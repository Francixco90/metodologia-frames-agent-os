import {createHash} from 'node:crypto';
import {isAbsolute, normalize, relative} from 'node:path';

import {
  CaseLongformCaptionExecutionAuthoritySchema,
  CaseLongformCaptionExecutionLedger,
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
const sha = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const expectedV7aStatus = (
  v4Status: CaseLongformCaptionReviewPlanContract['v4_status'],
): CaseLongformCaptionReviewPlanContract['v7a_status'] =>
  v4Status === 'PRE_RENDER_BLOCKED'
    ? 'PRE_RENDER_BLOCKED'
    : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS';
const expectedV7bStatus = (
  v7aStatus: CaseLongformCaptionReviewPlanContract['v7a_status'],
): CaseLongformCaptionReviewPlanContract['v7b_status'] =>
  v7aStatus === 'PRE_RENDER_BLOCKED'
    ? 'PRE_RENDER_BLOCKED'
    : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
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
  const ledger = CaseLongformCaptionExecutionLedger.parse(input.ledger);
  const plan = CaseLongformCaptionExternalReviewPlan.parse(input.plan);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-REF-ALIAS');
  const root = contract.planned_review_authority_root;
  if (!isAbsolute(root)) throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-NOT-ABSOLUTE');
  if (normalize(root) !== root)
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-NOT-CANONICAL');
  const priorRoots = [...contract.prior_authority_roots, ...input.trust.priorRoots];
  if (
    priorRoots.some(
      (prior) =>
        !isAbsolute(prior) ||
        normalize(prior) !== prior ||
        overlaps(root, prior) ||
        overlaps(prior, root),
    )
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ROOT-OVERLAP');
  const reviewers = Object.values(contract.review_actors);
  const priorActorIds = [...Object.values(contract.caption_actors), ...input.trust.priorActorIds];
  if (
    new Set(reviewers).size !== reviewers.length ||
    reviewers.some((actor) => priorActorIds.includes(actor)) ||
    !input.trust.trustedPlannerActorIds.includes(contract.review_actors.planner) ||
    !input.trust.trustedCaptionVerifierActorIds.includes(contract.review_actors.caption_verifier) ||
    !input.trust.trustedGuardianActorIds.includes(contract.review_actors.guardian)
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-ACTOR-DRIFT');
  if (contract.v7a_status !== expectedV7aStatus(contract.v4_status))
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-V7A-STATUS-DRIFT');
  if (contract.v7b_status !== expectedV7bStatus(contract.v7a_status))
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-V7B-STATUS-DRIFT');
  CaseLongformCaptionExecutionAuthoritySchema.parse(v7bProjection(contract));
  if (ledger.entries.some(({sequence}, index) => sequence !== index))
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-LEDGER-SEQUENCE-DRIFT');
  const a = contract.artifacts;
  let previous: string | null = null;
  for (const entry of ledger.entries) {
    const {entry_sha256: entrySha256, ...unsigned} = entry;
    if (entry.previous_entry_sha256 !== previous || entrySha256 !== sha(unsigned))
      throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-LEDGER-ENTRY-HASH-DRIFT');
    previous = entrySha256;
  }
  if (ledger.chain_sha256 !== previous)
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-LEDGER-CHAIN-HASH-DRIFT');
  if (
    ledger.job_id !== contract.job_id ||
    ledger.source_set_sha256 !== contract.source_set_sha256 ||
    ledger.placement_plan_sha256 !== a.caption_placement_plan.sha256 ||
    ledger.graph_sha256 !== a.operation_graph.sha256 ||
    ledger.temporal_map_sha256 !== a.temporal_map.sha256 ||
    ledger.caption_track_sha256 !== a.caption_track.sha256 ||
    ledger.caption_cleanup_sha256 !== a.caption_cleanup.sha256 ||
    ledger.layout_authority_sha256 !== a.caption_layout_authority.sha256 ||
    ledger.compositor_authority_sha256 !== a.caption_compositor_authority.sha256 ||
    ledger.entries.some(
      (entry) =>
        entry.graph_sha256 !== ledger.graph_sha256 ||
        entry.temporal_map_sha256 !== ledger.temporal_map_sha256 ||
        entry.caption_track_sha256 !== ledger.caption_track_sha256 ||
        entry.caption_cleanup_sha256 !== ledger.caption_cleanup_sha256 ||
        entry.layout_authority_sha256 !== ledger.layout_authority_sha256 ||
        entry.compositor_authority_sha256 !== ledger.compositor_authority_sha256 ||
        entry.compositor_executable_sha256 !== ledger.compositor_executable_sha256 ||
        entry.compositor_command_sha256 !== ledger.compositor_command_sha256 ||
        entry.compositor_config_sha256 !== ledger.compositor_config_sha256,
    )
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-LEDGER-BINDING-DRIFT');
  if (
    !refMatches(contract.artifacts.caption_execution_ledger, ledger) ||
    !refMatches(contract.artifacts.caption_external_review_plan, plan) ||
    !same(plan, deriveCaseLongformCaptionExternalReviewPlan({contract, ledger}))
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-PLAN-DRIFT');
  if (contract.status !== caseLongformCaptionReviewPlanStatus(contract.v4_status))
    throw new Error('VIDEO-OS-CASE-CAPTION-REVIEW-CONTRACT-STATUS-DRIFT');
  return contract;
};
