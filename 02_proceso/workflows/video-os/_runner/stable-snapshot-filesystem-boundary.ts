import {createHash} from 'node:crypto';
import {closeSync, constants, fstatSync, lstatSync, openSync, readSync, type Stats} from 'node:fs';

import {STABLE_SNAPSHOT_COVERAGE_GAPS} from '../_schema/stable-snapshot-reader-v1.schema.ts';

export class StableSnapshotError extends Error {
  readonly coverage_gaps = STABLE_SNAPSHOT_COVERAGE_GAPS;
  readonly reason: string;
  constructor(reason: string) {
    const stableReason = /^[A-Z][A-Z0-9-]*$/u.test(reason) ? reason : 'UNSAFE-REASON';
    super(`STABLE-SNAPSHOT-${stableReason}`);
    this.reason = stableReason;
  }
}
export const stableSnapshotError = (error: unknown, fallback: string): StableSnapshotError =>
  error instanceof StableSnapshotError ? error : new StableSnapshotError(fallback);
export const stableSnapshotFail = (reason: string): never => {
  throw new StableSnapshotError(reason);
};
export const stableSnapshotBoundary = <T>(reason: string, operation: () => T): T => {
  try {
    return operation();
  } catch (error) {
    throw stableSnapshotError(error, reason);
  }
};

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
) =>
  stableSnapshotBoundary(
    'IDENTITY-HOOK',
    () =>
      hooks.identity?.(stage, ref, stableSnapshotIdentity(value)) ?? stableSnapshotIdentity(value),
  );

const hashStableSnapshotFd = (fd: number, expectedSize: number) => {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let bytes = 0;
  for (
    let count = stableSnapshotBoundary('VERIFY-READ', () =>
      readSync(fd, buffer, 0, buffer.length, null),
    );
    count !== 0;
  ) {
    if (count < 0 || count > buffer.length || bytes + count > expectedSize)
      stableSnapshotFail('READ-BUDGET');
    hash.update(buffer.subarray(0, count));
    bytes += count;
    count = stableSnapshotBoundary('VERIFY-READ', () =>
      readSync(fd, buffer, 0, buffer.length, null),
    );
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
  const unresolved = stableSnapshotBoundary('VERIFY-LSTAT', () => lstatSync(path));
  if (unresolved.isSymbolicLink() || !unresolved.isFile()) stableSnapshotFail('SNAPSHOT-DRIFT');
  const fd = stableSnapshotBoundary('VERIFY-OPEN', () =>
    openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW),
  );
  let failure: StableSnapshotError | undefined;
  try {
    const before = observedStableSnapshotIdentity(
      hooks,
      'snapshot',
      ref,
      stableSnapshotBoundary('VERIFY-FSTAT', () => fstatSync(fd)),
    );
    const checked = hashStableSnapshotFd(fd, expected.size);
    const after = observedStableSnapshotIdentity(
      hooks,
      'snapshot',
      ref,
      stableSnapshotBoundary('VERIFY-FSTAT', () => fstatSync(fd)),
    );
    const current = stableSnapshotIdentity(
      stableSnapshotBoundary('VERIFY-LSTAT', () => lstatSync(path)),
    );
    if (
      !sameStableSnapshotIdentity(expected, before) ||
      !sameStableSnapshotIdentity(before, after) ||
      !sameStableSnapshotIdentity(after, current) ||
      checked.bytes !== expected.size ||
      checked.sha256 !== sha256
    )
      stableSnapshotFail('SNAPSHOT-DRIFT');
  } catch (error) {
    failure = stableSnapshotError(error, 'VERIFY');
  }
  try {
    closeSync(fd);
  } catch (error) {
    failure ??= stableSnapshotError(error, 'VERIFY-CLOSE');
  }
  if (failure) throw failure;
};
