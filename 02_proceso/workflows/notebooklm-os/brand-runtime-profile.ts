import {
  BrandEvidenceSetV1Schema,
  BrandKnowledgePackV1Schema,
  BrandProfileApprovalReceiptV1Schema,
  hashExperienceValue,
  type BrandEvidenceSetV1,
  type BrandKnowledgePackV1,
  type BrandProfileApprovalReceiptV1,
} from '../../core/contracts/index.ts';
import {
  byPortableId,
  emptySections,
  SECTION_FOR_CATEGORY,
  uniqueSorted,
} from './brand-runtime-common.ts';

export interface CompileBrandKnowledgePackOptions {
  brandName: string;
  version: `v${number}.${number}`;
  defaultLocale: string;
  responseLocales: readonly string[];
}

export const compileBrandKnowledgePack = (
  rawEvidence: BrandEvidenceSetV1,
  options: CompileBrandKnowledgePackOptions,
): BrandKnowledgePackV1 => {
  const evidence = BrandEvidenceSetV1Schema.parse(rawEvidence);
  const sections = emptySections();
  for (const rule of evidence.rules) sections[SECTION_FOR_CATEGORY[rule.category]].push(rule);
  for (const rules of Object.values(sections)) rules.sort(byPortableId('ruleId'));
  const blocking =
    evidence.blockingQuestions.length > 0 ||
    evidence.coverageGaps.some(({severity}) => severity === 'BLOCKING') ||
    evidence.conflicts.some(({resolution}) => resolution === 'OPEN' || resolution === 'BLOCKED') ||
    evidence.rules.some(({status}) => status === 'BLOCKED');
  const status = blocking ? ('BLOCKED' as const) : ('REVIEW' as const);
  const identity = {
    brandId: evidence.brandId,
    version: options.version,
    evidenceSetSha256: evidence.canonicalSha256,
  };
  const payload = {
    schemaVersion: 'brand-knowledge-pack-v1' as const,
    packId: `brand-pack-${hashExperienceValue(identity).slice(0, 20)}`,
    brandId: evidence.brandId,
    brandName: options.brandName,
    version: options.version,
    defaultLocale: options.defaultLocale,
    responseLocales: uniqueSorted(options.responseLocales),
    evidenceSetSha256: evidence.canonicalSha256,
    status,
    approvalGate: null,
    approvalReceiptSha256: null,
    reviewedPredecessorSha256: null,
    sections,
    blockingQuestions: evidence.blockingQuestions,
    coverageGaps: evidence.coverageGaps,
  };
  return BrandKnowledgePackV1Schema.parse({
    ...payload,
    canonicalSha256: hashExperienceValue(payload),
  });
};

/** Promote exactly one reviewed pack using a portable, hash-bound human approval receipt. */
export const activateBrandKnowledgePack = (
  rawPack: BrandKnowledgePackV1,
  rawReceipt: BrandProfileApprovalReceiptV1,
): BrandKnowledgePackV1 => {
  const pack = BrandKnowledgePackV1Schema.parse(rawPack);
  const receipt = BrandProfileApprovalReceiptV1Schema.parse(rawReceipt);
  if (pack.status !== 'REVIEW') throw new Error('Only a REVIEW brand pack can be activated.');
  if (receipt.brandId !== pack.brandId || receipt.reviewPackSha256 !== pack.canonicalSha256)
    throw new Error('Approval receipt is not bound to this reviewed brand pack.');
  const unsafeRule = [
    ...pack.sections.claims,
    ...pack.sections.assets,
    ...pack.sections.visualSystem,
    ...pack.sections.goldenReferences,
  ].find(({status}) => !['USER_CONFIRMED', 'SOURCE_VERIFIED'].includes(status));
  if (unsafeRule !== undefined)
    throw new Error('Claims and visual authorities require confirmed evidence before activation.');
  const payload = {
    ...pack,
    status: 'ACTIVE' as const,
    approvalGate: 'NLM_BRAND_PROFILE_APPROVED' as const,
    approvalReceiptSha256: receipt.canonicalSha256,
    reviewedPredecessorSha256: pack.canonicalSha256,
  };
  return BrandKnowledgePackV1Schema.parse({
    ...payload,
    canonicalSha256: hashExperienceValue(payload),
  });
};
