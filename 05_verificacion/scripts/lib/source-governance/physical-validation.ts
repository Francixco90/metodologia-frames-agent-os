import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';

export const fileSha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

export const fileBytes = (path: string): number => readFileSync(path).byteLength;

const PRIVATE_LOCATOR_PATTERN =
  /(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\/|[A-Za-z]:[\\/](?:Users|private)[\\/]|file:\/\//u;

export const containsPrivateLocator = (value: Uint8Array | string): boolean =>
  PRIVATE_LOCATOR_PATTERN.test(typeof value === 'string' ? value : new TextDecoder().decode(value));

export const readPortableFile = (
  root: string,
  sourceId: string,
  relativePath: string,
  errors: string[],
): Uint8Array | undefined => {
  const absolutePath = resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${sep}`) || !existsSync(absolutePath)) {
    errors.push(`${sourceId}: evidencia inexistente o fuera del root: ${relativePath}`);
    return undefined;
  }
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    errors.push(`${sourceId}: evidencia no es archivo regular: ${relativePath}`);
    return undefined;
  }
  return readFileSync(absolutePath);
};
