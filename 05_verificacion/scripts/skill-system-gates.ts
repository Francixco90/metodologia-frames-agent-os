import {createHash} from 'node:crypto';

import {
  ArchitectureDecisionV1Schema,
  CapabilityMapV1Schema,
  ComponentContractV1Schema,
  SkillEvalRunV1Schema,
  SkillSystemCaseV1Schema,
} from '../../02_proceso/workflows/skill-systems/contracts.ts';
import {
  SkillArchitectureGateInputV1Schema,
  SkillCaseGateInputV1Schema,
  SkillStaticGateInputV1Schema,
  type SkillMaterialRefV1,
} from '../../02_proceso/workflows/skill-systems/gate-contracts.ts';
import {evaluateSkillRunV1} from '../../02_proceso/workflows/skill-systems/governance.ts';
import {assertSkillContentHashV1, readSkillMaterialV1} from './skill-system-material.ts';

const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const readJson = (root: string, ref: SkillMaterialRefV1): Record<string, unknown> =>
  JSON.parse(readSkillMaterialV1(root, ref)) as Record<string, unknown>;

export const verifySkillCaseGateV1 = (root: string, input: unknown) => {
  const bundle = SkillCaseGateInputV1Schema.parse(input);
  const record = readJson(root, bundle.case_ref);
  const skillCase = SkillSystemCaseV1Schema.parse(record);
  assertSkillContentHashV1(record);
  const declared = [...skillCase.source_refs].sort();
  const supplied = bundle.source_refs.map(({ref}) => ref).sort();
  if (JSON.stringify(declared) !== JSON.stringify(supplied))
    throw new Error('SSS_CASE_SOURCE_SET001');
  for (const source of bundle.source_refs) readSkillMaterialV1(root, source);
  return {
    schema_version: 'skill-case-gate-result-v1',
    status: 'PASS',
    case_id: skillCase.case_id,
    case_sha256: bundle.case_ref.sha256,
    sources_verified: bundle.source_refs.length,
  } as const;
};

export const verifySkillArchitectureGateV1 = (root: string, input: unknown) => {
  const bundle = SkillArchitectureGateInputV1Schema.parse(input);
  const mapRecord = readJson(root, bundle.capability_map_ref);
  const decisionRecord = readJson(root, bundle.decision_ref);
  const map = CapabilityMapV1Schema.parse(mapRecord);
  const decision = ArchitectureDecisionV1Schema.parse(decisionRecord);
  assertSkillContentHashV1(mapRecord);
  assertSkillContentHashV1(decisionRecord);
  if (decision.case_id !== map.case_id || decision.capability_map_id !== map.map_id)
    throw new Error('SSS_ARCHITECTURE_BINDING001');
  return {
    schema_version: 'skill-architecture-gate-result-v1',
    status: 'PASS',
    map_id: map.map_id,
    decision_id: decision.decision_id,
  } as const;
};

export const verifySkillStaticGateV1 = (root: string, input: unknown) => {
  const bundle = SkillStaticGateInputV1Schema.parse(input);
  readSkillMaterialV1(root, bundle.candidate_ref);
  const components = bundle.contract_refs.map((ref) => {
    const record = readJson(root, ref);
    const contract = ComponentContractV1Schema.parse(record);
    assertSkillContentHashV1(record);
    return contract.component_id;
  });
  return {
    schema_version: 'skill-static-gate-result-v1',
    status: 'PASS',
    candidate_sha256: bundle.candidate_ref.sha256,
    component_ids: components,
  } as const;
};

export const verifySkillEvalGateV1 = (root: string, input: unknown) => {
  const run = SkillEvalRunV1Schema.parse(input);
  const candidate = readSkillMaterialV1(root, {
    ref: run.candidate_ref,
    sha256: run.candidate_sha256,
  });
  const replay = readSkillMaterialV1(root, {ref: run.replay_ref, sha256: run.replay_sha256});
  if (sha(candidate) !== run.candidate_sha256 || sha(replay) !== run.replay_sha256)
    throw new Error('SSS_EVAL_MATERIAL_HASH001');
  for (const item of run.cases) {
    if (item.infrastructure_status === 'PASS' && item.evidence_refs.length === 0)
      throw new Error(`SSS_EVAL_EVIDENCE_REQUIRED:${item.eval_case_id}`);
    for (const evidence of item.evidence_refs) readSkillMaterialV1(root, evidence);
  }
  return evaluateSkillRunV1(run);
};
