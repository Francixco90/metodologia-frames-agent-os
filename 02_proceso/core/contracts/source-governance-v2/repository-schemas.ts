import {z} from 'zod';

import {RelativePathSchema, Sha256Schema, TimestampSchema} from '../primitives.ts';
import {
  CanonicalGithubRepositoryUriSchema,
  GitSha1ObjectIdSchema,
  NonEmptyTextSchema,
  PinnedRepositoryArtifactBindingV1Schema,
  PinnedRepositoryLimitsV1Schema,
  PinnedRepositoryManifestBindingV1Schema,
  PinnedRepositoryRestrictionsV1Schema,
  SourceIdSchemaV2,
  sha256Text,
} from './common.ts';
import {PinnedRepositoryReceiptBindingV2Schema} from './receipt-schemas.ts';

export const PinnedRepositoryLockV1Schema = z
  .strictObject({
    contract_id: z.literal('pinned-repository-implementation-source-v1'),
    canonical_uri: CanonicalGithubRepositoryUriSchema,
    canonical_uri_sha256: Sha256Schema,
    git_object_algorithm: z.literal('sha1'),
    commit_object_id: GitSha1ObjectIdSchema,
    tree_object_id: GitSha1ObjectIdSchema,
    tree_listing_sha256: Sha256Schema,
    tracked_file_count: z.number().int().positive(),
    source_archive: z.strictObject({
      format: z.literal('git_archive_tar'),
      sha256: Sha256Schema,
      bytes: z.number().int().positive(),
      versioned_in_frames: z.literal(false),
    }),
    repository_descriptor: PinnedRepositoryArtifactBindingV1Schema,
    selected_paths_manifest: PinnedRepositoryManifestBindingV1Schema,
    selected_paths_projection: PinnedRepositoryArtifactBindingV1Schema,
    rights_authorization_projection: PinnedRepositoryArtifactBindingV1Schema,
    limits: PinnedRepositoryLimitsV1Schema,
  })
  .superRefine((lock, context) => {
    if (sha256Text(lock.canonical_uri) !== lock.canonical_uri_sha256) {
      context.addIssue({
        code: 'custom',
        message: 'canonical_uri_sha256 does not bind the exact canonical URI',
        path: ['canonical_uri_sha256'],
      });
    }
  });

export const PinnedRepositorySourceEntryV2Schema = z
  .strictObject({
    source_id: SourceIdSchemaV2,
    snapshot_id: NonEmptyTextSchema,
    current_state: z.literal('evaluated'),
    source_kind: z.literal('pinned_repository_implementation_source'),
    title: NonEmptyTextSchema,
    canonical_uri: CanonicalGithubRepositoryUriSchema,
    canonical_uri_sha256: Sha256Schema,
    observed_at: TimestampSchema,
    hashes: z.strictObject({
      raw_sha256: Sha256Schema,
      normalized_sha256: Sha256Schema,
      source_normalized_sha256: Sha256Schema,
      raw_bytes: z.number().int().positive(),
      normalized_bytes: z.number().int().positive(),
      normalization_contract: z.literal('git-archive-binary-identity-v1'),
    }),
    repository_lock: PinnedRepositoryLockV1Schema,
    deduplication: z.strictObject({
      verdict: z.literal('unique_canonical_uri_and_commit_within_source_registry_v2'),
      checked_against_registry: z.literal('source-registry-v2'),
    }),
    rights: z.strictObject({
      rights_holder: z.literal('repository_authors_and_rightsholders'),
      rights_basis: z.literal(
        'user_supplied_authorization_for_requested_internal_reimplementation',
      ),
      allowed_use_scope: z.literal('internal_typescript_reimplementation_only'),
      rights_verdict: z.literal('allowed_internal_implementation'),
    }),
    authority: z.strictObject({
      authority_class: z.enum(['methodology_reference', 'technical_authority']),
      authority_verdict: z.literal(
        'verified_pinned_repository_reference_for_internal_reimplementation',
      ),
      provenance_evidence: z.literal(
        'commit_tree_manifest_projection_rights_and_receipt_chain_hash_bound',
      ),
      claim_authority: z.literal('denied'),
    }),
    receipts: z.array(RelativePathSchema).length(3),
    receipt_bindings: z.array(PinnedRepositoryReceiptBindingV2Schema).length(3),
    restrictions: PinnedRepositoryRestrictionsV1Schema,
    coverage_gaps: z.array(NonEmptyTextSchema).min(1),
  })
  .superRefine((entry, context) => {
    if (sha256Text(entry.canonical_uri) !== entry.canonical_uri_sha256) {
      context.addIssue({
        code: 'custom',
        message: 'canonical_uri_sha256 does not bind the exact canonical URI',
        path: ['canonical_uri_sha256'],
      });
    }
    const archive = entry.repository_lock.source_archive;
    if (
      entry.hashes.raw_sha256 !== entry.hashes.normalized_sha256 ||
      entry.hashes.raw_sha256 !== entry.hashes.source_normalized_sha256 ||
      entry.hashes.raw_sha256 !== archive.sha256 ||
      entry.hashes.raw_bytes !== entry.hashes.normalized_bytes ||
      entry.hashes.raw_bytes !== archive.bytes
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Registry archive hashes and byte counts must use binary-identity semantics',
        path: ['hashes'],
      });
    }
    if (
      entry.canonical_uri !== entry.repository_lock.canonical_uri ||
      entry.canonical_uri_sha256 !== entry.repository_lock.canonical_uri_sha256
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Registry locator must equal the repository lock locator',
        path: ['repository_lock', 'canonical_uri'],
      });
    }
    if (
      entry.receipts.some((receipt, index) => receipt !== entry.receipt_bindings[index]?.path) ||
      entry.receipt_bindings.some(({event_order: eventOrder}, index) => eventOrder !== index + 1)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Receipt paths and hash bindings must be aligned in causal order',
        path: ['receipt_bindings'],
      });
    }
  });

export type PinnedRepositorySourceEntryV2 = z.infer<typeof PinnedRepositorySourceEntryV2Schema>;
