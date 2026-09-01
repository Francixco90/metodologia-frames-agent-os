import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {
  CanonicalSourceGapsSchema,
  ClaimRegistrySchema,
  ClaimsLedgerSchema,
  SourceBundleSchema,
  SourceRegistrySchema,
  auditCanonicalCoverage,
  normalizeSourceBytes,
  readYamlFile,
  sha256,
} from '../fixtures/source-notebook/contracts-v2.ts';
import {
  SOURCE_NOTEBOOK_ROOT,
  loadImportReceipts,
} from '../fixtures/source-notebook/test-support.ts';

describe('source grounding production contracts', () => {
  it('binds raw and normalized hashes to the actual first-party bytes', async () => {
    const registry = await readYamlFile(
      'registries/sources/source-registry.yml',
      SourceRegistrySchema,
    );
    const bytes = await readFile(
      path.resolve(SOURCE_NOTEBOOK_ROOT, 'inbox/first-party/SRC-SYNTH-VS001.md'),
    );
    const active = registry.entries.find(({source_id}) => source_id === 'SRC-SYNTH-VS001');
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
    const prompt = registry.entries.find(({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6');
    if (prompt?.projection === undefined) {
      throw new Error('Prompt source must declare an immutable projection.');
    }
    const projectionBytes = await readFile(
      path.resolve(SOURCE_NOTEBOOK_ROOT, prompt.projection.projection_locator),
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
        canonicalGaps.slots.some(({source_id}) => source_id === receipt.source_id),
      ),
    ).toBe(false);
  });

  it('grounds active claims in source ID, snapshot, hash and exact source lines', async () => {
    const [registry, claimRegistry, ledger, sourceRaw] = await Promise.all([
      readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
      readYamlFile('registries/claims/claim-registry.yml', ClaimRegistrySchema),
      readYamlFile('projects/vs-001-source-to-campaign/claims-ledger.yml', ClaimsLedgerSchema),
      readFile(path.resolve(SOURCE_NOTEBOOK_ROOT, 'inbox/first-party/SRC-SYNTH-VS001.md'), 'utf8'),
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
    const claimIds = new Set(claimRegistry.claims.map(({claim_id}) => claim_id));
    expect(
      ledger.entries.every(({claim_id, status}) => claimIds.has(claim_id) && status === 'usable'),
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
});
