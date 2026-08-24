import {z} from 'zod';

import {ArtifactBindingSchema} from './method-explainer-planning-v1.schema.ts';
import {Sha256Schema} from './video-os-v1.schema.ts';

export const MethodExplainerCopyExceptionV1Schema = z.strictObject({
  schema_version: z.literal('method-explainer-copy-exception-v1'),
  beat_id: z.string().regex(/^BEAT-[A-Z0-9-]{2,60}$/u),
  rule: z.enum(['VOICE_SCREEN_LITERAL', 'VOICE_SCREEN_CONTAINMENT', 'VOICE_SCREEN_OVERLAP']),
  voice_contract_sha256: Sha256Schema,
  role_hashes: z.strictObject({
    voiceover: Sha256Schema,
    accessibility_caption: Sha256Schema,
    on_screen: Sha256Schema,
  }),
  rationale: z.string().min(20).max(500),
  authority: z.literal('editorial'),
  review: z.strictObject({
    status: z.literal('PENDING_H01'),
    reviewer_id: z.literal('H01'),
    approval_candidate: ArtifactBindingSchema,
    binding_verification: z.literal('UNVERIFIED'),
  }),
});

const BoundedTextSchema = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0, 'COPY_TEXT_BLANK');

export const MethodExplainerCopyPolicyInputSchema = z.strictObject({
  beat_id: z.string().regex(/^BEAT-[A-Z0-9-]{2,60}$/u),
  voice_contract_sha256: Sha256Schema,
  voiceover: BoundedTextSchema(1_000),
  accessibility_caption: BoundedTextSchema(1_000),
  on_screen: z.array(BoundedTextSchema(160)).min(1).max(8),
  exception: MethodExplainerCopyExceptionV1Schema.optional(),
});

export type MethodExplainerCopyExceptionV1 = z.infer<typeof MethodExplainerCopyExceptionV1Schema>;
export type MethodExplainerCopyPolicyInput = z.infer<typeof MethodExplainerCopyPolicyInputSchema>;
