import {z} from 'zod';

import {hashExperienceValue} from './experience-normalization.ts';
import {
  BrandCoverageGapV1Schema,
  BrandLocaleSchema,
  BrandRuleV1Schema,
  BrandTextSchema,
  BrandVersionSchema,
} from './notebooklm-brand-shared-v1.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';

export const BrandKnowledgeSectionsV1Schema = z.strictObject({
  identity: z.array(BrandRuleV1Schema),
  positioning: z.array(BrandRuleV1Schema),
  audiences: z.array(BrandRuleV1Schema),
  voice: z.array(BrandRuleV1Schema),
  rhetoric: z.array(BrandRuleV1Schema),
  vocabulary: z.array(BrandRuleV1Schema),
  claims: z.array(BrandRuleV1Schema),
  visualSystem: z.array(BrandRuleV1Schema),
  assets: z.array(BrandRuleV1Schema),
  channels: z.array(BrandRuleV1Schema),
  goldenReferences: z.array(BrandRuleV1Schema),
  templates: z.array(BrandRuleV1Schema),
  exclusions: z.array(BrandRuleV1Schema),
  approvals: z.array(BrandRuleV1Schema),
});

export const BrandProfileApprovalReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-profile-approval-receipt-v1'),
    receiptId: PortableIdSchema,
    gate: z.literal('NLM_BRAND_PROFILE_APPROVED'),
    brandId: PortableIdSchema,
    reviewPackSha256: Sha256Schema,
    actorDigest: Sha256Schema,
    decision: z.literal('APPROVED'),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.canonicalSha256 !== hashExperienceValue(value))
      context.addIssue({code: 'custom', message: 'Approval receipt canonicalSha256 is stale.'});
  });

export const BrandKnowledgePackV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-knowledge-pack-v1'),
    packId: PortableIdSchema,
    brandId: PortableIdSchema,
    brandName: BrandTextSchema,
    version: BrandVersionSchema,
    defaultLocale: BrandLocaleSchema,
    responseLocales: z.array(BrandLocaleSchema).min(1).max(12),
    evidenceSetSha256: Sha256Schema,
    status: z.enum(['REVIEW', 'ACTIVE', 'BLOCKED', 'SUPERSEDED']),
    approvalGate: z.literal('NLM_BRAND_PROFILE_APPROVED').nullable(),
    approvalReceiptSha256: Sha256Schema.nullable(),
    reviewedPredecessorSha256: Sha256Schema.nullable(),
    sections: BrandKnowledgeSectionsV1Schema,
    blockingQuestions: z.array(BrandTextSchema).max(3),
    coverageGaps: z.array(BrandCoverageGapV1Schema).max(100),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const activeBindingsPresent =
      value.approvalGate === 'NLM_BRAND_PROFILE_APPROVED' &&
      value.approvalReceiptSha256 !== null &&
      value.reviewedPredecessorSha256 !== null;
    if (value.status === 'ACTIVE' && !activeBindingsPresent)
      context.addIssue({code: 'custom', message: 'ACTIVE requires its approval bindings.'});
    if (
      value.status !== 'ACTIVE' &&
      (value.approvalGate !== null ||
        value.approvalReceiptSha256 !== null ||
        value.reviewedPredecessorSha256 !== null)
    )
      context.addIssue({code: 'custom', message: 'Only ACTIVE may retain approval bindings.'});
    if (
      value.status === 'ACTIVE' &&
      value.coverageGaps.some(({severity}) => severity === 'BLOCKING')
    ) {
      context.addIssue({code: 'custom', message: 'ACTIVE cannot contain blocking coverage gaps.'});
    }
    if (value.status === 'ACTIVE' && value.blockingQuestions.length > 0)
      context.addIssue({code: 'custom', message: 'ACTIVE cannot contain blocking questions.'});
    if (value.canonicalSha256 !== hashExperienceValue(value))
      context.addIssue({code: 'custom', message: 'Knowledge pack canonicalSha256 is stale.'});
  });

export type BrandProfileApprovalReceiptV1 = z.infer<typeof BrandProfileApprovalReceiptV1Schema>;
export type BrandKnowledgePackV1 = z.infer<typeof BrandKnowledgePackV1Schema>;
