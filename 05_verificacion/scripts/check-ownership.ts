import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildOwnerResolver,
  compileOwnershipRoutes,
  readOwnershipManifest,
} from './ledger/ownership.ts';

const staticPrefix = (pattern: string): string => pattern.split(/[*?[{]/u, 1)[0] ?? '';

const patternsMayOverlap = (left: string, right: string): boolean => {
  if (left === right) return true;
  const leftPrefix = staticPrefix(left);
  const rightPrefix = staticPrefix(right);
  if (leftPrefix.length === 0 || rightPrefix.length === 0) return true;
  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
};

const git = (root: string, args: string[]): string =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'});

const gitPaths = (root: string, args: string[]): string[] =>
  git(root, args)
    .split('\0')
    .filter((path) => path.length > 0);

const commitSha = (root: string, ref: string, required: boolean): string | undefined => {
  try {
    return git(root, [
      'rev-parse',
      '--verify',
      '--quiet',
      '--end-of-options',
      `${ref}^{commit}`,
    ]).trim();
  } catch {
    if (required) throw new Error(`OWNERSHIP_BASE_REF no resuelve a commit: ${ref}`);
    return undefined;
  }
};

const tryGit = (root: string, args: string[]): string | undefined => {
  try {
    return git(root, args).trim();
  } catch {
    return undefined;
  }
};

const fallbackIsAllowed = (root: string): boolean => {
  const branch = tryGit(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const githubRef = process.env.GITHUB_REF?.trim();
  const parents = tryGit(root, ['show', '-s', '--format=%P', 'HEAD'])
    ?.split(/\s+/u)
    .filter(Boolean);
  return (
    branch === 'main' ||
    branch === 'master' ||
    githubRef === 'refs/heads/main' ||
    githubRef === 'refs/heads/master' ||
    (parents?.length ?? 0) > 1
  );
};

const resolveBase = (root: string): string => {
  const configuredBase = process.env.OWNERSHIP_BASE_REF?.trim();
  if (configuredBase) return commitSha(root, configuredBase, true) as string;

  const head = commitSha(root, 'HEAD', true) as string;
  for (const ref of ['upstream/main', 'origin/main']) {
    const candidate = commitSha(root, ref, false);
    if (candidate === undefined || candidate === head) continue;
    const mergeBase = tryGit(root, ['merge-base', 'HEAD', candidate]);
    if (mergeBase !== undefined && mergeBase.length > 0 && mergeBase !== head) return mergeBase;
  }

  if (fallbackIsAllowed(root)) {
    const firstParent = commitSha(root, 'HEAD^1', false);
    if (firstParent !== undefined) return firstParent;
  }
  throw new Error(
    'No se pudo acreditar una base de ownership; define OWNERSHIP_BASE_REF explícitamente.',
  );
};

export const changedPaths = (root: string): string[] => {
  const paths = new Set<string>();
  const base = resolveBase(root);
  const diffs = [
    ['diff', '--name-only', '-z', '--no-renames', `${base}...HEAD`, '--'],
    ['diff', '--cached', '--name-only', '-z', '--no-renames', '--'],
    ['diff', '--name-only', '-z', '--no-renames', '--'],
  ];
  for (const args of diffs) {
    for (const path of gitPaths(root, args)) paths.add(path);
  }
  for (const path of gitPaths(root, ['ls-files', '-z', '--others', '--exclude-standard'])) {
    paths.add(path);
  }
  return [...paths].sort();
};

const requiredOwnerProbes = [
  ['docs/program/dag.yml', 'lead'],
  ['01_intencion/program/dag.yml', 'lead'],
  ['docs/program/ownership-manifest.yml', 'lead'],
  ['01_intencion/program/ownership-manifest.yml', 'lead'],
  ['CLAUDE.md', 'lead'],
  ['GEMINI.md', 'lead'],
  ['.claude/agents/RT-01.md', 'agents-committee'],
  ['.claude/workflows/pr-00b.ts', 'agents-committee'],
  ['workflows/multimedia/index.ts', 'content'],
  ['02_proceso/workflows/multimedia/index.ts', 'content'],
  ['02_proceso/workflows/experience/index.ts', 'content'],
  ['04_estado/registries/experience/component-registry.yml', 'content'],
  ['04_estado/releases/experience/EXP-EXAMPLE/release-manifest.json', 'governance'],
] as const;

export const validateOwnership = (root = process.cwd()): string[] => {
  const manifest = readOwnershipManifest(root);
  const routes = compileOwnershipRoutes(root, manifest);
  const resolveOwner = buildOwnerResolver(root);
  const errors: string[] = [];

  for (let leftIndex = 0; leftIndex < routes.length; leftIndex += 1) {
    const left = routes[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < routes.length; rightIndex += 1) {
      const right = routes[rightIndex];
      if (!right || left.owner === right.owner) continue;
      if (patternsMayOverlap(left.canonicalPattern, right.canonicalPattern)) {
        errors.push(
          `colisión canónica: ${left.owner}:${left.pattern} ↔ ${right.owner}:${right.pattern}`,
        );
      }
    }
  }

  for (const route of routes) {
    if (route.pattern === '**' || route.pattern === '**/*') {
      errors.push(`allowlist global prohibida: ${route.owner}:${route.pattern}`);
    }
  }

  const assertOwner = (path: string, expected?: string): void => {
    try {
      const resolution = resolveOwner(path);
      if (expected !== undefined && resolution.owner !== expected) {
        errors.push(`owner incorrecto para ${path}: ${resolution.owner}; esperado ${expected}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  };

  for (const [path, owner] of requiredOwnerProbes) assertOwner(path, owner);
  for (const path of gitPaths(root, ['ls-files', '-z', '02_proceso/workflows/multimedia/**'])) {
    assertOwner(path, 'content');
  }
  for (const path of changedPaths(root)) assertOwner(path);

  return [...new Set(errors)];
};

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const errors = validateOwnership();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS G04 OWNERSHIP: aliases físicos, rutas cambiadas y allowlists resuelven un writer; H01 y Guardian son no-writers.',
    );
  }
}
