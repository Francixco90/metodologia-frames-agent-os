import {createHash} from 'node:crypto';

import {z} from 'zod';

import {RelativePathSchema, Sha256Schema} from '../primitives.ts';

export const NonEmptyTextSchema = z.string().trim().min(1);
export const SourceIdSchemaV2 = z.string().regex(/^SRC-[A-Z0-9-]+$/u);

/** Git object identifiers remain SHA-1 in the pinned donor repositories. */
export const GitSha1ObjectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{40}$/u, 'Expected a full lowercase Git SHA-1 object ID');

export const CanonicalGithubRepositoryUriSchema = z
  .url()
  .regex(
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/u,
    'Expected a canonical HTTPS GitHub repository URI ending in .git',
  );

export const PINNED_REPOSITORY_RESTRICTIONS_V1 = [
  'internal_typescript_reimplementation_only',
  'no_full_runtime_vendoring',
  'no_asset_copy_without_separate_traceability',
  'no_external_distribution',
  'no_publication_authority',
  'no_network_or_delivery_authority',
] as const;

export const PinnedRepositoryRestrictionsV1Schema = z
  .array(z.enum(PINNED_REPOSITORY_RESTRICTIONS_V1))
  .length(PINNED_REPOSITORY_RESTRICTIONS_V1.length)
  .superRefine((restrictions, context) => {
    if (
      restrictions.some(
        (restriction, index) => restriction !== PINNED_REPOSITORY_RESTRICTIONS_V1[index],
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Pinned repository restrictions must be complete and canonically ordered',
      });
    }
  });

export const PinnedRepositoryArtifactBindingV1Schema = z.strictObject({
  locator: RelativePathSchema,
  sha256: Sha256Schema,
  bytes: z.number().int().positive(),
});

export const PinnedRepositoryManifestBindingV1Schema =
  PinnedRepositoryArtifactBindingV1Schema.extend({
    format: z.literal('utf8_lf_tsv_v1'),
    selected_path_count: z.number().int().positive(),
  });

export const PinnedRepositoryLimitsV1Schema = z.strictObject({
  allowed_use_scope: z.literal('internal_typescript_reimplementation_only'),
  claim_authority: z.literal('denied'),
  full_runtime_vendoring: z.literal('denied'),
  asset_copy_without_separate_traceability: z.literal('denied'),
  external_distribution: z.literal('denied'),
  publication: z.literal('denied'),
  network_or_delivery: z.literal('denied'),
});

export const sha256Bytes = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const sha256Text = (value: string): string => sha256Bytes(new TextEncoder().encode(value));

export const sameArray = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);
