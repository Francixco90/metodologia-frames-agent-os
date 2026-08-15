import {z} from 'zod';

import {CaseLongformGraphAuthoritySchema} from './case-longform-graph-evidence.ts';
import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CASE_LONGFORM_ROLES} from './case-longform-graph-structure.ts';

const role = z.enum(CASE_LONGFORM_ROLES);
const segment = z.strictObject({
  id: z.string().min(1),
  node_id: z.string().min(1),
  role,
  source_sha256: Hash,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  output_start_frame: z.number().int().nonnegative(),
  output_end_frame: z.number().int().nonnegative(),
  transform: z.literal('PASSTHROUGH'),
});
export const CaseLongformSourceSegmentMap = z.strictObject({
  schema_version: z.literal('case-longform-source-segment-map-v1'),
  kind: z.literal('source_segment_map'),
  job_id: z.string(),
  graph_sha256: Hash,
  source_set_sha256: Hash,
  segments: z.array(segment).min(5),
});
export const CaseLongformTransformOrder = z.strictObject({
  schema_version: z.literal('case-longform-transform-order-v1'),
  kind: z.literal('transform_order'),
  job_id: z.string(),
  graph_sha256: Hash,
  order: z.tuple([
    z.literal('timeline_cut'),
    z.literal('audio_identifier_replace'),
    z.literal('visual_mask_source_space'),
    z.literal('scale_1920x1080'),
    z.literal('compose_single_caption_track'),
    z.literal('encode'),
  ]),
});
export const CaseLongformSemanticPolicyReceipt = z.strictObject({
  schema_version: z.literal('case-longform-semantic-policy-receipt-v1'),
  kind: z.literal('semantic_policy_receipt'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  actor_id: z.string().min(1),
  participants: z.tuple([
    z.strictObject({
      participant_id: z.literal('danilo'),
      public_name: z.literal('Danilo Cardona Estrada'),
      required_statuses: z.tuple([z.literal('recognized'), z.literal('appointed')]),
      forbidden_statuses: z.tuple([z.literal('certified')]),
      certificate_frames_zero: z.literal(true),
    }),
    z.strictObject({
      participant_id: z.literal('alejandra'),
      public_name: z.literal('Alejandra Calderón'),
      maximum_status: z.literal('recognized'),
    }),
    z.strictObject({
      participant_id: z.literal('natalia'),
      public_name: z.literal('Natalia Andrade'),
      exact_status: z.literal('in_progress'),
    }),
  ]),
});
export const CaseLongformPrerenderAuthorityRefs = z.strictObject({
  source_segment_map: Ref,
  transform_order: Ref,
  semantic_policy_receipt: Ref,
});
export const CaseLongformPrerenderGraphAuthoritySchema = CaseLongformGraphAuthoritySchema.extend({
  schema_version: z.literal('case-longform-prerender-graph-authority-v2'),
  artifacts: CaseLongformGraphAuthoritySchema.shape.artifacts.merge(
    CaseLongformPrerenderAuthorityRefs,
  ),
  status: z.literal('BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS'),
});
export type CaseLongformPrerenderGraphAuthority = z.infer<
  typeof CaseLongformPrerenderGraphAuthoritySchema
>;
