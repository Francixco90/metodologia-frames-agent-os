import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it} from 'vitest';

import type {Policy} from '../../scripts/lib/file-budget-policy.ts';
import {validateBudgetTrain} from '../../scripts/lib/file-budget-train.ts';

const roots: string[] = [];
const git = (root: string, args: string[]): string =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const put = (root: string, path: string, contents: string): void => {
  const target = join(root, path);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, contents);
};
const commit = (root: string, message: string): string => {
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
};
const policy: Policy = {
  schema_version: 'file-budget-policy-v2',
  pr_budget: {target_files: 8, target_loc: 800, hard_files: 12, hard_loc: 1200},
  budgets: [
    {
      surface: 'authored',
      kind: 'authored',
      match: ['**'],
      exclude: [],
      target: {max_lines: 300},
      hard: {max_lines: 500},
      scope: 'changed',
      mode: 'enforce',
      changed_mode: 'enforce',
      fallback: true,
      rationale: 'test',
    },
    {
      surface: 'generated',
      kind: 'generated',
      match: ['**'],
      exclude: [],
      target: {max_lines: 300},
      hard: {max_lines: 500},
      scope: 'changed',
      mode: 'enforce',
      changed_mode: 'enforce',
      fallback: true,
      rationale: 'test',
    },
  ],
};

const repository = (authoredFiles: number): {root: string; base: string} => {
  const root = mkdtempSync(join(tmpdir(), 'frames-budget-train-'));
  roots.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Budget Train Test']);
  put(root, 'base.txt', 'base\n');
  const base = commit(root, 'base');
  for (let index = 0; index < authoredFiles; index += 1)
    put(root, `change-${index}.txt`, 'changed\n');
  put(
    root,
    '02_proceso/governance/budget-train.yml',
    `schema_version: file-budget-train-v1\nbase_commit: ${base}\nsegments:\n  - {id: S1, base_ref: ${base}, head_ref: HEAD}\n`,
  );
  commit(root, 'candidate');
  return {root, base};
};

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, {recursive: true});
});

describe('file budget train', () => {
  it('accepts a clean chained candidate within the unchanged hard limits', () => {
    const {root, base} = repository(2);
    expect(validateBudgetTrain(root, policy, () => false, base)).toMatchObject({
      active: true,
      errors: [],
      summary: 'segments=1 authored=3/6',
    });
  });

  it('blocks a segment that exceeds the file hard limit', () => {
    const {root, base} = repository(13);
    expect(validateBudgetTrain(root, policy, () => false, base).errors).toEqual([
      'BUDGET-TRAIN-HARD S1 files=14 loc=17',
    ]);
  });
});
