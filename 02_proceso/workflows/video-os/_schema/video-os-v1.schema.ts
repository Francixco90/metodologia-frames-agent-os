import {z} from 'zod';

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const LocalRefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => value === value.normalize('NFC'), 'REF_MUST_BE_NFC')
  .refine((value) => !value.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(value), 'REF_ABSOLUTE')
  .refine((value) => !/^(?:[a-z][a-z0-9+.-]*:|~|\\)/iu.test(value), 'REF_NON_LOCAL')
  .refine((value) => !value.split(/[\\/]/u).includes('..'), 'REF_TRAVERSAL');
export const VideoOsStageSchema = z.enum(['V00', 'V01', 'V02', 'V03', 'V04']);
export const VideoOsStatusSchema = z.enum([
  'INTAKE',
  'SOURCE_FROZEN',
  'SPEC_CANDIDATE',
  'SPEC_APPROVED',
  'PLAN_COMPILED',
  'RENDERED_DRAFT',
  'VERIFIED',
  'HUMAN_APPROVED',
  'BLOCKED',
]);
export const VideoArchetypeSchema = z.enum([
  'case-longform',
  'method-explainer',
  'reel-evidence',
  'branded-wrapper',
  'montage',
  'title-loop',
]);

export const VideoOsRequestSchema = z.strictObject({
  request: z.string().min(1).max(4_000),
  sourceRefs: z.array(LocalRefSchema).max(40).default([]),
  sourceAuthority: z.enum(['verified', 'partial', 'unknown']).default('unknown'),
  rights: z.enum(['cleared', 'restricted', 'unknown']).default('unknown'),
  archetype: VideoArchetypeSchema.optional(),
  primaryFormat: z.enum(['16:9', '9:16', '1:1', 'source']).optional(),
  secondaryExports: z
    .array(z.enum(['16:9', '9:16', '1:1']))
    .max(3)
    .default([]),
  constraints: z.array(z.string().min(1).max(300)).max(30).default([]),
});

export const VideoOsPlanSchema = z.strictObject({
  schema_version: z.literal('video-os-plan-v1'),
  request: z.string(),
  request_sha256: Sha256Schema,
  decision: z.enum(['ROUTED', 'NEEDS_INPUT', 'BLOCKED']),
  blocking_questions: z.array(z.string()).max(3),
  archetype: VideoArchetypeSchema,
  primary_format: z.enum(['16:9', '9:16', '1:1', 'source']),
  secondary_exports: z.array(z.enum(['16:9', '9:16', '1:1'])).max(3),
  stages: z.array(VideoOsStageSchema).length(5),
  prompt_budget: z.strictObject({min: z.literal(3), target: z.literal(4), max: z.literal(5)}),
  context_budget: z.strictObject({max_tokens_per_stage: z.number().int().max(1_800)}),
  defaults: z.strictObject({
    privacy_mode: z.literal('light'),
    privacy_strategy: z.literal('field-level'),
    persistent_privacy_plate: z.literal(false),
    human_intro_motion_required: z.literal(true),
    freeze_frame_allowed: z.literal(false),
    motion_evidence: z.literal('scene-aware-multiframe'),
    minimum_motion_samples: z.number().int().min(2),
    privacy_tracking: z.literal('scene-aware-field-tracking'),
    source_audio: z.enum(['preserve', 'none']),
    automatic_terminal_state: z.literal('RENDERED_DRAFT'),
  }),
  checkpoints: z
    .array(z.enum(['INTAKE_LOCK', 'SPEC_APPROVED', 'RENDER_REVIEW', 'HANDOFF']))
    .length(4),
  standard_artifacts: z.array(z.string()).min(8),
  secondary_export_rule: z.literal('PRIMARY_VERIFICATION_PASS_REQUIRED'),
  next_gate: z.string(),
});

export const VideoOsStateSchema = z.strictObject({
  schema_version: z.literal('video-os-state-v1'),
  job_id: z.string().regex(/^VIDEO-[A-Z0-9-]{3,79}$/u),
  status: VideoOsStatusSchema,
  active_stage: VideoOsStageSchema,
  decisions_used: z.number().int().min(0).max(5),
  spec_sha256: Sha256Schema.nullable(),
  manifest_sha256: Sha256Schema.nullable(),
  manifest_spec_sha256: Sha256Schema.nullable(),
  primary_verification: z.enum(['NOT_RUN', 'PASS', 'FAIL']),
  primary_verification_receipt: z
    .strictObject({
      verifier_actor_id: z.string().min(1).max(120),
      spec_sha256: Sha256Schema,
      manifest_sha256: Sha256Schema,
      render_sha256: Sha256Schema,
      receipt_ref: z.string().min(1).max(500),
      receipt_sha256: Sha256Schema,
      visual_evidence_sha256: Sha256Schema,
      verdict: z.enum(['PASS', 'FAIL']),
    })
    .nullable(),
  visual_evidence: z
    .strictObject({
      shot_boundaries_resolved: z.literal(true),
      privacy_mode: z.literal('light'),
      mask_strategy: z.literal('field-level'),
      samples_per_layout: z.number().int().min(3),
      speaker_motion_verified: z.literal(true),
      frozen_intro_frames: z.literal(0),
    })
    .nullable(),
  human_approval_receipt: z
    .strictObject({
      approver_actor_id: z.literal('H01'),
      spec_sha256: Sha256Schema,
      render_sha256: Sha256Schema,
      receipt_ref: z.string().min(1).max(500),
      receipt_sha256: Sha256Schema,
    })
    .nullable(),
  secondary_exports_requested: z.array(z.enum(['16:9', '9:16', '1:1'])).max(3),
  evidence_refs: z.array(z.string().min(1).max(500)).max(80),
  producer_actor_id: z.string().min(1).max(120),
  verifier_actor_id: z.string().min(1).max(120),
  guardian_actor_id: z.string().min(1).max(120),
  next_gate: z.string().min(1).max(80),
  gaps: z.array(z.string().min(1).max(300)).max(30),
});

export const VideoOsJobSchema = z.strictObject({
  schema_version: z.literal('video-os-job-v1'),
  plan: VideoOsPlanSchema,
  state: VideoOsStateSchema,
});

export type VideoOsRequest = z.infer<typeof VideoOsRequestSchema>;
export type VideoOsPlan = z.infer<typeof VideoOsPlanSchema>;
export type VideoOsState = z.infer<typeof VideoOsStateSchema>;
export type VideoOsJob = z.infer<typeof VideoOsJobSchema>;
