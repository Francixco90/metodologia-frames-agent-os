import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CASE_LONGFORM_ROLES} from './case-longform-graph-structure.ts';

export type CaseLongformRoi = {x: number; y: number; width: number; height: number};
const point = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['base', 'layout', 'scroll', 'fade', 'boundary', 'sensitive']),
  subject_id: z.string().min(1),
  region_id: z.string().min(1).optional(),
  mask_id: z.string().min(1).optional(),
  roi: z
    .strictObject({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  frame: z.number().int().nonnegative(),
  frame_sha256: Hash,
});
export const CaseLongformObservedCoverage = z.strictObject({
  schema_version: z.literal('case-longform-observed-coverage-v1'),
  kind: z.literal('preview_observed_coverage'),
  job_id: z.string(),
  graph_sha256: Hash,
  temporal_map_sha256: Hash,
  redaction_map_sha256: Hash,
  preview_sha256: Hash,
  preview_profile_sha256: Hash,
  points: z.array(point).min(1),
});
export const CaseLongformSharedPreviewConfig = z.strictObject({
  schema_version: z.literal('case-longform-shared-preview-config-v1'),
  kind: z.literal('shared_preview_config'),
  job_id: z.string(),
  graph_authority_sha256: Hash,
  graph_sha256: Hash,
  runner_sha256: Hash,
  compiler_sha256: Hash,
  temporal_map_sha256: Hash,
  redaction_map_sha256: Hash,
  caption_track_sha256: Hash,
  caption_cleanup_sha256: Hash,
  mask_ids: z.array(z.string().min(1)).min(1),
});
const profileBase = {
  job_id: z.string(),
  graph_sha256: Hash,
  shared_config_sha256: Hash,
  caption_track_sha256: Hash,
  mask_ids: z.array(z.string().min(1)).min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  target_bitrate_kbps: z.number().int().positive(),
  range: z.strictObject({
    start_frame: z.number().int().nonnegative(),
    end_frame: z.number().int().nonnegative(),
  }),
  allowed_deltas: z.tuple([z.literal('bitrate')]),
};
export const CaseLongformPreviewProfile = z.strictObject({
  schema_version: z.literal('case-longform-preview-profile-v1'),
  kind: z.literal('preview_observed_profile'),
  ...profileBase,
  preview_media: Ref,
});
export const CaseLongformPlannedFullProfile = z.strictObject({
  schema_version: z.literal('case-longform-planned-full-profile-v1'),
  kind: z.literal('planned_full_profile'),
  ...profileBase,
  preview_profile_sha256: Hash,
});
const boundaryNode = (role: (typeof CASE_LONGFORM_ROLES)[number]) =>
  z.strictObject({
    role: z.literal(role),
    source_sha256: Hash,
    start_frame: z.number().int().nonnegative(),
    start_frame_sha256: Hash,
    end_frame: z.number().int().nonnegative(),
    end_frame_sha256: Hash,
  });
export const CaseLongformPreviewBoundaryObservation = z.strictObject({
  schema_version: z.literal('case-longform-preview-boundary-observation-v1'),
  kind: z.literal('preview_boundary_observation'),
  job_id: z.string(),
  graph_sha256: Hash,
  preview_sha256: Hash,
  preview_profile_sha256: Hash,
  nodes: z.tuple(
    CASE_LONGFORM_ROLES.map((role) => boundaryNode(role)) as [
      ReturnType<typeof boundaryNode>,
      ReturnType<typeof boundaryNode>,
      ReturnType<typeof boundaryNode>,
      ReturnType<typeof boundaryNode>,
      ReturnType<typeof boundaryNode>,
    ],
  ),
});
export const CaseLongformPreviewEvidenceSchema = z.strictObject({
  schema_version: z.literal('case-longform-preview-evidence-v1'),
  job_id: z.string(),
  artifacts: z.strictObject({
    graph_authority: Ref,
    shared_config: Ref,
    preview_profile: Ref,
    planned_full_profile: Ref,
    observed_coverage: Ref,
    preview_boundary_observation: Ref,
  }),
  status: z.literal('BLOCKED_PENDING_EXECUTION_AND_POSTRENDER_CONTRACTS'),
});
export type CaseLongformPreviewEvidence = z.infer<typeof CaseLongformPreviewEvidenceSchema>;
