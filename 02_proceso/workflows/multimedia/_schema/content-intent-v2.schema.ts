import {z} from 'zod';

import {MultimediaWorkflowIdSchema} from './workflow-v1.schema.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, 'Expected lowercase SHA-256');

export const ContentIntentV2Schema = z.strictObject({
  schema_version: z.literal('content-intent-v2'),
  request: z.string().min(1).max(4_000),
  request_hash: Sha256Schema,
  content_class: z.string().min(1).max(80),
  audience: z.string().min(1).max(600).nullable(),
  outcome: z.string().min(1).max(600).nullable(),
  sources: z.array(z.string().min(1).max(500)).max(40),
  source_authority: z.enum(['verified', 'partial', 'unknown']),
  channels: z.array(z.string().min(1).max(80)).max(20),
  restrictions: z.array(z.string().min(1).max(300)).max(30),
  effect_class: z.enum(['read_only', 'local_reversible', 'external_reversible', 'irreversible']),
  brief_sufficiency: z.enum(['complete', 'partial', 'insufficient']),
  blocking_questions: z.array(z.string().min(1).max(300)).max(3),
  route_candidates: z
    .array(
      z.strictObject({
        route_id: z.string().min(1).max(80),
        score: z.number().min(0).max(1),
        reason_codes: z.array(z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/u)).min(1),
      }),
    )
    .min(1),
  selected_stage_path: z.array(MultimediaWorkflowIdSchema).min(1).max(10),
  brief_ref: z.string().min(1).max(500).nullable(),
  next_gate: z.string().min(1).max(80),
  decision: z.enum(['ROUTED', 'NEEDS_INPUT', 'BLOCKED']),
});

export type ContentIntentV2 = z.infer<typeof ContentIntentV2Schema>;
