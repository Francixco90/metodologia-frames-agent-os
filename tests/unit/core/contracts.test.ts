import {describe, expect, it} from 'vitest';

import {
  HandoffSchema,
  NotebookBindingSchema,
  NotebookWorkUnitDeclarationSchema,
  parseJsonRepresentation,
  PrivateLocatorRefSchema,
  toJsonRepresentation,
  VersionedSourceSchema,
} from '../../../core/contracts/index.ts';
import {HASH_A, HASH_B, NOW, portableRef} from './fixtures.ts';

function activeSource(): Record<string, unknown> {
  return {
    schemaVersion: 'versioned-source-v1',
    sourceId: 'source:remotion-docs',
    logicalSourceId: 'logical:remotion-docs',
    version: '2026-07-19',
    sourceClass: 'technical_authority',
    mediaType: 'text/html',
    status: 'active',
    authority: 'primary',
    publicUrl: 'https://www.remotion.dev/docs/',
    rawSha256: HASH_A,
    normalizedSha256: HASH_B,
    license: {
      status: 'verified',
      spdxId: 'SEE-LICENSE',
      evidenceRef: portableRef('evidence', 'evidence:license'),
    },
    rights: {
      status: 'cleared',
      allowedUses: ['reference'],
      evidenceRef: portableRef('evidence', 'evidence:rights'),
    },
    owner: 'Remotion',
    observedAt: NOW,
    importReceiptIds: ['receipt:import:1'],
    metadata: {language: 'en'},
  };
}

describe('governed contract schemas', () => {
  it('accepts and JSON-round-trips an active, evidenced source', () => {
    const serialized = toJsonRepresentation(VersionedSourceSchema, activeSource());
    expect(parseJsonRepresentation(VersionedSourceSchema, serialized)).toEqual(
      VersionedSourceSchema.parse(activeSource()),
    );
  });

  it('fails closed when an active source lacks rights or license evidence', () => {
    const source = activeSource();
    source.license = {status: 'unknown'};
    source.rights = {status: 'unknown', allowedUses: []};
    expect(() => VersionedSourceSchema.parse(source)).toThrow();
  });

  it('rejects unknown fields instead of accepting a raw locator', () => {
    expect(() =>
      VersionedSourceSchema.parse({...activeSource(), rawLocalPath: '/Users/example/secret'}),
    ).toThrow();
  });

  it('represents a private locator only by receipt and digest', () => {
    expect(
      PrivateLocatorRefSchema.parse({
        schemaVersion: 'private-locator-ref-v1',
        privateReceiptId: 'receipt:private:1',
        locatorDigest: HASH_A,
        storageClass: 'work-private-ignored',
      }),
    ).not.toHaveProperty('uri');
  });

  it('requires grounded NotebookLM bindings to name sources', () => {
    expect(() =>
      NotebookBindingSchema.parse({
        schemaVersion: 'notebook-binding-v1',
        bindingId: 'binding:one',
        provider: 'notebooklm',
        notebookRef: portableRef('notebook', 'notebook:one'),
        accessMode: 'read-only',
        purpose: 'Ground a claim',
        questionPolicy: 'Only ask source-bounded questions',
        sourcePolicy: {mode: 'grounded', sourceIds: [], coverage: 'full', coverageGaps: []},
        observedAt: NOW,
      }),
    ).toThrow();
  });

  it('accepts a fail-closed NotebookLM work-unit declaration without a live binding', () => {
    expect(
      NotebookWorkUnitDeclarationSchema.parse({
        contract_ref: 'registries/notebooks/work-unit-binding-contract.yml',
        adapter_id: 'notebooklm-grounding-readonly-v1',
        binding_id: 'NB-BINDING-INSTAGRAM-CONTENT-001',
        purpose: 'Verify evidence coverage',
        question: 'Which governed sources support this work unit?',
        binding: {
          mode: 'none',
          reason_code: 'binding_not_selected',
          locator_material_present: false,
        },
        coverage: {
          status: 'coverage_gap',
          expected_source_ids: ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'],
          covered_source_ids: [],
          missing_source_ids: ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'],
          evidence_refs: [],
        },
        permissions: {
          access_mode: 'read_only',
          mutation: 'forbidden',
          evidence_promotion: 'forbidden_without_source_mapping',
          source_locked_effect: 'none',
        },
      }),
    ).toMatchObject({
      binding: {mode: 'none'},
      coverage: {status: 'coverage_gap', evidence_refs: []},
    });
  });

  it('rejects absolute paths in durable handoffs', () => {
    expect(() =>
      HandoffSchema.parse({
        schemaVersion: 'handoff-v1',
        handoffId: 'handoff:one',
        packageId: 'A03',
        producerActorId: 'actor:producer',
        consumerActorId: 'actor:consumer',
        baseCommit: HASH_A,
        sourceSnapshotId: 'snapshot:one',
        inputRefs: [portableRef('source', 'source:one')],
        outputs: [{path: '/tmp/output.json', sha256: HASH_B}],
        claims: [],
        mutations: [],
        tests: [],
        decision: 'accepted',
        risks: [],
        coverageGaps: [],
        nextGate: 'G08',
        timestamp: NOW,
      }),
    ).toThrow();
  });
});
