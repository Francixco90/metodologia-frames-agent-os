import {z} from 'zod';

import {RelativePathSchema, Sha256Schema} from '../../../../core/contracts/index.ts';
import {NonEmptyTextSchema, NullableHashSchema, SourceIdSchema} from './common.ts';

const SourceHashesSchema = z
  .object({
    raw_sha256: NullableHashSchema,
    normalized_sha256: NullableHashSchema,
    source_normalized_sha256: NullableHashSchema,
    raw_bytes: z.number().int().nonnegative().optional(),
    normalized_bytes: z.number().int().nonnegative().optional(),
    normalization_contract: NonEmptyTextSchema.optional(),
    status: z.literal('not_ingested').optional(),
  })
  .strict()
  .superRefine(
    ({normalized_sha256: compatibilityAlias, source_normalized_sha256: canonical}, context) => {
      if (compatibilityAlias !== canonical) {
        context.addIssue({
          code: 'custom',
          message: 'normalized_sha256 compatibility alias must equal source_normalized_sha256',
          path: ['normalized_sha256'],
        });
      }
    },
  );

export const SourceProjectionSchema = z.strictObject({
  projection_id: NonEmptyTextSchema,
  projection_locator: RelativePathSchema,
  projection_sha256: Sha256Schema,
  projection_bytes: z.number().int().positive(),
  projection_contract: NonEmptyTextSchema,
  derived_from_source_normalized_sha256: Sha256Schema,
  immutable: z.literal(true),
});

const SourceRightsSchema = z
  .object({
    rights_holder: NonEmptyTextSchema.optional(),
    rights_basis: NonEmptyTextSchema.optional(),
    allowed_use_scope: NonEmptyTextSchema.optional(),
    rights_verdict: NonEmptyTextSchema,
  })
  .strict();

const SourceAuthoritySchema = z
  .object({
    authority_class: NonEmptyTextSchema,
    authority_verdict: NonEmptyTextSchema,
    provenance_evidence: NonEmptyTextSchema,
    claim_authority: z.literal('denied').optional(),
  })
  .strict();

const SourceEntrySchema = z
  .object({
    source_id: SourceIdSchema,
    snapshot_id: NonEmptyTextSchema.optional(),
    current_state: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
    source_kind: NonEmptyTextSchema,
    title: NonEmptyTextSchema,
    portable_locator: RelativePathSchema.optional(),
    portable_locator_role: z.enum(['source_material', 'derived_projection']).optional(),
    canonical_uri: z.url().optional(),
    canonical_uri_sha256: Sha256Schema.optional(),
    observed_author: NonEmptyTextSchema.optional(),
    observed_at: NonEmptyTextSchema,
    hashes: SourceHashesSchema,
    projection: SourceProjectionSchema.optional(),
    deduplication: z
      .object({
        verdict: NonEmptyTextSchema,
        checked_against_registry: NonEmptyTextSchema.optional(),
      })
      .strict(),
    rights: SourceRightsSchema,
    authority: SourceAuthoritySchema,
    relations: z
      .array(
        z.strictObject({
          type: NonEmptyTextSchema,
          source_id: SourceIdSchema,
          verdict: NonEmptyTextSchema,
        }),
      )
      .optional(),
    receipts: z.array(RelativePathSchema).min(1),
    restrictions: z.array(NonEmptyTextSchema).optional(),
    coverage_gaps: z.array(NonEmptyTextSchema).optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    if ((entry.portable_locator === undefined) !== (entry.portable_locator_role === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'portable_locator and portable_locator_role must be declared together',
        path: ['portable_locator'],
      });
    }
    if (entry.portable_locator_role === 'derived_projection') {
      if (entry.projection === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'derived_projection locator requires projection metadata',
          path: ['projection'],
        });
      } else {
        if (entry.projection.projection_locator !== entry.portable_locator) {
          context.addIssue({
            code: 'custom',
            message: 'projection locator must equal portable locator',
            path: ['projection', 'projection_locator'],
          });
        }
        if (
          entry.projection.derived_from_source_normalized_sha256 !==
          entry.hashes.source_normalized_sha256
        ) {
          context.addIssue({
            code: 'custom',
            message: 'projection must bind the canonical source-normalized hash',
            path: ['projection', 'derived_from_source_normalized_sha256'],
          });
        }
      }
    }
    if (entry.portable_locator_role === 'source_material' && entry.projection !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'source material locator cannot also be a derived projection',
        path: ['projection'],
      });
    }
  });

export const SourceRegistrySchema = z.strictObject({
  schema_version: z.literal(2),
  registry_id: z.literal('source-registry-v2'),
  supersedes_registry: z.literal('source-registry-v1'),
  mutation_policy: z.literal('append-only-events-with-versioned-current-view'),
  lifecycle_contract: RelativePathSchema,
  semantic_migrations: z.array(
    z.strictObject({
      migration_id: NonEmptyTextSchema,
      source_id: SourceIdSchema,
      receipt: RelativePathSchema,
      applied_to_current_view: z.literal(true),
    }),
  ),
  entries: z.array(SourceEntrySchema).min(1),
});

export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;
