import {readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'yaml';

import {
  MutationProfileV1Schema,
  type MutationClassV1,
} from '../../../02_proceso/core/contracts/index.ts';

const MUTATING_SKILLS = new Map<string, MutationClassV1[]>([
  ['content-os-remotion-create', ['CREATE']],
  ['content-os-remotion-upgrade', ['EXPAND', 'MIGRATE']],
  ['content-os-router', ['EXPAND', 'EXTEND', 'CORRECT']],
  ['dev-document-generate', ['CREATE', 'CORRECT']],
  ['dev-document-release', ['MIGRATE', 'DEPRECATE']],
  ['dev-executing-plans', ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE']],
  ['dev-skillify', ['CREATE', 'EXTEND']],
  ['dev-systematic-debugging', ['CORRECT']],
  [
    'dev-verification-before-completion',
    ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE'],
  ],
  ['dev-writing-plans', ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE']],
  ['dev-writing-skills', ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE']],
  ['frames-docs-as-code', ['CREATE', 'EXPAND', 'CORRECT', 'MIGRATE']],
  ['frames-ecosystem-inventory', ['CREATE', 'CORRECT']],
  ['frames-harness-maintainer', ['EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE']],
  ['frames-local-extension-foundry', ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'DEPRECATE']],
  ['skill-authoring-engineer', ['CREATE', 'EXPAND', 'EXTEND', 'CORRECT', 'MIGRATE', 'DEPRECATE']],
  ['skill-release-governor', ['MIGRATE', 'DEPRECATE']],
]);

type Registry = {entries?: Array<{skill_id?: string; current_state?: string}>};

const activeIdsFrom = (root: string, ref: string): string[] => {
  const registry = parse(readFileSync(path.join(root, ref), 'utf8')) as Registry;
  return (registry.entries ?? [])
    .filter((entry) => entry.current_state === 'active' && entry.skill_id)
    .map((entry) => entry.skill_id as string);
};

export const buildMutationProfilesV1 = (root: string) => {
  const ids = new Set([
    ...activeIdsFrom(root, '04_estado/registries/skills/skill-registry.yml'),
    ...activeIdsFrom(root, '04_estado/registries/skills/creation-v3-skill-registry.yml'),
  ]);
  for (const id of MUTATING_SKILLS.keys()) ids.add(id);
  return [...ids].sort().map((skillId) =>
    MutationProfileV1Schema.parse({
      skillId,
      mutationClasses: MUTATING_SKILLS.get(skillId) ?? [],
      documentationImpactRequired: MUTATING_SKILLS.has(skillId),
    }),
  );
};

export const renderMutationProfilesV1 = (root: string): string => {
  const profiles = buildMutationProfilesV1(root);
  const lines = [
    'schema_version: mutation-profile-registry-v1',
    'authority: explicit-allowlist-no-keyword-inference',
    'profiles:',
  ];
  for (const profile of profiles) {
    const classes = profile.mutationClasses.join(', ');
    lines.push(`  - skill_id: ${profile.skillId}`);
    lines.push(`    mutation_classes: [${classes}]`);
    lines.push(`    documentation_impact_required: ${String(profile.documentationImpactRequired)}`);
  }
  return `${lines.join('\n')}\n`;
};
