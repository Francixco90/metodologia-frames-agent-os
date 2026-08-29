import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {
  CanonicalSourceGapsSchema,
  ClaimRegistrySchema,
  ClaimsLedgerSchema,
  NotebookAdapterContractSchema,
  NotebookRegistrySchema,
  PinnedRepositorySourceEntryV2Schema,
  SourceBundleSchema,
  SourceLifecycleContractSchema,
  SourceRegistrySchema,
  auditPinnedRepositorySourceV2,
  auditSourceLifecycle,
  readYamlFile,
  sha256,
} from '../fixtures/source-notebook/contracts.ts';
import {
  EXPECTED_PINNED_SOURCES,
  EXPECTED_REFERENCE_STATES,
  EXPECTED_SOURCE_IDS,
  PROMPT_HASHES,
  PROMPT_HISTORICAL_RECEIPTS,
  SOURCE_NOTEBOOK_ROOT,
  loadImportReceipts,
  loadPinnedEvidence,
} from '../fixtures/source-notebook/test-support.ts';

describe('source lifecycle production contracts', () => {
  it('parses governed YAML artifacts through strict Zod contracts', async () => {
    const [lifecycle, registry, canonicalGaps, bundle, claims, ledger, contract, notebooks] =
      await Promise.all([
        readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
        readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
        readYamlFile('registries/sources/canonical-source-gaps.yml', CanonicalSourceGapsSchema),
        readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
        readYamlFile('registries/claims/claim-registry.yml', ClaimRegistrySchema),
        readYamlFile('projects/vs-001-source-to-campaign/claims-ledger.yml', ClaimsLedgerSchema),
        readYamlFile('adapters/notebooklm/contract.yml', NotebookAdapterContractSchema),
        readYamlFile('registries/notebooks/notebook-registry.yml', NotebookRegistrySchema),
      ]);
    expect(lifecycle.contract_id).toBe('source-promotion-v2');
    expect(registry.entries.map(({source_id}) => source_id).sort()).toStrictEqual(
      [...EXPECTED_SOURCE_IDS].sort(),
    );
    expect(canonicalGaps.expected_count).toBe(4);
    expect(bundle.state).toBe('PARTIAL_CONTROLLED');
    expect(claims.claims).toHaveLength(3);
    expect(ledger.entries).toHaveLength(3);
    expect(contract.mode).toBe('read_only');
    expect(notebooks.entries).toHaveLength(1);
  });

  it('verifies the complete append-only lifecycle and activation gates', async () => {
    const [lifecycle, registry, receipts] = await Promise.all([
      readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      loadImportReceipts(),
    ]);
    expect(auditSourceLifecycle({lifecycle, registry, receipts})).toStrictEqual([]);

    const active = registry.entries.find(({source_id}) => source_id === 'SRC-SYNTH-VS001');
    expect(active).toMatchObject({
      current_state: 'active',
      rights: {
        allowed_use_scope: 'local_contract_testing_only',
        rights_verdict: 'allowed_local_test_only',
      },
      authority: {authority_verdict: 'verified_for_contract_testing_only'},
    });
    const syntheticActive = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-SYNTH-VS001' &&
        'transition' in receipt &&
        receipt.transition.to === 'active',
    )?.receipt;
    if (syntheticActive === undefined || !('verifier_id' in syntheticActive)) {
      throw new Error('Synthetic active receipt must be a transition receipt with a verifier.');
    }
    expect(syntheticActive.actor_id).not.toBe(syntheticActive.verifier_id);

    const prompt = registry.entries.find(({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6');
    expect(prompt).toMatchObject({
      snapshot_id: 'prompt-maestro-v6-source-v1',
      current_state: 'active',
      portable_locator: 'inbox/first-party/SRC-PROMPT-MAESTRO-V6.projection.yml',
      portable_locator_role: 'derived_projection',
      hashes: {
        raw_sha256: PROMPT_HASHES.raw,
        normalized_sha256: PROMPT_HASHES.sourceNormalized,
        source_normalized_sha256: PROMPT_HASHES.sourceNormalized,
      },
      projection: {
        projection_id: 'prompt-maestro-v6-requirements-projection-v2',
        projection_sha256: PROMPT_HASHES.projection,
        derived_from_source_normalized_sha256: PROMPT_HASHES.sourceNormalized,
        immutable: true,
      },
      rights: {
        allowed_use_scope: 'internal_product_implementation_only',
        rights_verdict: 'allowed_internal_implementation',
      },
      authority: {
        authority_class: 'first_party',
        authority_verdict: 'verified_product_requirements',
      },
    });
    const promptActive = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-PROMPT-MAESTRO-V6' &&
        'transition' in receipt &&
        receipt.transition.to === 'active',
    )?.receipt;
    if (promptActive === undefined || !('verifier_id' in promptActive)) {
      throw new Error('Prompt active receipt must be a transition receipt with a verifier.');
    }
    expect(promptActive.actor_id).not.toBe(promptActive.verifier_id);

    const migration = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-PROMPT-MAESTRO-V6' &&
        'receipt_kind' in receipt &&
        receipt.receipt_kind === 'hash_semantics_migration',
    )?.receipt;
    expect(migration).toMatchObject({
      receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-005',
      event_order: 5,
      state_preserved: 'active',
      legacy_semantics: {recorded_sha256: PROMPT_HASHES.historicalProjection},
      corrected_source_hashes: {
        raw_sha256: PROMPT_HASHES.raw,
        source_normalized_sha256: PROMPT_HASHES.sourceNormalized,
      },
      replacement_projection: {projection_sha256: PROMPT_HASHES.projection},
      historical_receipts: PROMPT_HISTORICAL_RECEIPTS,
      governed_state: {source_locked: false, ready: false, published: false},
    });
    for (const historical of PROMPT_HISTORICAL_RECEIPTS) {
      const bytes = await readFile(path.resolve(SOURCE_NOTEBOOK_ROOT, historical.path));
      expect(sha256(bytes), historical.receipt_id).toBe(historical.sha256);
    }
  });

  it('binds both donor repositories to full Git objects and physical receipt chains', async () => {
    const [lifecycle, registry, receipts] = await Promise.all([
      readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      loadImportReceipts(),
    ]);
    expect(lifecycle.repository_sources).toMatchObject({
      maximum_state_without_h01: 'evaluated',
      git_object_algorithm: 'sha1',
      content_and_receipt_hash_algorithm: 'sha256',
      rights_verdict: 'allowed_internal_implementation',
      allowed_use_scope: 'internal_typescript_reimplementation_only',
    });
    for (const [sourceId, expected] of EXPECTED_PINNED_SOURCES) {
      const candidate = registry.entries.find(({source_id}) => source_id === sourceId);
      const entry = PinnedRepositorySourceEntryV2Schema.parse(candidate);
      expect(entry).toMatchObject({
        current_state: 'evaluated',
        repository_lock: {
          git_object_algorithm: 'sha1',
          commit_object_id: expected.commit,
          tree_object_id: expected.tree,
          limits: {
            external_distribution: 'denied',
            publication: 'denied',
            network_or_delivery: 'denied',
          },
        },
        rights: {
          rights_verdict: 'allowed_internal_implementation',
          allowed_use_scope: 'internal_typescript_reimplementation_only',
        },
        authority: {claim_authority: 'denied'},
      });
      expect(
        auditPinnedRepositorySourceV2({entry, evidence: await loadPinnedEvidence(entry)}),
      ).toStrictEqual([]);
      const bound = receipts.filter(({path: receiptPath}) => entry.receipts.includes(receiptPath));
      expect(bound).toHaveLength(3);
      for (const {receipt} of bound) {
        expect('verifier_id' in receipt).toBe(true);
        if ('verifier_id' in receipt) expect(receipt.actor_id).not.toBe(receipt.verifier_id);
        expect('transition' in receipt && receipt.transition.to === 'active', sourceId).toBe(false);
      }
    }
  });

  it('keeps candidate and quarantined references fail-closed', async () => {
    const [registry, bundle, receipts] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
      loadImportReceipts(),
    ]);
    const entriesById = new Map(registry.entries.map((entry) => [entry.source_id, entry]));
    const activeIds = new Set(bundle.active_sources.map(({source_id}) => source_id));
    expect(bundle.candidate_references.map(({source_id}) => source_id).sort()).toStrictEqual(
      [...EXPECTED_REFERENCE_STATES.keys()].sort(),
    );
    expect([...activeIds].sort()).toStrictEqual(
      ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'].sort(),
    );
    expect(
      bundle.active_sources.find(({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6'),
    ).toMatchObject({
      normalized_sha256: PROMPT_HASHES.sourceNormalized,
      source_normalized_sha256: PROMPT_HASHES.sourceNormalized,
      projection_id: 'prompt-maestro-v6-requirements-projection-v2',
      projection_sha256: PROMPT_HASHES.projection,
    });
    for (const [sourceId, state] of EXPECTED_REFERENCE_STATES) {
      const reference = entriesById.get(sourceId);
      expect(reference?.current_state, sourceId).toBe(state);
      expect(reference?.rights.rights_verdict, sourceId).toBe('unresolved');
      expect(reference?.coverage_gaps?.length, sourceId).toBeGreaterThan(0);
      expect(activeIds.has(sourceId), sourceId).toBe(false);
      expect(
        receipts.some(
          ({receipt}) =>
            receipt.source_id === sourceId &&
            'transition' in receipt &&
            receipt.transition.to === 'active',
        ),
        sourceId,
      ).toBe(false);
    }
  });
});
