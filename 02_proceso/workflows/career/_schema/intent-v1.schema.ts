import {z} from 'zod';

import {
  CareerEffectClassSchema,
  CareerGateIdSchema,
  CareerWorkflowIdSchema,
  PortableRefSchema,
  Sha256Schema,
} from './primitives-v1.schema.ts';

export const CareerIntentV1Schema = z.strictObject({
  schema_version: z.literal('career-intent-v1'),
  request: z.string().min(1).max(4_000),
  request_hash: Sha256Schema,
  intent_class: z.enum([
    'general_cv',
    'targeted_cv',
    'cover_letter',
    'job_search',
    'full_application',
    'follow_up',
    'intervention',
  ]),
  candidate_id: z
    .string()
    .regex(/^CAND-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  application_id: z
    .string()
    .regex(/^APP-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  target_role: z.string().min(1).max(200).nullable(),
  language: z.enum(['es', 'en', 'pt', 'unknown']),
  job_ref: PortableRefSchema.nullable(),
  sources: z.array(PortableRefSchema).max(40),
  constraints: z.array(z.string().min(1).max(300)).max(30),
  effect_class: CareerEffectClassSchema,
  brief_sufficiency: z.enum(['complete', 'partial', 'insufficient']),
  blocking_questions: z.array(z.string().min(1).max(300)).max(3),
  reason_codes: z
    .array(z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/u))
    .min(1)
    .max(20),
  selected_stage_path: z.array(CareerWorkflowIdSchema).min(1).max(10),
  brief_ref: PortableRefSchema,
  next_gate: CareerGateIdSchema,
  decision: z.enum(['ROUTED', 'NEEDS_INPUT', 'BLOCKED']),
});

export type CareerIntentV1 = z.infer<typeof CareerIntentV1Schema>;
