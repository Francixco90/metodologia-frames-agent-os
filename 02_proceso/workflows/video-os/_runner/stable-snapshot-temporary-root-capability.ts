import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {
  stableSnapshotBoundary,
  stableSnapshotError,
  stableSnapshotFail,
  type StableSnapshotError,
} from './stable-snapshot-filesystem-boundary.ts';

type TemporaryRootState = Readonly<{fd: number; path: string; dev: number; ino: number}>;
declare const temporaryRootBrand: unique symbol;
const temporaryRoots = new WeakMap<object, TemporaryRootState>();
export type StableSnapshotTemporaryRootCapability = Readonly<{[temporaryRootBrand]: true}>;

const validateTemporaryRoot = (state: TemporaryRootState, requireMode = true): void => {
  const path = stableSnapshotBoundary('TEMP-LSTAT', () => lstatSync(state.path));
  const open = stableSnapshotBoundary('TEMP-FSTAT', () => fstatSync(state.fd));
  const real = stableSnapshotBoundary('TEMP-REALPATH', () => realpathSync(state.path));
  if (
    path.isSymbolicLink() ||
    !path.isDirectory() ||
    !open.isDirectory() ||
    path.dev !== state.dev ||
    path.ino !== state.ino ||
    open.dev !== state.dev ||
    open.ino !== state.ino ||
    real !== state.path ||
    (requireMode && ((path.mode & 0o777) !== 0o700 || (open.mode & 0o777) !== 0o700))
  )
    stableSnapshotFail('TEMP-IDENTITY-DRIFT');
};
export const getStableSnapshotTemporaryRoot = (
  value: unknown,
): Readonly<{path: string; fd: number}> => {
  if (!value || typeof value !== 'object') return stableSnapshotFail('TEMP-CAPABILITY');
  const state = temporaryRoots.get(value);
  if (!state) return stableSnapshotFail('TEMP-CAPABILITY');
  validateTemporaryRoot(state);
  return state;
};
export const assertStableSnapshotTemporaryRoot = (
  value: StableSnapshotTemporaryRootCapability,
): void => {
  getStableSnapshotTemporaryRoot(value);
};

export const withStableSnapshotTemporaryRoot = <T>(
  operation: (capability: StableSnapshotTemporaryRootCapability) => T,
  beforeFchmod?: (path: string, fd: number) => void,
): T => {
  const created = stableSnapshotBoundary('TEMP-CREATE', () =>
    mkdtempSync(resolve(tmpdir(), 'metodologia-stable-snapshot-')),
  );
  const path = stableSnapshotBoundary('TEMP-REALPATH', () => realpathSync(created));
  const noFollow = constants.O_NOFOLLOW;
  const directory = constants.O_DIRECTORY;
  if (!noFollow || !directory) stableSnapshotFail('TEMP-FLAGS');
  const fd = stableSnapshotBoundary('TEMP-OPEN', () =>
    openSync(path, constants.O_RDONLY | noFollow | directory),
  );
  const initial = stableSnapshotBoundary('TEMP-FSTAT', () => fstatSync(fd));
  const state = {fd, path, dev: initial.dev, ino: initial.ino};
  let result: T | undefined;
  let failure: StableSnapshotError | undefined;
  let removable = false;
  try {
    validateTemporaryRoot(state, false);
    if (beforeFchmod) stableSnapshotBoundary('TEMP-HOOK', () => beforeFchmod(path, fd));
    validateTemporaryRoot(state, false);
    stableSnapshotBoundary('TEMP-FCHMOD', () => fchmodSync(fd, 0o700));
    validateTemporaryRoot(state);
    const capability = Object.freeze({}) as StableSnapshotTemporaryRootCapability;
    temporaryRoots.set(capability, state);
    try {
      result = stableSnapshotBoundary('TEMP-OPERATION', () => operation(capability));
      if (result && typeof result === 'object' && 'then' in result)
        stableSnapshotFail('ASYNC-SCOPE');
      validateTemporaryRoot(state);
    } finally {
      temporaryRoots.delete(capability);
    }
  } catch (error) {
    failure = stableSnapshotError(error, 'TEMP');
  }
  try {
    validateTemporaryRoot(state);
    removable = true;
  } catch (error) {
    failure ??= stableSnapshotError(error, 'TEMP-CLEANUP-IDENTITY');
  }
  if (removable) {
    try {
      stableSnapshotBoundary('TEMP-REMOVE', () => rmSync(path, {recursive: true, force: true}));
    } catch (error) {
      failure ??= stableSnapshotError(error, 'TEMP-REMOVE');
    }
  }
  try {
    closeSync(fd);
  } catch (error) {
    failure ??= stableSnapshotError(error, 'TEMP-CLOSE');
  }
  if (failure) throw failure;
  return result as T;
};
