import {createHash} from 'node:crypto';

import {z} from 'zod';

import {NotebookStudioTypeSchema} from '../notebooklm-os-v1.ts';
import {Sha256Schema} from '../primitives.ts';
import {ContentChannelV1Schema} from './prompt-template.ts';
import {
  AllSourcesSentinelSchema,
  ExplicitActiveSourceIdsSchema,
  IdSchema,
  LanguageTagSchema,
  SourceIdSchema,
  TextSchema,
} from './shared.ts';

export const SourcePackBatchV1Schema = z.strictObject({
  batchId: IdSchema,
  sourcePackId: IdSchema,
  sourceIds: z.array(SourceIdSchema).min(1).max(20),
  purpose: TextSchema,
});

export const ClaimEvidenceV1Schema = z.strictObject({
  claimId: IdSchema,
  claim: TextSchema,
  sourceIds: z.array(SourceIdSchema).min(1).max(12),
  condition: TextSchema,
  asOf: z.string().date(),
  evidenceTag: z.enum(['METODOLOGIA', 'NEUROCIENCIA', 'PEDAGOGIA', 'INFERENCIA', 'SUPUESTO']),
});

export const computeSourceSetSha256 = (sourceIds: readonly string[]): string =>
  createHash('sha256')
    .update([...new Set(sourceIds)].sort().join('\n'))
    .digest('hex');

export const StudioBriefV2Schema = z
  .strictObject({
    schemaVersion: z.literal('studio-brief-v2'),
    briefId: IdSchema,
    type: NotebookStudioTypeSchema,
    channel: z.union([ContentChannelV1Schema, z.literal('studio')]),
    language: LanguageTagSchema,
    audience: TextSchema,
    objective: TextSchema,
    thesis: TextSchema,
    sourceIds: z.array(SourceIdSchema).min(1).max(12),
    activeSourceIds: ExplicitActiveSourceIdsSchema.max(12),
    sourceSetSha256: Sha256Schema,
    claimEvidence: z.array(ClaimEvidenceV1Schema),
    assetIds: z.array(IdSchema),
    exclusions: z.array(TextSchema).min(1),
    structure: z.array(TextSchema).min(1),
    style: TextSchema,
    duration: TextSchema,
    outputFormat: TextSchema,
    constraints: z.array(TextSchema).min(1),
    acceptance: z.array(TextSchema).min(1),
    idempotencyKey: z.string().trim().min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.sourceIds.some((id) => AllSourcesSentinelSchema.safeParse(id).success)) {
      context.addIssue({code: 'custom', path: ['sourceIds'], message: 'All-sources is blocked.'});
    }
    if (
      value.sourceIds.length !== value.activeSourceIds.length ||
      value.sourceIds.some((id) => !value.activeSourceIds.includes(id))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeSourceIds'],
        message: 'activeSourceIds must equal the explicitly selected sourceIds.',
      });
    }
    if (new Set(value.sourceIds).size !== value.sourceIds.length) {
      context.addIssue({code: 'custom', path: ['sourceIds'], message: 'sourceIds must be unique.'});
    }
    if (value.sourceSetSha256 !== computeSourceSetSha256(value.sourceIds)) {
      context.addIssue({
        code: 'custom',
        path: ['sourceSetSha256'],
        message: 'sourceSetSha256 must hash sorted unique sourceIds joined by a newline.',
      });
    }
    if (new Set(value.assetIds).size !== value.assetIds.length) {
      context.addIssue({code: 'custom', path: ['assetIds'], message: 'assetIds must be unique.'});
    }
    const claimIds = value.claimEvidence.map(({claimId}) => claimId);
    if (new Set(claimIds).size !== claimIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['claimEvidence'],
        message: 'claimId values must be unique.',
      });
    }
    const selected = new Set(value.activeSourceIds);
    for (const [index, evidence] of value.claimEvidence.entries()) {
      if (evidence.sourceIds.some((id) => !selected.has(id))) {
        context.addIssue({
          code: 'custom',
          path: ['claimEvidence', index, 'sourceIds'],
          message: 'Claim evidence must use active sources only.',
        });
      }
    }
  });

export type SourcePackBatchV1 = z.infer<typeof SourcePackBatchV1Schema>;
export type ClaimEvidenceV1 = z.infer<typeof ClaimEvidenceV1Schema>;
export type StudioBriefV2 = z.infer<typeof StudioBriefV2Schema>;
