import {createHash} from 'node:crypto';

import {z} from 'zod';

import {FRAMES_OPERATOR_PROFILES, type FramesOperatorProfileId} from '../profiles-v1.ts';

const VideoProjectionSchema = z.object({
  stages: z.array(z.string()),
  prompt_budget: z.strictObject({min: z.number(), target: z.number(), max: z.number()}),
  standard_artifacts: z.array(z.string()),
  secondary_export_rule: z.string(),
});

const CareerProjectionSchema = z.object({
  selected_stage_path: z.array(z.string()).min(1),
  blocking_questions: z.array(z.string()).max(3),
  next_gate: z.string().regex(/^CR_[A-Z_]+$/u),
});

export type OperatorDomainBindingV1 = {
  schema_version: 'operator-domain-binding-v1';
  domain: FramesOperatorProfileId;
  status: 'BOUND';
  projection_sha256: string;
  stages: readonly string[];
  documents: readonly string[];
};

const equal = (left: readonly string[], right: readonly string[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export const bindOperatorDomainPlanV1 = (
  domain: FramesOperatorProfileId,
  raw: unknown,
): OperatorDomainBindingV1 => {
  const profile = FRAMES_OPERATOR_PROFILES[domain];
  if (domain === 'VIDEO') {
    const plan = VideoProjectionSchema.parse(raw);
    if (!equal(plan.stages, profile.stages)) throw new Error('OPERATOR-VIDEO-STAGE-DRIFT');
    if (!equal(plan.standard_artifacts, profile.documents))
      throw new Error('OPERATOR-VIDEO-DOCUMENT-DRIFT');
    if (plan.prompt_budget.target !== 4 || plan.prompt_budget.max !== 5)
      throw new Error('OPERATOR-VIDEO-PROMPT-DRIFT');
    if (plan.secondary_export_rule !== 'PRIMARY_VERIFICATION_PASS_REQUIRED')
      throw new Error('OPERATOR-VIDEO-DERIVATIVE-RULE-DRIFT');
  } else {
    const plan = CareerProjectionSchema.parse(raw);
    const allowed = new Set<string>(profile.stages);
    if (plan.selected_stage_path.some((stage) => !allowed.has(stage)))
      throw new Error('OPERATOR-CAREER-STAGE-DRIFT');
  }
  return {
    schema_version: 'operator-domain-binding-v1',
    domain,
    status: 'BOUND',
    projection_sha256: createHash('sha256').update(JSON.stringify(raw)).digest('hex'),
    stages: profile.stages,
    documents: profile.documents,
  };
};
