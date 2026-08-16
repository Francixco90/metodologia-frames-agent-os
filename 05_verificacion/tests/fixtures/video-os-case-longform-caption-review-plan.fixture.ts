import {createHash} from 'node:crypto';

import {
  CaseLongformCaptionReviewPlanContractSchema,
  deriveCaseLongformCaptionExternalReviewPlan,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseLongformCaptionExecutionFixtures,
  materializeCaseLongformCaptionExecutionFixture,
} from './video-os-case-longform-caption-execution.fixture.ts';

const refFor = (ref: string, value: unknown) => {
  const bytes = Buffer.from(JSON.stringify(value));
  return {ref, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
};
export const caseLongformCaptionReviewPlanRef = (value: unknown) =>
  refFor('caption-external-review-plan.json', value);
export const caseLongformCaptionReviewLedgerRef = (value: unknown) =>
  refFor('caption-execution-ledger.json', value);
export const cleanupCaseLongformCaptionReviewPlanFixtures =
  cleanupCaseLongformCaptionExecutionFixtures;

// [CONFIG] JSON/bin-only fixture; no media, material authority, review outcome or render.
export const materializeCaseLongformCaptionReviewPlanFixture = () => {
  const base = materializeCaseLongformCaptionExecutionFixture();
  const placeholder = caseLongformCaptionReviewPlanRef({pending: true});
  let contract = CaseLongformCaptionReviewPlanContractSchema.parse({
    ...base.contract,
    schema_version: 'case-longform-caption-review-plan-contract-v7c0',
    artifacts: {...base.contract.artifacts, caption_external_review_plan: placeholder},
    planned_review_authority_root: '/v7c0/review-authority',
    review_actors: {
      planner: 'synthetic-review-planner',
      caption_verifier: 'synthetic-review-verifier',
      guardian: 'synthetic-review-guardian',
    },
    v7b_status: base.contract.status,
    coverage_gap: 'V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED',
    status: 'PRE_RENDER_BLOCKED',
  });
  const plan = deriveCaseLongformCaptionExternalReviewPlan({contract, ledger: base.ledger});
  contract = CaseLongformCaptionReviewPlanContractSchema.parse({
    ...contract,
    artifacts: {
      ...contract.artifacts,
      caption_external_review_plan: caseLongformCaptionReviewPlanRef(plan),
    },
  });
  const trust = {
    priorRoots: [base.root, '/v7c0/layout-authority'],
    priorActorIds: [...Object.values(base.contract.caption_actors), 'synthetic-preflight-producer'],
    trustedPlannerActorIds: [contract.review_actors.planner],
    trustedCaptionVerifierActorIds: [contract.review_actors.caption_verifier],
    trustedGuardianActorIds: [contract.review_actors.guardian],
  };
  return {base, contract, ledger: base.ledger, plan, trust};
};
