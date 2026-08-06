// ledger/ownership.ts — resolves the one-writer-per-path owner for each
// baseline path from docs/program/ownership-manifest.yml. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

import {type OwnerId, type OwnerResolution, ownerIds} from '../lib/file-disposition-policy-v3.ts';
import {globPatternToRegExp} from './path-utils.ts';

export const ownershipManifestSchema = z.object({
  version: z.literal(1),
  policy: z.literal('one-writer-per-path'),
  writers: z.record(z.enum(ownerIds), z.array(z.string().min(1))),
});

export const buildOwnerResolver = (root: string): ((path: string) => OwnerResolution) => {
  const manifestPath = resolve(root, 'docs/program/ownership-manifest.yml');
  const manifest = ownershipManifestSchema.parse(parse(readFileSync(manifestPath, 'utf8')));
  const routes = Object.entries(manifest.writers).flatMap(([owner, patterns]) =>
    patterns.map((pattern) => ({
      owner: owner as OwnerId,
      pattern,
      matcher: globPatternToRegExp(pattern),
    })),
  );
  return (path: string): OwnerResolution => {
    const matches = routes.filter(({matcher}) => matcher.test(path));
    if (matches.length > 1) {
      throw new Error(
        `Ownership collision for ${path}: ${matches.map(({owner, pattern}) => `${owner}:${pattern}`).join(', ')}`,
      );
    }
    const match = matches[0];
    if (match !== undefined) {
      return {
        owner: match.owner,
        evidence: `docs/program/ownership-manifest.yml:${match.owner}:${match.pattern}`,
      };
    }
    throw new Error(`Ownership unresolved for baseline path ${path}`);
  };
};