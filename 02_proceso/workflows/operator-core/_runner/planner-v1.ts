import {createHash} from 'node:crypto';

import {z} from 'zod';

import {Sha256Schema} from '../../../core/contracts/primitives.ts';
import {OperatorDomainV1Schema} from '../_schema/operator-v1.schema.ts';
import {
  FRAMES_OPERATOR_CONTEXT_BUDGET,
  FRAMES_OPERATOR_PROFILES,
  FRAMES_OPERATOR_PROMPT_CHAIN,
} from '../profiles-v1.ts';

const InputSchema = z.strictObject({
  request: z.string().trim().min(1).max(2_000),
  domain: OperatorDomainV1Schema,
  outcome: z.string().trim().min(1).max(500).optional(),
  sources: z
    .array(z.strictObject({source_id: z.string().min(3).max(160), sha256: Sha256Schema}))
    .max(24)
    .default([]),
  primary_deliverables: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
  secondary_deliverables: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
});

export type FramesOperatorPlanV1 = {
  schema_version: 'frames-operator-plan-v1';
  request_sha256: string;
  domain: z.infer<typeof OperatorDomainV1Schema>;
  decision: 'ROUTED' | 'NEEDS_INPUT';
  blocking_questions: string[];
  prompts: typeof FRAMES_OPERATOR_PROMPT_CHAIN;
  stages: readonly string[];
  standard_documents: readonly string[];
  context_budget: typeof FRAMES_OPERATOR_CONTEXT_BUDGET;
  secondary_rule: 'QUEUE_ONLY_UNTIL_PRIMARY_PASS';
  next_action: 'FREEZE_SOURCES_AND_SPEC' | 'ANSWER_BLOCKING_QUESTIONS';
};

export const planFramesOperatorV1 = (raw: unknown): FramesOperatorPlanV1 => {
  const input = InputSchema.parse(raw);
  const questions = [
    input.outcome ? null : '¿Cuál es el resultado observable que debe quedar listo?',
    input.sources.length > 0 ? null : '¿Qué fuentes autorizadas y hash-bound se usarán?',
    input.primary_deliverables.length > 0 ? null : '¿Cuál es el entregable principal?',
  ].filter((question): question is string => question !== null);
  const profile = FRAMES_OPERATOR_PROFILES[input.domain];
  return {
    schema_version: 'frames-operator-plan-v1',
    request_sha256: createHash('sha256').update(input.request.normalize('NFC')).digest('hex'),
    domain: input.domain,
    decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
    blocking_questions: questions,
    prompts: FRAMES_OPERATOR_PROMPT_CHAIN,
    stages: profile.stages,
    standard_documents: profile.documents,
    context_budget: FRAMES_OPERATOR_CONTEXT_BUDGET,
    secondary_rule: 'QUEUE_ONLY_UNTIL_PRIMARY_PASS',
    next_action: questions.length === 0 ? 'FREEZE_SOURCES_AND_SPEC' : 'ANSWER_BLOCKING_QUESTIONS',
  };
};
