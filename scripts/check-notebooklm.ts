import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {validateNotebookWorkUnitDeclaration} from '../adapters/notebooklm/index.ts';
import {AgentContractSchema} from '../committees/src/index.ts';
import {
  NotebookWorkflowBindingManifestSchema,
  type NotebookWorkUnitDeclaration,
} from '../core/contracts/index.ts';

const root = process.cwd();
const roleIds = [
  'RT-01',
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-09',
  'RT-10',
  'RT-11',
] as const;
const workflowManifests = [
  'workflows/core/notebooklm-binding.yml',
  'workflows/web/notebooklm-binding.yml',
  'workflows/content/notebooklm-binding.yml',
  'workflows/adapters/notebooklm-binding.yml',
] as const;

const SourceRegistryIndexSchema = z.object({
  entries: z.array(z.object({source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u)}).passthrough()),
});
const NotebookRegistryIndexSchema = z.object({
  entries: z.array(
    z
      .object({
        binding_id: z.string().min(1),
        binding: z.discriminatedUnion('mode', [
          z.object({mode: z.literal('none'), reason_code: z.string().min(1)}).passthrough(),
          z.object({mode: z.literal('digest'), binding_digest: z.string().min(1)}).passthrough(),
        ]),
        state: z.enum(['grounded', 'partial', 'coverage_gap', 'blocked']),
      })
      .passthrough(),
  ),
});
const WorkUnitContractIndexSchema = z.object({
  contract_id: z.literal('notebooklm-work-unit-binding-v1'),
  adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
  applies_to: z.object({
    agents: z.array(z.string()),
    workflows: z.array(z.string()),
  }),
  permissions: z.object({
    access_mode: z.literal('read_only'),
    mutation: z.literal('forbidden'),
    evidence_promotion: z.literal('forbidden_without_source_mapping'),
    source_locked_effect: z.literal('none'),
  }),
  consequence_without_live_binding: z.object({
    state: z.literal('coverage_gap'),
    may_query: z.literal(false),
    may_claim_grounding: z.literal(false),
    may_promote_evidence: z.literal(false),
    may_set_source_locked: z.literal(false),
  }),
});

const readYaml = (relativePath: string): unknown =>
  parse(readFileSync(resolve(root, relativePath), 'utf8')) as unknown;

const sourceRegistry = SourceRegistryIndexSchema.parse(
  readYaml('registries/sources/source-registry.yml'),
);
const notebookRegistry = NotebookRegistryIndexSchema.parse(
  readYaml('registries/notebooks/notebook-registry.yml'),
);
const workUnitContract = WorkUnitContractIndexSchema.parse(
  readYaml('registries/notebooks/work-unit-binding-contract.yml'),
);
const knownSourceIds = new Set(sourceRegistry.entries.map(({source_id: sourceId}) => sourceId));
const bindingById = new Map(
  notebookRegistry.entries.map((entry) => [entry.binding_id, entry] as const),
);
const errors: string[] = [];
const declarations: Array<{unitId: string; declaration: NotebookWorkUnitDeclaration}> = [];

for (const roleId of roleIds) {
  const relativePath = `agents/${roleId}/contract.yml`;
  const contract = AgentContractSchema.parse(readYaml(relativePath));
  if (contract.role_id !== roleId) {
    errors.push(`${relativePath}: role_id no coincide con la ruta`);
  }
  declarations.push({unitId: roleId, declaration: contract.notebooklm});
}

for (const relativePath of workflowManifests) {
  const manifest = NotebookWorkflowBindingManifestSchema.parse(readYaml(relativePath));
  declarations.push({unitId: manifest.workflow_id, declaration: manifest.notebooklm});
  for (const entrypoint of manifest.entrypoints) {
    if (!existsSync(resolve(root, entrypoint))) {
      errors.push(`${manifest.workflow_id}: entrypoint inexistente ${entrypoint}`);
    }
  }
}

for (const {unitId, declaration} of declarations) {
  validateNotebookWorkUnitDeclaration(declaration);
  if (!existsSync(resolve(root, declaration.contract_ref))) {
    errors.push(`${unitId}: contract_ref inexistente`);
  }

  const registryBinding = bindingById.get(declaration.binding_id);
  if (registryBinding === undefined) {
    errors.push(`${unitId}: binding_id no existe en notebook-registry.yml`);
  } else {
    if (registryBinding.binding.mode !== declaration.binding.mode) {
      errors.push(`${unitId}: modo de binding no coincide con el registry`);
    }
    if (
      registryBinding.binding.mode === 'none' &&
      declaration.binding.mode === 'none' &&
      registryBinding.binding.reason_code !== declaration.binding.reason_code
    ) {
      errors.push(`${unitId}: reason_code no coincide con el registry`);
    }
    if (
      registryBinding.state === 'coverage_gap' &&
      declaration.coverage.status !== 'coverage_gap'
    ) {
      errors.push(`${unitId}: el registry coverage_gap no permite sobredeclarar cobertura`);
    }
  }

  for (const sourceId of declaration.coverage.expected_source_ids) {
    if (!knownSourceIds.has(sourceId)) {
      errors.push(`${unitId}: source ID previsto no existe en source-registry.yml: ${sourceId}`);
    }
  }
}

const expectedUnits = new Set([...roleIds, 'WF-CORE', 'WF-WEB', 'WF-CONTENT', 'WF-ADAPTERS']);
const actualUnits = new Set(declarations.map(({unitId}) => unitId));
if (
  actualUnits.size !== expectedUnits.size ||
  [...expectedUnits].some((unitId) => !actualUnits.has(unitId))
) {
  errors.push('la cobertura de work units NotebookLM no coincide con RT-01..RT-11 + 4 workflows');
}
if (
  new Set(workUnitContract.applies_to.agents).size !== roleIds.length ||
  roleIds.some((roleId) => !workUnitContract.applies_to.agents.includes(roleId))
) {
  errors.push('work-unit-binding-contract.yml no enumera exactamente RT-01..RT-11');
}
for (const workflowId of ['WF-CORE', 'WF-WEB', 'WF-CONTENT', 'WF-ADAPTERS']) {
  if (!workUnitContract.applies_to.workflows.includes(workflowId)) {
    errors.push(`work-unit-binding-contract.yml omite ${workflowId}`);
  }
}

const versionedSurface = [
  'registries/notebooks/work-unit-binding-contract.yml',
  'registries/notebooks/notebook-registry.yml',
  ...roleIds.map((roleId) => `agents/${roleId}/contract.yml`),
  ...workflowManifests,
];
for (const relativePath of versionedSurface) {
  const raw = readFileSync(resolve(root, relativePath), 'utf8');
  if (
    /(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\//u.test(raw) ||
    /[A-Za-z]:[\\/](?:Users|private)[\\/]/u.test(raw) ||
    /file:\/\//u.test(raw)
  ) {
    errors.push(`${relativePath}: contiene material de locator local`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS G06 NOTEBOOKLM: ${declarations.length} work units declarados read-only; binding none y coverage_gap preservados.`,
  );
}
