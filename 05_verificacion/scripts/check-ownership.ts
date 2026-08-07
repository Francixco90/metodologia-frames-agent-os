import {execFileSync} from 'node:child_process';

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

const gitPaths = (root: string, args: string[]): string[] =>
  execFileSync('git', [args[0] ?? '', '-z', ...args.slice(1)], {cwd: root, encoding: 'utf8'})
    .split('\0')
    .filter((path) => path.length > 0);

const commitSha = (root: string, ref: string, required: boolean): string | undefined => {
  try {
    return execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`],
      {cwd: root, encoding: 'utf8'},
    ).trim();
  } catch {
    if (required) throw new Error(`OWNERSHIP_BASE_REF no resuelve a commit: ${ref}`);
    return undefined;
  }
};

const changedPaths = (root: string): string[] => {
  const paths = new Set<string>();
  const configuredBase = process.env.OWNERSHIP_BASE_REF?.trim();
  const base = commitSha(
    root,
    configuredBase && configuredBase.length > 0 ? configuredBase : 'HEAD^1',
    configuredBase !== undefined && configuredBase.length > 0,
  );
  if (base !== undefined) {
    for (const path of gitPaths(root, ['diff', '--name-only', `${base}...HEAD`, '--'])) {
      paths.add(path);
    }
  }
  for (const path of gitPaths(root, ['diff', '--cached', '--name-only', '--'])) paths.add(path);
  for (const path of gitPaths(root, ['diff', '--name-only', '--'])) paths.add(path);
  for (const path of gitPaths(root, ['ls-files', '--others', '--exclude-standard']))
    paths.add(path);
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
  for (const path of gitPaths(root, ['ls-files', '02_proceso/workflows/multimedia/**'])) {
    assertOwner(path, 'content');
  }
  for (const path of changedPaths(root)) assertOwner(path);

  return [...new Set(errors)];
};

const errors = validateOwnership();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS G04 OWNERSHIP: aliases físicos, rutas cambiadas y allowlists resuelven un writer; H01 y Guardian son no-writers.',
  );
}
