import {
  BrandContentBriefV1Schema,
  BrandKnowledgePackV1Schema,
  BrandNotebookBuildV1Schema,
  BrandProfileApprovalReceiptV1Schema,
  StudioBriefV2Schema,
  hashExperienceValue,
  type BrandContentBriefV1,
  type BrandEvidenceStatus,
  type BrandKnowledgePackV1,
  type BrandNotebookBuildV1,
  type BrandProfileApprovalReceiptV1,
  type StudioBriefV2,
} from '../../core/contracts/index.ts';
import {uniqueSorted} from './brand-runtime-common.ts';

export type BuildBrandContentBriefInput = Omit<
  BrandContentBriefV1,
  | 'schemaVersion'
  | 'briefId'
  | 'profileSha256'
  | 'sourceSelection'
  | 'sourceSetSha256'
  | 'idempotencyKey'
>;

export interface BuildBrandContentBriefContext {
  knowledgePack: BrandKnowledgePackV1;
  approvalReceipt: BrandProfileApprovalReceiptV1;
  notebookBuild: BrandNotebookBuildV1;
  sourceSetId: string;
}

const resolveApprovedContext = (context: BuildBrandContentBriefContext) => {
  const pack = BrandKnowledgePackV1Schema.parse(context.knowledgePack);
  const receipt = BrandProfileApprovalReceiptV1Schema.parse(context.approvalReceipt);
  const build = BrandNotebookBuildV1Schema.parse(context.notebookBuild);
  if (pack.status !== 'ACTIVE') throw new Error('Brand content requires an ACTIVE profile.');
  if (build.state !== 'BRAND_NOTEBOOK_PLAN_READY')
    throw new Error('Brand content requires a PLAN_READY notebook build.');
  const approvalBound =
    pack.approvalReceiptSha256 === receipt.canonicalSha256 &&
    pack.reviewedPredecessorSha256 === receipt.reviewPackSha256 &&
    receipt.brandId === pack.brandId;
  const buildBound =
    build.brandId === pack.brandId && build.knowledgePackSha256 === pack.canonicalSha256;
  if (!approvalBound || !buildBound)
    throw new Error('Brand content context is not bound to its approval and notebook build.');
  const sourceSet = build.sourceSets.find(({sourceSetId}) => sourceSetId === context.sourceSetId);
  if (sourceSet === undefined)
    throw new Error('Approved source set is missing from the notebook build.');
  return {pack, sourceSet, build};
};

export const buildBrandContentBrief = (
  raw: BuildBrandContentBriefInput,
  context: BuildBrandContentBriefContext,
): BrandContentBriefV1 => {
  const {pack, sourceSet, build} = resolveApprovedContext(context);
  if (raw.brandId !== pack.brandId) throw new Error('Content brief targets a different brand.');
  const sourceIds = uniqueSorted(raw.sourceIds);
  const plannedSourceIds = uniqueSorted(build.notebookPlan.sourceIds);
  if (
    sourceIds.length === plannedSourceIds.length &&
    sourceIds.every((sourceId, index) => sourceId === plannedSourceIds[index])
  ) {
    throw new Error('BLOCKED_ALL_SOURCES: select a bounded subset of notebook sources.');
  }
  const allowedSourceIds = new Set(sourceSet.sourceIds);
  if (sourceIds.some((sourceId) => !allowedSourceIds.has(sourceId)))
    throw new Error('Content brief references a source outside the approved source set.');
  const approvedStatuses = new Set<BrandEvidenceStatus>(['USER_CONFIRMED', 'SOURCE_VERIFIED']);
  const approvedClaimIds = new Set(
    pack.sections.claims
      .filter(({status}) => approvedStatuses.has(status))
      .map(({ruleId}) => ruleId),
  );
  const approvedAssetIds = new Set(
    pack.sections.assets
      .filter(({status}) => approvedStatuses.has(status))
      .map(({ruleId}) => ruleId),
  );
  if (raw.claimIds.some((claimId) => !approvedClaimIds.has(claimId)))
    throw new Error('Content brief references an unapproved or unknown claim.');
  if (raw.assetIds.some((assetId) => !approvedAssetIds.has(assetId)))
    throw new Error('Content brief references an unapproved or unknown asset.');
  const stable = {
    ...raw,
    profileSha256: pack.canonicalSha256,
    sourceIds,
    claimIds: uniqueSorted(raw.claimIds),
    assetIds: uniqueSorted(raw.assetIds),
    exclusions: uniqueSorted(raw.exclusions),
    acceptance: uniqueSorted(raw.acceptance),
  };
  const sourceSetSha256 = hashExperienceValue(sourceIds);
  const idempotencyKey = hashExperienceValue({...stable, sourceSetSha256});
  return BrandContentBriefV1Schema.parse({
    schemaVersion: 'brand-content-brief-v1',
    ...stable,
    briefId: `brand-brief-${idempotencyKey.slice(0, 20)}`,
    sourceSelection: 'EXPLICIT',
    sourceSetSha256,
    idempotencyKey,
  });
};

export type BuildBrandStudioBriefInput = Omit<
  StudioBriefV2,
  | 'schemaVersion'
  | 'briefId'
  | 'brandId'
  | 'profileSha256'
  | 'sourceIds'
  | 'assetIds'
  | 'sourceSetSha256'
  | 'brandContentBriefSha256'
  | 'idempotencyKey'
>;

export interface BuildBrandStudioBriefContext extends BuildBrandContentBriefContext {
  contentBrief: BrandContentBriefV1;
}

/** Compile Studio V2 only from a content brief revalidated against its approved context. */
export const buildBrandStudioBrief = (
  raw: BuildBrandStudioBriefInput,
  context: BuildBrandStudioBriefContext,
): StudioBriefV2 => {
  const content = BrandContentBriefV1Schema.parse(context.contentBrief);
  const expectedContent = buildBrandContentBrief(
    {
      brandId: content.brandId,
      channel: content.channel,
      locale: content.locale,
      audience: content.audience,
      objective: content.objective,
      templateId: content.templateId,
      sourceIds: content.sourceIds,
      claimIds: content.claimIds,
      assetIds: content.assetIds,
      exclusions: content.exclusions,
      acceptance: content.acceptance,
    },
    context,
  );
  if (hashExperienceValue(content) !== hashExperienceValue(expectedContent))
    throw new Error('Studio content brief is not bound to the supplied active brand context.');
  const selectedClaims = new Set(content.claimIds);
  const boundClaims = new Set(raw.claimEvidence.map(({claimId}) => claimId));
  if (
    raw.claimEvidence.some(({claimId}) => !selectedClaims.has(claimId)) ||
    content.claimIds.some((claimId) => !boundClaims.has(claimId))
  ) {
    throw new Error('Studio claim evidence must match every selected content claim.');
  }
  const selectedSources = new Set(content.sourceIds);
  if (raw.claimEvidence.some(({sourceIds}) => sourceIds.some((id) => !selectedSources.has(id))))
    throw new Error('Studio claim evidence references a source outside the content brief.');
  const brandContentBriefSha256 = hashExperienceValue(content);
  const stable = {
    ...raw,
    brandId: content.brandId,
    profileSha256: content.profileSha256,
    sourceIds: content.sourceIds,
    assetIds: content.assetIds,
    sourceSetSha256: content.sourceSetSha256,
    brandContentBriefSha256,
  };
  const idempotencyKey = hashExperienceValue(stable);
  return StudioBriefV2Schema.parse({
    schemaVersion: 'studio-brief-v2',
    ...stable,
    briefId: `studio-brief-${idempotencyKey.slice(0, 20)}`,
    idempotencyKey,
  });
};
