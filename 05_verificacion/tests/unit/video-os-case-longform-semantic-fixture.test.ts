import {afterEach, describe, expect, it} from 'vitest';

import {
  CASE_LONGFORM_POLICY_V3_PARTICIPANTS,
  CaseLongformSemanticAuthoritySchema,
  CaseLongformSemanticClaimMap,
  CaseLongformSemanticPolicyReceiptV3,
} from 'workflows/video-os/index.ts';
import {
  CaseLongformCaptionTrack,
  CaseLongformSourceSet,
} from 'workflows/video-os/_runner/case-longform-graph-structure.ts';
import {CaseLongformSourceSegmentMap} from 'workflows/video-os/_runner/case-longform-prerender-authority.ts';
import {
  cleanupCaseFixtures,
  readCaseFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformPrerenderReviewFixture} from './video-os-case-longform-prerender-review-fixture.test.ts';

export const materializeCaseLongformSemanticFixture = () => {
  const base = materializeCaseLongformPrerenderReviewFixture();
  const {root, options, reviewContract} = base;
  const a = reviewContract.artifacts;
  const sourceSet = CaseLongformSourceSet.parse(readCaseFixture(root, a.source_set));
  const segments = CaseLongformSourceSegmentMap.parse(readCaseFixture(root, a.source_segment_map));
  const captions = CaseLongformCaptionTrack.parse(readCaseFixture(root, a.caption_track));
  const policyV2 = readCaseFixture<{actor_id: string}>(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt_v2,
  );
  const policyV3Value = CaseLongformSemanticPolicyReceiptV3.parse({
    schema_version: 'case-longform-semantic-policy-receipt-v3',
    kind: 'semantic_policy_receipt_v3',
    job_id: reviewContract.job_id,
    plan_sha256: a.plan.sha256,
    source_set_sha256: reviewContract.source_set_sha256,
    previous_policy_sha256: a.semantic_policy_receipt_v2.sha256,
    actor_id: policyV2.actor_id,
    participants: CASE_LONGFORM_POLICY_V3_PARTICIPANTS,
  });
  const policyV3 = writeCaseFixture(
    options.trustPolicy.authorityRoot,
    'semantic-policy-v3.json',
    policyV3Value,
  );
  const claimsValue = CaseLongformSemanticClaimMap.parse({
    schema_version: 'case-longform-semantic-claim-map-v1',
    kind: 'semantic_claim_map',
    job_id: reviewContract.job_id,
    participant_id: 'danilo',
    public_name: 'Danilo Cardona Estrada',
    graph_sha256: a.operation_graph.sha256,
    source_set_sha256: reviewContract.source_set_sha256,
    policy_sha256: policyV3.sha256,
    source_segment_map_sha256: a.source_segment_map.sha256,
    transcript_sha256: a.audio_transcript.sha256,
    caption_track_sha256: a.caption_track.sha256,
    claims: [
      {
        claim_id: 'danilo-recognized',
        output_status: 'recognized',
        presentation: 'recognition',
        presentation_mode: 'SOURCE_AUDIOVISUAL_ONLY',
        display_text: 'Reconozco su proceso',
        source_role: 'body',
        source_sha256: sourceSet.sources[2].media.sha256,
        source_start_frame: 4,
        source_end_frame: 4,
        output_start_frame: 9,
        output_end_frame: 9,
        transcript_segment_ids: ['body-after'],
        caption_cue_ids: ['one'],
        evidence: {
          kind: 'audiovisual_declaration',
          modality: 'recognition_declaration',
          speaker: 'Germán',
        },
      },
    ],
    operational_gaps: [
      {
        gap_id: 'danilo-appointed-missing',
        status: 'appointed',
        reason: 'MISSING_APPOINTMENT_AUDIOVISUAL_DECLARATION',
      },
    ],
  });
  const claims = writeCaseFixture(root, 'semantic-claims.json', claimsValue);
  const semanticContract = CaseLongformSemanticAuthoritySchema.parse({
    schema_version: 'case-longform-semantic-authority-v4',
    job_id: reviewContract.job_id,
    source_set_sha256: reviewContract.source_set_sha256,
    artifacts: {
      ...a,
      semantic_policy_receipt_v3: policyV3,
      semantic_claim_map: claims,
    },
    status: 'PRE_RENDER_BLOCKED',
  });
  return {
    ...base,
    semanticContract,
    values: {
      ...base.values,
      policyV3: policyV3Value,
      claims: claimsValue,
      sourceSet,
      segments,
      captions,
    },
  };
};

afterEach(cleanupCaseFixtures);
describe('case-longform semantic fixture', () => {
  it('materializes Danilo as pre-render blocked with an operational appointment gap', () => {
    expect(materializeCaseLongformSemanticFixture().semanticContract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
