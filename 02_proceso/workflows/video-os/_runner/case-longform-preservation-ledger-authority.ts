import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CaseLongformPreservationPlanAuthoritySchema} from './case-longform-preservation-plan-authority.ts';

const frameSummary = z.strictObject({
  source_frame: z.number().int().nonnegative(),
  output_frame: z.number().int().nonnegative(),
  source_frame_sha256: Hash,
  output_frame_sha256: Hash,
  masked_pixels: z.number().int().nonnegative(),
  residual_pixels: z.number().int().positive(),
  changed_pixels: z.number().int().nonnegative(),
});
const regionEvidence = z.strictObject({
  region_id: z.string().min(1),
  source_sha256: Hash,
  output_sha256: Hash,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  output_start_frame: z.number().int().nonnegative(),
  output_end_frame: z.number().int().nonnegative(),
  frame_count: z.number().int().positive(),
  pixels_per_frame: z.number().int().positive(),
  total_masked_pixels: z.number().int().nonnegative(),
  total_residual_pixels: z.number().int().positive(),
  minimum_frame_residual_ratio_ppm: z.number().int().min(900_000).max(1_000_000),
  changed_pixels: z.number().int().nonnegative(),
  worst_output_frame: z.number().int().nonnegative(),
  worst_changed_pixels: z.number().int().nonnegative(),
  frame_chain_sha256: Hash,
  samples: z.strictObject({start: frameSummary, mid: frameSummary, end: frameSummary}),
});
export const CaseLongformFrameDiffLedger = z.strictObject({
  schema_version: z.literal('case-longform-frame-diff-ledger-v1'),
  kind: z.literal('frame_diff_ledger'),
  job_id: z.string().min(1),
  preservation_plan_sha256: Hash,
  preservation_policy_sha256: Hash,
  source_set_sha256: Hash,
  preview_media_sha256: Hash,
  redaction_map_sha256: Hash,
  ffmpeg_sha256: Hash,
  ffmpeg_bytes: z.number().int().positive(),
  ffprobe_sha256: Hash,
  ffprobe_bytes: z.number().int().positive(),
  fps: z.literal(24),
  rgb_tolerance_per_channel: z.number().int().min(0).max(8),
  minimum_residual_ratio_ppm: z.number().int().min(900_000).max(1_000_000),
  regions: z.array(regionEvidence).min(1),
});
export const CaseLongformPreservationLedgerAuthoritySchema =
  CaseLongformPreservationPlanAuthoritySchema.extend({
    schema_version: z.literal('case-longform-preservation-ledger-authority-v6'),
    artifacts: CaseLongformPreservationPlanAuthoritySchema.shape.artifacts.extend({
      frame_diff_ledger: Ref,
    }),
    v5a_status: CaseLongformPreservationPlanAuthoritySchema.shape.status,
    status: z.literal('BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS'),
  });
export type CaseLongformPreservationLedgerAuthority = z.infer<
  typeof CaseLongformPreservationLedgerAuthoritySchema
>;
export type CaseLongformFrameDiffLedgerValue = z.infer<typeof CaseLongformFrameDiffLedger>;
