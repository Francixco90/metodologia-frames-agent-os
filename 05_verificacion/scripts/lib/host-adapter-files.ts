import {createHash} from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

export const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const packageSha256 = (root: string): string =>
  sha256(readFileSync(resolve(root, '03_artefactos/host-adapters/host-adapter-package.json')));

export const safeTargetRoot = (root: string): string => {
  if (!existsSync(root) || lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) {
    throw new Error('HOST-INSTALL-PATH001 target root must be a real directory');
  }
  return realpathSync(root);
};

export const safeTargetPath = (root: string, ref: string): string => {
  if (!ref || ref.includes('\0') || ref.includes('\\') || isAbsolute(ref)) {
    throw new Error(`HOST-INSTALL-PATH002 unsafe ref ${ref}`);
  }
  if (ref.split('/').some((segment) => !segment || segment === '..')) {
    throw new Error(`HOST-INSTALL-PATH002 unsafe ref ${ref}`);
  }
  const candidate = resolve(root, ref);
  const offset = relative(root, candidate);
  if (offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`HOST-INSTALL-PATH003 escaped ref ${ref}`);
  }
  let parent = dirname(candidate);
  while (parent !== root && !existsSync(parent)) parent = dirname(parent);
  if (
    realpathSync(parent) !== parent ||
    (existsSync(candidate) && lstatSync(candidate).isSymbolicLink())
  ) {
    throw new Error(`HOST-INSTALL-PATH004 symlink target ${ref}`);
  }
  return candidate;
};

export const atomicWrite = (path: string, value: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, {encoding: 'utf8', mode: 0o600, flag: 'wx'});
  renameSync(temporary, path);
};

export const readOptional = (path: string): Buffer | null => {
  try {
    return readFileSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};
