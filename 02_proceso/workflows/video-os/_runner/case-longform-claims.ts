import type {z} from 'zod';

import {compactCaseLongformAudioToken} from './case-longform-audio-derivation.ts';
import type {
  CaseLongformCaptionTrack,
  CaseLongformSourceSet,
} from './case-longform-graph-structure.ts';
import type {CaseLongformSourceSegmentMap} from './case-longform-prerender-authority.ts';
import type {CaseLongformAudioTranscript} from './case-longform-prerender-review-authority.ts';
import type {
  CaseLongformSemanticClaimMap,
  CaseLongformSemanticPolicyReceiptV3,
} from './case-longform-semantic-authority.ts';

type Claims = z.infer<typeof CaseLongformSemanticClaimMap>;
type Participant = z.infer<typeof CaseLongformSemanticPolicyReceiptV3>['participants'][number];
type Sources = z.infer<typeof CaseLongformSourceSet>;
type Segments = z.infer<typeof CaseLongformSourceSegmentMap>;
type Transcript = z.infer<typeof CaseLongformAudioTranscript>;
type Captions = z.infer<typeof CaseLongformCaptionTrack>;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
// prettier-ignore
export const CASE_LONGFORM_POLICY_V3_PARTICIPANTS = [
  {participant_id: 'danilo', public_name: 'Danilo Cardona Estrada', claim_requirements: [
    {status: 'recognized', required: true, allowed_modalities: ['recognition_declaration'], authorized_presentation_variants: ['reconozco su proceso'], authorized_speakers: ['Germán'], presentation_mode: 'SOURCE_AUDIOVISUAL_ONLY', presentation: 'recognition', allowed_roles: ['body', 'closure']},
    {status: 'appointed', required: true, allowed_modalities: ['appointment_declaration'], authorized_presentation_variants: ['queda nombrado'], authorized_speakers: ['Germán'], presentation_mode: 'SOURCE_AUDIOVISUAL_ONLY', presentation: 'appointment', allowed_roles: ['closure']}]},
  {participant_id: 'alejandra', public_name: 'Alejandra Calderón', claim_requirements: [
    {status: 'recognized', required: false, allowed_modalities: ['recognition_declaration'], authorized_presentation_variants: ['reconozco su avance'], authorized_speakers: ['Javier', 'Germán'], presentation_mode: 'SOURCE_AUDIOVISUAL_ONLY', presentation: 'recognition', allowed_roles: ['body', 'closure']}]},
  {participant_id: 'natalia', public_name: 'Natalia Andrade', claim_requirements: [
    {status: 'in_progress', required: true, allowed_modalities: ['process_demonstration'], authorized_presentation_variants: ['En progreso'], authorized_speakers: [], presentation_mode: 'EDITORIAL_LABEL', presentation: 'progress', allowed_roles: ['body']}]},
] as const;
const covers = (
  values: Array<{start_frame: number; end_frame: number}>,
  start: number,
  end: number,
): boolean => {
  let cursor = start;
  for (const value of [...values].sort((a, b) => a.start_frame - b.start_frame)) {
    if (value.end_frame < cursor) continue;
    if (value.start_frame > cursor) return false;
    cursor = Math.max(cursor, value.end_frame + 1);
  }
  return cursor > end;
};

export const assertCaseLongformClaims = (
  claims: Claims,
  selected: Participant,
  context: {
    sourceSet: Sources;
    segments: Segments;
    transcript: Transcript;
    captions: Captions;
  },
): 'PRE_RENDER_BLOCKED' | 'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS' => {
  const claimIds = claims.claims.map(({claim_id}) => claim_id);
  const claimStatuses = claims.claims.map(({output_status}) => output_status);
  if (
    new Set(claimIds).size !== claimIds.length ||
    new Set(claimStatuses).size !== claimStatuses.length
  )
    throw new Error('VIDEO-OS-CASE-SEMANTIC-CLAIM-DUPLICATE');
  for (const claim of claims.claims) {
    const requirement = selected.claim_requirements.find(
      ({status}) => status === claim.output_status,
    );
    const source = context.sourceSet.sources.find(({role}) => role === claim.source_role)!;
    const segment = context.segments.segments.filter(
      (item) =>
        item.role === claim.source_role &&
        item.source_start_frame <= claim.source_start_frame &&
        item.source_end_frame >= claim.source_end_frame,
    );
    const transcriptSource = context.transcript.sources.find(
      ({role}) => role === claim.source_role,
    )!;
    const transcriptValues = transcriptSource.segments.filter(({id}) =>
      claim.transcript_segment_ids.includes(id),
    );
    const captionValues = context.captions.cues.filter(({id}) =>
      claim.caption_cue_ids.includes(id),
    );
    const display = compactCaseLongformAudioToken(claim.display_text);
    const authorized =
      requirement?.authorized_presentation_variants.map(compactCaseLongformAudioToken) ?? [];
    const speakerAllowed =
      claim.evidence.kind === 'process_evidence' ||
      requirement?.authorized_speakers.includes(claim.evidence.speaker);
    const expectedOutput =
      segment.length === 1
        ? segment[0]!.output_start_frame + claim.source_start_frame - segment[0]!.source_start_frame
        : -1;
    if (
      !requirement ||
      !requirement.allowed_modalities.includes(claim.evidence.modality) ||
      !authorized.includes(display) ||
      !speakerAllowed ||
      requirement.presentation_mode !== claim.presentation_mode ||
      requirement.presentation !== claim.presentation ||
      !requirement.allowed_roles.includes(claim.source_role) ||
      source.media.sha256 !== claim.source_sha256 ||
      claim.source_start_frame > claim.source_end_frame ||
      claim.output_start_frame !== expectedOutput ||
      claim.output_end_frame !==
        expectedOutput + claim.source_end_frame - claim.source_start_frame ||
      new Set(claim.transcript_segment_ids).size !== claim.transcript_segment_ids.length ||
      transcriptValues.length !== claim.transcript_segment_ids.length ||
      !covers(transcriptValues, claim.source_start_frame, claim.source_end_frame) ||
      new Set(claim.caption_cue_ids).size !== claim.caption_cue_ids.length ||
      captionValues.length !== claim.caption_cue_ids.length ||
      !covers(captionValues, claim.output_start_frame, claim.output_end_frame) ||
      (claim.presentation_mode === 'SOURCE_AUDIOVISUAL_ONLY' &&
        (!transcriptValues.some(({text}) =>
          compactCaseLongformAudioToken(text).includes(display),
        ) ||
          !captionValues.some(({text}) => compactCaseLongformAudioToken(text).includes(display))))
    )
      throw new Error('VIDEO-OS-CASE-SEMANTIC-CLAIM-EVIDENCE-DRIFT');
  }
  const expectedGaps = selected.claim_requirements
    .filter(({required, status}) => required && !claimStatuses.includes(status))
    .map(({status}) => ({
      gap_id: `${selected.participant_id}-${status}-missing`,
      status,
      reason:
        status === 'appointed'
          ? ('MISSING_APPOINTMENT_AUDIOVISUAL_DECLARATION' as const)
          : ('MISSING_REQUIRED_AUDIOVISUAL_EVIDENCE' as const),
    }));
  if (!same(claims.operational_gaps, expectedGaps))
    throw new Error('VIDEO-OS-CASE-SEMANTIC-GAP-DRIFT');
  return expectedGaps.length
    ? 'PRE_RENDER_BLOCKED'
    : 'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS';
};
