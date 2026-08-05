import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {prepareReadOnlyGrounding, groundingRequestSchema} from '../../../adapters/notebooklm/index.ts';
import {
  CanonicalSourceGapsSchema,
  ClaimRegistrySchema,
  ClaimsLedgerSchema,
  ImportReceiptSchema,
  NotebookAdapterContractSchema,
  NotebookRegistrySchema,
  PortableNotebookBindingSchema,
  SourceBundleSchema,
  SourceLifecycleContractSchema,
  SourceRegistrySchema,
  auditCanonicalCoverage,
  auditSourceLifecycle,
  hasAbsoluteLocalLocator,
  normalizeSourceBytes,
  readYamlFile,
  sha256,
} from '../fixtures/source-notebook/contracts.ts';

const root = process.cwd();
const receiptDirectory = 'receipts/imports';
const expectedSourceIds = [
  'SRC-LEGACY-STITCH-REMOTION-001',
  'SRC-MAO-BRAND-BUNDLE-001',
  'SRC-MAO-BRAND-VOICE-001',
  'SRC-MAO-PUBLIC-SEMANTICS-001',
  'SRC-METH-IMAGE-001',
  'SRC-METH-JVC-SKOOL-001',
  'SRC-METH-JVC-YT-001',
  'SRC-PROMPT-MAESTRO-V6',
  'SRC-REMOTION-DOCS-001',
  'SRC-REMOTION-SKILLS-001',
  'SRC-SYNTH-VS001',
] as const;
const expectedReferenceStates = new Map([
  ['SRC-LEGACY-STITCH-REMOTION-001', 'quarantined'],
  ['SRC-METH-IMAGE-001', 'candidate'],
  ['SRC-METH-JVC-SKOOL-001', 'candidate'],
  ['SRC-METH-JVC-YT-001', 'candidate'],
  ['SRC-REMOTION-DOCS-001', 'candidate'],
  ['SRC-REMOTION-SKILLS-001', 'candidate'],
] as const);
const promptHashes = {
  raw: '19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2',
  sourceNormalized: '00de50b02d9cf393a5376781938fd0ba01c3bd8b7460e4b379ef9c31b148e505',
  historicalProjection: '02153ec2c50808ae1b91c8dff0bf0f11840ac8237948580b5e0ee6d36cbdf48f',
  projection: 'b75c9baa1afc8a893743e96adfddf09a2580cd9f527abdf91d108ee19d6f50f5',
} as const;
const promptHistoricalReceipts = [
  {
    receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-001',
    path: 'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-candidate.yml',
    sha256: '52493223df5fbe96a95ab75e195ce632bad7319e55fb3dfc7dce44f606c47d84',
  },
  {
    receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-002',
    path: 'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-quarantined.yml',
    sha256: '9851ddb94f379ae6000be31fea0e955e9b50e2e359e0ab2a462e2fd6cbf58660',
  },
  {
    receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-003',
    path: 'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-evaluated.yml',
    sha256: 'c30d699c9ef29dcdee0887fe4d28ccc007a1b88eaaa6e9a416fd3923f3d7c89a',
  },
  {
    receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-004',
    path: 'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-active.yml',
    sha256: 'e27ef1dff0277e0c08a0fe9ce524010f0156218b8ca9bfa0c404931c950a4cbd',
  },
] as const;

const loadImportReceipts = async () => {
  const names = (await readdir(path.resolve(root, receiptDirectory)))
    .filter((name) => name.endsWith('.yml'))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const relativePath = `${receiptDirectory}/${name}`;
      const raw = await readFile(path.resolve(root, relativePath), 'utf8');
      return {
        path: relativePath,
        receipt: ImportReceiptSchema.parse(parse(raw) as unknown),
      };
    }),
  );
};

describe('source and NotebookLM production contracts', () => {
  it('parses governed YAML artifacts through strict Zod contracts', async () => {
    const [
      lifecycle,
      registry,
      canonicalGaps,
      bundle,
      claims,
      ledger,
      notebookContract,
      notebookRegistry,
    ] = await Promise.all([
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
    expect(registry.entries.map(({source_id: sourceId}) => sourceId).sort()).toStrictEqual(
      [...expectedSourceIds].sort(),
    );
    expect(canonicalGaps.expected_count).toBe(4);
    expect(bundle.state).toBe('PARTIAL_CONTROLLED');
    expect(claims.claims).toHaveLength(3);
    expect(ledger.entries).toHaveLength(3);
    expect(notebookContract.mode).toBe('read_only');
    expect(notebookRegistry.entries).toHaveLength(1);
  });

  it('verifies the complete append-only lifecycle and activation gates', async () => {
    const [lifecycle, registry, receipts] = await Promise.all([
      readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      loadImportReceipts(),
    ]);

    expect(auditSourceLifecycle({lifecycle, registry, receipts})).toStrictEqual([]);

    const active = registry.entries.find(({source_id: sourceId}) => sourceId === 'SRC-SYNTH-VS001');
    expect(active?.current_state).toBe('active');
    expect(active?.rights.allowed_use_scope).toBe('local_contract_testing_only');
    expect(active?.rights.rights_verdict).toBe('allowed_local_test_only');
    expect(active?.authority.authority_verdict).toBe('verified_for_contract_testing_only');

    const syntheticActiveReceipt = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-SYNTH-VS001' &&
        'transition' in receipt &&
        receipt.transition.to === 'active',
    )?.receipt;
    expect(syntheticActiveReceipt).toBeDefined();
    if (syntheticActiveReceipt === undefined || !('verifier_id' in syntheticActiveReceipt)) {
      throw new Error('Synthetic active receipt must be a transition receipt with a verifier.');
    }
    expect(syntheticActiveReceipt.actor_id).not.toBe(syntheticActiveReceipt.verifier_id);

    const prompt = registry.entries.find(
      ({source_id: sourceId}) => sourceId === 'SRC-PROMPT-MAESTRO-V6',
    );
    expect(prompt).toMatchObject({
      snapshot_id: 'prompt-maestro-v6-source-v1',
      current_state: 'active',
      portable_locator: 'inbox/first-party/SRC-PROMPT-MAESTRO-V6.projection.yml',
      portable_locator_role: 'derived_projection',
      hashes: {
        raw_sha256: promptHashes.raw,
        normalized_sha256: promptHashes.sourceNormalized,
        source_normalized_sha256: promptHashes.sourceNormalized,
      },
      projection: {
        projection_id: 'prompt-maestro-v6-requirements-projection-v2',
        projection_sha256: promptHashes.projection,
        derived_from_source_normalized_sha256: promptHashes.sourceNormalized,
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

    const promptActiveReceipt = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-PROMPT-MAESTRO-V6' &&
        'transition' in receipt &&
        receipt.transition.to === 'active',
    )?.receipt;
    expect(promptActiveReceipt).toBeDefined();
    if (promptActiveReceipt === undefined || !('verifier_id' in promptActiveReceipt)) {
      throw new Error('Prompt active receipt must be a transition receipt with a verifier.');
    }
    expect(promptActiveReceipt.actor_id).not.toBe(promptActiveReceipt.verifier_id);

    const promptMigrationReceipt = receipts.find(
      ({receipt}) =>
        receipt.source_id === 'SRC-PROMPT-MAESTRO-V6' &&
        'receipt_kind' in receipt &&
        receipt.receipt_kind === 'hash_semantics_migration',
    )?.receipt;
    expect(promptMigrationReceipt).toMatchObject({
      receipt_id: 'RCP-IMP-SRC-PROMPT-MAESTRO-V6-005',
      event_order: 5,
      state_preserved: 'active',
      legacy_semantics: {
        recorded_sha256: promptHashes.historicalProjection,
        corrected_role: 'historical_projection_sha256',
      },
      corrected_source_hashes: {
        raw_sha256: promptHashes.raw,
        source_normalized_sha256: promptHashes.sourceNormalized,
      },
      replacement_projection: {
        projection_sha256: promptHashes.projection,
      },
      historical_receipts: promptHistoricalReceipts,
      governed_state: {
        source_locked: false,
        ready: false,
        published: false,
      },
    });
    if (
      promptMigrationReceipt === undefined ||
      !('receipt_kind' in promptMigrationReceipt) ||
      promptMigrationReceipt.receipt_kind !== 'hash_semantics_migration'
    ) {
      throw new Error('Prompt hash-semantics migration receipt is required.');
    }
    for (const historicalReceipt of promptHistoricalReceipts) {
      const historicalBytes = await readFile(path.resolve(root, historicalReceipt.path));
      expect(sha256(historicalBytes), historicalReceipt.receipt_id).toBe(historicalReceipt.sha256);
    }
  });

  it('keeps candidate and quarantined references fail-closed', async () => {
    const [registry, bundle, receipts] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
      loadImportReceipts(),
    ]);
    const entriesById = new Map(registry.entries.map((entry) => [entry.source_id, entry]));
    const bundledActiveIds = new Set(
      bundle.active_sources.map(({source_id: sourceId}) => sourceId),
    );

    expect(
      bundle.candidate_references.map(({source_id: sourceId}) => sourceId).sort(),
    ).toStrictEqual([...expectedReferenceStates.keys()].sort());
    expect([...bundledActiveIds].sort()).toStrictEqual(
      ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'].sort(),
    );
    expect(
      bundle.active_sources.find(({source_id: sourceId}) => sourceId === 'SRC-PROMPT-MAESTRO-V6'),
    ).toMatchObject({
      normalized_sha256: promptHashes.sourceNormalized,
      source_normalized_sha256: promptHashes.sourceNormalized,
      projection_id: 'prompt-maestro-v6-requirements-projection-v2',
      projection_sha256: promptHashes.projection,
    });

    for (const [sourceId, expectedState] of expectedReferenceStates) {
      const reference = entriesById.get(sourceId);
      expect(reference?.current_state, sourceId).toBe(expectedState);
      expect(reference?.rights.rights_verdict, sourceId).toBe('unresolved');
      expect(reference?.coverage_gaps?.length, sourceId).toBeGreaterThan(0);
      expect(bundledActiveIds.has(sourceId), sourceId).toBe(false);
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

  it('binds raw and normalized hashes to the actual first-party bytes', async () => {
    const registry = await readYamlFile(
      'registries/sources/source-registry.yml',
      SourceRegistrySchema,
    );
    const bytes = await readFile(path.resolve(root, 'inbox/first-party/SRC-SYNTH-VS001.md'));
    const active = registry.entries.find(({source_id: sourceId}) => sourceId === 'SRC-SYNTH-VS001');

    expect(active).toBeDefined();
    expect(sha256(bytes)).toBe(active?.hashes.raw_sha256);
    expect(sha256(normalizeSourceBytes(bytes))).toBe(active?.hashes.source_normalized_sha256);
    expect(active?.hashes.normalized_sha256).toBe(active?.hashes.source_normalized_sha256);
    expect(bytes.byteLength).toBe(active?.hashes.raw_bytes);
    expect(normalizeSourceBytes(bytes).byteLength).toBe(active?.hashes.normalized_bytes);
  });

  it('binds the immutable prompt projection separately from source-normalized bytes', async () => {
    const registry = await readYamlFile(
      'registries/sources/source-registry.yml',
      SourceRegistrySchema,
    );
    const prompt = registry.entries.find(
      ({source_id: sourceId}) => sourceId === 'SRC-PROMPT-MAESTRO-V6',
    );
    if (prompt?.projection === undefined) {
      throw new Error('Prompt source must declare an immutable projection.');
    }
    const projectionBytes = await readFile(
      path.resolve(root, prompt.projection.projection_locator),
    );
    const projection = parse(projectionBytes.toString('utf8')) as {
      projection_id?: string;
      source_hash_binding?: {source_normalized_sha256?: string};
      scope?: {mutable_implementation_status_included?: boolean};
      immutability?: {policy?: string};
    };

    expect(sha256(projectionBytes)).toBe(prompt.projection.projection_sha256);
    expect(projectionBytes.byteLength).toBe(prompt.projection.projection_bytes);
    expect(projection.projection_id).toBe(prompt.projection.projection_id);
    expect(projection.source_hash_binding?.source_normalized_sha256).toBe(
      prompt.hashes.source_normalized_sha256,
    );
    expect(projection.scope?.mutable_implementation_status_included).toBe(false);
    expect(projection.immutability?.policy).toBe('append-only-hash-bound-snapshot');
    expect(prompt.portable_locator).not.toBe('docs/program/requirements-traceability.md');
    expect(prompt.projection.projection_sha256).not.toBe(prompt.hashes.source_normalized_sha256);
  });

  it('keeps the canonical corpus explicitly at 0-of-4 and fail-closed', async () => {
    const [canonicalGaps, bundle, receipts] = await Promise.all([
      readYamlFile('registries/sources/canonical-source-gaps.yml', CanonicalSourceGapsSchema),
      readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
      loadImportReceipts(),
    ]);

    expect(auditCanonicalCoverage(canonicalGaps)).toStrictEqual([]);
    expect(canonicalGaps.confirmed_count).toBe(0);
    expect(
      canonicalGaps.slots.every(
        ({source_id: sourceId, raw_sha256: rawHash}) => sourceId === null && rawHash === null,
      ),
    ).toBe(true);
    expect(bundle.expected_canonical_sources).toMatchObject({
      expected_count: 4,
      confirmed_count: 0,
    });
    expect(bundle.source_locked).toBe(false);
    expect(bundle.hard_limits).toContain('source_locked_must_remain_false');
    expect(
      receipts.some(({receipt}) =>
        canonicalGaps.slots.some(({source_id: sourceId}) => sourceId === receipt.source_id),
      ),
    ).toBe(false);
  });

  it('grounds active claims in source ID, snapshot, hash and exact source lines', async () => {
    const [registry, claimRegistry, ledger, sourceRaw] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('registries/claims/claim-registry.yml', ClaimRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/claims-ledger.yml', ClaimsLedgerSchema),
      readFile(path.resolve(root, 'inbox/first-party/SRC-SYNTH-VS001.md'), 'utf8'),
    ]);
    const sourceById = new Map(registry.entries.map((entry) => [entry.source_id, entry]));
    const sourceLines = sourceRaw.split('\n');

    for (const claim of claimRegistry.claims) {
      const source = sourceById.get(claim.source_id);
      expect(source?.current_state).toBe('active');
      expect(source?.snapshot_id).toBe(claim.source_snapshot_id);
      expect(source?.hashes.source_normalized_sha256).toBe(claim.source_normalized_sha256);

      const [start, end = start] = String(claim.source_lines)
        .split('-')
        .map((value) => Number.parseInt(value, 10));
      expect(start).toBeGreaterThan(0);
      const groundedText = sourceLines
        .slice((start ?? 1) - 1, end)
        .join(' ')
        .replace(/\s+/gu, ' ')
        .replaceAll('`', '')
        .trim();
      expect(groundedText).toBe(claim.text);
    }

    const registryIds = new Set(claimRegistry.claims.map(({claim_id: claimId}) => claimId));
    expect(
      ledger.entries.every(
        ({claim_id: claimId, status}) => registryIds.has(claimId) && status === 'usable',
      ),
    ).toBe(true);
    expect(ledger.blocked_claim_classes).toEqual(
      expect.arrayContaining([
        'performance',
        'customer_outcome',
        'comparative_superiority',
        'commercial_rights',
      ]),
    );
  });

  it('keeps NotebookLM blocked without a binding and never fabricates grounding', async () => {
    const [adapterContract, notebookRegistry] = await Promise.all([
      readYamlFile('adapters/notebooklm/contract.yml', NotebookAdapterContractSchema),
      readYamlFile('registries/notebooks/notebook-registry.yml', NotebookRegistrySchema),
    ]);
    const registryEntry = notebookRegistry.entries[0];

    expect(adapterContract.network_activation).toBe('disabled');
    expect(adapterContract.write_operations).toStrictEqual([]);
    expect(adapterContract.locator_persistence).toBe('forbidden');
    expect(registryEntry?.state).toBe('coverage_gap');
    expect(registryEntry?.consequences).toEqual(
      expect.arrayContaining([
        'grounding_queries_blocked',
        'no_notebook_claims_may_be_promoted',
        'no_source_locked_claim',
      ]),
    );

    if (registryEntry?.binding.mode !== 'none') {
      throw new Error('Fixture notebook binding must remain in mode none.');
    }
    const result = prepareReadOnlyGrounding({
      operation: 'resolve_binding_status',
      binding: {
        mode: 'none',
        reasonCode: registryEntry.binding.reason_code,
        locatorMaterialPresent: false,
      },
      claimIds: [],
    });
    expect(result).toMatchObject({
      status: 'blocked',
      bindingMode: 'none',
      coverageStatus: 'unavailable',
      evidence: [],
      errorCode: 'NOTEBOOK_BINDING_NONE',
    });

    const digest = 'a'.repeat(64);
    const dryResult = prepareReadOnlyGrounding({
      operation: 'query_grounding',
      binding: {
        mode: 'digest',
        bindingDigest: digest,
        coverage: {
          sourceCount: 1,
          citedSourceCount: 1,
          coverageDigest: digest,
          observedAt: '2026-07-19T20:38:02Z',
        },
        locatorMaterialPresent: false,
      },
      claimIds: ['CLM-VS001-001'],
    });
    expect(dryResult.status).toBe('partial');
    expect(dryResult.evidence).toStrictEqual([]);
    expect('grounded' in dryResult).toBe(false);
  });

  it('validates portable digest coverage and rejects impossible citation counts', async () => {
    const positiveFixture = parse(
      await readFile(
        path.resolve(root, 'adapters/notebooklm/fixtures/positive/binding-digest.yml'),
        'utf8',
      ),
    ) as {
      request?: {binding?: unknown};
    };
    expect(PortableNotebookBindingSchema.safeParse(positiveFixture.request?.binding).success).toBe(
      true,
    );

    const impossible = structuredClone(positiveFixture.request?.binding) as Record<string, unknown>;
    const coverage = impossible.coverage as Record<string, unknown>;
    coverage.cited_source_count = 4;
    coverage.source_count = 3;
    expect(PortableNotebookBindingSchema.safeParse(impossible).success).toBe(false);
  });

  it('contains no absolute local locators in versioned source or notebook outputs', async () => {
    const targets = [
      'adapters/notebooklm/contract.yml',
      'registries/notebooks/binding-contract.yml',
      'registries/notebooks/notebook-registry.yml',
      'registries/sources/lifecycle-contract.yml',
      'registries/sources/source-registry.yml',
      'registries/sources/canonical-source-gaps.yml',
      'registries/claims/claim-registry.yml',
      'receipts/imports/20260719-SRC-SYNTH-VS001-candidate.yml',
      'receipts/imports/20260719-SRC-SYNTH-VS001-quarantined.yml',
      'receipts/imports/20260719-SRC-SYNTH-VS001-evaluated.yml',
      'receipts/imports/20260719-SRC-SYNTH-VS001-active.yml',
      'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-candidate.yml',
      'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-quarantined.yml',
      'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-evaluated.yml',
      'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-active.yml',
      'receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-hash-semantics-migration.yml',
      'inbox/first-party/SRC-PROMPT-MAESTRO-V6.projection.yml',
      'projects/vs-001-source-to-campaign/source-bundle.yml',
      'projects/vs-001-source-to-campaign/claims-ledger.yml',
    ];

    for (const target of targets) {
      const raw = await readFile(path.resolve(root, target), 'utf8');
      expect(hasAbsoluteLocalLocator(raw), target).toBe(false);
    }
  });

  it('round-trips governed YAML models through JSON without semantic drift', async () => {
    const [registry, bundle] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
    ]);
    const registryJson = JSON.parse(JSON.stringify(registry)) as unknown;
    const bundleJson = JSON.parse(JSON.stringify(bundle)) as unknown;

    expect(SourceRegistrySchema.parse(registryJson)).toStrictEqual(registry);
    expect(SourceBundleSchema.parse(bundleJson)).toStrictEqual(bundle);
  });

  it('production request schema accepts every declared read-only operation', async () => {
    const contract = await readYamlFile(
      'adapters/notebooklm/contract.yml',
      NotebookAdapterContractSchema,
    );
    for (const operation of contract.allowed_operations) {
      expect(
        groundingRequestSchema.safeParse({
          operation,
          binding: {
            mode: 'none',
            reasonCode: 'binding-not-selected',
            locatorMaterialPresent: false,
          },
          claimIds: operation === 'query_grounding' ? ['CLM-VS001-001'] : [],
        }).success,
      ).toBe(true);
    }
  });
});
