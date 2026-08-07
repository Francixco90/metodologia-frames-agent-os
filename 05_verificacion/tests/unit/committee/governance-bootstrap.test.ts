import {mkdirSync, mkdtempSync, rmSync, symlinkSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import {describe, expect, it} from 'vitest';

import {
  loadPrincipleConformanceRegistry,
  summarizePrincipleConformance,
  validatePrincipleConformance,
} from '../../../scripts/check-principle-conformance.ts';
import {buildOwnerResolver, canonicalizeRepoPath} from '../../../scripts/ledger/ownership.ts';

const root = process.cwd();

describe('PR-00B1 governance bootstrap', () => {
  it('resolves legacy and taxonomic aliases to the same physical owner', () => {
    const legacy = 'tests/unit/committee/governance-bootstrap.test.ts';
    const taxonomic = '05_verificacion/tests/unit/committee/governance-bootstrap.test.ts';
    const resolveOwner = buildOwnerResolver(root);

    expect(canonicalizeRepoPath(root, legacy)).toBe(canonicalizeRepoPath(root, taxonomic));
    expect(resolveOwner(legacy).owner).toBe('agents-committee');
    expect(resolveOwner(taxonomic).owner).toBe('agents-committee');
  });

  it('blocks traversal and absolute ownership paths', () => {
    expect(() => canonicalizeRepoPath(root, '../AGENTS.md')).toThrow(/traversal/u);
    expect(() => canonicalizeRepoPath(root, resolve(root, 'AGENTS.md'))).toThrow(/traversal/u);
  });

  it('blocks symlink escapes and broken symlinks using an external sandbox', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'pr-00b1-ownership-'));
    const repository = join(sandbox, 'repository');
    const outside = join(sandbox, 'outside');
    mkdirSync(repository);
    mkdirSync(outside);
    symlinkSync(outside, join(repository, 'escape'));
    symlinkSync(join(sandbox, 'missing-target'), join(repository, 'broken'));

    try {
      expect(() => canonicalizeRepoPath(repository, 'escape/file.txt')).toThrow(
        /escapes repository/u,
      );
      expect(() => canonicalizeRepoPath(repository, 'broken/file.txt')).toThrow(/broken symlink/u);
    } finally {
      rmSync(sandbox, {recursive: true, force: true});
    }
  });

  it('loads and validates the principle registry without errors', () => {
    const registry = loadPrincipleConformanceRegistry(root);

    expect(validatePrincipleConformance(root, registry)).toEqual([]);
  });

  it('rejects a corrupted source anchor', () => {
    const registry = structuredClone(loadPrincipleConformanceRegistry(root));
    registry.principles[0]!.source_refs[0]!.anchor = 'anchor that is not present';

    expect(validatePrincipleConformance(root, registry)).toContain(
      'PC-01: anchor ausente en AGENTS.md: anchor that is not present',
    );
  });

  it('rejects an unresolved responsible owner', () => {
    const registry = structuredClone(loadPrincipleConformanceRegistry(root));
    registry.principles[0]!.responsible = 'missing-owner';

    expect(validatePrincipleConformance(root, registry)).toContain(
      'PC-01: responsible no resoluble missing-owner',
    );
  });

  it('reports the PR-00B1 conformance baseline', () => {
    const registry = loadPrincipleConformanceRegistry(root);

    expect(summarizePrincipleConformance(registry)).toEqual({
      total: 16,
      enforced: 1,
      gaps: 15,
      conformance: 'GAP',
    });
  });
});
