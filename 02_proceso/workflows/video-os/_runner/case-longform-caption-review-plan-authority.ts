import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CaseLongformCaptionExecutionAuthoritySchema} from './case-longform-caption-execution-authority.ts';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
export const CASE_LONGFORM_CAPTION_REVIEW_CHECKS = [
  'TEXT_FIDELITY',
  'FRAME_TIMING',
  'LAYOUT_GEOMETRY',
  'SINGLE_LAYER',
  'BOUNDARY_CONTINUITY',
] as const;
const reviewer = (role: 'CAPTION_VERIFIER' | 'GUARDIAN') =>
  z.strictObject({role: z.literal(role), actor_id: id});

export const CaseLongformCaptionReviewTask = z.strictObject({
  task_id: id,
  sequence: z.number().int().nonnegative(),
  ledger_sequence: z.number().int().nonnegative(),
  check: z.enum(CASE_LONGFORM_CAPTION_REVIEW_CHECKS),
  caption_entry_sha256: Hash,
  cue_id: id,
  layout_id: id,
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
  text_sha256: Hash,
  font_sha256: Hash,
  geometry: z.strictObject({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});
export const CaseLongformCaptionExternalReviewPlan = z.strictObject({
  schema_version: z.literal('case-longform-caption-external-review-plan-v1'),
  kind: z.literal('caption_external_review_plan'),
  plan_scope: z.literal('PLANNING_ONLY_NO_OUTCOME'),
  actor_id: id,
  job_id: z.string().min(1),
  source_set_sha256: Hash,
  graph_sha256: Hash,
  temporal_map_sha256: Hash,
  caption_track_sha256: Hash,
  caption_cleanup_sha256: Hash,
  placement_plan_sha256: Hash,
  execution_ledger_sha256: Hash,
  layout_authority_sha256: Hash,
  compositor_authority_sha256: Hash,
  caption_verifier_authority_sha256: Hash,
  reviewers: z.tuple([reviewer('CAPTION_VERIFIER'), reviewer('GUARDIAN')]),
  checks: z.tuple([
    z.literal('TEXT_FIDELITY'),
    z.literal('FRAME_TIMING'),
    z.literal('LAYOUT_GEOMETRY'),
    z.literal('SINGLE_LAYER'),
    z.literal('BOUNDARY_CONTINUITY'),
  ]),
  tasks: z.array(CaseLongformCaptionReviewTask).min(CASE_LONGFORM_CAPTION_REVIEW_CHECKS.length),
});
export const CaseLongformCaptionReviewPlanContractSchema =
  CaseLongformCaptionExecutionAuthoritySchema.extend({
    schema_version: z.literal('case-longform-caption-review-plan-contract-v7c0'),
    artifacts: CaseLongformCaptionExecutionAuthoritySchema.shape.artifacts.extend({
      caption_external_review_plan: Ref,
    }),
    planned_review_authority_root: z.string().min(1),
    review_actors: z.strictObject({planner: id, caption_verifier: id, guardian: id}),
    v7b_status: CaseLongformCaptionExecutionAuthoritySchema.shape.status,
    coverage_gap: z.literal('V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED'),
    status: z.enum([
      'PRE_RENDER_BLOCKED',
      'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS',
    ]),
  });
export type CaseLongformCaptionReviewPlanContract = z.infer<
  typeof CaseLongformCaptionReviewPlanContractSchema
>;
export type CaseLongformCaptionExternalReviewPlanValue = z.infer<
  typeof CaseLongformCaptionExternalReviewPlan
>;
export const caseLongformCaptionReviewPlanStatus = (
  v4Status: CaseLongformCaptionReviewPlanContract['v4_status'],
): CaseLongformCaptionReviewPlanContract['status'] =>
  v4Status === 'PRE_RENDER_BLOCKED'
    ? 'PRE_RENDER_BLOCKED'
    : 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
