import {z} from 'zod';

import {hashExperienceValue} from './experience-normalization.ts';
import {
  BrandLocaleSchema,
  BrandLongTextSchema,
  BrandSourceIdSchema,
  BrandTextSchema,
  BrandVersionSchema,
} from './notebooklm-brand-shared-v1.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';

export const BrandContentBriefV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-content-brief-v1'),
    briefId: PortableIdSchema,
    brandId: PortableIdSchema,
    channel: PortableIdSchema,
    locale: BrandLocaleSchema,
    audience: BrandTextSchema,
    objective: BrandTextSchema,
    templateId: PortableIdSchema,
    profileSha256: Sha256Schema,
    sourceSelection: z.literal('EXPLICIT'),
    sourceIds: z.array(BrandSourceIdSchema).min(1).max(12),
    claimIds: z.array(PortableIdSchema).max(50),
    assetIds: z.array(PortableIdSchema).max(20),
    exclusions: z.array(BrandTextSchema),
    acceptance: z.array(BrandTextSchema).min(1).max(30),
    sourceSetSha256: Sha256Schema,
    idempotencyKey: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.sourceIds).size !== value.sourceIds.length)
      context.addIssue({code: 'custom', message: 'sourceIds must be unique.'});
    const expected = hashExperienceValue([...new Set(value.sourceIds)].sort());
    if (value.sourceSetSha256 !== expected)
      context.addIssue({code: 'custom', message: 'sourceSetSha256 does not match sourceIds.'});
    const stable = {
      brandId: value.brandId,
      channel: value.channel,
      locale: value.locale,
      audience: value.audience,
      objective: value.objective,
      templateId: value.templateId,
      sourceIds: value.sourceIds,
      claimIds: value.claimIds,
      assetIds: value.assetIds,
      exclusions: value.exclusions,
      acceptance: value.acceptance,
      profileSha256: value.profileSha256,
    };
    const expectedIdempotencyKey = hashExperienceValue({
      ...stable,
      sourceSetSha256: value.sourceSetSha256,
    });
    if (value.idempotencyKey !== expectedIdempotencyKey)
      context.addIssue({code: 'custom', message: 'idempotencyKey is stale.'});
    if (value.briefId !== `brand-brief-${expectedIdempotencyKey.slice(0, 20)}`)
      context.addIssue({code: 'custom', message: 'briefId does not match idempotencyKey.'});
  });

export const BrandFeedbackEventV1Schema = z.strictObject({
  schemaVersion: z.literal('brand-feedback-event-v1'),
  feedbackId: PortableIdSchema,
  brandId: PortableIdSchema,
  actorId: PortableIdSchema,
  targetRuleId: PortableIdSchema,
  action: z.enum(['CONFIRM', 'REPLACE', 'BLOCK']),
  replacementStatement: BrandLongTextSchema.nullable(),
  evidenceIds: z.array(PortableIdSchema).min(1).max(20),
  reason: BrandTextSchema,
  successorVersion: BrandVersionSchema,
});

export const BrandQaReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-qa-receipt-v1'),
    receiptId: PortableIdSchema,
    briefSha256: Sha256Schema,
    checks: z.strictObject({
      voice: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      claims: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      assets: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      visuals: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      channel: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      language: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      accessibility: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      brandSeparation: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
      internalInstructionLeakage: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
    }),
    findings: z.array(BrandTextSchema),
    state: z.enum(['VERIFIED_DRAFT', 'BLOCKED']),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const allPass = Object.values(value.checks).every((status) => status === 'PASS');
    if (value.state === 'VERIFIED_DRAFT' && !allPass)
      context.addIssue({
        code: 'custom',
        message: 'VERIFIED_DRAFT requires every QA check to PASS.',
      });
    if (value.state === 'BLOCKED' && allPass)
      context.addIssue({code: 'custom', message: 'A fully passing receipt cannot be BLOCKED.'});
    if (value.canonicalSha256 !== hashExperienceValue(value))
      context.addIssue({code: 'custom', message: 'QA receipt canonicalSha256 is stale.'});
  });

export type BrandContentBriefV1 = z.infer<typeof BrandContentBriefV1Schema>;
export type BrandFeedbackEventV1 = z.infer<typeof BrandFeedbackEventV1Schema>;
export type BrandQaReceiptV1 = z.infer<typeof BrandQaReceiptV1Schema>;
