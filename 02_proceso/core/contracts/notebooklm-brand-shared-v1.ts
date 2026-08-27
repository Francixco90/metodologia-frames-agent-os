import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

export const BrandTextSchema = z.string().trim().min(1).max(2_000);
export const BrandLongTextSchema = z.string().trim().min(1).max(20_000);
export const BrandLocaleSchema = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u);
export const BrandSourceIdSchema = z.string().regex(/^NLS-[A-Z0-9-]+$/u);
export const BrandVersionSchema = z.string().regex(/^v\d+\.\d+$/u);

export const BrandEvidenceStatusSchema = z.enum([
  'OBSERVED',
  'INFERRED',
  'USER_CONFIRMED',
  'SOURCE_VERIFIED',
  'BLOCKED',
]);

export const BrandRuleCategorySchema = z.enum([
  'identity',
  'positioning',
  'audience',
  'voice',
  'rhetoric',
  'vocabulary',
  'claim',
  'visual',
  'asset',
  'channel',
  'golden-reference',
  'template',
  'exclusion',
  'approval',
]);

export const BrandConflictV1Schema = z.strictObject({
  conflictId: PortableIdSchema,
  observationIds: z.array(PortableIdSchema).min(2).max(20),
  description: BrandTextSchema,
  resolution: z.enum(['OPEN', 'USER_RESOLVED', 'SOURCE_RESOLVED', 'BLOCKED']),
  winningObservationId: PortableIdSchema.nullable(),
});

export const BrandCoverageGapV1Schema = z.strictObject({
  gapId: PortableIdSchema,
  category: BrandRuleCategorySchema,
  description: BrandTextSchema,
  severity: z.enum(['ADVISORY', 'REQUIRED', 'BLOCKING']),
});

export const BrandRuleV1Schema = z.strictObject({
  ruleId: PortableIdSchema,
  category: BrandRuleCategorySchema,
  statement: BrandLongTextSchema,
  status: BrandEvidenceStatusSchema,
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(PortableIdSchema).min(1).max(20),
  supersedesRuleId: PortableIdSchema.nullable(),
});

export const BrandKnowledgeDocumentV1Schema = z.strictObject({
  documentId: PortableIdSchema,
  layer: z.enum([
    '00-control',
    '10-canon',
    '20-evidence',
    '30-templates',
    '40-golden-references',
    '50-assets',
    '60-operations',
  ]),
  title: BrandTextSchema,
  version: BrandVersionSchema,
  language: BrandLocaleSchema,
  path: RelativePathSchema,
  contentSha256: Sha256Schema,
  sourceRefs: z.array(RelativePathSchema).max(50),
});

export type BrandEvidenceStatus = z.infer<typeof BrandEvidenceStatusSchema>;
export type BrandRuleCategory = z.infer<typeof BrandRuleCategorySchema>;
export type BrandRuleV1 = z.infer<typeof BrandRuleV1Schema>;
