import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CASE_LONGFORM_ROLES} from './case-longform-graph-structure.ts';
import {CaseLongformSemanticAuthoritySchema} from './case-longform-semantic-authority.ts';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const role = z.enum(CASE_LONGFORM_ROLES);
const participant = z.enum(['danilo', 'alejandra', 'natalia']);
const category = z.enum([
  'faces',
  'drawings',
  'products',
  'dashboards',
  'interfaces',
  'functional_text',
  'evidence',
  'captions',
  'motion',
]);
export const CaseLongformPreservationRoi = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const span = {
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
};
const policyRegion = z.strictObject({
  region_id: id,
  category,
  source_role: role,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  source_roi: CaseLongformPreservationRoi,
});
const policyOverlay = z.strictObject({
  overlay_id: id,
  kind: z.enum(['MASK', 'CAPTION']),
  source_id: id,
  ...span,
  roi: CaseLongformPreservationRoi,
});
export const CaseLongformPreservationPolicyReceipt = z.strictObject({
  schema_version: z.literal('case-longform-preservation-policy-receipt-v1'),
  kind: z.literal('preservation_policy_receipt'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  previous_policy_sha256: Hash,
  actor_id: z.string().min(1),
  fps: z.literal(24),
  width: z.literal(1920),
  height: z.literal(1080),
  rgb_tolerance_per_channel: z.number().int().min(0).max(255),
  minimum_residual_ratio_ppm: z.number().int().min(1).max(1_000_000),
  participants: z
    .array(
      z.strictObject({
        participant_id: participant,
        public_name: z.string().min(1),
        regions: z.array(policyRegion).min(1),
        authorized_overlays: z.array(policyOverlay),
        allowed_cross_category_overlaps: z.array(z.tuple([id, id])),
      }),
    )
    .length(3),
});
const planRegion = z.strictObject({
  region_id: id,
  category,
  source_role: role,
  source_sha256: Hash,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  output_start_frame: z.number().int().nonnegative(),
  output_end_frame: z.number().int().nonnegative(),
  source_roi: CaseLongformPreservationRoi,
  output_roi: CaseLongformPreservationRoi,
  overlay_ids: z.array(id),
});
export const CaseLongformPreservationPlan = z.strictObject({
  schema_version: z.literal('case-longform-preservation-plan-v1'),
  kind: z.literal('preservation_plan'),
  job_id: z.string(),
  participant_id: participant,
  graph_sha256: Hash,
  source_set_sha256: Hash,
  policy_sha256: Hash,
  source_segment_map_sha256: Hash,
  redaction_map_sha256: Hash,
  caption_track_sha256: Hash,
  regions: z.array(planRegion).min(1),
});
export const CaseLongformPreservationPlanAuthoritySchema =
  CaseLongformSemanticAuthoritySchema.extend({
    schema_version: z.literal('case-longform-preservation-plan-authority-v5a'),
    artifacts: CaseLongformSemanticAuthoritySchema.shape.artifacts.extend({
      preservation_policy_receipt: Ref,
      preservation_plan: Ref,
    }),
    v4_status: CaseLongformSemanticAuthoritySchema.shape.status,
    status: z.literal('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS'),
  });
export type CaseLongformPreservationPlanAuthority = z.infer<
  typeof CaseLongformPreservationPlanAuthoritySchema
>;
