import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {parse as parseYaml} from 'yaml';

import {
  EcosystemInventoryV1Schema,
  hashExperienceValue,
  type EcosystemInventoryV1,
} from '../../core/contracts/index.ts';
import type {LocalExtensionDiscovery} from '../local-extensions/index.ts';

type Item = EcosystemInventoryV1['items'][number];
const item = (kind: Item['kind'], id: string, ref: string, state = 'ACTIVE'): Item => ({
  kind,
  id,
  ref,
  scope: 'CANONICAL',
  state,
});

const trackedPaths = (root: string): string[] => {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: root,
      encoding: 'buffer',
    },
  );
  if (result.status !== 0) throw new Error('INVENTORY-GIT001');
  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((ref) => !ref.startsWith('03_artefactos/content/documentation/ecosystem-inventory'))
    .sort();
};

const yaml = <T>(root: string, ref: string): T =>
  parseYaml(readFileSync(path.join(root, ref), 'utf8')) as T;

export const buildEcosystemInventoryV1 = (
  root: string,
  local?: LocalExtensionDiscovery,
): EcosystemInventoryV1 => {
  const paths = trackedPaths(root);
  const items: Item[] = [];
  for (const ref of paths) {
    const agent = ref.match(/^02_proceso\/agents\/(RT-\d+)\/contract\.yml$/u)?.[1];
    if (agent) items.push(item('AGENT', agent, ref));
    if (/\/workflow\.yml$/u.test(ref)) {
      const workflow = yaml<{workflow_id?: string}>(root, ref);
      if (workflow.workflow_id) items.push(item('WORKFLOW', workflow.workflow_id, ref));
    }
    if (/\/templates\/.*\.(?:md|html)$/u.test(ref)) items.push(item('TEMPLATE', ref, ref));
    if (/\/(?:_assets|assets)\//u.test(ref)) items.push(item('ASSET', ref, ref));
    if (/^03_artefactos\/adapters\//u.test(ref) && ref.endsWith('/context.md')) {
      items.push(item('ADAPTER', ref.split('/')[2] ?? ref, ref));
    }
    if (/^03_artefactos\/renderers\//u.test(ref) && ref.endsWith('/context.md')) {
      items.push(item('RENDERER', ref.split('/')[2] ?? ref, ref));
    }
  }
  const router = yaml<{routes?: Array<{id: string}>}>(root, '02_proceso/governance/router.yml');
  for (const route of router.routes ?? [])
    items.push(item('ROUTE', route.id, '02_proceso/governance/router.yml'));
  const commands = yaml<{gates?: Array<{gate: string}>}>(
    root,
    '05_verificacion/scripts/commands.yaml',
  );
  for (const gate of commands.gates ?? [])
    items.push(item('GATE', gate.gate, '05_verificacion/scripts/commands.yaml'));
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  for (const command of Object.keys(packageJson.scripts ?? {}))
    items.push(item('COMMAND', command, 'package.json'));
  for (const registryRef of [
    '04_estado/registries/skills/skill-registry.yml',
    '04_estado/registries/skills/creation-v3-skill-registry.yml',
  ]) {
    const registry = yaml<{entries?: Array<{skill_id: string; current_state: string}>}>(
      root,
      registryRef,
    );
    for (const skill of registry.entries ?? []) {
      if (skill.current_state === 'active') items.push(item('SKILL', skill.skill_id, registryRef));
    }
  }
  const sources = yaml<{entries?: Array<{source_id: string; current_state: string}>}>(
    root,
    '04_estado/registries/sources/source-registry.yml',
  );
  for (const source of sources.entries ?? [])
    items.push(
      item(
        'SOURCE',
        source.source_id,
        '04_estado/registries/sources/source-registry.yml',
        source.current_state.toUpperCase(),
      ),
    );
  for (const registryRef of [
    '02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml',
    '02_proceso/workflows/career/_assets/deliverable-registry.yml',
  ]) {
    const registry = yaml<{definitions?: Array<{deliverable_id: string}>}>(root, registryRef);
    for (const definition of registry.definitions ?? [])
      items.push(item('DELIVERABLE', definition.deliverable_id, registryRef));
  }
  const componentRegistry = yaml<{components?: Array<{component_id: string}>}>(
    root,
    '04_estado/registries/components/component-registry.yml',
  );
  for (const component of componentRegistry.components ?? [])
    items.push(
      item(
        'COMPONENT',
        component.component_id,
        '04_estado/registries/components/component-registry.yml',
      ),
    );
  const rendererRegistry = yaml<{capabilities?: Array<{capabilityId: string}>}>(
    root,
    '04_estado/registries/renderers/renderer-capability-registry-v1.yml',
  );
  for (const renderer of rendererRegistry.capabilities ?? [])
    items.push(
      item(
        'RENDERER',
        renderer.capabilityId,
        '04_estado/registries/renderers/renderer-capability-registry-v1.yml',
      ),
    );
  for (const record of local?.records ?? []) {
    items.push({
      kind: 'LOCAL_EXTENSION',
      id: record.extension_id,
      ref: `04_estado/local/${record.scope === 'USER_LOCAL' ? 'user-extensions' : 'extensions'}/${record.extension_id}`,
      scope: record.scope === 'USER_LOCAL' ? 'USER_LOCAL' : 'PROJECT_LOCAL',
      state: record.state,
    });
  }
  const unique = [
    ...new Map(items.map((value) => [`${value.kind}\0${value.id}\0${value.ref}`, value])).values(),
  ].sort((left, right) =>
    `${left.kind}:${left.id}:${left.ref}`.localeCompare(`${right.kind}:${right.id}:${right.ref}`),
  );
  return EcosystemInventoryV1Schema.parse({
    schemaVersion: 'ecosystem-inventory-v1',
    inventoryId: local ? 'ECO-LOCAL-V1' : 'ECO-PUBLIC-V1',
    scope: local ? 'LOCAL_COMBINED' : 'PUBLIC',
    items: unique,
    sourceSha256: hashExperienceValue(unique),
  });
};
