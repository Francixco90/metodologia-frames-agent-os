import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  type Stats,
} from 'node:fs';
import {isAbsolute, resolve, sep} from 'node:path';

import {
  StableSnapshotRootAuthoritySchema,
  type StableSnapshotRequestV1,
} from '../_schema/stable-snapshot-reader-v1.schema.ts';
type RootState = Readonly<{fd: number; realpath: string; dev: number; ino: number}>;
declare const rootCapabilityBrand: unique symbol;
const rootCapabilities = new WeakMap<object, RootState>();
export type StableSnapshotRootCapability = Readonly<{[rootCapabilityBrand]: true}>;
export type StableSnapshotIdentity = Readonly<
  Pick<Stats, 'dev' | 'ino' | 'size' | 'mtimeMs' | 'ctimeMs' | 'nlink'>
>;
export type StableSnapshotStage =
  'source-pre' | 'source-open' | 'source-post' | 'source-set' | 'snapshot';
export type StableSnapshotIdentityHooks = {
  identity?: (
    stage: StableSnapshotStage,
    ref: string,
    value: StableSnapshotIdentity,
  ) => StableSnapshotIdentity;
};
const fail = (code: string): never => {
  throw new Error(`STABLE-SNAPSHOT-ROOT-${code}`);
};
const validateRoot = (state: RootState): void => {
  const path = lstatSync(state.realpath);
  const open = fstatSync(state.fd);
  if (
    path.isSymbolicLink() ||
    !path.isDirectory() ||
    !open.isDirectory() ||
    path.dev !== state.dev ||
    path.ino !== state.ino ||
    open.dev !== state.dev ||
    open.ino !== state.ino ||
    realpathSync(state.realpath) !== state.realpath
  )
    fail('IDENTITY-DRIFT');
};
export const stableSnapshotIdentity = (value: Stats): StableSnapshotIdentity => ({
  dev: value.dev,
  ino: value.ino,
  size: value.size,
  mtimeMs: value.mtimeMs,
  ctimeMs: value.ctimeMs,
  nlink: value.nlink,
});
export const sameStableSnapshotIdentity = (a: StableSnapshotIdentity, b: StableSnapshotIdentity) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeMs === b.mtimeMs &&
  a.ctimeMs === b.ctimeMs &&
  a.nlink === b.nlink;
export const observedStableSnapshotIdentity = (
  hooks: StableSnapshotIdentityHooks,
  stage: StableSnapshotStage,
  ref: string,
  value: Stats,
) => hooks.identity?.(stage, ref, stableSnapshotIdentity(value)) ?? stableSnapshotIdentity(value);
const hashStableSnapshotFd = (fd: number, expectedSize: number) => {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let bytes = 0;
  for (let count = readSync(fd, buffer, 0, buffer.length, null); count !== 0;) {
    if (count < 0 || count > buffer.length || bytes + count > expectedSize)
      throw new Error('STABLE-SNAPSHOT-READ-BUDGET');
    hash.update(buffer.subarray(0, count));
    bytes += count;
    count = readSync(fd, buffer, 0, buffer.length, null);
  }
  return {bytes, sha256: hash.digest('hex')};
};
export const verifyStableSnapshot = (
  path: string,
  expected: StableSnapshotIdentity,
  sha256: string,
  hooks: StableSnapshotIdentityHooks,
  ref: string,
) => {
  const unresolved = lstatSync(path);
  if (unresolved.isSymbolicLink() || !unresolved.isFile()) fail('SNAPSHOT-DRIFT');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = observedStableSnapshotIdentity(hooks, 'snapshot', ref, fstatSync(fd));
    const checked = hashStableSnapshotFd(fd, expected.size);
    const after = observedStableSnapshotIdentity(hooks, 'snapshot', ref, fstatSync(fd));
    const current = stableSnapshotIdentity(lstatSync(path));
    if (
      !sameStableSnapshotIdentity(expected, before) ||
      !sameStableSnapshotIdentity(before, after) ||
      !sameStableSnapshotIdentity(after, current) ||
      checked.bytes !== expected.size ||
      checked.sha256 !== sha256
    )
      fail('SNAPSHOT-DRIFT');
  } finally {
    closeSync(fd);
  }
};
export const getStableSnapshotRoot = (value: unknown): RootState => {
  if (!value || typeof value !== 'object') return fail('CAPABILITY');
  const state = rootCapabilities.get(value);
  if (!state) return fail('CAPABILITY');
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
    const info = lstatSync(current);
    if (info.isSymbolicLink() || !info.isDirectory() || info.dev !== root.dev) fail('ANCESTOR');
    if (realpathSync(current) !== current) fail('ANCESTOR-REALPATH');
  }
  const path = resolve(root.realpath, material.ref);
  if (path !== root.realpath && !path.startsWith(`${root.realpath}${sep}`)) fail('ESCAPE');
  const info = lstatSync(path);
  const before = observedStableSnapshotIdentity(hooks, 'source-pre', material.ref, info);
  if (info.isSymbolicLink() || !info.isFile() || before.dev !== root.dev || before.nlink !== 1)
    fail('SOURCE-TYPE');
  if (realpathSync(path) !== path || before.size !== material.size_bytes) fail('SOURCE-DRIFT');
  return {material, path, before};
};
export const assertStableSnapshotSource = (
  item: ReturnType<typeof resolveStableSnapshotSource>,
  stage: StableSnapshotStage,
  hooks: StableSnapshotIdentityHooks,
) => {
  const current = lstatSync(item.path);
  if (!current.isFile() || current.isSymbolicLink() || realpathSync(item.path) !== item.path)
    fail('SOURCE-DRIFT');
  if (
    !sameStableSnapshotIdentity(
      item.before,
      observedStableSnapshotIdentity(hooks, stage, item.material.ref, current),
    )
  )
    fail('SOURCE-DRIFT');
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
    return fail('AUTHORITY');
  }
  if (!parsed.success) return fail('AUTHORITY');
  const authority = parsed.data;
  if (!isAbsolute(authority.root_path) || resolve(authority.root_path) !== authority.root_path)
    return fail('PATH');
  const real = realpathSync(authority.root_path);
  if (real !== authority.root_path || real !== authority.expected_realpath) return fail('REALPATH');
  const noFollow = constants.O_NOFOLLOW;
  const directory = constants.O_DIRECTORY;
  if (!noFollow || !directory) return fail('FLAGS');
  const fd = openSync(real, constants.O_RDONLY | noFollow | directory);
  try {
    const info = (hooks.rootStat ?? fstatSync)(fd);
    const state = {fd, realpath: real, dev: info.dev, ino: info.ino};
    if (state.dev !== authority.expected_dev || state.ino !== authority.expected_ino)
      return fail('AUTHORITY-DRIFT');
    validateRoot(state);
    const capability = Object.freeze({}) as StableSnapshotRootCapability;
    rootCapabilities.set(capability, state);
    try {
      const result = operation(capability);
      if (result && typeof result === 'object' && 'then' in result) return fail('ASYNC-SCOPE');
      validateRoot(state);
      return result;
    } finally {
      rootCapabilities.delete(capability);
    }
  } finally {
    closeSync(fd);
  }
};
