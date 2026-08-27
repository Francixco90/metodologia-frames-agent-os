import {z} from 'zod';

import {hashExperienceValue} from './experience-normalization.ts';
import {NotebookGateSchema, NotebookStudioTypeSchema} from './notebooklm-os-v1.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';

const IdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/u);
const TextSchema = z.string().trim().min(1).max(2_000);
const SourceIdSchema = z.string().regex(/^NLS-[A-Z0-9-]+$/u);

export const StudioBriefV1Schema = z.strictObject({
  schemaVersion: z.literal('studio-brief-v1'),
  briefId: IdSchema,
  type: NotebookStudioTypeSchema,
  audience: TextSchema,
  objective: TextSchema,
  thesis: TextSchema,
  sourceIds: z.array(SourceIdSchema).min(1).max(50),
  structure: z.array(TextSchema).min(1),
  style: TextSchema,
  duration: TextSchema,
  constraints: z.array(TextSchema).min(1),
  acceptance: z.array(TextSchema).min(1),
});

const LocaleSchema = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u);

export const StudioClaimEvidenceV2Schema = z.strictObject({
  claimId: IdSchema,
  sourceIds: z.array(SourceIdSchema).min(1).max(12),
  condition: TextSchema.nullable(),
});

/**
 * Backward-compatible successor to StudioBriefV1. V1 remains unchanged and
 * callers opt in by using this schemaVersion.
 */
export const StudioBriefV2Schema = z
  .strictObject({
    schemaVersion: z.literal('studio-brief-v2'),
    briefId: IdSchema,
    brandId: PortableIdSchema,
    profileSha256: Sha256Schema,
    type: NotebookStudioTypeSchema,
    audience: TextSchema,
    objective: TextSchema,
    thesis: TextSchema,
    sourceIds: z.array(SourceIdSchema).min(1).max(12),
    structure: z.array(TextSchema).min(1),
    style: TextSchema,
    duration: TextSchema,
    constraints: z.array(TextSchema).min(1),
    acceptance: z.array(TextSchema).min(1),
    locale: LocaleSchema,
    channel: IdSchema,
    claimEvidence: z.array(StudioClaimEvidenceV2Schema).max(50),
    assetIds: z.array(IdSchema).max(20),
    exclusions: z.array(TextSchema),
    finalFormat: IdSchema,
    sourceSetSha256: Sha256Schema,
    brandContentBriefSha256: Sha256Schema,
    negativePrompt: z.array(TextSchema).min(1),
    idempotencyKey: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.sourceIds).size !== value.sourceIds.length) {
      context.addIssue({code: 'custom', message: 'sourceIds must be unique.'});
    }
    const expected = hashExperienceValue([...new Set(value.sourceIds)].sort());
    if (value.sourceSetSha256 !== expected) {
      context.addIssue({code: 'custom', message: 'sourceSetSha256 does not match sourceIds.'});
    }
    const selected = new Set(value.sourceIds);
    for (const binding of value.claimEvidence) {
      if (binding.sourceIds.some((sourceId) => !selected.has(sourceId))) {
        context.addIssue({
          code: 'custom',
          message: `Claim ${binding.claimId} references a source outside the explicit source set.`,
        });
      }
    }
  });

export const StudioBriefCompatibleSchema = z.union([StudioBriefV1Schema, StudioBriefV2Schema]);

export const StudioArtifactReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('studio-artifact-receipt-v1'),
    artifactIdDigest: Sha256Schema,
    requestedType: NotebookStudioTypeSchema,
    obtainedType: NotebookStudioTypeSchema.nullable(),
    sourceIds: z.array(SourceIdSchema).min(1),
    promptSha256: Sha256Schema,
    state: z.enum(['PLANNED', 'GENERATED', 'DOWNLOADED', 'VERIFIED_DRAFT', 'BLOCKED']),
    downloadedBytes: z.number().int().nonnegative(),
    validations: z.array(TextSchema),
    gaps: z.array(TextSchema),
  })
  .superRefine((value, context) => {
    if (
      value.state === 'VERIFIED_DRAFT' &&
      (value.obtainedType !== value.requestedType || value.downloadedBytes === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'VERIFIED_DRAFT requires matching type and downloaded bytes.',
      });
    }
  });

export const NotebookLifecycleReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('notebook-lifecycle-receipt-v1'),
    receiptId: IdSchema,
    planSha256: Sha256Schema,
    actor: TextSchema,
    approval: NotebookGateSchema.nullable(),
    approvalUse: z.enum(['NONE', 'CONSUMED_ONCE']),
    externalChanges: z.array(TextSchema),
    readbackSha256: Sha256Schema.nullable(),
    outputHashes: z.array(Sha256Schema),
    state: z.enum(['PLANNED', 'APPLIED', 'VERIFIED', 'BLOCKED', 'ROLLED_BACK']),
    nextGate: NotebookGateSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.externalChanges.length > 0 &&
      (value.approval === null || value.readbackSha256 === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'External changes require approval and readback.',
      });
    }
    if (
      ['NLM_SHARE_AUTHORIZED', 'NLM_DESTRUCTIVE_AUTHORIZED'].includes(value.approval ?? '') &&
      value.approvalUse !== 'CONSUMED_ONCE'
    ) {
      context.addIssue({code: 'custom', message: 'Sharing and destructive grants are one-use.'});
    }
  });

export type StudioBriefV1 = z.infer<typeof StudioBriefV1Schema>;
export type StudioBriefV2 = z.infer<typeof StudioBriefV2Schema>;
export type StudioBriefCompatible = z.infer<typeof StudioBriefCompatibleSchema>;
export type StudioArtifactReceiptV1 = z.infer<typeof StudioArtifactReceiptV1Schema>;
export type NotebookLifecycleReceiptV1 = z.infer<typeof NotebookLifecycleReceiptV1Schema>;
