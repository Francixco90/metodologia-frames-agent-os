import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
  statfsSync,
  type Stats,
} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';

import {
  TransactionRootAuthorityV1Schema,
  failTransactionV1,
  type TransactionRootAuthorityV1,
} from '../contracts/transaction-kernel-v1.ts';

export const TRANSACTION_ROOT_COVERAGE_GAPS = [
  'NODE_FS_OPENAT_UNAVAILABLE',
  'HOST_OBJECT_TRAPS_REQUIRE_OUTER_TIME_BOUND',
] as const;
const NETWORK_FS_TYPES = new Set([0x6969, 0x517b, 0xff534d42]);
type RootStateV1 = Readonly<{
  fd: number;
  realpath: string;
  dev: number;
  ino: number;
  filesystemType: number;
  parentRealpath: string;
  parentDev: number;
  parentIno: number;
}>;
declare const rootBrand: unique symbol;
export type RootCapabilityV1 = Readonly<{[rootBrand]: true}>;
const capabilities = new WeakMap<object, RootStateV1>();

export interface StableRootHooksV1 {
  readonly platform?: NodeJS.Platform;
  readonly rootStat?: (fd: number) => Stats;
  readonly filesystemStat?: (path: string) => ReturnType<typeof statfsSync>;
  readonly onSeam?: (seam: StableRootSeamV1) => void;
}
export type StableRootSeamV1 =
  'ROOT_REALPATH' | 'ROOT_OPENED' | 'ROOT_VALIDATED_PRE' | 'ROOT_VALIDATED_POST' | 'ROOT_CLOSED';

export const assertSupportedTransactionFilesystemV1 = (
  path: string,
  hooks: StableRootHooksV1 = {},
  expectedType?: number,
): number => {
  if ((hooks.platform ?? process.platform) === 'win32') {
    return failTransactionV1('CAPABILITY_GAP', 'Windows secure filesystem backend unavailable.');
  }
  if (!constants.O_NOFOLLOW || !constants.O_DIRECTORY) {
    return failTransactionV1('CAPABILITY_GAP', 'Required no-follow directory flags unavailable.');
  }
  const info = (hooks.filesystemStat ?? statfsSync)(path);
  const rawType = info.type;
  if (
    typeof rawType === 'bigint' &&
    (rawType > BigInt(Number.MAX_SAFE_INTEGER) || rawType < BigInt(Number.MIN_SAFE_INTEGER))
  ) {
    return failTransactionV1('CAPABILITY_GAP', 'Filesystem type exceeds safe integer range.');
  }
  const filesystemType = Number(rawType);
  if (
    (expectedType !== undefined && filesystemType !== expectedType) ||
    NETWORK_FS_TYPES.has(filesystemType)
  ) {
    return failTransactionV1('CAPABILITY_GAP', 'Filesystem is unbound or NFS-like.');
  }
  return filesystemType;
};

const validate = (state: RootStateV1): void => {
  let path: Stats;
  let open: Stats;
  try {
    path = lstatSync(state.realpath);
    open = fstatSync(state.fd);
  } catch {
    return failTransactionV1('ROOT_IDENTITY_DRIFT', 'Root identity cannot be read.');
  }
  const parent = lstatSync(state.parentRealpath);
  if (
    path.isSymbolicLink() ||
    !path.isDirectory() ||
    !open.isDirectory() ||
    path.dev !== state.dev ||
    path.ino !== state.ino ||
    open.dev !== state.dev ||
    open.ino !== state.ino ||
    parent.dev !== state.parentDev ||
    parent.ino !== state.parentIno ||
    realpathSync(state.realpath) !== state.realpath ||
    realpathSync(state.parentRealpath) !== state.parentRealpath
  ) {
    failTransactionV1('ROOT_IDENTITY_DRIFT', 'Root or parent identity drifted.');
  }
};

export const getStableRootV1 = (value: unknown): RootStateV1 => {
  if (value === null || typeof value !== 'object') {
    return failTransactionV1('ROOT_AUTHORITY_INVALID', 'Opaque root capability required.');
  }
  const state = capabilities.get(value);
  if (state === undefined) {
    return failTransactionV1('ROOT_AUTHORITY_INVALID', 'Expired or forged root capability.');
  }
  validate(state);
  return state;
};

const parseAuthority = (raw: unknown): TransactionRootAuthorityV1 => {
  const parsed = TransactionRootAuthorityV1Schema.safeParse(raw);
  if (!parsed.success) {
    return failTransactionV1('ROOT_AUTHORITY_INVALID', 'Invalid root authority contract.');
  }
  return parsed.data;
};

export const withStableRootCapabilityV1 = <T>(
  raw: unknown,
  operation: (capability: RootCapabilityV1) => T,
  hooks: StableRootHooksV1 = {},
): T => {
  const authority = parseAuthority(raw);
  if (!isAbsolute(authority.rootPath) || resolve(authority.rootPath) !== authority.rootPath) {
    return failTransactionV1(
      'ROOT_AUTHORITY_INVALID',
      'Root path must be absolute and normalized.',
    );
  }
  const real = realpathSync(authority.rootPath);
  hooks.onSeam?.('ROOT_REALPATH');
  if (real !== authority.rootPath || real !== authority.expectedRealpath) {
    return failTransactionV1('ROOT_AUTHORITY_INVALID', 'Root realpath does not match authority.');
  }
  const flags = constants.O_NOFOLLOW | constants.O_DIRECTORY;
  const filesystemType = assertSupportedTransactionFilesystemV1(
    real,
    hooks,
    authority.expectedFilesystemType,
  );
  const fd = openSync(real, constants.O_RDONLY | flags);
  hooks.onSeam?.('ROOT_OPENED');
  let result: T | undefined;
  let failure: unknown;
  try {
    const info = (hooks.rootStat ?? fstatSync)(fd);
    const parentRealpath = realpathSync(dirname(real));
    const parent = lstatSync(parentRealpath);
    const state: RootStateV1 = Object.freeze({
      fd,
      realpath: real,
      dev: info.dev,
      ino: info.ino,
      filesystemType,
      parentRealpath,
      parentDev: parent.dev,
      parentIno: parent.ino,
    });
    if (state.dev !== authority.expectedDev || state.ino !== authority.expectedIno) {
      failTransactionV1('ROOT_AUTHORITY_INVALID', 'Root dev/ino does not match authority.');
    }
    validate(state);
    hooks.onSeam?.('ROOT_VALIDATED_PRE');
    const capability = Object.freeze({}) as RootCapabilityV1;
    capabilities.set(capability, state);
    try {
      result = operation(capability);
      if (result !== null && typeof result === 'object' && 'then' in result) {
        failTransactionV1('CAPABILITY_GAP', 'Root capability cannot escape synchronous scope.');
      }
      validate(state);
      hooks.onSeam?.('ROOT_VALIDATED_POST');
    } finally {
      capabilities.delete(capability);
    }
  } catch (error) {
    failure = error;
  }
  try {
    closeSync(fd);
    hooks.onSeam?.('ROOT_CLOSED');
  } catch (error) {
    failure ??= error;
  }
  if (failure !== undefined) {
    if (failure instanceof Error) throw failure;
    return failTransactionV1('BLOCKED_UNCERTAIN', 'Root operation threw a non-error value.');
  }
  return result as T;
};
