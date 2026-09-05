import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {RendererCapabilityRegistryV1Schema} from '../../../../core/contracts/index.ts';
import {verifyApprovedH03LockSuccession} from '../../../scripts/lib/h03-lock-succession.mjs';

const root = process.cwd();
const read = (ref: string): string => readFileSync(resolve(root, ref), 'utf8');
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

describe('H-03 renderer adapters integration', () => {
  it('binds five governed capabilities to exact dependencies and fail-closed states', () => {
    const registry = RendererCapabilityRegistryV1Schema.parse(
      parse(read('registries/renderers/renderer-capability-registry-v1.yml')),
    );
    const packageJson = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };

    expect(registry.capabilities.map(({capabilityId}) => capabilityId)).toEqual([
      'd3',
      'gsap',
      'three',
      'lottie',
      'remotion',
    ]);
    expect(registry.capabilities.every(({readinessEligible}) => !readinessEligible)).toBe(true);
    expect(registry.capabilities.every(({publicationAuthority}) => !publicationAuthority)).toBe(
      true,
    );
    expect(registry.productionState).toBe('BLOCKED_LICENSE');
    expect(registry.distributionState).toBe('NOT_DESIGNED');
    expect(packageJson.dependencies['d3-selection']).toBeUndefined();
    expect(packageJson.dependencies['d3-transition']).toBeUndefined();
    expect(packageJson.dependencies['d3-timer']).toBeUndefined();
    expect(packageJson.dependencies['d3-force']).toBeUndefined();
  });

  it('repeats the semantic adapter probe byte-for-byte in fresh processes', () => {
    const script = resolve(root, 'scripts/check-renderer-capabilities.ts');
    const run = (): string =>
      execFileSync(process.execPath, ['--import', 'tsx', script, '--child'], {
        cwd: root,
        encoding: 'utf8',
        env: {...process.env, TZ: 'UTC'},
      }).trim();

    const first = run();
    const second = run();
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(second).toBe(first);
  });

  it('records approved lock succession and a reproducible graphical smoke without readiness claims', () => {
    const verifiedSuccession = verifyApprovedH03LockSuccession(root);
    const succession = verifiedSuccession.receipt as {
      receipt_id?: string;
      supersedes_receipt_id?: string;
      approval_phrase?: string;
      approval_scope?: string;
      previous?: {lock_sha256?: string};
      current?: {lock_sha256?: string};
      dependency_change?: boolean;
      audit_receipt?: {ref?: string; sha256?: string};
      publication_authority?: boolean;
    };
    const smoke = parse(read('quality/reports/creation-v3-h03-render-smoke.yml')) as {
      replay_ref?: string;
      replay_sha256?: string;
      outputs?: Array<{frame?: number; sha256?: string}>;
      checks?: {measured_overlap_ms?: Record<string, number>};
      claims?: {production_eligibility?: string; publication_authority?: boolean};
      temporary_outputs_versioned?: boolean;
    };

    expect(succession.receipt_id).toBe('H03-LOCK-SUCCESSION-016');
    expect(succession.supersedes_receipt_id).toBe('H03-LOCK-SUCCESSION-015');
    expect(succession.approval_phrase).toBe('go');
    expect(succession.approval_scope).toBe(
      'frames_consolidation_f9_generated_artifacts_gate_without_dependency_change',
    );
    expect(succession.dependency_change).toBe(false);
    expect(succession.previous?.lock_sha256).toBe(verifiedSuccession.currentLockSha256);
    expect(succession.current?.lock_sha256).toBe(verifiedSuccession.currentLockSha256);
    expect(succession.audit_receipt?.sha256).toBe(
      sha256(read(succession.audit_receipt?.ref ?? 'missing')),
    );
    expect(succession.publication_authority).toBe(false);
    expect(smoke.outputs).toHaveLength(6);
    expect(smoke.outputs?.[0]?.sha256).toBe(smoke.outputs?.[1]?.sha256);
    expect(smoke.outputs?.[2]?.sha256).toBe(smoke.outputs?.[3]?.sha256);
    expect(smoke.outputs?.[4]?.sha256).toBe(smoke.outputs?.[5]?.sha256);
    expect(new Set(smoke.outputs?.map(({frame}) => frame))).toEqual(new Set([0, 15, 29]));
    expect(smoke.replay_sha256).toBe(sha256(read(smoke.replay_ref ?? 'missing')));
    expect(Object.values(smoke.checks?.measured_overlap_ms ?? {}).every((value) => value > 0)).toBe(
      true,
    );
    expect(smoke.claims?.production_eligibility).toBe('not_claimed');
    expect(smoke.claims?.publication_authority).toBe(false);
    expect(smoke.temporary_outputs_versioned).toBe(false);
  });
});
