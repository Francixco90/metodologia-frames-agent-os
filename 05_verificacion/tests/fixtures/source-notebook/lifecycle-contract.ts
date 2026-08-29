import {z} from 'zod';

import {RepositorySourcePolicyV1Schema} from '../../../../core/contracts/source-governance-v2.ts';
import {NonEmptyTextSchema, TransitionSchema} from './common.ts';

export const SourceLifecycleContractSchema = z.strictObject({
  schema_version: z.literal(2),
  contract_id: z.literal('source-promotion-v2'),
  supersedes_contract: z.literal('source-promotion-v1'),
  mutation_policy: z.literal('append-only-events'),
  initial_state: z.literal('candidate'),
  states: z.array(z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated'])),
  allowed_transitions: z.array(TransitionSchema).min(1),
  normalization: z.strictObject({
    profile_id: z.literal('source-normalization-v1'),
    compatible_legacy_profile_ids: z.array(z.literal('source-promotion-v1')).length(1),
    encoding: z.literal('UTF-8'),
    reject_invalid_utf8: z.literal(true),
    strip_utf8_bom: z.literal(true),
    unicode_form: z.literal('NFC'),
    line_endings: z.literal('LF'),
    trim_trailing_spaces_and_tabs: z.literal(true),
    trailing_newline_count: z.literal(1),
    preserve_internal_whitespace: z.literal(true),
  }),
  hashes: z.strictObject({
    raw: z.strictObject({
      algorithm: z.literal('sha256'),
      input: z.literal('exact_received_bytes'),
      canonical_field: z.literal('raw_sha256'),
    }),
    source_normalized: z.strictObject({
      algorithm: z.literal('sha256'),
      input: z.literal('normalized_utf8_bytes'),
      canonical_field: z.literal('source_normalized_sha256'),
    }),
    normalized_compatibility_alias: z.strictObject({
      field: z.literal('normalized_sha256'),
      semantics: z.literal('source_normalized_sha256'),
      must_equal_canonical_field: z.literal(true),
      status: z.literal('deprecated_compatibility_only'),
    }),
  }),
  projections: z.strictObject({
    distinct_from_source_bytes: z.literal(true),
    required_fields: z
      .array(
        z.enum([
          'projection_id',
          'projection_locator',
          'projection_sha256',
          'projection_bytes',
          'projection_contract',
          'derived_from_source_normalized_sha256',
        ]),
      )
      .length(6),
    mutable_status_forbidden: z.literal(true),
    mutation_rule: z.literal('new_projection_id_and_append_only_migration_receipt'),
  }),
  portable_artifacts: z.strictObject({
    roles: z.array(z.enum(['source_material', 'derived_projection'])).length(2),
    source_material_hash_field: z.literal('source_normalized_sha256'),
    derived_projection_hash_field: z.literal('projection_sha256'),
  }),
  semantic_migrations: z.strictObject({
    receipt_kind: z.literal('hash_semantics_migration'),
    preserve_state: z.literal(true),
    transition_forbidden: z.literal(true),
    required_lineage: z
      .array(
        z.enum([
          'superseded_receipt_ids',
          'historical_receipt_hashes',
          'legacy_misclassified_hash',
          'corrected_source_normalized_sha256',
          'replacement_projection_sha256',
        ]),
      )
      .length(5),
  }),
  deduplication: z.strictObject({
    exact_raw_hash: z.literal('duplicate_exact'),
    exact_normalized_hash: z.literal('duplicate_content'),
    canonical_uri_hash: z.literal('duplicate_locator'),
    near_duplicate: z.literal('human_review_required'),
    rule: z.literal('no_active_promotion_when_duplicate_verdict_is_pending'),
  }),
  rights_gate: z.strictObject({
    required_for_active: z
      .array(z.enum(['rights_holder', 'rights_basis', 'allowed_use_scope', 'rights_verdict']))
      .length(4),
    allowed_verdicts: z
      .array(
        z.enum([
          'allowed_local_test_only',
          'allowed_internal_editorial',
          'allowed_internal_implementation',
          'allowed_publication',
        ]),
      )
      .min(1),
  }),
  authority_gate: z.strictObject({
    required_for_active: z
      .array(z.enum(['authority_class', 'authority_verdict', 'provenance_evidence']))
      .length(3),
    authority_classes: z
      .array(
        z.enum([
          'first_party',
          'first_party_synthetic',
          'technical_authority',
          'official_agent_guidance',
          'methodology_reference',
          'promotional_unverified',
        ]),
      )
      .min(1),
  }),
  active_gate: z.strictObject({
    all_required: z
      .array(
        z.enum([
          'raw_sha256_present',
          'source_normalized_sha256_present',
          'normalized_compatibility_alias_matches',
          'provenance_verified',
          'deduplication_resolved',
          'rights_verdict_allows_requested_scope',
          'authority_verdict_allows_requested_scope',
          'portable_artifact_hash_verified',
          'evaluated_receipt_present',
          'active_receipt_present',
        ]),
      )
      .length(10),
  }),
  stop_rules: z.array(NonEmptyTextSchema).min(1),
  repository_sources: RepositorySourcePolicyV1Schema,
});

export type SourceLifecycleContract = z.infer<typeof SourceLifecycleContractSchema>;
