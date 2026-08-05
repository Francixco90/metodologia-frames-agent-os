import {
  SourceFreezeReceiptV1Schema,
  type SourceFreezeReceiptV1,
} from '../../../core/contracts/creation-v3.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import type {LoadedCanonicalContentV1} from './parse-canonical-content.ts';

export const computeSourceFreezeReceiptSha256 = (
  receipt: Omit<SourceFreezeReceiptV1, 'receiptSha256'>,
): string =>
  hashCanonical({
    domain: 'source-freeze-receipt-v1:integrity:v1',
    receipt,
  });

export const buildSourceFreezeReceipt = (
  contentRef: string,
  loaded: LoadedCanonicalContentV1,
): SourceFreezeReceiptV1 => {
  const {document, manifest, resolvedClaims} = loaded;
  const groundedClaimIds = resolvedClaims
    .filter(({claim}) => claim.support === 'direct')
    .map(({claim}) => claim.claimId)
    .sort();
  const qualifiedClaimIds = resolvedClaims
    .filter(({claim}) => claim.support !== 'direct')
    .map(({claim}) => claim.claimId)
    .sort();
  const unsigned = {
    schemaVersion: 'source-freeze-receipt-v1' as const,
    receiptId: 'RCP-H01-RT02-SOURCE-FREEZE-001',
    manifestId: manifest.manifestId,
    manifestRef: document.frontmatter.sourceFreezeManifest,
    contentId: document.frontmatter.contentId,
    contentVersion: document.frontmatter.version,
    contentRef,
    contentRawSha256: document.rawSha256,
    contentSemanticSha256: document.semanticSha256,
    baseCommit: manifest.baseCommit,
    producerActorInstanceId: manifest.createdByActorInstanceId,
    verifierActorInstanceId: manifest.verifiedByActorInstanceId,
    readSet: manifest.readSet,
    readSetSha256: hashCanonical({
      domain: 'source-freeze-read-set-v1:integrity:v1',
      entries: manifest.readSet,
    }),
    claimBindings: resolvedClaims
      .map(({claim, materialRef, fragmentSha256}) => ({
        claimId: claim.claimId,
        authorityId: claim.authorityId,
        support: claim.support,
        evidenceRole: claim.evidenceRole,
        materialRef,
        locator: claim.locator,
        fragmentSha256,
      }))
      .sort(({claimId: left}, {claimId: right}) => (left < right ? -1 : left > right ? 1 : 0)),
    profileBindings: manifest.profileBindings,
    coverage: {
      requiredClaimIds: document.body.claims.map(({claimId}) => claimId).sort(),
      groundedClaimIds,
      qualifiedClaimIds,
      blockedClaimIds: [],
      status: qualifiedClaimIds.length > 0 ? ('qualified' as const) : ('complete' as const),
    },
    integrityState: 'frozen' as const,
    authorityState: 'candidate_limited' as const,
    scopeLocked: true as const,
    authoredStatus: 'DRAFT' as const,
    maximumState: 'SCOPED' as const,
    globalSourceLocked: false as const,
    distributionState: 'NOT_DESIGNED' as const,
    publicationAuthority: false as const,
    coverageGaps: manifest.coverageGaps,
  };
  return SourceFreezeReceiptV1Schema.parse({
    ...unsigned,
    receiptSha256: computeSourceFreezeReceiptSha256(unsigned),
  });
};
