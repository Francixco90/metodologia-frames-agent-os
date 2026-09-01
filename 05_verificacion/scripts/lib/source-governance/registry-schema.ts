import {z} from 'zod';

import {
  PinnedRepositorySourceEntryV2Schema,
  RepositorySourcePolicyV1Schema,
} from '../../../../02_proceso/core/contracts/source-governance-v2.ts';
import {
  RelativePathSchema,
  TimestampSchema,
} from '../../../../02_proceso/core/contracts/primitives.ts';
import {
  SourceRegistryEntryCheckSchema,
  type SourceRegistryCheckEntry,
} from './registry-entry-schema.ts';

export const SourceRegistryCheckSchema = z.strictObject({
  schema_version: z.literal(2),
  registry_id: z.literal('source-registry-v2'),
  supersedes_registry: z.literal('source-registry-v1'),
  mutation_policy: z.literal('append-only-events-with-versioned-current-view'),
  lifecycle_contract: RelativePathSchema,
  semantic_migrations: z.array(
    z.strictObject({
      migration_id: z.string().trim().min(1),
      source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
      receipt: RelativePathSchema,
      applied_to_current_view: z.literal(true),
    }),
  ),
  entries: z.array(SourceRegistryEntryCheckSchema).min(1),
});

export type SourceRegistryCheck = z.infer<typeof SourceRegistryCheckSchema>;
export type {SourceRegistryCheckEntry};

export const ProjectLocalSourceRegisterSchema = z.strictObject({
  schema_version: z.literal(1),
  register_id: z.literal('agentic-workflow-adoption-v1-source-register'),
  registry_contract: z.literal('pinned-repository-project-local-register-v1'),
  scope: z.literal('PROJECT_LOCAL'),
  project_root: z.literal('03_artefactos/projects/agentic-workflow-adoption-v1'),
  status: z.literal('EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED'),
  overlay_ownership: z.literal('governance_engineer_only'),
  baseline: z.strictObject({
    frames_commit_sha1: z.literal('9978acd2e9f056fa3634a71ed7c495ba0323af77'),
    observed_at: TimestampSchema,
  }),
  global_authorities: z.strictObject({
    overlay_rule: z.literal('additive_project_local_no_global_registry_mutation'),
    lifecycle_contract: z.strictObject({
      locator: z.literal('04_estado/registries/sources/lifecycle-contract.yml'),
      sha256: z.literal('2fa4f6bd00a69afdc51729963cb3dc0f030bfffa8903d84b6cab93376f01b613'),
    }),
    source_registry: z.strictObject({
      locator: z.literal('04_estado/registries/sources/source-registry.yml'),
      sha256: z.literal('fbba553904040cc8a9d035da3efbdac9f1cbdd269fccaadccfdedca2138fdf8b'),
    }),
  }),
  normalization_contract: z.literal('git-archive-binary-identity-v1'),
  receipt_contract: z.literal('pinned_repository_source_transition_v2'),
  external_evidence_contract: z.strictObject({
    state: z.literal('EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED'),
    versioned_evidence_physically_verified: z
      .tuple([
        z.literal('repository_descriptor'),
        z.literal('selected_paths_manifest'),
        z.literal('selected_paths_projection'),
        z.literal('rights_authorization_projection'),
        z.literal('three_historical_receipts_per_source'),
      ])
      .readonly(),
    observations_not_replayed: z
      .tuple([
        z.literal('source_archive_bytes'),
        z.literal('full_commit_tree'),
        z.literal('selected_blob_contents'),
      ])
      .readonly(),
    prohibited_claims: z
      .tuple([
        z.literal('source_archive_recomputed_in_frames'),
        z.literal('commit_tree_replayed_in_frames'),
        z.literal('selected_blob_hashes_recomputed_from_source_bytes_in_frames'),
      ])
      .readonly(),
    required_coverage_gap: z.literal(
      'external_archive_tree_and_blob_observations_not_replayed_in_frames',
    ),
  }),
  policy: RepositorySourcePolicyV1Schema,
  entries: z.array(PinnedRepositorySourceEntryV2Schema).length(2),
});

export type ProjectLocalSourceRegister = z.infer<typeof ProjectLocalSourceRegisterSchema>;
