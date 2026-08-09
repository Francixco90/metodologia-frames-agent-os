import {createHash} from 'node:crypto';
import {
  SkillEvalRunV1Schema,
  SkillSystemCaseV1Schema,
  type SkillEffectClassV1,
} from './contracts.ts';

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export type DemotionInputV1 = {
  repeatable: boolean;
  needsSpecializedJudgment: boolean;
  instructionSufficient: boolean;
  referenceSufficient: boolean;
  toolSufficient: boolean;
};

export const decideSmallestComponentV1 = (input: DemotionInputV1) => {
  if (!input.repeatable) return {kind: 'INSTRUCTION', decision: 'DEMOTE'} as const;
  if (input.referenceSufficient) return {kind: 'REFERENCE', decision: 'DEMOTE'} as const;
  if (input.toolSufficient && !input.needsSpecializedJudgment)
    return {kind: 'TOOL', decision: 'DEMOTE'} as const;
  if (input.instructionSufficient && !input.needsSpecializedJudgment)
    return {kind: 'INSTRUCTION', decision: 'DEMOTE'} as const;
  return {kind: 'SKILL', decision: 'CREATE_OR_EVOLVE'} as const;
};

export const effectPolicyV1 = (
  effect: SkillEffectClassV1,
  controls: {
    workOrder: boolean;
    trustedRunner: boolean;
    sandboxReplay: boolean;
    humanAuthorization: boolean;
  },
) => {
  if (effect === 'E0') return {status: 'PASS', effect: 'advisory'} as const;
  if (effect === 'E1') return {status: 'PASS', effect: 'read_only'} as const;
  if (effect === 'E2')
    return controls.workOrder
      ? ({status: 'PASS', effect: 'local_reversible'} as const)
      : ({status: 'BLOCKED', gap: 'WORK_ORDER_REQUIRED'} as const);
  if (effect === 'E3')
    return controls.workOrder && controls.trustedRunner && controls.sandboxReplay
      ? ({status: 'PASS', effect: 'sandboxed_execution'} as const)
      : ({status: 'VALIDATED_NOT_RUNNABLE', gap: 'TRUSTED_SANDBOX_REPLAY_REQUIRED'} as const);
  return controls.humanAuthorization
    ? ({status: 'BLOCKED', gap: 'E4_OUT_OF_MVP'} as const)
    : ({status: 'BLOCKED', gap: 'EXACT_HUMAN_AUTHORIZATION_REQUIRED'} as const);
};

export const evaluateSkillRunV1 = (input: unknown) => {
  const run = SkillEvalRunV1Schema.parse(input);
  const eligible = run.cases.filter((item) => item.infrastructure_status === 'PASS');
  const candidatePasses = eligible.filter((item) => item.candidate_pass === true).length;
  const baselinePasses = eligible.filter((item) => item.baseline_pass === true).length;
  const infrastructureFailureRatio = (run.cases.length - eligible.length) / run.cases.length;
  const coverageSufficient =
    eligible.length >= run.coverage_policy.minimum_eligible_cases &&
    infrastructureFailureRatio <= run.coverage_policy.maximum_infrastructure_failure_ratio;
  return {
    schema_version: 'skill-eval-summary-v1',
    run_id: run.run_id,
    denominator: eligible.length,
    excluded_infrastructure: run.cases.length - eligible.length,
    infrastructure_failure_ratio: infrastructureFailureRatio,
    coverage_sufficient: coverageSufficient,
    candidate_passes: candidatePasses,
    baseline_passes: baselinePasses,
    lift: eligible.length === 0 ? null : (candidatePasses - baselinePasses) / eligible.length,
    verdict: !coverageSufficient ? 'UNKNOWN' : candidatePasses > baselinePasses ? 'PASS' : 'REVISE',
    summary_sha256: hash(run),
  } as const;
};

export const validateSkillCaseV1 = (input: unknown) => SkillSystemCaseV1Schema.parse(input);
