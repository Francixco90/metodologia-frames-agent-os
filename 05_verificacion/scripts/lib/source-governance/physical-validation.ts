import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

export const fileSha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

export const fileBytes = (path: string): number => readFileSync(path).byteLength;

const PRIVATE_LOCATOR_PATTERN =
  /(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\/|[A-Za-z]:[\\/](?:Users|private)[\\/]|file:\/\//u;

export const containsPrivateLocator = (value: Uint8Array | string): boolean =>
  PRIVATE_LOCATOR_PATTERN.test(typeof value === 'string' ? value : new TextDecoder().decode(value));

export type PortableReadHooks = Readonly<{
  afterInitialStat?: () => void;
  afterOpen?: () => void;
}>;

const isContained = (root: string, target: string): boolean => {
  const fromRoot = relative(root, target);
  return fromRoot !== '' && !isAbsolute(fromRoot) && !fromRoot.startsWith(`..${sep}`);
};

const sameIdentity = (
  first: {dev: bigint; ino: bigint},
  second: {dev: bigint; ino: bigint},
): boolean => first.dev === second.dev && first.ino === second.ino;

export const readPortableFile = (
  root: string,
  sourceId: string,
  relativePath: string,
  errors: string[],
  hooks: PortableReadHooks = {},
): Uint8Array | undefined => {
  const initialErrorCount = errors.length;
  let descriptor: number | undefined;
  try {
    const rootReal = realpathSync(root);
    const candidate = resolve(rootReal, relativePath);
    if (!isContained(rootReal, candidate)) {
      errors.push(`${sourceId}: evidencia inexistente o fuera del root: ${relativePath}`);
      return undefined;
    }
    const initial = lstatSync(candidate, {bigint: true});
    if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n) {
      errors.push(`${sourceId}: evidencia no es archivo regular exclusivo: ${relativePath}`);
      return undefined;
    }
    const targetReal = realpathSync(candidate);
    if (!isContained(rootReal, targetReal)) {
      errors.push(`${sourceId}: realpath de evidencia escapa del root: ${relativePath}`);
      return undefined;
    }
    hooks.afterInitialStat?.();
    descriptor = openSync(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor, {bigint: true});
    if (!opened.isFile() || opened.nlink !== 1n || !sameIdentity(initial, opened)) {
      errors.push(`${sourceId}: evidencia cambió entre validación y apertura: ${relativePath}`);
      return undefined;
    }
    hooks.afterOpen?.();
    const bytes = readFileSync(descriptor);
    const afterRead = fstatSync(descriptor, {bigint: true});
    if (
      !sameIdentity(opened, afterRead) ||
      opened.size !== afterRead.size ||
      opened.mtimeNs !== afterRead.mtimeNs ||
      BigInt(bytes.byteLength) !== afterRead.size
    ) {
      errors.push(`${sourceId}: evidencia cambió durante lectura protegida: ${relativePath}`);
      return undefined;
    }
    const pathAfterRead = lstatSync(candidate, {bigint: true});
    const realAfterRead = realpathSync(candidate);
    if (
      pathAfterRead.isSymbolicLink() ||
      !sameIdentity(opened, pathAfterRead) ||
      realAfterRead !== targetReal ||
      !isContained(rootReal, realAfterRead)
    ) {
      errors.push(`${sourceId}: readback de evidencia detectó sustitución: ${relativePath}`);
      return undefined;
    }
    return errors.length === initialErrorCount ? bytes : undefined;
  } catch (error) {
    errors.push(`${sourceId}: lectura protegida falló para ${relativePath}: ${String(error)}`);
    return undefined;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
};
