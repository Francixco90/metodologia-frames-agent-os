import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {RelativePathSchema, Sha256Schema, TimestampSchema} from '../../../../core/contracts/index.ts';

const SourceIdSchema = z.string().regex(/^SRC-[A-Z0-9-]+$/u);
const ClaimIdSchema = z.string().regex(/^CLM-[A-Z0-9-]+$/u);
const NullableHashSchema = Sha256Schema.nullable();
const NonEmptyTextSchema = z.string().trim().min(1);

const TransitionSchema = z.strictObject({
  from: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']).nullable(),
  to: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
});

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
});

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

const SourceProjectionSchema = z.strictObject({
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
        z
          .object({
            type: NonEmptyTextSchema,
            source_id: SourceIdSchema,
            verdict: NonEmptyTextSchema,
          })
          .strict(),
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

const TransitionImportReceiptSchema = z
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

const HashSemanticsMigrationReceiptSchema = z.strictObject({
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
  TransitionImportReceiptSchema,
  HashSemanticsMigrationReceiptSchema,
]);

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
    z.strictObject({
      source_id: SourceIdSchema,
      use_scope: NonEmptyTextSchema,
    }),
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

export const PortableNotebookBindingSchema = z.discriminatedUnion('mode', [
  z
    .strictObject({
      mode: z.literal('digest'),
      binding_digest: Sha256Schema,
      locator_material_present: z.literal(false),
      coverage: z.strictObject({
        source_count: z.number().int().nonnegative(),
        cited_source_count: z.number().int().nonnegative(),
        coverage_digest: Sha256Schema,
        observed_at: TimestampSchema,
      }),
    })
    .superRefine(({coverage}, context) => {
      if (coverage.cited_source_count > coverage.source_count) {
        context.addIssue({
          code: 'custom',
          message: 'cited_source_count cannot exceed source_count',
          path: ['coverage', 'cited_source_count'],
        });
      }
    }),
  z.strictObject({
    mode: z.literal('none'),
    reason_code: NonEmptyTextSchema,
    locator_material_present: z.literal(false),
  }),
]);

export const NotebookRegistrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('notebook-registry-v1'),
  mutation_policy: z.literal('append-only-records'),
  entries: z.array(
    z.strictObject({
      binding_id: NonEmptyTextSchema,
      adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
      recorded_at: TimestampSchema,
      binding: PortableNotebookBindingSchema,
      state: z.enum(['grounded', 'partial', 'coverage_gap', 'blocked']),
      consequences: z.array(NonEmptyTextSchema).min(1),
    }),
  ),
});

export const NotebookAdapterContractSchema = z.strictObject({
  schema_version: z.literal(1),
  adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
  mode: z.literal('read_only'),
  network_activation: z.literal('disabled'),
  locator_persistence: z.literal('forbidden'),
  unknown_fields: z.literal('reject'),
  allowed_operations: z.array(
    z.enum([
      'resolve_binding_status',
      'read_metadata_digest',
      'read_coverage_digest',
      'query_grounding',
    ]),
  ),
  write_operations: z.array(z.never()).length(0),
  binding_union: z.record(z.string(), z.unknown()),
  request_union: z.strictObject({
    query_grounding: z.strictObject({
      claim_ids: z.strictObject({minimum_items: z.literal(1)}),
    }),
    resolve_binding_status: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
    read_metadata_digest: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
    read_coverage_digest: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
  }),
  outputs: z.record(z.string(), z.unknown()),
  errors: z.array(NonEmptyTextSchema).min(1),
  stop_rules: z.array(NonEmptyTextSchema).min(1),
});

export type CanonicalSourceGaps = z.infer<typeof CanonicalSourceGapsSchema>;
export type ImportReceipt = z.infer<typeof ImportReceiptSchema>;
export type SourceLifecycleContract = z.infer<typeof SourceLifecycleContractSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;

export const readYamlFile = async <Schema extends z.ZodType>(
  relativePath: string,
  schema: Schema,
): Promise<z.output<Schema>> => {
  const raw = await readFile(path.resolve(process.cwd(), relativePath), 'utf8');
  return schema.parse(parse(raw) as unknown);
};

export const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const normalizeSourceBytes = (bytes: Uint8Array): Uint8Array => {
  const decoded = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const withoutBom = decoded.startsWith('\uFEFF') ? decoded.slice(1) : decoded;
  const normalized = withoutBom
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n*$/u, '\n');

  return new TextEncoder().encode(normalized);
};

export const hasAbsoluteLocalLocator = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return (
      /(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\//u.test(value) ||
      /[A-Za-z]:[\\/](?:Users|private)[\\/]/u.test(value) ||
      /file:\/\//u.test(value)
    );
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasAbsoluteLocalLocator(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => hasAbsoluteLocalLocator(item));
  }
  return false;
};

type ReceiptRecord = {
  path: string;
  receipt: ImportReceipt;
};

type TransitionImportReceipt = z.infer<typeof TransitionImportReceiptSchema>;
type HashSemanticsMigrationReceipt = z.infer<typeof HashSemanticsMigrationReceiptSchema>;

const isTransitionReceipt = (receipt: ImportReceipt): receipt is TransitionImportReceipt =>
  'transition' in receipt;

const isHashSemanticsMigrationReceipt = (
  receipt: ImportReceipt,
): receipt is HashSemanticsMigrationReceipt =>
  'receipt_kind' in receipt && receipt.receipt_kind === 'hash_semantics_migration';

export const auditSourceLifecycle = ({
  lifecycle,
  registry,
  receipts,
}: {
  lifecycle: SourceLifecycleContract;
  registry: SourceRegistry;
  receipts: ReceiptRecord[];
}): string[] => {
  const errors: string[] = [];
  const allowedTransitions = new Set(
    lifecycle.allowed_transitions.map(
      (transition) => `${transition.from ?? 'null'}>${transition.to}`,
    ),
  );
  const receiptByPath = new Map(receipts.map((item) => [item.path, item.receipt]));
  const receiptPathById = new Map(
    receipts.map(({path: receiptPath, receipt}) => [receipt.receipt_id, receiptPath]),
  );
  const receiptIds = new Set<string>();
  const sourceIds = new Set<string>();

  for (const {receipt} of receipts) {
    if (receiptIds.has(receipt.receipt_id)) {
      errors.push(`duplicate receipt_id ${receipt.receipt_id}`);
    }
    receiptIds.add(receipt.receipt_id);
    if (isTransitionReceipt(receipt)) {
      const transitionKey = `${receipt.transition.from ?? 'null'}>${receipt.transition.to}`;
      if (!allowedTransitions.has(transitionKey)) {
        errors.push(`forbidden transition ${transitionKey}`);
      }
    }
  }

  for (const migrationReference of registry.semantic_migrations) {
    const receipt = receiptByPath.get(migrationReference.receipt);
    if (
      receipt === undefined ||
      !isHashSemanticsMigrationReceipt(receipt) ||
      receipt.migration_id !== migrationReference.migration_id ||
      receipt.source_id !== migrationReference.source_id
    ) {
      errors.push(`${migrationReference.migration_id}: registry migration receipt mismatch`);
    }
  }

  for (const entry of registry.entries) {
    if (sourceIds.has(entry.source_id)) {
      errors.push(`duplicate source_id ${entry.source_id}`);
    }
    sourceIds.add(entry.source_id);

    const sourceReceipts = entry.receipts
      .map((receiptPath) => {
        const receipt = receiptByPath.get(receiptPath);
        if (receipt === undefined) {
          errors.push(`${entry.source_id}: missing receipt ${receiptPath}`);
        }
        return receipt;
      })
      .filter((receipt): receipt is ImportReceipt => receipt !== undefined)
      .sort((first, second) => first.event_order - second.event_order);

    let previousState: TransitionImportReceipt['transition']['to'] | null = null;
    const eventOrders = new Set<number>();
    for (const [index, receipt] of sourceReceipts.entries()) {
      if (receipt.source_id !== entry.source_id) {
        errors.push(`${entry.source_id}: receipt source mismatch`);
      }
      if (eventOrders.has(receipt.event_order)) {
        errors.push(`${entry.source_id}: duplicate event_order`);
      }
      eventOrders.add(receipt.event_order);
      if (receipt.event_order !== index + 1) {
        errors.push(`${entry.source_id}: receipt event_order sequence has a gap`);
      }
      if (isTransitionReceipt(receipt)) {
        if (receipt.transition.from !== previousState) {
          errors.push(`${entry.source_id}: receipt chain is discontinuous`);
        }
        previousState = receipt.transition.to;
      } else if (receipt.state_preserved !== previousState) {
        errors.push(`${entry.source_id}: semantic migration does not preserve current state`);
      }
    }
    if (previousState !== entry.current_state) {
      errors.push(`${entry.source_id}: receipt chain does not reach current_state`);
    }

    const hasRawHash = entry.hashes.raw_sha256 !== null;
    const hasSourceNormalizedHash = entry.hashes.source_normalized_sha256 !== null;
    if (entry.current_state === 'active') {
      if (!hasRawHash || !hasSourceNormalizedHash) {
        errors.push(`${entry.source_id}: active source is missing hashes`);
      }
      if (
        entry.deduplication.verdict.includes('pending') ||
        entry.deduplication.verdict.includes('unresolved')
      ) {
        errors.push(`${entry.source_id}: active source has unresolved dedupe`);
      }
      for (const field of lifecycle.rights_gate.required_for_active) {
        if (!(field in entry.rights)) {
          errors.push(`${entry.source_id}: active source missing rights ${field}`);
        }
      }
      if (
        !lifecycle.rights_gate.allowed_verdicts.includes(
          entry.rights.rights_verdict as
            | 'allowed_internal_editorial'
            | 'allowed_internal_implementation'
            | 'allowed_local_test_only'
            | 'allowed_publication',
        )
      ) {
        errors.push(`${entry.source_id}: active source rights do not allow use`);
      }
      for (const field of lifecycle.authority_gate.required_for_active) {
        if (!(field in entry.authority)) {
          errors.push(`${entry.source_id}: active source missing authority ${field}`);
        }
      }
      if (
        !lifecycle.authority_gate.authority_classes.includes(
          entry.authority.authority_class as
            | 'first_party'
            | 'first_party_synthetic'
            | 'methodology_reference'
            | 'official_agent_guidance'
            | 'promotional_unverified'
            | 'technical_authority',
        ) ||
        entry.authority.authority_verdict === 'pending'
      ) {
        errors.push(`${entry.source_id}: active source authority is unresolved`);
      }
      const transitionReceipts = sourceReceipts.filter(isTransitionReceipt);
      const evaluatedReceipt = transitionReceipts.find(
        ({transition}) => transition.to === 'evaluated',
      );
      const activeReceipt = transitionReceipts.find(({transition}) => transition.to === 'active');
      if (evaluatedReceipt === undefined || activeReceipt === undefined) {
        errors.push(`${entry.source_id}: active source lacks gate receipts`);
      }
      if (
        activeReceipt !== undefined &&
        (activeReceipt.verifier_id === undefined ||
          activeReceipt.verifier_id === activeReceipt.actor_id)
      ) {
        errors.push(`${entry.source_id}: active receipt lacks independent verifier`);
      }
    } else if (
      (!hasRawHash || !hasSourceNormalizedHash) &&
      (entry.coverage_gaps?.length ?? 0) === 0
    ) {
      errors.push(`${entry.source_id}: missing hashes without coverage_gap`);
    }

    const semanticMigrations = sourceReceipts.filter(isHashSemanticsMigrationReceipt);
    for (const receipt of sourceReceipts) {
      if (!isTransitionReceipt(receipt)) continue;
      const receiptHashes =
        'hashes' in receipt && receipt.hashes !== null && typeof receipt.hashes === 'object'
          ? (receipt.hashes as Record<string, unknown>)
          : undefined;
      if (
        receiptHashes !== undefined &&
        entry.hashes.raw_sha256 !== null &&
        receiptHashes.raw_sha256 !== entry.hashes.raw_sha256
      ) {
        errors.push(`${entry.source_id}: raw hash differs across receipts`);
      }
      if (
        receiptHashes !== undefined &&
        entry.hashes.source_normalized_sha256 !== null &&
        receiptHashes.normalized_sha256 !== entry.hashes.source_normalized_sha256
      ) {
        const supersedingMigration = semanticMigrations.find(
          (migration) =>
            migration.superseded_receipt_ids.includes(receipt.receipt_id) &&
            migration.legacy_semantics.recorded_sha256 === receiptHashes.normalized_sha256 &&
            migration.corrected_source_hashes.source_normalized_sha256 ===
              entry.hashes.source_normalized_sha256,
        );
        if (supersedingMigration === undefined) {
          errors.push(`${entry.source_id}: source-normalized hash differs without migration`);
        }
      }
    }

    for (const migration of semanticMigrations) {
      if (
        migration.corrected_source_hashes.raw_sha256 !== entry.hashes.raw_sha256 ||
        migration.corrected_source_hashes.source_normalized_sha256 !==
          entry.hashes.source_normalized_sha256
      ) {
        errors.push(`${entry.source_id}: semantic migration corrected hashes mismatch registry`);
      }
      if (
        entry.projection === undefined ||
        migration.replacement_projection.projection_id !== entry.projection.projection_id ||
        migration.replacement_projection.projection_sha256 !== entry.projection.projection_sha256 ||
        migration.replacement_projection.projection_locator !== entry.projection.projection_locator
      ) {
        errors.push(`${entry.source_id}: semantic migration projection mismatch registry`);
      }
      const supersededIds = new Set(migration.superseded_receipt_ids);
      const transitionIds = sourceReceipts
        .filter(isTransitionReceipt)
        .map(({receipt_id: receiptId}) => receiptId);
      if (
        supersededIds.size !== transitionIds.length ||
        transitionIds.some((receiptId) => !supersededIds.has(receiptId))
      ) {
        errors.push(`${entry.source_id}: semantic migration lineage is incomplete`);
      }
      const historicalIds = new Set(
        migration.historical_receipts.map(({receipt_id: receiptId}) => receiptId),
      );
      if (
        historicalIds.size !== transitionIds.length ||
        transitionIds.some((receiptId) => !historicalIds.has(receiptId)) ||
        migration.historical_receipts.some(
          ({path: receiptPath, receipt_id: receiptId}) =>
            receiptPathById.get(receiptId) !== receiptPath,
        )
      ) {
        errors.push(`${entry.source_id}: historical receipt hash lineage is incomplete`);
      }
    }
  }

  const sourcesByNormalizedHash = new Map<string, SourceRegistry['entries']>();
  for (const entry of registry.entries) {
    const normalizedHash = entry.hashes.source_normalized_sha256;
    if (normalizedHash !== null) {
      const entries = sourcesByNormalizedHash.get(normalizedHash) ?? [];
      entries.push(entry);
      sourcesByNormalizedHash.set(normalizedHash, entries);
    }
  }
  for (const entries of sourcesByNormalizedHash.values()) {
    if (
      entries.length > 1 &&
      entries.every(({deduplication}) => deduplication.verdict === 'unique')
    ) {
      errors.push('duplicate normalized hash incorrectly marked unique');
    }
  }

  return errors;
};

export const auditCanonicalCoverage = (gaps: CanonicalSourceGaps): string[] => {
  const errors: string[] = [];
  const confirmedSlots = gaps.slots.filter(({source_id: sourceId}) => sourceId !== null);
  if (confirmedSlots.length !== gaps.confirmed_count) {
    errors.push('confirmed_count does not match populated canonical slots');
  }
  if (gaps.confirmed_count < gaps.expected_count) {
    if (
      gaps.consequence.source_locked ||
      gaps.consequence.may_claim_canonical_corpus_ingested ||
      gaps.consequence.may_publish
    ) {
      errors.push('incomplete canonical corpus must remain fail-closed');
    }
    for (const slot of gaps.slots) {
      if (
        slot.source_id === null &&
        (slot.raw_sha256 !== null || slot.normalized_sha256 !== null)
      ) {
        errors.push('empty canonical slot cannot carry content hashes');
      }
    }
  }
  return errors;
};
