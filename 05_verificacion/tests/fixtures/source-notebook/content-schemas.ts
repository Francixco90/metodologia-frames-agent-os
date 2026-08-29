import {z} from 'zod';

import {RelativePathSchema, Sha256Schema} from '../../../../core/contracts/index.ts';
import {ClaimIdSchema, NonEmptyTextSchema, NullableHashSchema, SourceIdSchema} from './common.ts';

export const CanonicalSourceGapsSchema = z.strictObject({
  schema_version: z.literal(1),
  record_id: z.literal('canonical-source-gaps-v1'),
  status: z.literal('coverage_gap'),
  expected_count: z.literal(4),
  confirmed_count: z.number().int().min(0).max(4),
  slots: z
    .array(
      z.strictObject({
        expected_slot: z.number().int().min(1).max(4),
        source_id: SourceIdSchema.nullable(),
        title: NonEmptyTextSchema.nullable(),
        raw_sha256: NullableHashSchema,
        normalized_sha256: NullableHashSchema,
        gap_reason: NonEmptyTextSchema,
      }),
    )
    .length(4),
  consequence: z.strictObject({
    source_locked: z.boolean(),
    may_use_synthetic_fixture: z.boolean(),
    may_claim_canonical_corpus_ingested: z.boolean(),
    may_publish: z.boolean(),
  }),
});

const BundleActiveSourceSchema = z
  .strictObject({
    source_id: SourceIdSchema,
    normalized_sha256: Sha256Schema,
    source_normalized_sha256: Sha256Schema,
    projection_id: NonEmptyTextSchema.optional(),
    projection_sha256: Sha256Schema.optional(),
    use_scope: NonEmptyTextSchema,
  })
  .superRefine((source, context) => {
    if (source.normalized_sha256 !== source.source_normalized_sha256) {
      context.addIssue({
        code: 'custom',
        message: 'bundle normalized alias must equal source_normalized_sha256',
        path: ['normalized_sha256'],
      });
    }
    if ((source.projection_id === undefined) !== (source.projection_sha256 === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'bundle projection ID and hash must be declared together',
        path: ['projection_id'],
      });
    }
  });

export const SourceBundleSchema = z.strictObject({
  schema_version: z.literal(2),
  bundle_id: z.literal('source-bundle-vs-001-v2'),
  project_id: NonEmptyTextSchema,
  source_snapshot_id: NonEmptyTextSchema,
  state: z.literal('PARTIAL_CONTROLLED'),
  source_locked: z.literal(false),
  active_sources: z.array(BundleActiveSourceSchema),
  candidate_references: z.array(
    z.strictObject({source_id: SourceIdSchema, use_scope: NonEmptyTextSchema}),
  ),
  expected_canonical_sources: z.strictObject({
    record: RelativePathSchema,
    expected_count: z.literal(4),
    confirmed_count: z.number().int().min(0).max(4),
  }),
  claims: z.strictObject({
    registry: RelativePathSchema,
    active_claim_ids: z.array(ClaimIdSchema),
  }),
  coverage_gaps: z.array(NonEmptyTextSchema).min(1),
  hard_limits: z.array(NonEmptyTextSchema).min(1),
});

const ClaimSchema = z.strictObject({
  claim_id: ClaimIdSchema,
  state: z.enum(['candidate', 'active', 'deprecated', 'blocked']),
  claim_type: NonEmptyTextSchema,
  text: NonEmptyTextSchema,
  source_id: SourceIdSchema,
  source_snapshot_id: NonEmptyTextSchema,
  source_lines: z.union([z.string(), z.number()]),
  source_normalized_sha256: Sha256Schema,
  support: z.enum(['direct', 'qualified', 'inferred']),
  allowed_use_scope: NonEmptyTextSchema,
});

export const ClaimRegistrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('claim-registry-v1'),
  mutation_policy: z.literal('append-only-records'),
  claims: z.array(ClaimSchema).min(1),
});

export const ClaimsLedgerSchema = z.strictObject({
  schema_version: z.literal(1),
  ledger_id: NonEmptyTextSchema,
  project_id: NonEmptyTextSchema,
  mutation_policy: z.literal('append-only-records'),
  source_snapshot_id: NonEmptyTextSchema,
  entries: z.array(
    z.strictObject({
      claim_id: ClaimIdSchema,
      source_id: SourceIdSchema,
      support: z.enum(['direct', 'qualified', 'inferred']),
      allowed_use_scope: NonEmptyTextSchema,
      status: z.enum(['usable', 'blocked']),
    }),
  ),
  blocked_claim_classes: z.array(NonEmptyTextSchema).min(1),
  coverage_gaps: z.array(NonEmptyTextSchema).min(1),
});

export type CanonicalSourceGaps = z.infer<typeof CanonicalSourceGapsSchema>;
