import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  computeChangeProgramSha256,
  evaluateChangeProgramBudget,
  type ChangeProgramManifestV1,
} from '../../scripts/lib/change-program-budget.ts';

const roots: string[] = [];
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const write = (root: string, path: string, value: string): void => {
  mkdirSync(dirname(join(root, path)), {recursive: true});
  writeFileSync(join(root, path), value);
};
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'frames-change-budget-'));
  roots.push(root);
  const planRef = 'docs/plan.md';
  const manifestPath = 'state/change-budget.json';
  write(root, planRef, 'approved local plan\n');
  const payload: Omit<ChangeProgramManifestV1, 'canonicalSha256'> = {
    schemaVersion: 'change-budget-program-v1',
    programId: 'adoption-v1',
    branch: 'codex/adoption-v1',
    baseCommit: 'a'.repeat(40),
    authority: {mode: 'LOCAL_SIMULATION', planRef, planSha256: sha('approved local plan\n')},
    limits: {targetFiles: 2, targetLoc: 20, hardFiles: 3, hardLoc: 30},
    partitions: [
      {
        id: 'governance',
        paths: [manifestPath, planRef],
        limits: {targetFiles: 2, targetLoc: 20, hardFiles: 2, hardLoc: 25},
      },
    ],
    perFileLineCaps: [],
  };
  const manifest = {...payload, canonicalSha256: computeChangeProgramSha256(payload)};
  write(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const run = (overrides: Record<string, unknown> = {}) =>
    evaluateChangeProgramBudget({
      root,
      manifestPath,
      branch: 'codex/adoption-v1',
      baseCommit: 'a'.repeat(40),
      authoredPaths: [manifestPath, planRef],
      locByPath: new Map([
        [manifestPath, 10],
        [planRef, 1],
      ]),
      ...overrides,
    });
  return {root, manifestPath, manifest, run};
};
const withoutProgramHash = (
  manifest: ChangeProgramManifestV1,
): Omit<ChangeProgramManifestV1, 'canonicalSha256'> => {
  const payload = {...manifest} as Partial<ChangeProgramManifestV1>;
  delete payload.canonicalSha256;
  return payload as Omit<ChangeProgramManifestV1, 'canonicalSha256'>;
};

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, {recursive: true, force: true})));

describe('change program budget', () => {
  it('accepts an exact hash-bound branch-local partition', () => {
    const result = fixture().run();
    expect(result.active).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain(
      'BUDGET-PROGRAM-ACTIVE adoption-v1 authority=LOCAL_SIMULATION',
    );
  });

  it.each([
    ['base', {baseCommit: 'b'.repeat(40)}, 'BUDGET-PROGRAM004'],
    ['paths', {authoredPaths: ['docs/plan.md']}, 'BUDGET-PROGRAM007'],
    [
      'hard cap',
      {
        locByPath: new Map([
          ['state/change-budget.json', 40],
          ['docs/plan.md', 1],
        ]),
      },
      'BUDGET-PROGRAM-HARD',
    ],
  ])('blocks %s drift', (_label, overrides, code) => {
    const result = fixture().run(overrides);
    expect(result.active).toBe(false);
    expect(result.perFileLineCaps).toEqual([]);
    expect(result.errors.join('\n')).toContain(code);
  });

  it('deactivates on another branch so the caller can enforce the normal PR hard cap', () => {
    const result = fixture().run({branch: 'main'});
    expect(result.active).toBe(false);
    expect(result.errors).toEqual([]);
    expect(result.perFileLineCaps).toEqual([]);
    expect(result.warnings).toContain('BUDGET-PROGRAM-INACTIVE branch=main');
  });

  it('blocks manifest and physical plan hash drift', () => {
    const first = fixture();
    write(
      first.root,
      first.manifestPath,
      `${JSON.stringify({...first.manifest, programId: 'changed'})}\n`,
    );
    expect(first.run().errors).toContain('BUDGET-PROGRAM002 manifest hash mismatch');
    const second = fixture();
    write(second.root, 'docs/plan.md', 'drifted\n');
    expect(second.run().errors).toContain('BUDGET-PROGRAM005 plan hash mismatch');
  });

  it('blocks duplicate partition ownership', () => {
    const value = fixture();
    const payload = withoutProgramHash(value.manifest);
    payload.partitions.push({
      id: 'duplicate',
      paths: ['docs/plan.md'],
      limits: {targetFiles: 1, targetLoc: 5, hardFiles: 1, hardLoc: 10},
    });
    write(
      value.root,
      value.manifestPath,
      `${JSON.stringify({...payload, canonicalSha256: computeChangeProgramSha256(payload)}, null, 2)}\n`,
    );
    expect(value.run().errors).toContain('BUDGET-PROGRAM006 path declared by multiple partitions');
  });

  it('returns an exact line-only cap only while the hash-bound program is active', () => {
    const value = fixture();
    const payload = withoutProgramHash(value.manifest);
    payload.perFileLineCaps = [
      {
        path: 'docs/plan.md',
        surface: 'authored-doc',
        baselineHardLines: 10,
        programHardLines: 15,
        rationale: 'Bounded local allowance for this exact authored plan.',
      },
    ];
    write(
      value.root,
      value.manifestPath,
      `${JSON.stringify({...payload, canonicalSha256: computeChangeProgramSha256(payload)}, null, 2)}\n`,
    );
    const active = value.run();
    expect(active.active).toBe(true);
    expect(active.perFileLineCaps).toEqual(payload.perFileLineCaps);
    const drifted = value.run({baseCommit: 'b'.repeat(40)});
    expect(drifted.active).toBe(false);
    expect(drifted.perFileLineCaps).toEqual([]);
  });

  it.each([
    ['duplicate', ['docs/plan.md', 'docs/plan.md'], 'BUDGET-PROGRAM008'],
    ['unpartitioned', ['docs/other.md'], 'BUDGET-PROGRAM009'],
  ])('rejects a %s per-file line cap binding', (_label, paths, code) => {
    const value = fixture();
    const payload = withoutProgramHash(value.manifest);
    payload.perFileLineCaps = paths.map((path) => ({
      path,
      surface: 'authored-doc',
      baselineHardLines: 10,
      programHardLines: 15,
      rationale: 'Bounded local allowance for one exact authored path.',
    }));
    write(
      value.root,
      value.manifestPath,
      `${JSON.stringify({...payload, canonicalSha256: computeChangeProgramSha256(payload)}, null, 2)}\n`,
    );
    const result = value.run();
    expect(result.active).toBe(false);
    expect(result.perFileLineCaps).toEqual([]);
    expect(result.errors.join('\n')).toContain(code);
  });

  it('rejects an unbounded self-authorized cap', () => {
    const value = fixture();
    const payload = withoutProgramHash(value.manifest);
    payload.limits.hardFiles = 161;
    write(
      value.root,
      value.manifestPath,
      `${JSON.stringify({...payload, canonicalSha256: computeChangeProgramSha256(payload)}, null, 2)}\n`,
    );
    expect(value.run().errors).toContain('BUDGET-PROGRAM001 invalid change program manifest');
  });
});
