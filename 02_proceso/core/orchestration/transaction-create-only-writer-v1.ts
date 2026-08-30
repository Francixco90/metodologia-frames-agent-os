import {createHash} from 'node:crypto';
// prettier-ignore
import {closeSync, constants, fchmodSync, fstatSync, fsyncSync, linkSync, lstatSync, openSync, readFileSync, realpathSync, unlinkSync, writeSync, type Stats} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
// prettier-ignore
import {TransactionCreateFileIntentV1Schema, TransactionKernelErrorV1, failTransactionV1, type TransactionCreateFileIntentV1, type TransactionOutputV1} from '../contracts/transaction-kernel-v1.ts';
// prettier-ignore
import {assertDeclaredParentsV1, assertExactTransactionRefV1, readBoundTransactionFileV1} from './transaction-path-guard-v1.ts';
import {getStableRootV1, type RootCapabilityV1} from './stable-root-capability-v1.ts';
// prettier-ignore
export type TransactionWriterSeamV1 = 'TEMP_OPENED' | 'BYTES_WRITTEN' | 'FILE_SYNCED' | 'TARGET_LINKED' | 'PARENT_SYNCED' | 'READBACK_VERIFIED' | 'TEMP_REMOVED' | 'PARENT_RESYNCED';
// prettier-ignore
export type TransactionWriterOperationV1 = 'TEMP_OPEN' | 'WRITE' | 'FILE_FSYNC' | 'LINK' | 'PARENT_OPEN' | 'PARENT_FSYNC' | 'READBACK' | 'TEMP_UNLINK' | 'PARENT_RESYNC';
// prettier-ignore
export interface TransactionWriterHooksV1 { readonly onSeam?: (seam: TransactionWriterSeamV1) => void; readonly beforeOperation?: (operation: TransactionWriterOperationV1) => void; }
function uncertain(error: unknown): never {
  if (error instanceof TransactionKernelErrorV1 && error.code === 'BLOCKED_UNCERTAIN') throw error;
  const message = error instanceof Error ? error.message : 'unknown filesystem failure';
  return failTransactionV1('BLOCKED_UNCERTAIN', `Transaction filesystem uncertain: ${message}`);
}
// prettier-ignore
export const writeAllSyncV1 = (fd: number, raw: string | Uint8Array, position: number | null = 0): void => {
  const bytes = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : raw;
  let offset = 0;
  while (offset < bytes.byteLength) {
    // prettier-ignore
    const written = writeSync(fd, bytes, offset, bytes.byteLength - offset, position === null ? null : position + offset);
    if (written <= 0) failTransactionV1('WRITE_FAILED', 'Write made no progress.');
    offset += written;
  }
};
export const fsyncTransactionDirectoryV1 = (path: string): void => {
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
};
export const writeExclusiveDurableFileV1 = (path: string, raw: string): void => {
  try {
    const fd = openSync(
      path,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o400,
    );
    try {
      writeAllSyncV1(fd, raw);
      fchmodSync(fd, 0o400);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (readBoundTransactionFileV1(path) !== raw) throw new Error('Durable readback mismatch.');
    fsyncTransactionDirectoryV1(dirname(path));
  } catch (error) {
    return uncertain(error);
  }
};
export const appendDurableLineV1 = (path: string, line: string): void => {
  let before: Stats | undefined;
  try {
    before = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return uncertain(error);
  }
  try {
    const fd = openSync(
      path,
      constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    );
    try {
      const opened = fstatSync(fd);
      // prettier-ignore
      if (!opened.isFile() || opened.nlink !== 1 || (before !== undefined && (before.isSymbolicLink() || before.dev !== opened.dev || before.ino !== opened.ino))) throw new Error('Ledger identity is unsafe.');
      writeAllSyncV1(fd, `${line}\n`, null);
      fsyncSync(fd);
      const after = lstatSync(path);
      // prettier-ignore
      if (after.dev !== opened.dev || after.ino !== opened.ino || after.nlink !== 1 || realpathSync(path) !== path) throw new Error('Ledger identity drifted.');
    } finally {
      closeSync(fd);
    }
    fsyncTransactionDirectoryV1(dirname(path));
  } catch (error) {
    return uncertain(error);
  }
};

const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export const writeCreateOnlyV1 = (
  capability: RootCapabilityV1,
  raw: TransactionCreateFileIntentV1,
  attemptId: string,
  hooks: TransactionWriterHooksV1 = {},
): TransactionOutputV1 => {
  const parsed = TransactionCreateFileIntentV1Schema.safeParse(raw);
  if (!parsed.success) return failTransactionV1('CONTRACT_INVALID', 'Invalid CREATE_FILE intent.');
  const intent = parsed.data;
  assertExactTransactionRefV1(intent.ref);
  assertDeclaredParentsV1(capability, [intent.ref]);
  const bytes = Buffer.from(intent.contentBase64, 'base64');
  if (digest(bytes) !== intent.contentSha256) {
    return failTransactionV1('HASH_MISMATCH', 'Intent content digest mismatch.');
  }
  const root = getStableRootV1(capability);
  const target = resolve(root.realpath, intent.ref);
  const parentPath = dirname(target);
  const parentBefore = lstatSync(parentPath);
  // prettier-ignore
  const assertParentStable = (): void => { const current = lstatSync(parentPath); if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== parentBefore.dev || current.ino !== parentBefore.ino || realpathSync(parentPath) !== parentPath) throw new Error('Output parent identity drifted.'); };
  const temp = resolve(parentPath, `.${basename(target)}.${attemptId}.tmp`);
  let fileFd: number | undefined;
  let parentFd: number | undefined;
  try {
    try {
      lstatSync(target);
      return failTransactionV1('BLOCKED_UNCERTAIN', 'Create-only target already exists.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    hooks.beforeOperation?.('TEMP_OPEN');
    assertParentStable();
    fileFd = openSync(
      temp,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    );
    hooks.onSeam?.('TEMP_OPENED');
    hooks.beforeOperation?.('WRITE');
    writeAllSyncV1(fileFd, bytes);
    hooks.onSeam?.('BYTES_WRITTEN');
    hooks.beforeOperation?.('FILE_FSYNC');
    fsyncSync(fileFd);
    hooks.onSeam?.('FILE_SYNCED');
    const tempInfo = fstatSync(fileFd);
    if (!tempInfo.isFile() || tempInfo.nlink !== 1 || tempInfo.dev !== root.dev) {
      throw new Error('Temporary file identity is unsafe.');
    }
    hooks.beforeOperation?.('LINK');
    assertParentStable();
    linkSync(temp, target);
    hooks.onSeam?.('TARGET_LINKED');
    hooks.beforeOperation?.('PARENT_OPEN');
    parentFd = openSync(
      parentPath,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    const parentOpen = fstatSync(parentFd);
    if (parentOpen.dev !== parentBefore.dev || parentOpen.ino !== parentBefore.ino) {
      throw new Error('Output parent identity drifted.');
    }
    hooks.beforeOperation?.('PARENT_FSYNC');
    fsyncSync(parentFd);
    hooks.onSeam?.('PARENT_SYNCED');
    hooks.beforeOperation?.('READBACK');
    const targetInfo = lstatSync(target);
    const readback = readFileSync(target);
    if (
      targetInfo.isSymbolicLink() ||
      !targetInfo.isFile() ||
      targetInfo.dev !== root.dev ||
      targetInfo.ino !== tempInfo.ino ||
      targetInfo.nlink !== 2 ||
      realpathSync(target) !== target ||
      digest(readback) !== intent.contentSha256
    ) {
      throw new Error('Create-only readback identity or digest mismatch.');
    }
    hooks.onSeam?.('READBACK_VERIFIED');
    hooks.beforeOperation?.('TEMP_UNLINK');
    unlinkSync(temp);
    hooks.onSeam?.('TEMP_REMOVED');
    hooks.beforeOperation?.('PARENT_RESYNC');
    fsyncSync(parentFd);
    hooks.onSeam?.('PARENT_RESYNCED');
    if (lstatSync(target).nlink !== 1) throw new Error('Published target retained a hardlink.');
    getStableRootV1(capability);
    return {ref: intent.ref, sha256: intent.contentSha256, sizeBytes: bytes.byteLength};
  } catch (error) {
    return uncertain(error);
  } finally {
    if (fileFd !== undefined) {
      try {
        closeSync(fileFd);
      } catch (error) {
        uncertain(error);
      }
    }
    if (parentFd !== undefined) {
      try {
        closeSync(parentFd);
      } catch (error) {
        uncertain(error);
      }
    }
  }
};
