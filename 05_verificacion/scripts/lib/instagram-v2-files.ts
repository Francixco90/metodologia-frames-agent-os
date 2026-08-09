import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {parse} from 'yaml';

export type InstagramV2FileAccess = ReturnType<typeof createInstagramV2FileAccess>;

const portable = (value: string): string => value.replaceAll('\\', '/');
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const child = join(directory, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });

export const createInstagramV2FileAccess = (root: string) => ({
  exists: (path: string): boolean => {
    try {
      statSync(resolve(root, path));
      return true;
    } catch {
      return false;
    }
  },
  read: (path: string): string => readFileSync(resolve(root, path), 'utf8'),
  readYaml: <T>(path: string): T => parse(readFileSync(resolve(root, path), 'utf8')) as T,
  fileSha256: (path: string): string => sha256(readFileSync(resolve(root, path))),
  sha256,
  packageDigest: (skillRoot: string): string => {
    const absoluteRoot = resolve(root, skillRoot);
    const manifest = `${walk(absoluteRoot)
      .sort()
      .map((path) => `${sha256(readFileSync(path))}  ${portable(relative(absoluteRoot, path))}`)
      .join('\n')}\n`;
    return sha256(manifest);
  },
});
