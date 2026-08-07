// ledger/ownership.ts — resolves one physical repo path to one logical writer.
// Manifest evidence remains in the stable legacy namespace. [CÓDIGO]
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {basename, dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

import {type OwnerId, type OwnerResolution, ownerIds} from '../lib/file-disposition-policy-v3.ts';
import {globPatternToRegExp} from './path-utils.ts';

export const ownershipManifestSchema = z.object({
  version: z.literal(1),
  policy: z.literal('one-writer-per-path'),
  writers: z.record(z.enum(ownerIds), z.array(z.string().min(1))),
  non_writers: z.object({
    human_approver: z.object({actor_id: z.literal('H01')}),
    guardian: z.object({may_remediate: z.literal(false)}),
  }),
});

export type OwnershipManifest = z.infer<typeof ownershipManifestSchema>;

export interface CompiledOwnershipRoute {
  owner: OwnerId;
  pattern: string;
  canonicalPattern: string;
  matcher: RegExp;
}

const portable = (path: string): string => path.split(sep).join('/');

const assertInside = (root: string, candidate: string): void => {
  const offset = relative(root, candidate);
  if (offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`Ownership path escapes repository: ${candidate}`);
  }
};

/** Resolve aliases and the nearest existing ancestor without trusting a missing leaf. */
export const canonicalizeRepoPath = (root: string, candidate: string): string => {
  if (candidate.length === 0 || candidate.includes('\0') || candidate.includes('\\')) {
    throw new Error(`Ownership path is not portable: ${candidate}`);
  }
  if (isAbsolute(candidate) || candidate.split('/').some((segment) => segment === '..')) {
    throw new Error(`Ownership path traversal is forbidden: ${candidate}`);
  }

  const canonicalRoot = realpathSync(root);
  const lexicalPath = resolve(root, candidate);
  assertInside(resolve(root), lexicalPath);

  const suffix: string[] = [];
  let ancestor = lexicalPath;
  while (true) {
    try {
      lstatSync(ancestor);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      suffix.unshift(basename(ancestor));
      ancestor = parent;
    }
  }

  let resolvedAncestor: string;
  try {
    resolvedAncestor = realpathSync(ancestor);
  } catch {
    throw new Error(`Ownership path contains a broken symlink: ${candidate}`);
  }
  const canonicalPath = resolve(resolvedAncestor, ...suffix);
  assertInside(canonicalRoot, canonicalPath);
  const repoRelative = relative(canonicalRoot, canonicalPath);
  if (repoRelative.length === 0) throw new Error('Ownership path cannot be the repository root');
  return portable(repoRelative);
};

export const canonicalizeOwnershipPattern = (root: string, pattern: string): string => {
  const wildcardIndex = pattern.search(/[*?[{]/u);
  if (wildcardIndex === -1) return canonicalizeRepoPath(root, pattern);
  const prefix = pattern.slice(0, wildcardIndex);
  if (prefix.length === 0) throw new Error(`Ownership pattern lacks a static prefix: ${pattern}`);
  const suffix = pattern.slice(wildcardIndex);
  const directoryPrefix = prefix.endsWith('/');
  const canonicalPrefix = canonicalizeRepoPath(
    root,
    directoryPrefix ? prefix.slice(0, -1) : prefix,
  );
  return directoryPrefix ? `${canonicalPrefix}/${suffix}` : `${canonicalPrefix}${suffix}`;
};

export const readOwnershipManifest = (root: string): OwnershipManifest => {
  const path = resolve(root, 'docs/program/ownership-manifest.yml');
  return ownershipManifestSchema.parse(parse(readFileSync(path, 'utf8')));
};

export const compileOwnershipRoutes = (
  root: string,
  manifest = readOwnershipManifest(root),
): CompiledOwnershipRoute[] =>
  Object.entries(manifest.writers).flatMap(([owner, patterns]) =>
    patterns.map((pattern) => {
      const canonicalPattern = canonicalizeOwnershipPattern(root, pattern);
      return {
        owner: owner as OwnerId,
        pattern,
        canonicalPattern,
        matcher: globPatternToRegExp(canonicalPattern),
      };
    }),
  );

export const buildOwnerResolver = (root: string): ((path: string) => OwnerResolution) => {
  const routes = compileOwnershipRoutes(root);
  return (path: string): OwnerResolution => {
    const canonicalPath = canonicalizeRepoPath(root, path);
    const matches = routes.filter(({matcher}) => matcher.test(canonicalPath));
    const owners = new Set(matches.map(({owner}) => owner));
    if (owners.size > 1) {
      throw new Error(
        `Ownership collision for ${path}: ${matches.map(({owner, pattern}) => `${owner}:${pattern}`).join(', ')}`,
      );
    }
    const match = matches[0];
    if (match === undefined) throw new Error(`Ownership unresolved for repo path ${path}`);
    return {
      owner: match.owner,
      evidence: `docs/program/ownership-manifest.yml:${match.owner}:${match.pattern}`,
    };
  };
};
