import {createHash} from 'node:crypto';
import {isAbsolute, normalize, relative} from 'node:path';

import {
  CaseLongformCaptionExecutionAuthoritySchema,
  type CaseLongformCaptionExecutionLedgerValue,
} from './case-longform-caption-execution-authority.ts';
import {
  CaseLongformCaptionExternalReviewPlan,
  CaseLongformCaptionReviewPlanContractSchema,
  caseLongformCaptionReviewPlanStatus,
  type CaseLongformCaptionExternalReviewPlanValue,
  type CaseLongformCaptionReviewPlanContract,
} from './case-longform-caption-review-plan-authority.ts';
import {deriveCaseLongformCaptionExternalReviewPlan} from './case-longform-caption-review-plan.ts';

export type CaseLongformCaptionReviewPlanContractTrust = {
  priorRoots: string[];
  priorActorIds: string[];
  trustedPlannerActorIds: string[];
  trustedCaptionVerifierActorIds: string[];
  trustedGuardianActorIds: string[];
};
type Input = {
  contract: unknown;
  ledger: CaseLongformCaptionExecutionLedgerValue;
  plan: CaseLongformCaptionExternalReviewPlanValue;
  trust: CaseLongformCaptionReviewPlanContractTrust;
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const overlaps = (a: string, b: string): boolean => {
  const path = relative(a, b);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
};
const refMatches = (ref: {sha256: string; bytes: number}, value: unknown): boolean => {
  const bytes = Buffer.from(JSON.stringify(value));
  return (
    ref.bytes === bytes.length && ref.sha256 === createHash('sha256').update(bytes).digest('hex')
  );
};
const v7bProjection = (contract: CaseLongformCaptionReviewPlanContract) => ({
  schema_version: 'case-longform-caption-execution-authority-v7b' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformCaptionExecutionAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  caption_actors: contract.caption_actors,
  v4_status: contract.v4_status,
  v5a_status: contract.v5a_status,
  v6_status: contract.v6_status,
  v7a_status: contract.v7a_status,
  status: contract.v7b_status,
});

// [CONFIG] Pure contract check only; it does not read files or accredit the V7b material chain.
export const assertCaseLongformCaptionReviewPlanContract = (
  input: Input,
): CaseLongformCaptionReviewPlanContract => {
  const contract = CaseLongformCaptionReviewPlanContractSchema.parse(input.contract);
  const plan = CaseLongformCaptionExternalReviewPlan.parse(input.plan);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-REF-ALIAS');
  const root = contract.planned_review_authority_root;
  if (!isAbsolute(root)) throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-NOT-ABSOLUTE');
  if (normalize(root) !== root)
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-NOT-CANONICAL');
  if (
    input.trust.priorRoots.some(
      (prior) =>
        !isAbsolute(prior) ||
        normalize(prior) !== prior ||
        overlaps(root, prior) ||
        overlaps(prior, root),
    )
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-OVERLAP');
  const reviewers = Object.values(contract.review_actors);
  if (
    new Set(reviewers).size !== reviewers.length ||
    reviewers.some((actor) => input.trust.priorActorIds.includes(actor)) ||
    !input.trust.trustedPlannerActorIds.includes(contract.review_actors.planner) ||
    !input.trust.trustedCaptionVerifierActorIds.includes(contract.review_actors.caption_verifier) ||
    !input.trust.trustedGuardianActorIds.includes(contract.review_actors.guardian)
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ACTOR-DRIFT');
  CaseLongformCaptionExecutionAuthoritySchema.parse(v7bProjection(contract));
  if (
    !refMatches(contract.artifacts.caption_execution_ledger, input.ledger) ||
    !refMatches(contract.artifacts.caption_external_review_plan, plan) ||
    !same(plan, deriveCaseLongformCaptionExternalReviewPlan({contract, ledger: input.ledger}))
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-PLAN-DRIFT');
  if (contract.status !== caseLongformCaptionReviewPlanStatus(contract.v4_status))
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-STATUS-DRIFT');
  return contract;
};
