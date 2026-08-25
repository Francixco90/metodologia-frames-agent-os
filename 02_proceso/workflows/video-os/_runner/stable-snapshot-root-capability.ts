import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
  type Stats,
} from 'node:fs';
import {isAbsolute, resolve, sep} from 'node:path';

import {
  StableSnapshotRootAuthoritySchema,
  type StableSnapshotRequestV1,
} from '../_schema/stable-snapshot-reader-v1.schema.ts';
import {
  observedStableSnapshotIdentity,
  sameStableSnapshotIdentity,
  stableSnapshotBoundary,
  stableSnapshotError,
  stableSnapshotFail,
  type StableSnapshotError,
  type StableSnapshotIdentityHooks,
  type StableSnapshotStage,
} from './stable-snapshot-filesystem-boundary.ts';
export {
  observedStableSnapshotIdentity,
  sameStableSnapshotIdentity,
  stableSnapshotIdentity,
  verifyStableSnapshot,
  type StableSnapshotIdentity,
  type StableSnapshotIdentityHooks,
} from './stable-snapshot-filesystem-boundary.ts';

type RootState = Readonly<{fd: number; realpath: string; dev: number; ino: number}>;
declare const rootCapabilityBrand: unique symbol;
const rootCapabilities = new WeakMap<object, RootState>();
export type StableSnapshotRootCapability = Readonly<{[rootCapabilityBrand]: true}>;

const validateRoot = (state: RootState): void => {
  const path = stableSnapshotBoundary('ROOT-LSTAT', () => lstatSync(state.realpath));
  const open = stableSnapshotBoundary('ROOT-FSTAT', () => fstatSync(state.fd));
  const real = stableSnapshotBoundary('ROOT-REALPATH', () => realpathSync(state.realpath));
  if (
    path.isSymbolicLink() ||
    !path.isDirectory() ||
    !open.isDirectory() ||
    path.dev !== state.dev ||
    path.ino !== state.ino ||
    open.dev !== state.dev ||
    open.ino !== state.ino ||
    real !== state.realpath
  )
    stableSnapshotFail('ROOT-IDENTITY-DRIFT');
};
export const getStableSnapshotRoot = (value: unknown): RootState => {
  if (!value || typeof value !== 'object') return stableSnapshotFail('ROOT-CAPABILITY');
  const state = rootCapabilities.get(value);
  if (!state) return stableSnapshotFail('ROOT-CAPABILITY');
  validateRoot(state);
  return state;
};
export const resolveStableSnapshotSource = (
  root: RootState,
  material: StableSnapshotRequestV1['materials'][number],
  hooks: StableSnapshotIdentityHooks,
) => {
  let current = root.realpath;
  for (const part of material.ref.split('/').slice(0, -1)) {
    current = resolve(current, part);
    const info = stableSnapshotBoundary('SOURCE-ANCESTOR-LSTAT', () => lstatSync(current));
    if (info.isSymbolicLink() || !info.isDirectory() || info.dev !== root.dev)
      stableSnapshotFail('ANCESTOR');
    if (stableSnapshotBoundary('SOURCE-ANCESTOR-REALPATH', () => realpathSync(current)) !== current)
      stableSnapshotFail('ANCESTOR-REALPATH');
  }
  const path = resolve(root.realpath, material.ref);
  if (path !== root.realpath && !path.startsWith(`${root.realpath}${sep}`))
    stableSnapshotFail('ESCAPE');
  const info = stableSnapshotBoundary('SOURCE-LSTAT', () => lstatSync(path));
  const before = observedStableSnapshotIdentity(hooks, 'source-pre', material.ref, info);
  if (info.isSymbolicLink() || !info.isFile() || before.dev !== root.dev || before.nlink !== 1)
    stableSnapshotFail('SOURCE-TYPE');
  if (
    stableSnapshotBoundary('SOURCE-REALPATH', () => realpathSync(path)) !== path ||
    before.size !== material.size_bytes
  )
    stableSnapshotFail('SOURCE-DRIFT');
  return {material, path, before};
};
export const assertStableSnapshotSource = (
  item: ReturnType<typeof resolveStableSnapshotSource>,
  stage: StableSnapshotStage,
  hooks: StableSnapshotIdentityHooks,
) => {
  const current = stableSnapshotBoundary('SOURCE-LSTAT', () => lstatSync(item.path));
  if (
    !current.isFile() ||
    current.isSymbolicLink() ||
    stableSnapshotBoundary('SOURCE-REALPATH', () => realpathSync(item.path)) !== item.path
  )
    stableSnapshotFail('SOURCE-DRIFT');
  if (
    !sameStableSnapshotIdentity(
      item.before,
      observedStableSnapshotIdentity(hooks, stage, item.material.ref, current),
    )
  )
    stableSnapshotFail('SOURCE-DRIFT');
};

export const withStableSnapshotRootCapability = <T>(
  raw: unknown,
  operation: (capability: StableSnapshotRootCapability) => T,
  hooks: {rootStat?: (fd: number) => Stats} = {},
): T => {
  let parsed: ReturnType<typeof StableSnapshotRootAuthoritySchema.safeParse>;
  try {
    parsed = StableSnapshotRootAuthoritySchema.safeParse(raw);
  } catch {
    return stableSnapshotFail('ROOT-AUTHORITY');
  }
  if (!parsed.success) return stableSnapshotFail('ROOT-AUTHORITY');
  const authority = parsed.data;
  if (!isAbsolute(authority.root_path) || resolve(authority.root_path) !== authority.root_path)
    return stableSnapshotFail('ROOT-PATH');
  const real = stableSnapshotBoundary('ROOT-REALPATH', () => realpathSync(authority.root_path));
  if (real !== authority.root_path || real !== authority.expected_realpath)
    return stableSnapshotFail('ROOT-REALPATH');
  const noFollow = constants.O_NOFOLLOW;
  const directory = constants.O_DIRECTORY;
  if (!noFollow || !directory) return stableSnapshotFail('ROOT-FLAGS');
  const fd = stableSnapshotBoundary('ROOT-OPEN', () =>
    openSync(real, constants.O_RDONLY | noFollow | directory),
  );
  let result: T | undefined;
  let failure: StableSnapshotError | undefined;
  try {
    const info = hooks.rootStat
      ? stableSnapshotBoundary('ROOT-STAT-HOOK', () => hooks.rootStat!(fd))
      : stableSnapshotBoundary('ROOT-FSTAT', () => fstatSync(fd));
    const state = {fd, realpath: real, dev: info.dev, ino: info.ino};
    if (state.dev !== authority.expected_dev || state.ino !== authority.expected_ino)
      stableSnapshotFail('ROOT-AUTHORITY-DRIFT');
    validateRoot(state);
    const capability = Object.freeze({}) as StableSnapshotRootCapability;
    rootCapabilities.set(capability, state);
    try {
      result = stableSnapshotBoundary('ROOT-OPERATION', () => operation(capability));
      if (result && typeof result === 'object' && 'then' in result)
        stableSnapshotFail('ASYNC-SCOPE');
      validateRoot(state);
    } finally {
      rootCapabilities.delete(capability);
    }
  } catch (error) {
    failure = stableSnapshotError(error, 'ROOT');
  }
  try {
    closeSync(fd);
  } catch (error) {
    failure ??= stableSnapshotError(error, 'ROOT-CLOSE');
  }
  if (failure) throw failure;
  return result as T;
};
