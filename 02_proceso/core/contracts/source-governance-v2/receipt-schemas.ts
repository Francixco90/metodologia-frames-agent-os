import {z} from 'zod';

import {RelativePathSchema, Sha256Schema, TimestampSchema} from '../primitives.ts';
import {
  CanonicalGithubRepositoryUriSchema,
  GitSha1ObjectIdSchema,
  NonEmptyTextSchema,
  PinnedRepositoryRestrictionsV1Schema,
  SourceIdSchemaV2,
  sha256Text,
} from './common.ts';

export const PinnedRepositoryReceiptBindingV2Schema = z.strictObject({
  path: RelativePathSchema,
  sha256: Sha256Schema,
  event_order: z.number().int().min(1).max(3),
});

export const ProjectLocalSourceRegisterScopeReceiptV1Schema = z
  .strictObject({
    schema_version: z.literal(1),
    receipt_kind: z.literal('source_register_scope_migration_v1'),
    receipt_id: z.literal('RCP-AWF-ADOPTION-V1-PROJECT-LOCAL-SCOPE-001'),
    recorded_at: TimestampSchema,
    actor_id: NonEmptyTextSchema,
    verifier_id: NonEmptyTextSchema,
    register_id: z.literal('agentic-workflow-adoption-v1-source-register'),
    register_locator: z.literal(
      '03_artefactos/projects/agentic-workflow-adoption-v1/source-register.yml',
    ),
    register_sha256: Sha256Schema,
    integration_scope: z.literal('PROJECT_LOCAL'),
    global_registry_integration_authorized: z.literal(false),
    historical_receipts_immutable: z.literal(true),
    historical_receipt_bindings: z
      .array(
        z.strictObject({
          source_id: z.enum(['SRC-PROPOSAL-MEASURE-E0D6BA4', 'SRC-TECHNICAL-DEFENSE-78FD383']),
          receipts: z.array(PinnedRepositoryReceiptBindingV2Schema).length(3),
        }),
      )
      .length(2),
    external_evidence_state: z.literal('EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED'),
    versioned_evidence_verification: z.strictObject({
      repository_descriptors: z.literal(2),
      selected_paths_manifests: z.literal(2),
      selected_paths_projections: z.literal(2),
      rights_authorization_projections: z.literal(2),
      historical_receipts: z.literal(6),
      verdict: z.literal('physical_hash_bytes_and_schema_verified'),
    }),
    union_deduplication: z.strictObject({
      scope: z.literal('global_source_registry_plus_project_local_register'),
      keys: z
        .tuple([
          z.literal('canonical_uri'),
          z.literal('raw_sha256'),
          z.literal('source_normalized_sha256'),
          z.literal('commit_sha1'),
        ])
        .readonly(),
      verdict: z.literal('unique_within_scoped_union'),
    }),
    interpretation: z.strictObject({
      superseded_ambiguous_field: z.literal('review.registry_integration_authorized'),
      historical_true_means: z.literal(
        'historical_evaluation_complete_for_scoped_registration_review',
      ),
      does_not_authorize_global_registry_integration: z.literal(true),
    }),
    append_only: z.literal(true),
  })
  .superRefine((receipt, context) => {
    if (receipt.actor_id === receipt.verifier_id) {
      context.addIssue({
        code: 'custom',
        message: 'Scope migration actor and verifier must be different actor instances',
        path: ['verifier_id'],
      });
    }
    if (
      new Set(receipt.historical_receipt_bindings.map(({source_id: sourceId}) => sourceId)).size !==
      2
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Scope migration must bind each donor exactly once',
        path: ['historical_receipt_bindings'],
      });
    }
  });

export const PinnedRepositoryReceiptAuthorizationV2Schema = z.strictObject({
  rights_holder: z.literal('repository_authors_and_rightsholders'),
  rights_basis: z.literal('user_supplied_authorization_for_requested_internal_reimplementation'),
  rights_verdict: z.literal('allowed_internal_implementation'),
  allowed_use_scope: z.literal('internal_typescript_reimplementation_only'),
  external_distribution_authorized: z.literal(false),
});

export const PinnedRepositoryReceiptRepositoryV2Schema = z
  .strictObject({
    canonical_uri: CanonicalGithubRepositoryUriSchema,
    canonical_uri_sha256: Sha256Schema,
    git_object_algorithm: z.literal('sha1'),
    commit_sha1: GitSha1ObjectIdSchema,
    tree_sha1: GitSha1ObjectIdSchema,
    tree_listing_sha256: Sha256Schema,
    tracked_file_count: z.number().int().positive(),
  })
  .superRefine((repository, context) => {
    if (sha256Text(repository.canonical_uri) !== repository.canonical_uri_sha256) {
      context.addIssue({
        code: 'custom',
        message: 'canonical_uri_sha256 does not bind the exact canonical URI',
        path: ['canonical_uri_sha256'],
      });
    }
  });

export const PinnedRepositoryReceiptEvidenceV2Schema = z.strictObject({
  repository_descriptor: RelativePathSchema,
  repository_descriptor_sha256: Sha256Schema,
  selected_paths_manifest_sha256: Sha256Schema,
  selected_paths_projection_sha256: Sha256Schema,
  rights_authorization_projection_sha256: Sha256Schema,
});

export const PinnedRepositoryReceiptAuthorityV2Schema = z.strictObject({
  authority_class: z.enum(['methodology_reference', 'technical_authority']),
  authority_verdict: NonEmptyTextSchema,
  provenance_evidence: NonEmptyTextSchema,
});

export const PinnedRepositoryReceiptDeduplicationV2Schema = z.strictObject({
  verdict: NonEmptyTextSchema,
  checked_against_registry: NonEmptyTextSchema,
});

export const PinnedRepositoryCoverageGapResolutionV2Schema = z.strictObject({
  gap: NonEmptyTextSchema,
  resolution: NonEmptyTextSchema,
  evidence: NonEmptyTextSchema,
});

export const PinnedRepositoryTransitionReceiptV2Schema = z
  .strictObject({
    schema_version: z.literal(2),
    receipt_kind: z.literal('pinned_repository_source_transition_v2'),
    receipt_id: NonEmptyTextSchema,
    recorded_at: TimestampSchema,
    event_order: z.number().int().min(1).max(3),
    actor_id: NonEmptyTextSchema,
    verifier_id: NonEmptyTextSchema,
    package_id: NonEmptyTextSchema,
    source_id: SourceIdSchemaV2,
    transition: z.strictObject({
      from: z.enum(['candidate', 'quarantined']).nullable(),
      to: z.enum(['candidate', 'quarantined', 'evaluated']),
    }),
    previous_receipt_sha256: Sha256Schema.nullable(),
    hashes: z.strictObject({
      raw_sha256: Sha256Schema,
      normalized_sha256: Sha256Schema,
      source_normalized_sha256: Sha256Schema,
    }),
    hash_semantics: z.strictObject({
      raw: z.literal('git_archive_tar_bytes_for_exact_pinned_commit'),
      normalized: z.literal('binary_identity_same_as_raw'),
      normalization_contract: z.literal('git-archive-binary-identity-v1'),
      raw_bytes: z.number().int().positive(),
    }),
    repository: PinnedRepositoryReceiptRepositoryV2Schema,
    evidence_projection: PinnedRepositoryReceiptEvidenceV2Schema,
    rights: PinnedRepositoryReceiptAuthorizationV2Schema,
    authority: PinnedRepositoryReceiptAuthorityV2Schema,
    deduplication: PinnedRepositoryReceiptDeduplicationV2Schema,
    checks: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
    restrictions: PinnedRepositoryRestrictionsV1Schema,
    coverage_gaps: z.array(NonEmptyTextSchema).min(1),
    coverage_gap_resolutions: z.array(PinnedRepositoryCoverageGapResolutionV2Schema).optional(),
    decision: NonEmptyTextSchema,
    append_only: z.literal(true),
    review: z.strictObject({
      registry_integration_authorized: z.boolean(),
      contract_hash_chain: NonEmptyTextSchema,
      guardian_revalidation: NonEmptyTextSchema,
    }),
  })
  .superRefine((receipt, context) => {
    if (receipt.actor_id === receipt.verifier_id) {
      context.addIssue({
        code: 'custom',
        message: 'Receipt actor and verifier must be different actor instances',
        path: ['verifier_id'],
      });
    }
    if (
      receipt.hashes.raw_sha256 !== receipt.hashes.normalized_sha256 ||
      receipt.hashes.raw_sha256 !== receipt.hashes.source_normalized_sha256
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Binary-identity archive hashes must be identical',
        path: ['hashes'],
      });
    }
  });

export type PinnedRepositoryTransitionReceiptV2 = z.infer<
  typeof PinnedRepositoryTransitionReceiptV2Schema
>;
