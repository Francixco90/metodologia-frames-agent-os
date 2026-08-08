// Git/worktree discovery and filesystem boundary checks for file budgets. [CÓDIGO]
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync, realpathSync, statSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

import {metricsFor} from '../ledger/git-walker.ts';

export interface BudgetBase {
  commit: string;
  source: string;
  explicit: boolean;
}

export interface BudgetGitState {
  base: BudgetBase;
  paths: Set<string>;
  loc: number;
  locByPath: Map<string, number>;
}

const git = (root: string, args: readonly string[]): Buffer =>
  execFileSync('git', [...args], {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const tryGitText = (root: string, args: readonly string[]): string | null => {
  try {
    return git(root, args).toString('utf8').trim();
  } catch {
    return null;
  }
};

const nulPaths = (bytes: Buffer): string[] => bytes.toString('utf8').split('\0').filter(Boolean);

const commitFor = (root: string, ref: string): string | null =>
  tryGitText(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]);

export const resolveBudgetBase = (
  root: string,
  environment: NodeJS.ProcessEnv = process.env,
): BudgetBase => {
  const explicit = environment.BUDGET_BASE_REF?.trim();
  if (explicit) {
    const commit = commitFor(root, explicit);
    if (!commit) throw new Error(`BUDGET-BASE001 invalid ${explicit}`);
    return {commit, source: explicit, explicit: true};
  }

  for (const source of ['upstream/main', 'origin/main']) {
    if (!commitFor(root, source)) continue;
    const commit = tryGitText(root, ['merge-base', 'HEAD', source]);
    if (commit) return {commit, source, explicit: false};
  }

  const context = environment.CI ? 'CI' : 'local';
  throw new Error(`BUDGET-BASE002 no reliable ${context} base ref`);
};

const pathExistsNoFollow = (root: string, path: string): boolean => {
  try {
    lstatSync(resolve(root, path));
    return true;
  } catch {
    return false;
  }
};

export const readBudgetFile = (root: string, path: string): Buffer => {
  if (
    path.length === 0 ||
    path.includes('\0') ||
    path.includes('\\') ||
    isAbsolute(path) ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`BUDGET-PATH001 unsafe path ${path}`);
  }

  const rootReal = realpathSync(root);
  const candidate = resolve(rootReal, path);
  const direct = lstatSync(candidate);
  if (direct.isSymbolicLink()) throw new Error(`BUDGET-PATH002 symlink ${path}`);

  const real = realpathSync(candidate);
  const fromRoot = relative(rootReal, real);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`BUDGET-PATH003 outside root ${path}`);
  }
  if (!statSync(real).isFile()) throw new Error(`BUDGET-PATH004 not a regular file ${path}`);
  return readFileSync(real);
};

export const changedBudgetPaths = (root: string, baseCommit: string): Set<string> =>
  new Set([
    ...nulPaths(git(root, ['diff', '--name-only', '-z', '--no-renames', baseCommit, 'HEAD', '--'])),
    ...nulPaths(git(root, ['diff', '--cached', '--name-only', '-z', '--no-renames', 'HEAD', '--'])),
    ...nulPaths(git(root, ['diff', '--name-only', '-z', '--no-renames', '--'])),
    ...nulPaths(git(root, ['ls-files', '-z', '--others', '--exclude-standard'])),
  ]);

export const changedBudgetLocByPath = (root: string, baseCommit: string): Map<string, number> => {
  const result = new Map<string, number>();
  for (const record of nulPaths(
    git(root, ['diff', '--numstat', '-z', '--no-renames', baseCommit, '--']),
  )) {
    const match = /^(\d+|-)\t(\d+|-)\t/u.exec(record);
    if (!match) throw new Error(`BUDGET-GIT001 invalid numstat record ${record}`);
    const path = record.slice(match[0].length);
    result.set(
      path,
      match[1] === '-' || match[2] === '-' ? 0 : Number(match[1]) + Number(match[2]),
    );
  }
  for (const path of nulPaths(git(root, ['ls-files', '-z', '--others', '--exclude-standard']))) {
    result.set(path, metricsFor(readBudgetFile(root, path)).loc);
  }
  return result;
};

export const changedBudgetLoc = (root: string, baseCommit: string): number => {
  return [...changedBudgetLocByPath(root, baseCommit).values()].reduce((sum, loc) => sum + loc, 0);
};

export const versionableBudgetPaths = (root: string): string[] =>
  nulPaths(git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']))
    .filter((path) => pathExistsNoFollow(root, path))
    .sort();

export const collectBudgetGitState = (
  root: string,
  environment: NodeJS.ProcessEnv = process.env,
): BudgetGitState => {
  const base = resolveBudgetBase(root, environment);
  const locByPath = changedBudgetLocByPath(root, base.commit);
  return {
    base,
    paths: changedBudgetPaths(root, base.commit),
    loc: [...locByPath.values()].reduce((sum, loc) => sum + loc, 0),
    locByPath,
  };
};
