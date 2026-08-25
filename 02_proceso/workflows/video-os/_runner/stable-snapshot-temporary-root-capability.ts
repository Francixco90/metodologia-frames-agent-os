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

type TemporaryPathIdentity = Readonly<{path: string; dev: number; ino: number}>;
type TemporaryRootState = Readonly<TemporaryPathIdentity & {fd: number}>;
type TemporaryRootHooks = Readonly<{
  beforeOpen?: (path: string) => void;
  beforeFchmod?: (path: string, fd: number) => void;
}>;
declare const temporaryRootBrand: unique symbol;
const temporaryRoots = new WeakMap<object, TemporaryRootState>();
export type StableSnapshotTemporaryRootCapability = Readonly<{[temporaryRootBrand]: true}>;

const validateTemporaryPath = (state: TemporaryPathIdentity): void => {
  const path = stableSnapshotBoundary('TEMP-LSTAT', () => lstatSync(state.path));
  const real = stableSnapshotBoundary('TEMP-REALPATH', () => realpathSync(state.path));
  if (
    path.isSymbolicLink() ||
    !path.isDirectory() ||
    path.dev !== state.dev ||
    path.ino !== state.ino ||
    real !== state.path
  )
    stableSnapshotFail('TEMP-IDENTITY-DRIFT');
};
const validateTemporaryRoot = (state: TemporaryRootState, requireMode = true): void => {
  validateTemporaryPath(state);
  const path = stableSnapshotBoundary('TEMP-LSTAT', () => lstatSync(state.path));
  const open = stableSnapshotBoundary('TEMP-FSTAT', () => fstatSync(state.fd));
  if (
    !open.isDirectory() ||
    open.dev !== state.dev ||
    open.ino !== state.ino ||
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
  hooks: TemporaryRootHooks = {},
): T => {
  const created = stableSnapshotBoundary('TEMP-CREATE', () =>
    mkdtempSync(resolve(tmpdir(), 'metodologia-stable-snapshot-')),
  );
  let identity: TemporaryPathIdentity | undefined;
  let state: TemporaryRootState | undefined;
  let fd: number | undefined;
  let result: T | undefined;
  let failure: StableSnapshotError | undefined;
  let removable = false;
  try {
    const path = stableSnapshotBoundary('TEMP-REALPATH', () => realpathSync(created));
    const initialPath = stableSnapshotBoundary('TEMP-LSTAT', () => lstatSync(path));
    identity = {path, dev: initialPath.dev, ino: initialPath.ino};
    validateTemporaryPath(identity);
    if (hooks.beforeOpen)
      stableSnapshotBoundary('TEMP-BEFORE-OPEN-HOOK', () => hooks.beforeOpen!(path));
    validateTemporaryPath(identity);
    const noFollow = constants.O_NOFOLLOW;
    const directory = constants.O_DIRECTORY;
    if (!noFollow || !directory) stableSnapshotFail('TEMP-FLAGS');
    fd = stableSnapshotBoundary('TEMP-OPEN', () =>
      openSync(path, constants.O_RDONLY | noFollow | directory),
    );
    const initial = stableSnapshotBoundary('TEMP-FSTAT', () => fstatSync(fd!));
    state = {...identity, fd};
    if (initial.dev !== identity.dev || initial.ino !== identity.ino || !initial.isDirectory())
      stableSnapshotFail('TEMP-IDENTITY-DRIFT');
    validateTemporaryRoot(state, false);
    if (hooks.beforeFchmod)
      stableSnapshotBoundary('TEMP-HOOK', () => hooks.beforeFchmod!(path, fd!));
    validateTemporaryRoot(state, false);
    stableSnapshotBoundary('TEMP-FCHMOD', () => fchmodSync(fd!, 0o700));
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
    if (state) {
      validateTemporaryRoot(state, false);
      stableSnapshotBoundary('TEMP-CLEANUP-FCHMOD', () => fchmodSync(state.fd, 0o700));
      validateTemporaryRoot(state);
      removable = true;
    } else if (identity) {
      validateTemporaryPath(identity);
      removable = true;
    }
  } catch (error) {
    failure ??= stableSnapshotError(error, 'TEMP-CLEANUP-IDENTITY');
  }
  if (removable && identity) {
    try {
      stableSnapshotBoundary('TEMP-REMOVE', () =>
        rmSync(identity.path, {recursive: true, force: true}),
      );
    } catch (error) {
      failure ??= stableSnapshotError(error, 'TEMP-REMOVE');
    }
  }
  if (fd !== undefined)
    try {
      closeSync(fd);
    } catch (error) {
      failure ??= stableSnapshotError(error, 'TEMP-CLOSE');
    }
  if (failure) throw failure;
  return result as T;
};
