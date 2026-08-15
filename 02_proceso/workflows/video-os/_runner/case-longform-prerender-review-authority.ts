import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CASE_LONGFORM_ROLES} from './case-longform-graph-structure.ts';
import {
  CaseLongformPrerenderGraphAuthoritySchema,
  CaseLongformSemanticPolicyReceipt,
} from './case-longform-prerender-authority.ts';

const role = z.enum(CASE_LONGFORM_ROLES);
const portableId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const span = {
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
};
const participantPolicy = CaseLongformSemanticPolicyReceipt.shape.participants;

export const CaseLongformAudioDictionaryReceipt = z.strictObject({
  schema_version: z.literal('case-longform-audio-dictionary-receipt-v1'),
  kind: z.literal('audio_dictionary_receipt'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  actor_id: z.string().min(1),
  entries: z
    .array(
      z.strictObject({
        dictionary_id: portableId,
        variants: z.array(z.string().min(1)).min(1),
        required_treatment: z.enum(['CUT_CLAUSE', 'ROOM_TONE_IDENTIFIER']),
        caption_replacement: z.enum(['la empresa', '[URL oculta]']),
      }),
    )
    .min(1),
});
export const CaseLongformSemanticPolicyReceiptV2 = z.strictObject({
  schema_version: z.literal('case-longform-semantic-policy-receipt-v2'),
  kind: z.literal('semantic_policy_receipt_v2'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  previous_policy_sha256: Hash,
  audio_dictionary_sha256: Hash,
  actor_id: z.string().min(1),
  participants: participantPolicy,
});
const transcriptSegment = z.discriminatedUnion('kind', [
  z.strictObject({
    id: portableId,
    kind: z.literal('speech'),
    ...span,
    text: z.string().min(1),
  }),
  z.strictObject({id: portableId, kind: z.literal('silence'), ...span, text: z.literal('')}),
]);
const transcriptSource = (value: (typeof CASE_LONGFORM_ROLES)[number]) =>
  z.strictObject({
    role: z.literal(value),
    source_sha256: Hash,
    media: Ref,
    audio_stream_index: z.literal(0),
    frame_count: z.number().int().positive(),
    segments: z.array(transcriptSegment).min(1),
  });
export const CaseLongformAudioTranscript = z.strictObject({
  schema_version: z.literal('case-longform-audio-transcript-v1'),
  kind: z.literal('audio_transcript'),
  job_id: z.string(),
  source_set_sha256: Hash,
  fps: z.literal(24),
  sources: z.tuple(
    CASE_LONGFORM_ROLES.map(transcriptSource) as [
      ReturnType<typeof transcriptSource>,
      ReturnType<typeof transcriptSource>,
      ReturnType<typeof transcriptSource>,
      ReturnType<typeof transcriptSource>,
      ReturnType<typeof transcriptSource>,
    ],
  ),
});
export const CaseLongformAudioMatch = z.strictObject({
  match_id: z.string().min(1),
  dictionary_id: portableId,
  role,
  source_sha256: Hash,
  transcript_segment_id: portableId,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  variant: z.string().min(1),
  occurrence: z.literal(0),
});
const donor = z.strictObject({
  source_sha256: Hash,
  media: Ref,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  audio_stream_index: z.literal(0),
  sample_rate: z.literal(48_000),
  channels: z.literal(1),
  sample_format: z.literal('s16le'),
  pcm_sha256: Hash,
  pcm_bytes: z.number().int().positive(),
  duration_samples: z.number().int().positive(),
  rms_dbfs: z.number().finite(),
  peak_dbfs: z.number().finite(),
  speech_free_review: z.literal('PENDING_EXTERNAL_REVIEW'),
});
const operationBase = {
  operation_id: z.string().min(1),
  match_id: z.string().min(1),
  dictionary_id: portableId,
  role,
  source_sha256: Hash,
  source_start_frame: z.number().int().nonnegative(),
  source_end_frame: z.number().int().nonnegative(),
  caption_replacement: z.enum(['la empresa', '[URL oculta]']),
};
export const CaseLongformAudioRedactionMap = z.strictObject({
  schema_version: z.literal('case-longform-audio-redaction-map-v1'),
  kind: z.literal('audio_redaction_map'),
  job_id: z.string(),
  graph_sha256: Hash,
  source_set_sha256: Hash,
  dictionary_sha256: Hash,
  transcript_sha256: Hash,
  source_segment_map_sha256: Hash,
  matches: z.array(CaseLongformAudioMatch).min(1),
  operations: z
    .array(
      z.discriminatedUnion('treatment', [
        z.strictObject({...operationBase, treatment: z.literal('CUT_CLAUSE')}),
        z.strictObject({
          ...operationBase,
          treatment: z.literal('ROOM_TONE_IDENTIFIER'),
          output_start_frame: z.number().int().nonnegative(),
          output_end_frame: z.number().int().nonnegative(),
          donor,
        }),
      ]),
    )
    .min(1),
});
export const CaseLongformPrerenderReviewRefs = z.strictObject({
  semantic_policy_receipt_v2: Ref,
  audio_dictionary_receipt: Ref,
  audio_transcript: Ref,
  audio_redaction_map: Ref,
});
export const CaseLongformPrerenderReviewAuthoritySchema =
  CaseLongformPrerenderGraphAuthoritySchema.extend({
    schema_version: z.literal('case-longform-prerender-review-authority-v3'),
    artifacts: CaseLongformPrerenderGraphAuthoritySchema.shape.artifacts.merge(
      CaseLongformPrerenderReviewRefs,
    ),
    status: z.literal('BLOCKED_PENDING_TRANSCRIPT_SEMANTIC_PRESERVATION_REVIEW_CONTRACTS'),
  });
export type CaseLongformPrerenderReviewAuthority = z.infer<
  typeof CaseLongformPrerenderReviewAuthoritySchema
>;
