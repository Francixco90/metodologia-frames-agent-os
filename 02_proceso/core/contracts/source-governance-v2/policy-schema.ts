import {z} from 'zod';

import {PinnedRepositoryRestrictionsV1Schema} from './common.ts';

export const RepositorySourcePolicyV1Schema = z.strictObject({
  contract_id: z.literal('pinned-repository-implementation-source-v1'),
  additive_to_registry_schema: z.literal(2),
  maximum_state_without_h01: z.literal('evaluated'),
  git_object_algorithm: z.literal('sha1'),
  content_and_receipt_hash_algorithm: z.literal('sha256'),
  required_transitions: z
    .tuple([
      z.literal('null>candidate'),
      z.literal('candidate>quarantined'),
      z.literal('quarantined>evaluated'),
    ])
    .readonly(),
  required_portable_artifacts: z
    .tuple([
      z.literal('repository_descriptor'),
      z.literal('selected_paths_manifest'),
      z.literal('selected_paths_projection'),
      z.literal('rights_authorization_projection'),
    ])
    .readonly(),
  receipt_chain: z.strictObject({
    receipt_schema_version: z.literal(2),
    receipt_kind: z.literal('pinned_repository_source_transition_v2'),
    physical_sha256_binding_required: z.literal(true),
    previous_receipt_sha256_required_after_first: z.literal(true),
    actor_and_verifier_must_differ: z.literal(true),
    immutable_fields: z
      .tuple([
        z.literal('source_id'),
        z.literal('repository.canonical_uri'),
        z.literal('repository.commit_sha1'),
        z.literal('repository.tree_sha1'),
        z.literal('evidence_projection.selected_paths_manifest_sha256'),
        z.literal('rights.allowed_use_scope'),
        z.literal('restrictions'),
      ])
      .readonly(),
  }),
  rights_verdict: z.literal('allowed_internal_implementation'),
  allowed_use_scope: z.literal('internal_typescript_reimplementation_only'),
  restrictions: PinnedRepositoryRestrictionsV1Schema,
});
