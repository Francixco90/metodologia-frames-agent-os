import {
  BrandEvidenceSetV1Schema,
  BrandKnowledgePackV1Schema,
  BrandNotebookBuildV1Schema,
  NotebookPlanV1Schema,
  hashExperienceValue,
  type BrandEvidenceSetV1,
  type BrandKnowledgePackV1,
  type BrandNotebookBuildV1,
  type NotebookPlanV1,
} from '../../core/contracts/index.ts';
import {byPortableId, uniqueSorted} from './brand-runtime-common.ts';

export interface BrandKnowledgeDocumentInput {
  documentId: string;
  layer:
    | '00-control'
    | '10-canon'
    | '20-evidence'
    | '30-templates'
    | '40-golden-references'
    | '50-assets'
    | '60-operations';
  title: string;
  version: `v${number}.${number}`;
  language: string;
  path: string;
  contentSha256: string;
  sourceRefs: string[];
}

export interface BrandSourceSetInput {
  sourceSetId: string;
  purpose: string;
  sourceIds: string[];
}

export interface BrandGroundingCaseInput {
  caseId: string;
  route: 'identity' | 'voice' | 'claim' | 'asset' | 'channel' | 'injection-defense';
  query: string;
  sourceSetId: string;
  acceptance: string[];
}

export interface CompileBrandNotebookBuildInput {
  intakeSha256: string;
  evidence: BrandEvidenceSetV1;
  knowledgePack: BrandKnowledgePackV1;
  knowledgeDocuments: BrandKnowledgeDocumentInput[];
  knowledgeMapDocumentId: string;
  bootstrapXml: string;
  operatingPromptDocumentId: string;
  groundingCases: BrandGroundingCaseInput[];
  sourceSets: BrandSourceSetInput[];
  notebookPlan: NotebookPlanV1;
  stageReceiptDigests: Partial<Record<'N00' | 'N01' | 'N02' | 'N03', string>>;
}

const buildStages = (
  packStatus: BrandKnowledgePackV1['status'],
  receiptDigests: CompileBrandNotebookBuildInput['stageReceiptDigests'],
) => {
  const stageNames = [
    'N00',
    'N01',
    'N02',
    'N03',
    'N04',
    'N05',
    'N06',
    'N07',
    'N08',
    'N09',
  ] as const;
  const blocking = packStatus === 'BLOCKED' || packStatus === 'SUPERSEDED';
  const reviewing = packStatus === 'REVIEW';
  const required = blocking ? ['N00'] : reviewing ? ['N00', 'N01'] : ['N00', 'N01', 'N02', 'N03'];
  for (const stage of required) {
    if (receiptDigests[stage as keyof typeof receiptDigests] === undefined)
      throw new Error(`Missing receipt digest for verified stage ${stage}.`);
  }
  return stageNames.map((stage, index) => {
    const verified = blocking ? index === 0 : reviewing ? index < 2 : index < 4;
    const status = verified
      ? ('VERIFIED' as const)
      : blocking && index === 1
        ? ('BLOCKED' as const)
        : reviewing && index === 2
          ? ('READY' as const)
          : !blocking && !reviewing && index === 4
            ? ('READY' as const)
            : ('PLANNED' as const);
    return {
      stage,
      status,
      receiptDigest: verified
        ? (receiptDigests[stage as keyof typeof receiptDigests] ?? null)
        : null,
      reasonCodes:
        blocking && index === 1
          ? ['BRAND_PROFILE_BLOCKED']
          : reviewing && index === 2
            ? ['NLM_BRAND_PROFILE_APPROVED_REQUIRED']
            : [],
    };
  });
};

export const compileBrandNotebookBuild = (
  input: CompileBrandNotebookBuildInput,
): BrandNotebookBuildV1 => {
  const evidence = BrandEvidenceSetV1Schema.parse(input.evidence);
  const pack = BrandKnowledgePackV1Schema.parse(input.knowledgePack);
  const notebookPlan = NotebookPlanV1Schema.parse(input.notebookPlan);
  if (input.intakeSha256 !== evidence.intakeSha256) throw new Error('Intake digest mismatch.');
  if (pack.evidenceSetSha256 !== evidence.canonicalSha256)
    throw new Error('Evidence digest mismatch.');
  if (pack.brandId !== evidence.brandId || notebookPlan.profileId !== pack.brandId)
    throw new Error('Brand, evidence, and notebook profile identities must match.');
  const sourceSets = input.sourceSets
    .map((sourceSet) => {
      const sourceIds = uniqueSorted(sourceSet.sourceIds);
      return {...sourceSet, sourceIds, sourceSetSha256: hashExperienceValue(sourceIds)};
    })
    .sort(byPortableId('sourceSetId'));
  const plannedSourceIds = new Set(notebookPlan.sourceIds);
  if (sourceSets.some(({sourceIds}) => sourceIds.some((id) => !plannedSourceIds.has(id))))
    throw new Error('Source set contains a source outside the notebook plan.');
  const identity = {
    brandId: pack.brandId,
    intakeSha256: input.intakeSha256,
    evidenceSha256: evidence.canonicalSha256,
    knowledgePackSha256: pack.canonicalSha256,
    notebookPlanSha256: hashExperienceValue(notebookPlan),
  };
  const payload = {
    schemaVersion: 'brand-notebook-build-v1' as const,
    buildId: `brand-build-${hashExperienceValue(identity).slice(0, 20)}`,
    brandId: pack.brandId,
    intakeSha256: input.intakeSha256,
    evidenceSha256: evidence.canonicalSha256,
    knowledgePackSha256: pack.canonicalSha256,
    knowledgeDocuments: [...input.knowledgeDocuments].sort(byPortableId('documentId')),
    knowledgeMapDocumentId: input.knowledgeMapDocumentId,
    bootstrapXml: input.bootstrapXml,
    bootstrapSha256: hashExperienceValue(input.bootstrapXml),
    operatingPromptDocumentId: input.operatingPromptDocumentId,
    groundingCases: [...input.groundingCases].sort(byPortableId('caseId')),
    sourceSets,
    notebookPlan,
    stages: buildStages(pack.status, input.stageReceiptDigests),
    state:
      pack.status === 'BLOCKED' || pack.status === 'SUPERSEDED'
        ? ('BLOCKED' as const)
        : pack.status === 'REVIEW'
          ? ('BRAND_PROFILE_REVIEW' as const)
          : ('BRAND_NOTEBOOK_PLAN_READY' as const),
  };
  return BrandNotebookBuildV1Schema.parse({
    ...payload,
    canonicalSha256: hashExperienceValue(payload),
  });
};
