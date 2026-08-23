import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

import {
  ArchitectureDecisionV1Schema,
  CapabilityMapV1Schema,
  ComponentContractV1Schema,
} from '../../../02_proceso/workflows/skill-systems/contracts.ts';
import {stableStringify} from '../../../02_proceso/workflows/multimedia/_runner/brief-model.ts';

const S02 = '04_estado/tasks/TASK-loose-032/skill-system/S02';
const S03 = '04_estado/tasks/TASK-loose-032/skill-system/S03';
const SCHEMA_REF = '02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
const SCHEMA_BINDING = `${SCHEMA_REF}#DiagramContractV2Schema`;
const PLANNING_REF = '02_proceso/workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
const SAFE_ZONE_REF = '03_artefactos/skills/content-os-creative/assets/metodologia/safe-zones.json';
const COMPONENTS = [
  ['component-contract-skill-v1.json', 'SKILL_EXPLAINER_DIAGRAM_DESIGN', 'SKILL', 'E1'],
  ['component-contract-validator-v1.json', 'TOOL_EXPLAINER_DIAGRAM_VALIDATE', 'TOOL', 'E1'],
  ['component-contract-compiler-v1.json', 'TOOL_EXPLAINER_DIAGRAM_COMPILE', 'TOOL', 'E1'],
  ['component-contract-schema-v1.json', 'SCHEMA_DIAGRAM_CONTRACT_V2', 'SCHEMA', 'E0'],
] as const;
const S02_REFS = [`${S02}/architecture-decision-v1.json`, `${S02}/capability-map-v1.json`];
const CONTRACT_REFS = COMPONENTS.map(([file]) => `${S03}/${file}`);

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const fail = (code: string): never => {
  throw new Error(code);
};
const readBytes = (root: string, ref: string) => readFileSync(path.join(root, ref));
const readRecord = (root: string, ref: string): Record<string, unknown> =>
  JSON.parse(readBytes(root, ref).toString('utf8')) as Record<string, unknown>;
const assertContentHash = (record: Record<string, unknown>, code: string) => {
  const payload = {...record};
  delete payload.content_sha256;
  if (record.content_sha256 !== sha(stableStringify(payload))) fail(code);
};
const containsPublicationGrant = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, item]) =>
      ((key === 'publication_authority' || key === 'publicationAuthorized') && item !== false) ||
      containsPublicationGrant(item),
  );
};
const same = (left: readonly unknown[], right: readonly unknown[]) =>
  JSON.stringify(left) === JSON.stringify(right);

export const verifyExplainerDiagramS03 = (root: string) => {
  const actualFiles = readdirSync(path.join(root, S03))
    .filter((file) => file.startsWith('component-contract-') && file.endsWith('.json'))
    .sort();
  const expectedFiles = COMPONENTS.map(([file]) => file).sort();
  if (!same(actualFiles, expectedFiles)) fail('S03_CONTRACT_SET001');

  const mapRecord = readRecord(root, `${S02}/capability-map-v1.json`);
  const decisionRecord = readRecord(root, `${S02}/architecture-decision-v1.json`);
  assertContentHash(mapRecord, 'S03_S02_HASH001');
  assertContentHash(decisionRecord, 'S03_S02_HASH001');
  const map = CapabilityMapV1Schema.parse(mapRecord);
  const decision = ArchitectureDecisionV1Schema.parse(decisionRecord);
  const ids = COMPONENTS.map(([, id]) => id);
  if (!same(decision.selected_topology, ids)) fail('S03_TOPOLOGY001');
  if (
    !same(
      map.components.map(({component_id}) => component_id),
      ids,
    )
  )
    fail('S03_TOPOLOGY001');

  const contracts = COMPONENTS.map(([file, id, kind, effect]) => {
    const ref = `${S03}/${file}`;
    const record = readRecord(root, ref);
    if (containsPublicationGrant(record)) fail('S03_PUBLICATION001');
    assertContentHash(record, 'S03_CONTRACT_HASH001');
    const contract = ComponentContractV1Schema.parse(record);
    if (contract.component_id !== id || contract.kind !== kind) fail('S03_CONTRACT_BINDING001');
    if (contract.effect_class !== effect || contract.write_set.length !== 0) fail('S03_EFFECT001');
    const isSkill = id === 'SKILL_EXPLAINER_DIAGRAM_DESIGN';
    const expectedInput = isSkill ? PLANNING_REF : SCHEMA_BINDING;
    const expectedOwner = id === 'SCHEMA_DIAGRAM_CONTRACT_V2' ? 'video-os' : 'content';
    const expectedReads = isSkill ? [PLANNING_REF, SCHEMA_REF, SAFE_ZONE_REF] : [SCHEMA_REF];
    if (contract.owner !== expectedOwner || !same(contract.read_set, expectedReads))
      fail('S03_CONTRACT_BINDING001');
    if (contract.outputs_schema_ref !== SCHEMA_BINDING) fail('S03_SCHEMA_BINDING001');
    if (contract.inputs_schema_ref !== expectedInput) fail('S03_SCHEMA_BINDING001');
    return contract;
  });

  const planRecord = readRecord(root, `${S03}/skill-eval-plan-v1.json`);
  if (containsPublicationGrant(planRecord)) fail('S03_PUBLICATION001');
  assertContentHash(planRecord, 'S03_PLAN_HASH001');
  const plan = planRecord as {
    candidate_component?: string;
    source_refs?: Array<{ref?: string; sha256?: string}>;
    schema_binding?: {ref?: string; export?: string};
    constraints?: {maximum_effect?: string; read_only?: boolean; publication_authority?: boolean};
    cases?: Array<{family?: string; owner_component?: string}>;
  };
  const expectedRefs = [...S02_REFS, SCHEMA_REF, ...CONTRACT_REFS];
  if (!same(plan.source_refs?.map(({ref}) => ref) ?? [], expectedRefs)) fail('S03_SOURCE_REFS001');
  for (const source of plan.source_refs ?? []) {
    if (!source.ref || source.sha256 !== sha(readBytes(root, source.ref)))
      fail('S03_SOURCE_HASH001');
  }
  if (
    plan.schema_binding?.ref !== SCHEMA_REF ||
    plan.schema_binding.export !== 'DiagramContractV2Schema'
  )
    fail('S03_SCHEMA_BINDING001');
  if (
    plan.constraints?.maximum_effect !== 'E1' ||
    plan.constraints.read_only !== true ||
    plan.constraints.publication_authority !== false
  )
    fail('S03_EFFECT001');
  const families = new Set(plan.cases?.map(({family}) => family));
  if (!['TRIGGER', 'DECISION', 'OUTCOME'].every((family) => families.has(family)))
    fail('S03_EVAL_COVERAGE001');
  if (plan.candidate_component !== ids[0]) fail('S03_PLAN_BINDING001');
  if (
    plan.cases?.some(({owner_component}) => !ids.includes(owner_component as (typeof ids)[number]))
  )
    fail('S03_PLAN_BINDING001');
  if (!/export const DiagramContractV2Schema/u.test(readBytes(root, SCHEMA_REF).toString('utf8')))
    fail('S03_SCHEMA_EXPORT001');

  return {status: 'PASS' as const, component_ids: contracts.map(({component_id}) => component_id)};
};
