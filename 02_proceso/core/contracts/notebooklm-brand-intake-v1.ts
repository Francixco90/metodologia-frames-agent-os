import {z} from 'zod';

import {hashExperienceValue} from './experience-normalization.ts';
import {
  BrandConflictV1Schema,
  BrandCoverageGapV1Schema,
  BrandEvidenceStatusSchema,
  BrandLocaleSchema,
  BrandLongTextSchema,
  BrandRuleCategorySchema,
  BrandRuleV1Schema,
  BrandTextSchema,
} from './notebooklm-brand-shared-v1.ts';
import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

export const BrandInputRefV1Schema = z.strictObject({
  schemaVersion: z.literal('brand-input-ref-v1'),
  inputId: PortableIdSchema,
  kind: z.enum([
    'conversation',
    'comment',
    'note',
    'attachment',
    'url-reference',
    'drive-reference',
    'transcription',
  ]),
  modality: z.enum(['text', 'document', 'image', 'audio', 'video', 'data']),
  title: BrandTextSchema,
  mimeType: z.string().trim().min(3).max(160).nullable(),
  contentSha256: Sha256Schema,
  portableIdentityDigest: Sha256Schema,
  locatorDigest: Sha256Schema.nullable(),
  provenance: BrandTextSchema,
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'RESTRICTED']),
  rights: z.enum(['APPROVED', 'REVIEW', 'BLOCKED']),
  safety: z.enum(['CLEAN', 'REVIEW', 'BLOCKED']).default('CLEAN'),
  extraction: z.enum(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE']),
  extractedTextSha256: Sha256Schema.nullable(),
});

export const BrandObservationV1Schema = z.strictObject({
  observationId: PortableIdSchema,
  category: BrandRuleCategorySchema,
  statement: BrandLongTextSchema,
  status: BrandEvidenceStatusSchema,
  confidence: z.number().min(0).max(1),
  inputIds: z.array(PortableIdSchema).min(1).max(20),
  sourceRefs: z.array(RelativePathSchema).max(20),
});

export const BrandIntakePacketV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-intake-packet-v1'),
    brandId: PortableIdSchema,
    brandName: BrandTextSchema,
    objective: BrandTextSchema,
    audiences: z.array(BrandTextSchema).min(1).max(12),
    channels: z.array(PortableIdSchema).min(1).max(22),
    responseLocales: z.array(BrandLocaleSchema).min(1).max(12),
    requestedOutputs: z.array(BrandTextSchema).min(1).max(22),
    inputRefs: z.array(BrandInputRefV1Schema).min(1).max(100),
    observations: z.array(BrandObservationV1Schema).max(500),
    conflicts: z.array(BrandConflictV1Schema).max(100),
    blockingQuestions: z.array(BrandTextSchema).max(3),
    coverageGaps: z.array(BrandCoverageGapV1Schema).max(100),
  })
  .superRefine((value, context) => {
    const inputIds = value.inputRefs.map(({inputId}) => inputId);
    const observationIds = value.observations.map(({observationId}) => observationId);
    if (new Set(inputIds).size !== inputIds.length)
      context.addIssue({code: 'custom', message: 'inputId values must be unique.'});
    if (new Set(observationIds).size !== observationIds.length)
      context.addIssue({code: 'custom', message: 'observationId values must be unique.'});
    const availableInputs = new Set(inputIds);
    const availableObservations = new Set(observationIds);
    for (const observation of value.observations) {
      if (observation.inputIds.some((inputId) => !availableInputs.has(inputId))) {
        context.addIssue({
          code: 'custom',
          message: `Observation ${observation.observationId} references an unknown input.`,
        });
      }
    }
    for (const conflict of value.conflicts) {
      if (conflict.observationIds.some((id) => !availableObservations.has(id)))
        context.addIssue({code: 'custom', message: `Conflict ${conflict.conflictId} is unbound.`});
      if (
        conflict.winningObservationId !== null &&
        !conflict.observationIds.includes(conflict.winningObservationId)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Conflict ${conflict.conflictId} winner must be one of its observations.`,
        });
      }
    }
  });

export const BrandEvidenceItemV1Schema = z.strictObject({
  evidenceId: PortableIdSchema,
  observationId: PortableIdSchema,
  category: BrandRuleCategorySchema,
  statement: BrandLongTextSchema,
  status: BrandEvidenceStatusSchema,
  confidence: z.number().min(0).max(1),
  inputIds: z.array(PortableIdSchema).min(1).max(20),
  sourceRefs: z.array(RelativePathSchema).max(20),
});

export const BrandEvidenceSetV1Schema = z
  .strictObject({
    schemaVersion: z.literal('brand-evidence-set-v1'),
    evidenceSetId: PortableIdSchema,
    brandId: PortableIdSchema,
    intakeSha256: Sha256Schema,
    evidence: z.array(BrandEvidenceItemV1Schema).max(500),
    rules: z.array(BrandRuleV1Schema).max(500),
    conflicts: z.array(BrandConflictV1Schema).max(100),
    blockingQuestions: z.array(BrandTextSchema).max(3),
    coverageGaps: z.array(BrandCoverageGapV1Schema).max(100),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const evidenceIds = value.evidence.map(({evidenceId}) => evidenceId);
    const ruleIds = value.rules.map(({ruleId}) => ruleId);
    if (new Set(evidenceIds).size !== evidenceIds.length)
      context.addIssue({code: 'custom', message: 'evidenceId values must be unique.'});
    if (new Set(ruleIds).size !== ruleIds.length)
      context.addIssue({code: 'custom', message: 'ruleId values must be unique.'});
    const availableEvidence = new Set(evidenceIds);
    for (const rule of value.rules) {
      if (rule.evidenceIds.some((evidenceId) => !availableEvidence.has(evidenceId)))
        context.addIssue({code: 'custom', message: `Rule ${rule.ruleId} has unknown evidence.`});
    }
    if (value.canonicalSha256 !== hashExperienceValue(value))
      context.addIssue({code: 'custom', message: 'Evidence set canonicalSha256 is stale.'});
  });

export type BrandInputRefV1 = z.infer<typeof BrandInputRefV1Schema>;
export type BrandIntakePacketV1 = z.infer<typeof BrandIntakePacketV1Schema>;
export type BrandEvidenceSetV1 = z.infer<typeof BrandEvidenceSetV1Schema>;
