import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {
  groundingRequestSchema,
  prepareReadOnlyGrounding,
} from '../../../adapters/notebooklm/index.ts';
import {
  NotebookAdapterContractSchema,
  NotebookRegistrySchema,
  PinnedRepositorySourceEntryV2Schema,
  PortableNotebookBindingSchema,
  SourceBundleSchema,
  SourceRegistrySchema,
  hasAbsoluteLocalLocator,
  readYamlFile,
} from '../fixtures/source-notebook/contracts.ts';
import {SOURCE_NOTEBOOK_ROOT} from '../fixtures/source-notebook/test-support.ts';

describe('NotebookLM read-only production contracts', () => {
  it('keeps NotebookLM blocked without a binding and never fabricates grounding', async () => {
    const [contract, notebookRegistry] = await Promise.all([
      readYamlFile('adapters/notebooklm/contract.yml', NotebookAdapterContractSchema),
      readYamlFile('registries/notebooks/notebook-registry.yml', NotebookRegistrySchema),
    ]);
    const entry = notebookRegistry.entries[0];
    expect(contract.network_activation).toBe('disabled');
    expect(contract.write_operations).toStrictEqual([]);
    expect(contract.locator_persistence).toBe('forbidden');
    expect(entry?.state).toBe('coverage_gap');
    expect(entry?.consequences).toEqual(
      expect.arrayContaining([
        'grounding_queries_blocked',
        'no_notebook_claims_may_be_promoted',
        'no_source_locked_claim',
      ]),
    );
    if (entry?.binding.mode !== 'none') {
      throw new Error('Fixture notebook binding must remain in mode none.');
    }
    expect(
      prepareReadOnlyGrounding({
        operation: 'resolve_binding_status',
        binding: {
          mode: 'none',
          reasonCode: entry.binding.reason_code,
          locatorMaterialPresent: false,
        },
        claimIds: [],
      }),
    ).toMatchObject({
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
    const fixture = parse(
      await readFile(
        path.resolve(
          SOURCE_NOTEBOOK_ROOT,
          'adapters/notebooklm/fixtures/positive/binding-digest.yml',
        ),
        'utf8',
      ),
    ) as {request?: {binding?: unknown}};
    expect(PortableNotebookBindingSchema.safeParse(fixture.request?.binding).success).toBe(true);
    const impossible = structuredClone(fixture.request?.binding) as Record<string, unknown>;
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
    const registry = await readYamlFile(
      'registries/sources/source-registry.yml',
      SourceRegistrySchema,
    );
    for (const candidate of registry.entries.filter(
      ({source_kind}) => source_kind === 'pinned_repository_implementation_source',
    )) {
      const entry = PinnedRepositorySourceEntryV2Schema.parse(candidate);
      targets.push(
        entry.repository_lock.repository_descriptor.locator,
        entry.repository_lock.selected_paths_manifest.locator,
        entry.repository_lock.selected_paths_projection.locator,
        entry.repository_lock.rights_authorization_projection.locator,
        ...entry.receipts,
      );
    }
    for (const target of targets) {
      const raw = await readFile(path.resolve(SOURCE_NOTEBOOK_ROOT, target), 'utf8');
      expect(hasAbsoluteLocalLocator(raw), target).toBe(false);
    }
  });

  it('round-trips governed YAML models through JSON without semantic drift', async () => {
    const [registry, bundle] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/source-bundle.yml', SourceBundleSchema),
    ]);
    expect(
      SourceRegistrySchema.parse(JSON.parse(JSON.stringify(registry)) as unknown),
    ).toStrictEqual(registry);
    expect(SourceBundleSchema.parse(JSON.parse(JSON.stringify(bundle)) as unknown)).toStrictEqual(
      bundle,
    );
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
