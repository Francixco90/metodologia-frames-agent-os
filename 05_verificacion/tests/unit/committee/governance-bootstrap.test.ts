import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import {afterEach, describe, expect, it} from 'vitest';

import {
  loadPrincipleConformanceRegistry,
  summarizePrincipleConformance,
  validatePrincipleConformance,
} from '../../../scripts/check-principle-conformance.ts';
import {changedPaths} from '../../../scripts/check-ownership.ts';
import {buildOwnerResolver, canonicalizeRepoPath} from '../../../scripts/ledger/ownership.ts';

const root = process.cwd();
const originalBaseRef = process.env.OWNERSHIP_BASE_REF;
const originalGithubRef = process.env.GITHUB_REF;
const sandboxes = new Set<string>();

const git = (repository: string, ...args: string[]): string =>
  execFileSync('git', args, {cwd: repository, encoding: 'utf8'}).trim();

const createGitFixture = (withRemoteBase: boolean): string => {
  const sandbox = mkdtempSync(join(tmpdir(), 'pr-00b1-git-'));
  const repository = join(sandbox, 'repository');
  sandboxes.add(sandbox);
  mkdirSync(repository);
  git(repository, 'init', '--initial-branch=main');
  git(repository, 'config', 'user.name', 'PR-00B1 Test');
  git(repository, 'config', 'user.email', 'pr-00b1.invalid');
  for (const name of ['worktree.txt', 'deleted.txt', 'rename-from.txt']) {
    writeFileSync(join(repository, name), `base ${name}\n`);
  }
  git(repository, 'add', '.');
  git(repository, 'commit', '-m', 'base');
  if (withRemoteBase) git(repository, 'update-ref', 'refs/remotes/upstream/main', 'HEAD');
  git(repository, 'switch', '-c', 'feature');
  for (const name of ['commit-one.txt', 'commit-two.txt']) {
    writeFileSync(join(repository, name), `${name}\n`);
    git(repository, 'add', name);
    git(repository, 'commit', '-m', name);
  }
  return repository;
};

const restoreEnv = (key: 'OWNERSHIP_BASE_REF' | 'GITHUB_REF', value: string | undefined): void => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

afterEach(() => {
  restoreEnv('OWNERSHIP_BASE_REF', originalBaseRef);
  restoreEnv('GITHUB_REF', originalGithubRef);
  for (const sandbox of sandboxes) rmSync(sandbox, {recursive: true, force: true});
  sandboxes.clear();
});

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

  it('collects both feature commits and every local Git change from upstream/main', () => {
    const repository = createGitFixture(true);
    delete process.env.OWNERSHIP_BASE_REF;
    delete process.env.GITHUB_REF;
    writeFileSync(join(repository, 'staged.txt'), 'staged\n');
    git(repository, 'add', 'staged.txt');
    writeFileSync(join(repository, 'worktree.txt'), 'worktree changed\n');
    writeFileSync(join(repository, 'untracked.txt'), 'untracked\n');
    rmSync(join(repository, 'deleted.txt'));
    git(repository, 'mv', 'rename-from.txt', 'rename-to.txt');

    expect(changedPaths(repository)).toEqual([
      'commit-one.txt',
      'commit-two.txt',
      'deleted.txt',
      'rename-from.txt',
      'rename-to.txt',
      'staged.txt',
      'untracked.txt',
      'worktree.txt',
    ]);
  });

  it.each(['missing-ref', '--all'])('blocks an invalid explicit base: %s', (baseRef) => {
    const repository = createGitFixture(true);
    process.env.OWNERSHIP_BASE_REF = baseRef;

    expect(() => changedPaths(repository)).toThrow(
      `OWNERSHIP_BASE_REF no resuelve a commit: ${baseRef}`,
    );
  });

  it('blocks feature and detached HEAD without an accredited base', () => {
    const repository = createGitFixture(false);
    delete process.env.OWNERSHIP_BASE_REF;
    delete process.env.GITHUB_REF;
    const missingBase = /No se pudo acreditar una base de ownership/u;

    expect(() => changedPaths(repository)).toThrow(missingBase);
    git(repository, 'switch', '--detach');
    expect(() => changedPaths(repository)).toThrow(missingBase);
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
