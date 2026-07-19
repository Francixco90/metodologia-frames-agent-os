import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {groundingRequestSchema, notebookBindingSchema} from '../../adapters/notebooklm/index.ts';
import {
  CanonicalSourceGapsSchema,
  ImportReceiptSchema,
  SourceLifecycleContractSchema,
  SourceRegistrySchema,
  auditCanonicalCoverage,
  auditSourceLifecycle,
  readYamlFile,
} from '../fixtures/source-notebook/contracts.ts';

const root = process.cwd();

const loadSourceSystem = async () => {
  const [lifecycle, registry, receiptNames] = await Promise.all([
    readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
    readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
    readdir(path.resolve(root, 'receipts/imports')),
  ]);
  const receipts = await Promise.all(
    receiptNames
      .filter((name) => name.endsWith('.yml'))
      .sort()
      .map(async (name) => {
        const relativePath = `receipts/imports/${name}`;
        const raw = await readFile(path.resolve(root, relativePath), 'utf8');
        return {
          path: relativePath,
          receipt: ImportReceiptSchema.parse(parse(raw) as unknown),
        };
      }),
  );
  return {lifecycle, registry, receipts};
};

const digest = 'a'.repeat(64);
const validDigestBinding = () => ({
  mode: 'digest' as const,
  bindingDigest: digest,
  coverage: {
    sourceCount: 1,
    citedSourceCount: 1,
    coverageDigest: digest,
    observedAt: '2026-07-19T20:38:02Z',
  },
  locatorMaterialPresent: false as const,
});

describe('source lifecycle adversarial rejection', () => {
  it('rejects active promotion without hashes, rights or verified authority', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const missingHashRegistry = structuredClone(registry);
    const missingHashActive = missingHashRegistry.entries.find(
      ({current_state: currentState}) => currentState === 'active',
    );
    if (missingHashActive === undefined) {
      throw new Error('Expected an active source fixture.');
    }
    missingHashActive.hashes.raw_sha256 = null;

    const missingRightsRegistry = structuredClone(registry);
    const missingRightsActive = missingRightsRegistry.entries.find(
      ({current_state: currentState}) => currentState === 'active',
    );
    if (missingRightsActive === undefined) {
      throw new Error('Expected an active source fixture.');
    }
    delete missingRightsActive.rights.rights_holder;

    const pendingAuthorityRegistry = structuredClone(registry);
    const pendingAuthorityActive = pendingAuthorityRegistry.entries.find(
      ({current_state: currentState}) => currentState === 'active',
    );
    if (pendingAuthorityActive === undefined) {
      throw new Error('Expected an active source fixture.');
    }
    pendingAuthorityActive.authority.authority_verdict = 'pending';

    expect(
      auditSourceLifecycle({
        lifecycle,
        registry: missingHashRegistry,
        receipts,
      }),
    ).toContain('SRC-SYNTH-VS001: active source is missing hashes');
    expect(
      auditSourceLifecycle({
        lifecycle,
        registry: missingRightsRegistry,
        receipts,
      }),
    ).toContain('SRC-SYNTH-VS001: active source missing rights rights_holder');
    expect(
      auditSourceLifecycle({
        lifecycle,
        registry: pendingAuthorityRegistry,
        receipts,
      }),
    ).toContain('SRC-SYNTH-VS001: active source authority is unresolved');
  });

  it('rejects skipped lifecycle states and missing append-only receipts', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const withoutQuarantine = receipts.filter(
      ({receipt}) =>
        !(
          receipt.source_id === 'SRC-SYNTH-VS001' &&
          'transition' in receipt &&
          receipt.transition.to === 'quarantined'
        ),
    );

    const errors = auditSourceLifecycle({
      lifecycle,
      registry,
      receipts: withoutQuarantine,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing receipt'),
        expect.stringContaining('receipt chain is discontinuous'),
      ]),
    );
  });

  it('rejects removal of the hash-semantics migration receipt', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const withoutMigration = receipts.filter(
      ({receipt}) =>
        !('receipt_kind' in receipt && receipt.receipt_kind === 'hash_semantics_migration'),
    );

    expect(
      auditSourceLifecycle({
        lifecycle,
        registry,
        receipts: withoutMigration,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('registry migration receipt mismatch'),
        expect.stringContaining('missing receipt'),
        expect.stringContaining('source-normalized hash differs without migration'),
      ]),
    );
  });

  it('rejects conflated compatibility aliases and mutable projection locators', async () => {
    const {registry} = await loadSourceSystem();
    const aliasMismatch = structuredClone(registry);
    const promptWithAliasMismatch = aliasMismatch.entries.find(
      ({source_id: sourceId}) => sourceId === 'SRC-PROMPT-MAESTRO-V6',
    );
    if (promptWithAliasMismatch === undefined) {
      throw new Error('Expected prompt source fixture.');
    }
    promptWithAliasMismatch.hashes.normalized_sha256 =
      promptWithAliasMismatch.projection?.projection_sha256 ?? null;
    expect(SourceRegistrySchema.safeParse(aliasMismatch).success).toBe(false);

    const mutableLocator = structuredClone(registry);
    const promptWithMutableLocator = mutableLocator.entries.find(
      ({source_id: sourceId}) => sourceId === 'SRC-PROMPT-MAESTRO-V6',
    );
    if (promptWithMutableLocator === undefined) {
      throw new Error('Expected prompt source fixture.');
    }
    promptWithMutableLocator.portable_locator = 'docs/program/requirements-traceability.md';
    expect(SourceRegistrySchema.safeParse(mutableLocator).success).toBe(false);
  });

  it('rejects equal normalized hashes both marked unique', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const duplicatedRegistry = structuredClone(registry);
    const active = duplicatedRegistry.entries.find(
      ({current_state: currentState}) => currentState === 'active',
    );
    if (active === undefined) {
      throw new Error('Expected an active source fixture.');
    }
    duplicatedRegistry.entries.push({
      ...structuredClone(active),
      source_id: 'SRC-SYNTH-DUPLICATE',
      snapshot_id: 'synthetic-duplicate-v1',
    });

    expect(
      auditSourceLifecycle({
        lifecycle,
        registry: duplicatedRegistry,
        receipts,
      }),
    ).toContain('duplicate normalized hash incorrectly marked unique');
  });

  it('rejects false canonical coverage and source lock claims', async () => {
    const gaps = await readYamlFile(
      'registries/sources/canonical-source-gaps.yml',
      CanonicalSourceGapsSchema,
    );
    const falseCount = structuredClone(gaps);
    falseCount.confirmed_count = 1;
    const falseLock = structuredClone(gaps);
    falseLock.consequence.source_locked = true;

    expect(auditCanonicalCoverage(falseCount)).toContain(
      'confirmed_count does not match populated canonical slots',
    );
    expect(auditCanonicalCoverage(falseLock)).toContain(
      'incomplete canonical corpus must remain fail-closed',
    );
  });
});

describe('NotebookLM adversarial rejection', () => {
  it('rejects explicit write operations and locator material flags', () => {
    expect(
      groundingRequestSchema.safeParse({
        operation: 'add_source',
        binding: {
          mode: 'none',
          reasonCode: 'binding-not-selected',
          locatorMaterialPresent: false,
        },
        claimIds: [],
      }).success,
    ).toBe(false);
    expect(
      notebookBindingSchema.safeParse({
        ...validDigestBinding(),
        locatorMaterialPresent: true,
      }).success,
    ).toBe(false);
  });

  it('rejects an undeclared absolute locator field instead of stripping it', () => {
    const absoluteLocator = ['', 'private', 'forbidden', 'notebook'].join('/');
    const adversarialJson = JSON.parse(
      JSON.stringify({
        ...validDigestBinding(),
        notebookLocator: absoluteLocator,
      }),
    ) as unknown;

    expect(notebookBindingSchema.safeParse(adversarialJson).success).toBe(false);
  });

  it('rejects undeclared live mutation instructions on a read operation', () => {
    const adversarialJson = JSON.parse(
      JSON.stringify({
        operation: 'query_grounding',
        binding: validDigestBinding(),
        claimIds: ['CLM-VS001-001'],
        liveMutation: {
          operation: 'add_source',
          activate: true,
        },
      }),
    ) as unknown;

    expect(groundingRequestSchema.safeParse(adversarialJson).success).toBe(false);
  });

  it('rejects malformed coverage timestamps', () => {
    const binding = validDigestBinding();
    binding.coverage.observedAt = 'not-an-iso-timestamp';

    expect(notebookBindingSchema.safeParse(binding).success).toBe(false);
  });

  it('rejects digest material in none mode', () => {
    expect(
      notebookBindingSchema.safeParse({
        mode: 'none',
        reasonCode: 'binding-not-selected',
        locatorMaterialPresent: false,
        bindingDigest: digest,
      }).success,
    ).toBe(false);
  });

  it('rejects grounding queries without a claim/source mapping', () => {
    expect(
      groundingRequestSchema.safeParse({
        operation: 'query_grounding',
        binding: validDigestBinding(),
        claimIds: [],
      }).success,
    ).toBe(false);
  });
});
