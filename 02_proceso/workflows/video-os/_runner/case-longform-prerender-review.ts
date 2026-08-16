import type {z} from 'zod';

import {
  compactCaseLongformAudioToken,
  deriveCaseLongformAudioMatches,
  deriveCaseLongformAudioOperations,
  validateCaseLongformAudioTranscript,
} from './case-longform-audio-derivation.ts';
import {
  assertCaseLongformAudioMaterialStartAlignment,
  deriveCaseLongformPcmDonorEvidenceFromMaterial,
  deriveCaseLongformPcmDonorEvidence,
} from './case-longform-audio-pcm.ts';
import {readCaseLongformMaterial} from './case-longform-media.ts';
import {CaseLongformSourceSet} from './case-longform-graph-structure.ts';
import {
  CaseLongformPrerenderGraphAuthoritySchema,
  CaseLongformSemanticPolicyReceipt,
  CaseLongformSourceSegmentMap,
} from './case-longform-prerender-authority.ts';
import {assertCaseLongformPrerenderGraphAuthority} from './case-longform-prerender.ts';
import {
  CaseLongformAudioDictionaryReceipt,
  CaseLongformAudioRedactionMap,
  CaseLongformAudioTranscript,
  CaseLongformPrerenderReviewAuthoritySchema,
  CaseLongformSemanticPolicyReceiptV2,
  type CaseLongformPrerenderReviewAuthority,
} from './case-longform-prerender-review-authority.ts';

type Options = Parameters<typeof assertCaseLongformPrerenderGraphAuthority>[1];
type ReviewOptions = Options;
type Ref = {ref: string; sha256: string; bytes: number};
type Segments = z.infer<typeof CaseLongformSourceSegmentMap>;
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const baseProjection = (contract: CaseLongformPrerenderReviewAuthority) => ({
  schema_version: 'case-longform-prerender-graph-authority-v2' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformPrerenderGraphAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  status: 'BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS' as const,
});
export {
  deriveCaseLongformAudioMatches,
  deriveCaseLongformAudioOperations,
  deriveCaseLongformPcmDonorEvidence,
};
const validateRoomToneDonors = (
  audio: z.infer<typeof CaseLongformAudioRedactionMap>,
  sourceSet: z.infer<typeof CaseLongformSourceSet>,
  segments: Segments,
  options: ReviewOptions,
): void => {
  for (const operation of audio.operations) {
    if (operation.treatment !== 'ROOM_TONE_IDENTIFIER') continue;
    const source = sourceSet.sources.find(({role}) => role === operation.role)!;
    const donor = operation.donor;
    const donorFrames = donor.source_end_frame - donor.source_start_frame + 1;
    const targetFrames = operation.source_end_frame - operation.source_start_frame + 1;
    const included = segments.segments.filter(
      (item) =>
        item.role === operation.role &&
        item.source_start_frame <= donor.source_start_frame &&
        item.source_end_frame >= donor.source_end_frame,
    );
    if (
      donor.source_sha256 !== operation.source_sha256 ||
      donor.source_sha256 !== source.media.sha256 ||
      !same(donor.media, source.media) ||
      donor.source_start_frame > donor.source_end_frame ||
      donorFrames !== targetFrames ||
      included.length !== 1 ||
      (donor.source_start_frame <= operation.source_end_frame &&
        donor.source_end_frame >= operation.source_start_frame)
    )
      throw new Error('VIDEO-OS-CASE-AUDIO-DONOR-AUTHORITY-DRIFT');
    const expected = deriveCaseLongformPcmDonorEvidenceFromMaterial(
      options.projectRoot,
      source.media,
      donor.source_start_frame,
      donor.source_end_frame,
      options.mediaToolAuthority,
      options.mediaSnapshotHooks,
    );
    if (!same(donor, expected)) throw new Error('VIDEO-OS-CASE-AUDIO-DONOR-MATERIAL-DRIFT');
  }
};
export const assertCaseLongformPrerenderReviewAuthority = (
  raw: unknown,
  options: ReviewOptions,
): CaseLongformPrerenderReviewAuthority => {
  const contract = CaseLongformPrerenderReviewAuthoritySchema.parse(raw);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-PRERENDER-REVIEW-REF-ALIAS');
  assertCaseLongformPrerenderGraphAuthority(baseProjection(contract), options);
  const a = contract.artifacts;
  const sourceSet = material(options.projectRoot, a.source_set, CaseLongformSourceSet);
  const segments = material(
    options.projectRoot,
    a.source_segment_map,
    CaseLongformSourceSegmentMap,
  );
  const oldPolicy = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt,
    CaseLongformSemanticPolicyReceipt,
  );
  const dictionary = material(
    options.trustPolicy.authorityRoot,
    a.audio_dictionary_receipt,
    CaseLongformAudioDictionaryReceipt,
  );
  const policy = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt_v2,
    CaseLongformSemanticPolicyReceiptV2,
  );
  const transcript = material(options.projectRoot, a.audio_transcript, CaseLongformAudioTranscript);
  const audio = material(options.projectRoot, a.audio_redaction_map, CaseLongformAudioRedactionMap);
  if (
    dictionary.job_id !== contract.job_id ||
    dictionary.plan_sha256 !== a.plan.sha256 ||
    dictionary.source_set_sha256 !== contract.source_set_sha256 ||
    dictionary.actor_id !== oldPolicy.actor_id ||
    policy.job_id !== contract.job_id ||
    policy.plan_sha256 !== a.plan.sha256 ||
    policy.source_set_sha256 !== contract.source_set_sha256 ||
    policy.previous_policy_sha256 !== a.semantic_policy_receipt.sha256 ||
    policy.audio_dictionary_sha256 !== a.audio_dictionary_receipt.sha256 ||
    policy.actor_id !== oldPolicy.actor_id ||
    !same(policy.participants, oldPolicy.participants)
  )
    throw new Error('VIDEO-OS-CASE-PRERENDER-REVIEW-POLICY-DRIFT');
  const dictionaryIds = dictionary.entries.map(({dictionary_id}) => dictionary_id);
  const variants = dictionary.entries.flatMap(({variants}) =>
    variants.map(compactCaseLongformAudioToken),
  );
  if (
    variants.includes('') ||
    new Set(dictionaryIds).size !== dictionaryIds.length ||
    new Set(variants).size !== variants.length
  )
    throw new Error('VIDEO-OS-CASE-AUDIO-DICTIONARY-DUPLICATE');
  if (
    transcript.job_id !== contract.job_id ||
    transcript.source_set_sha256 !== contract.source_set_sha256
  )
    throw new Error('VIDEO-OS-CASE-TRANSCRIPT-AUTHORITY-DRIFT');
  const sourceFrameCounts = new Map(
    sourceSet.sources.map((source) => {
      const freeze = JSON.parse(
        readCaseLongformMaterial(options.projectRoot, source.freeze_receipt).bytes.toString('utf8'),
      ) as {measurements: {frame_count: number}};
      return [source.role, freeze.measurements.frame_count] as const;
    }),
  );
  validateCaseLongformAudioTranscript(transcript, sourceSet, sourceFrameCounts);
  const matches = deriveCaseLongformAudioMatches(transcript, dictionary);
  const matchedRoles = new Set(matches.map(({role}) => role));
  sourceSet.sources
    .filter(({role}) => matchedRoles.has(role))
    .forEach(({media}) =>
      assertCaseLongformAudioMaterialStartAlignment(
        options.projectRoot,
        media,
        options.mediaToolAuthority,
        options.mediaSnapshotHooks,
      ),
    );
  const operationCores = audio.operations.map((operation) => {
    if (operation.treatment !== 'ROOM_TONE_IDENTIFIER') return operation;
    return Object.fromEntries(Object.entries(operation).filter(([key]) => key !== 'donor'));
  });
  const matchIds = audio.matches.map(({match_id}) => match_id);
  const operationIds = audio.operations.map(({operation_id}) => operation_id);
  if (
    new Set(matchIds).size !== matchIds.length ||
    new Set(operationIds).size !== operationIds.length ||
    new Set(matches.map(({dictionary_id}) => dictionary_id)).size !== dictionary.entries.length ||
    !same(audio.matches, matches) ||
    audio.job_id !== contract.job_id ||
    audio.graph_sha256 !== a.operation_graph.sha256 ||
    audio.source_set_sha256 !== contract.source_set_sha256 ||
    audio.dictionary_sha256 !== a.audio_dictionary_receipt.sha256 ||
    audio.transcript_sha256 !== a.audio_transcript.sha256 ||
    audio.source_segment_map_sha256 !== a.source_segment_map.sha256 ||
    !same(operationCores, deriveCaseLongformAudioOperations(matches, dictionary, segments))
  )
    throw new Error('VIDEO-OS-CASE-AUDIO-REDACTION-DRIFT');
  validateRoomToneDonors(audio, sourceSet, segments, options);
  return contract;
};
