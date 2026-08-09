import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it} from 'vitest';

import {
  changedBudgetLoc,
  changedBudgetPaths,
  collectBudgetGitState,
  readBudgetFile,
  resolveBudgetBase,
  versionableBudgetPaths,
} from '../../scripts/lib/file-budget-git.ts';

const temporaryRoots: string[] = [];
const git = (root: string, args: string[]): string =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const put = (root: string, path: string, content: string): void => {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), {recursive: true});
  writeFileSync(absolute, content);
};
const commit = (root: string, message: string): string => {
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
};
const repository = (): {root: string; base: string} => {
  const root = mkdtempSync(join(tmpdir(), 'frames-budget-git-'));
  temporaryRoots.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Budget Test']);
  put(root, 'modify.txt', 'old\n');
  put(root, 'delete.txt', 'gone\n');
  return {root, base: commit(root, 'base')};
};

afterEach(() => {
  while (temporaryRoots.length > 0) rmSync(temporaryRoots.pop() as string, {recursive: true});
});

describe('file-budget Git state', () => {
  it('uses one explicit base for complete commits, index, worktree, untracked and deletions', () => {
    const {root, base} = repository();
    put(root, 'commit-one.txt', 'one\n');
    commit(root, 'commit one');
    put(root, 'commit-two.txt', 'two\nthree\n');
    commit(root, 'commit two');
    put(root, 'staged.txt', 'stage\n');
    git(root, ['add', 'staged.txt']);
    put(root, 'staged-cancelled.txt', 'index-only\n');
    git(root, ['add', 'staged-cancelled.txt']);
    rmSync(join(root, 'staged-cancelled.txt'));
    put(root, 'modify.txt', 'new\nextra\n');
    rmSync(join(root, 'delete.txt'));
    put(root, 'untracked.txt', 'u\nv\n');

    const state = collectBudgetGitState(root, {BUDGET_BASE_REF: base});
    expect(state.base).toStrictEqual({commit: base, source: base, explicit: true});
    expect([...state.paths].sort()).toStrictEqual([
      'commit-one.txt',
      'commit-two.txt',
      'delete.txt',
      'modify.txt',
      'staged-cancelled.txt',
      'staged.txt',
      'untracked.txt',
    ]);
    expect(state.loc).toBe(10);
    expect(changedBudgetPaths(root, base)).toStrictEqual(state.paths);
    expect(changedBudgetLoc(root, base)).toBe(state.loc);
  });

  it('uses the merge-base when upstream/main has advanced on a divergent branch', () => {
    const {root, base} = repository();
    put(root, 'local.txt', 'local\n');
    const localHead = commit(root, 'local');
    git(root, ['switch', '-q', '--detach', base]);
    put(root, 'upstream.txt', 'upstream\n');
    const upstreamHead = commit(root, 'upstream');
    git(root, ['update-ref', 'refs/remotes/upstream/main', upstreamHead]);
    git(root, ['switch', '-q', '--detach', localHead]);

    expect(resolveBudgetBase(root, {})).toStrictEqual({
      commit: base,
      source: 'upstream/main',
      explicit: false,
    });
  });

  it('prefers the product origin when both main remotes exist', () => {
    const {root, base} = repository();
    git(root, ['update-ref', 'refs/remotes/upstream/main', base]);
    git(root, ['update-ref', 'refs/remotes/origin/main', base]);

    expect(resolveBudgetBase(root, {})).toStrictEqual({
      commit: base,
      source: 'origin/main',
      explicit: false,
    });
  });

  it('fails closed without an explicit or remote main base in CI and locally', () => {
    const {root} = repository();
    expect(() => resolveBudgetBase(root, {})).toThrow('BUDGET-BASE002 no reliable local base');
    expect(() => resolveBudgetBase(root, {CI: 'true'})).toThrow(
      'BUDGET-BASE002 no reliable CI base',
    );
    expect(() => resolveBudgetBase(root, {BUDGET_BASE_REF: 'missing'})).toThrow(
      'BUDGET-BASE001 invalid missing',
    );
  });

  it('lists existing tracked and untracked paths but not a deleted worktree path', () => {
    const {root} = repository();
    rmSync(join(root, 'delete.txt'));
    put(root, 'untracked.txt', 'new\n');
    expect(versionableBudgetPaths(root)).toStrictEqual(['modify.txt', 'untracked.txt']);
  });
});

describe('file-budget safe reads', () => {
  it('reads regular in-root files and rejects traversal, direct symlinks and symlink escapes', () => {
    const {root} = repository();
    expect(readBudgetFile(root, 'modify.txt').toString('utf8')).toBe('old\n');
    expect(() => readBudgetFile(root, '../outside.txt')).toThrow('BUDGET-PATH001');

    symlinkSync('modify.txt', join(root, 'direct-link'));
    expect(() => readBudgetFile(root, 'direct-link')).toThrow('BUDGET-PATH002');

    const outside = mkdtempSync(join(tmpdir(), 'frames-budget-outside-'));
    temporaryRoots.push(outside);
    put(outside, 'secret.txt', 'secret\n');
    symlinkSync(outside, join(root, 'escape'));
    expect(() => readBudgetFile(root, 'escape/secret.txt')).toThrow('BUDGET-PATH003');
  });
});
