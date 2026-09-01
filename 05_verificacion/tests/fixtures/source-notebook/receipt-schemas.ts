import {z} from 'zod';

import {PinnedRepositoryTransitionReceiptV2Schema} from '../../../../core/contracts/source-governance-v2.ts';
import {
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../../../core/contracts/index.ts';
import {NonEmptyTextSchema, SourceIdSchema, TransitionSchema} from './common.ts';
import {SourceProjectionSchema} from './registry-schema.ts';

export const TransitionImportReceiptSchema = z
  .object({
    schema_version: z.literal(1),
    receipt_id: NonEmptyTextSchema,
    recorded_at: TimestampSchema,
    event_order: z.number().int().positive(),
    actor_id: NonEmptyTextSchema,
    verifier_id: NonEmptyTextSchema.optional(),
    package_id: NonEmptyTextSchema,
    source_id: SourceIdSchema,
    transition: TransitionSchema,
    append_only: z.literal(true),
  })
  .passthrough();

export const HashSemanticsMigrationReceiptSchema = z.strictObject({
  schema_version: z.literal(2),
  receipt_kind: z.literal('hash_semantics_migration'),
  receipt_id: NonEmptyTextSchema,
  recorded_at: TimestampSchema,
  event_order: z.number().int().positive(),
  actor_id: NonEmptyTextSchema,
  package_id: NonEmptyTextSchema,
  source_id: SourceIdSchema,
  state_preserved: z.literal('active'),
  migration_id: NonEmptyTextSchema,
  superseded_receipt_ids: z.array(NonEmptyTextSchema).min(1),
  historical_receipts: z
    .array(
      z.strictObject({
        receipt_id: NonEmptyTextSchema,
        path: RelativePathSchema,
        sha256: Sha256Schema,
      }),
    )
    .min(1),
  legacy_semantics: z.strictObject({
    field: z.literal('normalized_sha256'),
    recorded_sha256: Sha256Schema,
    corrected_role: z.literal('historical_projection_sha256'),
    historical_locator: RelativePathSchema,
    defect: z.literal('mutable_requirements_matrix_was_misclassified_as_normalized_source_bytes'),
  }),
  corrected_source_hashes: z.strictObject({
    raw_sha256: Sha256Schema,
    source_normalized_sha256: Sha256Schema,
    raw_bytes: z.number().int().positive(),
    source_normalized_bytes: z.number().int().positive(),
    normalization_contract: z.literal('source-promotion-v1'),
  }),
  replacement_projection: SourceProjectionSchema,
  verification_status: z.literal('pending_independent_guardian_revalidation'),
  governed_state: z.strictObject({
    source_locked: z.literal(false),
    ready: z.literal(false),
    published: z.literal(false),
  }),
  decision: z.literal('correct_hash_roles_without_rewriting_or_deleting_historical_receipts'),
  append_only: z.literal(true),
});

export const ImportReceiptSchema = z.union([
  PinnedRepositoryTransitionReceiptV2Schema,
  TransitionImportReceiptSchema,
  HashSemanticsMigrationReceiptSchema,
]);

export type ImportReceipt = z.infer<typeof ImportReceiptSchema>;
export type TransitionImportReceipt =
  | z.infer<typeof TransitionImportReceiptSchema>
  | z.infer<typeof PinnedRepositoryTransitionReceiptV2Schema>;
export type HashSemanticsMigrationReceipt = z.infer<typeof HashSemanticsMigrationReceiptSchema>;

export const isTransitionReceipt = (receipt: ImportReceipt): receipt is TransitionImportReceipt =>
  'transition' in receipt;

export const isHashSemanticsMigrationReceipt = (
  receipt: ImportReceipt,
): receipt is HashSemanticsMigrationReceipt =>
  'receipt_kind' in receipt && receipt.receipt_kind === 'hash_semantics_migration';
