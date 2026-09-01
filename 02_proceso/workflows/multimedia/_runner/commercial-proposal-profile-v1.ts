import {hashCanonical} from '../../../core/evidence/hash.ts';
import {
  CommercialProposalReadinessV1Schema,
  CommercialProposalVerificationV1Schema,
  calculateCommercialProposalCanonicalSha256,
  type CommercialProposalReadinessV1,
  type CommercialProposalVerificationV1,
} from '../_schema/commercial-proposal-v1.schema.ts';

export const COMMERCIAL_PROPOSAL_BASE_PATH = ['P01', 'P02', 'P03', 'P05', 'P06', 'P07'] as const;
export const COMMERCIAL_PROPOSAL_FORBIDDEN_STAGES = ['P04', 'P09'] as const;

export type CommercialProposalProfileV1 = {
  contentClass: 'commercial-proposal';
  stagePath: Array<'P00' | (typeof COMMERCIAL_PROPOSAL_BASE_PATH)[number] | 'P08'>;
  readinessCanonicalSha256: string;
  revisionDurableReceiptSha256: string | null;
  deckGate: 'NOT_REQUESTED' | 'AWAITING_EXPLICIT_MATERIALIZATION_GATE';
  maximumAutomaticState: 'RENDERED_DRAFT';
};

export type ResolveCommercialProposalProfileInputV1 = {
  readiness: unknown;
  readinessCanonicalSha256: string;
  revision?: unknown;
};

export const sealCommercialProposalContract = <T extends object>(
  draft: T,
): T & {
  canonicalSha256: string;
} => {
  const unsigned = {...draft, canonicalSha256: '0'.repeat(64)};
  return {...draft, canonicalSha256: calculateCommercialProposalCanonicalSha256(unsigned)};
};

export const sealCommercialProposalReadiness = (
  draft: Omit<CommercialProposalReadinessV1, 'canonicalSha256'>,
): CommercialProposalReadinessV1 =>
  CommercialProposalReadinessV1Schema.parse(sealCommercialProposalContract(draft));

export const sealCommercialProposalVerification = (
  draft: Omit<CommercialProposalVerificationV1, 'canonicalSha256'>,
): CommercialProposalVerificationV1 =>
  CommercialProposalVerificationV1Schema.parse(sealCommercialProposalContract(draft));

export const resolveCommercialProposalProfile = (
  input: ResolveCommercialProposalProfileInputV1,
): CommercialProposalProfileV1 => {
  const readiness = CommercialProposalReadinessV1Schema.parse(input.readiness);
  if (readiness.canonicalSha256 !== input.readinessCanonicalSha256)
    throw new Error('READINESS_CANONICAL_SHA256_MISMATCH');
  if (readiness.status !== 'READY') throw new Error('COMMERCIAL_PROPOSAL_READINESS_BLOCKED');
  if (input.revision !== undefined) throw new Error('P08_BLOCKED_PENDING_DURABLE_RECEIPT_V2');

  const stagePath: CommercialProposalProfileV1['stagePath'] = [
    ...(readiness.brandProfile.status === 'MISSING' ? (['P00'] as const) : []),
    ...COMMERCIAL_PROPOSAL_BASE_PATH,
  ];
  if (
    stagePath.some((stage) => COMMERCIAL_PROPOSAL_FORBIDDEN_STAGES.includes(stage as 'P04' | 'P09'))
  )
    throw new Error('COMMERCIAL_PROPOSAL_FORBIDDEN_STAGE');

  return {
    contentClass: 'commercial-proposal',
    stagePath,
    readinessCanonicalSha256: input.readinessCanonicalSha256,
    revisionDurableReceiptSha256: null,
    deckGate: readiness.deck.requested ? 'AWAITING_EXPLICIT_MATERIALIZATION_GATE' : 'NOT_REQUESTED',
    maximumAutomaticState: 'RENDERED_DRAFT',
  };
};

export const commercialProposalSourceManifestSha256 = (sources: unknown[]): string =>
  hashCanonical(sources);
