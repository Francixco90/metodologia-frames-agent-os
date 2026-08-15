import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CASE_LONGFORM_ROLES} from './case-longform-graph-structure.ts';
import {CaseLongformPrerenderReviewAuthoritySchema} from './case-longform-prerender-review-authority.ts';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const role = z.enum(CASE_LONGFORM_ROLES);
const participant = z.enum(['danilo', 'alejandra', 'natalia']);
const status = z.enum(['recognized', 'appointed', 'certified', 'in_progress']);
const modality = z.enum([
  'recognition_declaration',
  'appointment_declaration',
  'process_demonstration',
]);
const requirement = z.strictObject({
  status,
  required: z.boolean(),
  allowed_modalities: z.array(modality).min(1),
  authorized_presentation_variants: z.array(z.string().min(1)).min(1),
  authorized_speakers: z.array(z.string().min(1)),
  presentation_mode: z.enum(['SOURCE_AUDIOVISUAL_ONLY', 'EDITORIAL_LABEL']),
  presentation: z.enum(['recognition', 'appointment', 'progress']),
  allowed_roles: z.array(role).min(1),
});
export const CaseLongformSemanticPolicyReceiptV3 = z.strictObject({
  schema_version: z.literal('case-longform-semantic-policy-receipt-v3'),
  kind: z.literal('semantic_policy_receipt_v3'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  previous_policy_sha256: Hash,
  actor_id: z.string().min(1),
  participants: z
    .array(
      z.strictObject({
        participant_id: participant,
        public_name: z.string().min(1),
        claim_requirements: z.array(requirement).min(1),
      }),
    )
    .length(3),
});
const evidence = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('audiovisual_declaration'),
    modality: z.enum(['recognition_declaration', 'appointment_declaration']),
    speaker: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal('process_evidence'),
    modality: z.literal('process_demonstration'),
  }),
]);
const claim = z.strictObject({
  claim_id: id,
  output_status: status,
  presentation: z.enum(['recognition', 'appointment', 'progress']),
  display_text: z.string().min(1),
  presentation_mode: z.enum(['SOURCE_AUDIOVISUAL_ONLY', 'EDITORIAL_LABEL']),
  source_role: role,
  source_sha256: Hash,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  output_start_frame: z.number().int().nonnegative(),
  output_end_frame: z.number().int().nonnegative(),
  transcript_segment_ids: z.array(id).min(1),
  caption_cue_ids: z.array(id).min(1),
  evidence,
});
export const CaseLongformSemanticClaimMap = z.strictObject({
  schema_version: z.literal('case-longform-semantic-claim-map-v1'),
  kind: z.literal('semantic_claim_map'),
  job_id: z.string(),
  participant_id: participant,
  public_name: z.string().min(1),
  graph_sha256: Hash,
  source_set_sha256: Hash,
  policy_sha256: Hash,
  source_segment_map_sha256: Hash,
  transcript_sha256: Hash,
  caption_track_sha256: Hash,
  claims: z.array(claim),
  operational_gaps: z.array(
    z.strictObject({
      gap_id: id,
      status,
      reason: z.enum([
        'MISSING_REQUIRED_AUDIOVISUAL_EVIDENCE',
        'MISSING_APPOINTMENT_AUDIOVISUAL_DECLARATION',
      ]),
    }),
  ),
});
export const CaseLongformSemanticAuthoritySchema =
  CaseLongformPrerenderReviewAuthoritySchema.extend({
    schema_version: z.literal('case-longform-semantic-authority-v4'),
    artifacts: CaseLongformPrerenderReviewAuthoritySchema.shape.artifacts.extend({
      semantic_policy_receipt_v3: Ref,
      semantic_claim_map: Ref,
    }),
    status: z.enum([
      'PRE_RENDER_BLOCKED',
      'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS',
    ]),
  });
export type CaseLongformSemanticAuthority = z.infer<typeof CaseLongformSemanticAuthoritySchema>;
