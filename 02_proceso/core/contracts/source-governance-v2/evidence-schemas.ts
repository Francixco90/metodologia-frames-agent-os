import {z} from 'zod';

import {RelativePathSchema, Sha256Schema} from '../primitives.ts';
import {
  CanonicalGithubRepositoryUriSchema,
  GitSha1ObjectIdSchema,
  NonEmptyTextSchema,
  PinnedRepositoryArtifactBindingV1Schema,
  PinnedRepositoryRestrictionsV1Schema,
  SourceIdSchemaV2,
} from './common.ts';

export const PinnedRepositoryDescriptorV1Schema = z.strictObject({
  schema_version: z.literal(1),
  descriptor_id: NonEmptyTextSchema,
  source_id: SourceIdSchemaV2,
  status: z.literal('EVALUATED'),
  repository: z.strictObject({
    canonical_uri: CanonicalGithubRepositoryUriSchema,
    canonical_uri_sha256: Sha256Schema,
    commit_sha1: GitSha1ObjectIdSchema,
    tree_sha1: GitSha1ObjectIdSchema,
    tree_listing_sha256: Sha256Schema,
    tracked_file_count: z.number().int().positive(),
  }),
  source_archive: z.strictObject({
    format: z.literal('git_archive_tar'),
    sha256: Sha256Schema,
    bytes: z.number().int().positive(),
    versioned_in_frames: z.literal(false),
  }),
  selected_paths_manifest: z.strictObject({
    locator: RelativePathSchema,
    sha256: Sha256Schema,
    bytes: z.number().int().positive(),
    selected_path_count: z.number().int().positive(),
    content_copied: z.literal(false),
  }),
  selected_paths_projection: PinnedRepositoryArtifactBindingV1Schema,
  rights_authorization_projection: PinnedRepositoryArtifactBindingV1Schema,
  assumption: z.literal('[SUPUESTO] user_authorized_internal_implementation'),
  restrictions: PinnedRepositoryRestrictionsV1Schema,
});

export const PinnedRepositorySelectedPathsProjectionV1Schema = z.strictObject({
  schema_version: z.literal(1),
  projection_id: NonEmptyTextSchema,
  source_id: SourceIdSchemaV2,
  copy_policy: z.literal('metadata_only_no_source_bytes'),
  manifest_contract: z.strictObject({
    format: z.literal('utf8_lf_tsv_v1'),
    columns: z
      .tuple([
        z.literal('repository_relative_path'),
        z.literal('git_blob_sha1'),
        z.literal('source_file_sha256'),
        z.literal('source_file_bytes'),
      ])
      .readonly(),
    order: z.literal('bytewise_lexicographic_by_repository_relative_path'),
    selected_path_count: z.number().int().positive(),
  }),
  selections: z.array(
    z.strictObject({
      purpose: NonEmptyTextSchema,
      decision: NonEmptyTextSchema,
      paths: z.array(RelativePathSchema).min(1),
    }),
  ),
  excluded_classes: z.array(NonEmptyTextSchema).min(1),
  target: z.record(z.string(), NonEmptyTextSchema),
});

export const PinnedRepositoryRightsProjectionV1Schema = z
  .strictObject({
    schema_version: z.literal(1),
    evidence_projection_id: NonEmptyTextSchema,
    source_id: SourceIdSchemaV2,
    evidence_kind: z.enum([
      'user_instruction_projection',
      'user_instruction_and_tracked_license_projection',
    ]),
    assumption: z.literal('[SUPUESTO] user_authorized_internal_implementation'),
    rights_verdict: z.literal('allowed_internal_implementation'),
    allowed_use_scope: z.literal('internal_typescript_reimplementation_only'),
    external_distribution_authorized: z.literal(false),
    observations: z.strictObject({
      tracked_license_file_observed: z.boolean(),
      tracked_license_scope: NonEmptyTextSchema.optional(),
      tracked_license_sha256: Sha256Schema.optional(),
      repository_ownership_inferred: z.literal(false),
      public_license_inferred: z.literal(false),
      source_bytes_versioned_in_frames: z.literal(false),
    }),
    restrictions: PinnedRepositoryRestrictionsV1Schema,
    evidence_limits: z.array(NonEmptyTextSchema).min(1),
  })
  .superRefine((projection, context) => {
    const observations = projection.observations;
    if (observations.tracked_license_file_observed) {
      if (projection.evidence_kind !== 'user_instruction_and_tracked_license_projection') {
        context.addIssue({
          code: 'custom',
          message: 'Observed license requires license evidence kind',
        });
      }
      for (const field of ['tracked_license_scope', 'tracked_license_sha256'] as const) {
        if (observations[field] === undefined) {
          context.addIssue({
            code: 'custom',
            message: `Observed license requires ${field}`,
            path: ['observations', field],
          });
        }
      }
    } else if (
      projection.evidence_kind !== 'user_instruction_projection' ||
      observations.tracked_license_scope !== undefined ||
      observations.tracked_license_sha256 !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unobserved license cannot carry tracked-license evidence',
        path: ['observations'],
      });
    }
  });
