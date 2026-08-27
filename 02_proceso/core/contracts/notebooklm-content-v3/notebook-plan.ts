import {z} from 'zod';

import {
  NotebookGateSchema,
  NotebookOperationSchema,
  NotebookProviderSchema,
} from '../notebooklm-os-v1.ts';
import {Sha256Schema} from '../primitives.ts';
import {validateNotebookPlanV2} from './notebook-plan-rules.ts';
import {ExplicitActiveSourceIdsSchema, IdSchema, SourceIdSchema, TextSchema} from './shared.ts';
import {SourcePackBatchV1Schema} from './studio-brief.ts';

export const NotebookPlanV2BaseSchema = z.strictObject({
  schemaVersion: z.literal('notebook-plan-v2'),
  planId: IdSchema,
  profileId: IdSchema,
  provider: NotebookProviderSchema,
  targetNotebookDigest: Sha256Schema.nullable(),
  targetNotebookTitle: TextSchema,
  visibility: z.literal('private'),
  idempotencyKey: IdSchema,
  operations: z
    .array(
      z.strictObject({
        operationId: IdSchema,
        stage: z.enum(['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09']),
        action: NotebookOperationSchema,
        sourceIds: z.array(SourceIdSchema).max(20),
        requiredGate: NotebookGateSchema.nullable(),
        effect: z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE', 'EXTERNAL_MUTATION', 'DESTRUCTIVE']),
      }),
    )
    .min(1),
  sourceIds: z.array(SourceIdSchema).min(1).max(150),
  activeSourceIds: ExplicitActiveSourceIdsSchema,
  sourcePacks: z.array(SourcePackBatchV1Schema).min(1),
  permissions: z.array(TextSchema),
  stopRules: z.array(TextSchema).min(1),
  rollback: z.array(TextSchema).min(1),
});

export const NotebookPlanV2Schema = NotebookPlanV2BaseSchema.superRefine(validateNotebookPlanV2);

export type NotebookPlanV2 = z.infer<typeof NotebookPlanV2Schema>;
