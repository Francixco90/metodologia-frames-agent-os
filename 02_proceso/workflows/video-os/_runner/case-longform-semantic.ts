import type {z} from 'zod';

import {
  assertCaseLongformClaims,
  CASE_LONGFORM_POLICY_V3_PARTICIPANTS,
} from './case-longform-claims.ts';
import {readCaseLongformMaterial} from './case-longform-media.ts';
import {CaseLongformCaptionTrack, CaseLongformSourceSet} from './case-longform-graph-structure.ts';
import {CaseLongformSourceSegmentMap} from './case-longform-prerender-authority.ts';
import {assertCaseLongformPrerenderReviewAuthority} from './case-longform-prerender-review.ts';
import {
  CaseLongformAudioTranscript,
  CaseLongformPrerenderReviewAuthoritySchema,
  CaseLongformSemanticPolicyReceiptV2,
} from './case-longform-prerender-review-authority.ts';
import {
  CaseLongformSemanticAuthoritySchema,
  CaseLongformSemanticClaimMap,
  CaseLongformSemanticPolicyReceiptV3,
  type CaseLongformSemanticAuthority,
} from './case-longform-semantic-authority.ts';

type Options = Parameters<typeof assertCaseLongformPrerenderReviewAuthority>[1];
type Ref = {ref: string; sha256: string; bytes: number};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const reviewProjection = (contract: CaseLongformSemanticAuthority) => ({
  schema_version: 'case-longform-prerender-review-authority-v3' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformPrerenderReviewAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  status: 'BLOCKED_PENDING_TRANSCRIPT_SEMANTIC_PRESERVATION_REVIEW_CONTRACTS' as const,
});

export const assertCaseLongformSemanticAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformSemanticAuthority => {
  const contract = CaseLongformSemanticAuthoritySchema.parse(raw);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-SEMANTIC-REF-ALIAS');
  assertCaseLongformPrerenderReviewAuthority(reviewProjection(contract), options);
  const a = contract.artifacts;
  const policyV2 = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt_v2,
    CaseLongformSemanticPolicyReceiptV2,
  );
  const policy = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt_v3,
    CaseLongformSemanticPolicyReceiptV3,
  );
  const claims = material(options.projectRoot, a.semantic_claim_map, CaseLongformSemanticClaimMap);
  const sourceSet = material(options.projectRoot, a.source_set, CaseLongformSourceSet);
  const segments = material(
    options.projectRoot,
    a.source_segment_map,
    CaseLongformSourceSegmentMap,
  );
  const transcript = material(options.projectRoot, a.audio_transcript, CaseLongformAudioTranscript);
  const captions = material(options.projectRoot, a.caption_track, CaseLongformCaptionTrack);
  if (
    policy.job_id !== contract.job_id ||
    policy.plan_sha256 !== a.plan.sha256 ||
    policy.source_set_sha256 !== contract.source_set_sha256 ||
    policy.previous_policy_sha256 !== a.semantic_policy_receipt_v2.sha256 ||
    policy.actor_id !== policyV2.actor_id ||
    !same(policy.participants, CASE_LONGFORM_POLICY_V3_PARTICIPANTS)
  )
    throw new Error('VIDEO-OS-CASE-SEMANTIC-POLICY-DRIFT');
  const selected = policy.participants.find(
    ({participant_id}) => participant_id === claims.participant_id,
  )!;
  if (
    !selected ||
    claims.job_id !== contract.job_id ||
    claims.graph_sha256 !== a.operation_graph.sha256 ||
    claims.source_set_sha256 !== contract.source_set_sha256 ||
    claims.policy_sha256 !== a.semantic_policy_receipt_v3.sha256 ||
    claims.source_segment_map_sha256 !== a.source_segment_map.sha256 ||
    claims.transcript_sha256 !== a.audio_transcript.sha256 ||
    claims.caption_track_sha256 !== a.caption_track.sha256 ||
    claims.public_name !== selected?.public_name
  )
    throw new Error('VIDEO-OS-CASE-SEMANTIC-CLAIM-BINDING-DRIFT');
  const expectedStatus = assertCaseLongformClaims(claims, selected, {
    sourceSet,
    segments,
    transcript,
    captions,
  });
  if (contract.status !== expectedStatus) throw new Error('VIDEO-OS-CASE-SEMANTIC-GAP-DRIFT');
  return contract;
};
