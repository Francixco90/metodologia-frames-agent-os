import {describe, expect, it} from 'vitest';

import {validateProductParity} from '../../scripts/lib/project-validation.ts';
import {validateGovernedSourceLineage} from '../../scripts/lib/source-lineage-validation.ts';

const hash = 'a'.repeat(64);
const bundle = {
  schema_version: 2 as const,
  bundle_id: 'bundle-v1',
  project_id: 'nivel-0-route',
  source_snapshot_id: 'snapshot-v1',
  state: 'PARTIAL_CONTROLLED' as const,
  source_locked: false,
  normalization_contract: 'normalized-json-v1',
  privacy_contract: {
    public_projection: 'derived_sanitized_content_only' as const,
    forbidden: ['participant_names'],
  },
  active_sources: [{source_id: 'SRC-ACTIVE', normalized_sha256: hash}],
  official_references: [{source_id: 'SRC-OFFICIAL'}],
  excluded_sources: [
    {
      source_id: 'SRC-EXCLUDED',
      normalized_sha256: hash,
      exclusion_reason: 'user_rejected',
    },
  ],
  coverage_gaps: ['recording_comparison_pending'],
  hard_limits: ['no_private_data'],
};

const ledger = {
  schema_version: 1 as const,
  ledger_id: 'ledger-v1',
  project_id: 'nivel-0-route',
  mutation_policy: 'append-only-records' as const,
  source_snapshot_id: 'snapshot-v1',
  entries: [{claim_id: 'CLM-001', source_ids: ['SRC-ACTIVE', 'SRC-OFFICIAL']}],
  blocked_claim_classes: ['guaranteed_outcomes'],
  coverage_gaps: ['verbatim_claims_blocked'],
};

const validate = (overrides = {}) =>
  validateGovernedSourceLineage({
    projectId: 'nivel-0-route',
    snapshotId: 'snapshot-v1',
    sourceLocked: false,
    bundle,
    ledger,
    ...overrides,
  });

describe('project source lineage', () => {
  it('accepts a coherent, fail-closed source system', () => {
    expect(validate()).toEqual([]);
  });

  it('rejects snapshot drift', () => {
    expect(validate({snapshotId: 'stale-snapshot'})).toContain(
      'manifest, source bundle and claims ledger must share source_snapshot_id',
    );
  });

  it('rejects unknown and excluded claim sources', () => {
    const unknown = {...ledger, entries: [{claim_id: 'CLM-002', source_ids: ['SRC-UNKNOWN']}]};
    expect(validate({ledger: unknown})).toContain('CLM-002: unknown source id');

    const excluded = {...ledger, entries: [{claim_id: 'CLM-003', source_ids: ['SRC-EXCLUDED']}]};
    expect(validate({ledger: excluded})).toContain(
      'CLM-003: excluded source cannot support claims',
    );
  });

  it('rejects malformed source hashes', () => {
    const malformed = {
      ...bundle,
      active_sources: [{source_id: 'SRC-ACTIVE', normalized_sha256: 'not-a-hash'}],
    };
    expect(() => validate({bundle: malformed})).toThrow();
  });
});

describe('project product parity', () => {
  it('rejects registry-only and drifting products', () => {
    const registry = [
      {artifact_id: 'content', kind: 'content' as const, technical_state: 'IN_PROGRESS' as const},
      {artifact_id: 'ghost', kind: 'web' as const, technical_state: 'IN_PROGRESS' as const},
    ];
    const manifest = [
      {
        artifact_id: 'content',
        kind: 'content' as const,
        technical_state: 'IN_PROGRESS' as const,
        planned_ref: 'projects/nivel-0-route/content/',
      },
    ];
    expect(validateProductParity('nivel-0-route', registry, manifest)).toContain(
      'nivel-0-route: registry y manifest deben declarar los mismos productos',
    );
  });
});
