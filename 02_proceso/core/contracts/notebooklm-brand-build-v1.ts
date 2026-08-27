import {z} from 'zod';

import {hashExperienceValue} from './experience-normalization.ts';
import {NotebookPlanV1Schema} from './notebooklm-os-v1.ts';
import {
  BrandKnowledgeDocumentV1Schema,
  BrandSourceIdSchema,
  BrandTextSchema,
} from './notebooklm-brand-shared-v1.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';

export const BrandSourceSetV1Schema = z
  .strictObject({
    sourceSetId: PortableIdSchema,
    purpose: BrandTextSchema,
    sourceIds: z.array(BrandSourceIdSchema).min(1).max(20),
    sourceSetSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.sourceIds).size !== value.sourceIds.length)
      context.addIssue({code: 'custom', message: 'sourceIds must be unique.'});
    const expected = hashExperienceValue([...new Set(value.sourceIds)].sort());
    if (value.sourceSetSha256 !== expected)
      context.addIssue({code: 'custom', message: 'sourceSetSha256 does not match sourceIds.'});
  });

export const BrandGroundingCaseV1Schema = z.strictObject({
  caseId: PortableIdSchema,
  route: z.enum(['identity', 'voice', 'claim', 'asset', 'channel', 'injection-defense']),
  query: BrandTextSchema,
  sourceSetId: PortableIdSchema,
  acceptance: z.array(BrandTextSchema).min(1).max(20),
});

export const BrandBuildStageV1Schema = z
  .strictObject({
    stage: z.enum(['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09']),
    status: z.enum(['PLANNED', 'READY', 'VERIFIED', 'BLOCKED']),
    receiptDigest: Sha256Schema.nullable(),
    reasonCodes: z.array(PortableIdSchema),
  })
  .superRefine((value, context) => {
    if (value.status === 'VERIFIED' && value.receiptDigest === null)
      context.addIssue({code: 'custom', message: 'VERIFIED stages require a receiptDigest.'});
  });

export const BrandBuildStateSchema = z.enum([
  'BRAND_PROFILE_REVIEW',
  'BRAND_NOTEBOOK_PLAN_READY',
  'BLOCKED',
]);

export const BrandNotebookBuildV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-notebook-build-v1'),
    buildId: PortableIdSchema,
    brandId: PortableIdSchema,
    intakeSha256: Sha256Schema,
    evidenceSha256: Sha256Schema,
    knowledgePackSha256: Sha256Schema,
    knowledgeDocuments: z.array(BrandKnowledgeDocumentV1Schema).min(1).max(50),
    knowledgeMapDocumentId: PortableIdSchema,
    bootstrapXml: z.string().min(1).max(9_500),
    bootstrapSha256: Sha256Schema,
    operatingPromptDocumentId: PortableIdSchema,
    groundingCases: z.array(BrandGroundingCaseV1Schema).min(1).max(50),
    sourceSets: z.array(BrandSourceSetV1Schema).min(1).max(50),
    notebookPlan: NotebookPlanV1Schema,
    stages: z.array(BrandBuildStageV1Schema).length(10),
    state: BrandBuildStateSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const expectedStages = ['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09'];
    if (value.stages.some(({stage}, index) => stage !== expectedStages[index]))
      context.addIssue({code: 'custom', message: 'stages must contain N00-N09 in order.'});
    const documentIds = new Set(value.knowledgeDocuments.map(({documentId}) => documentId));
    if (
      !documentIds.has(value.knowledgeMapDocumentId) ||
      !documentIds.has(value.operatingPromptDocumentId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Knowledge map and operating prompt must be documents.',
      });
    const sourceSetIds = new Set(value.sourceSets.map(({sourceSetId}) => sourceSetId));
    const plannedSourceIds = new Set(value.notebookPlan.sourceIds);
    if (value.sourceSets.some(({sourceIds}) => sourceIds.some((id) => !plannedSourceIds.has(id))))
      context.addIssue({
        code: 'custom',
        message: 'Every source-set source must be included in the notebook plan.',
      });
    for (const groundingCase of value.groundingCases) {
      if (!sourceSetIds.has(groundingCase.sourceSetId))
        context.addIssue({
          code: 'custom',
          message: `Unknown source set for ${groundingCase.caseId}.`,
        });
    }
    const bootstrap = value.bootstrapXml.trim();
    if (
      !bootstrap.startsWith('<notebook_bootstrap') ||
      !bootstrap.endsWith('</notebook_bootstrap>')
    )
      context.addIssue({
        code: 'custom',
        message: 'bootstrapXml must use the notebook_bootstrap XML wrapper.',
      });
    if (value.bootstrapSha256 !== hashExperienceValue(value.bootstrapXml))
      context.addIssue({code: 'custom', message: 'bootstrapSha256 does not match bootstrapXml.'});
    if (value.canonicalSha256 !== hashExperienceValue(value))
      context.addIssue({code: 'custom', message: 'Notebook build canonicalSha256 is stale.'});
  });

export type BrandBuildState = z.infer<typeof BrandBuildStateSchema>;
export type BrandSourceSetV1 = z.infer<typeof BrandSourceSetV1Schema>;
export type BrandNotebookBuildV1 = z.infer<typeof BrandNotebookBuildV1Schema>;
