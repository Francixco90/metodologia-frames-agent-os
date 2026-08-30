// prettier-ignore
import {closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, unlinkSync} from 'node:fs';
import {isAbsolute, resolve} from 'node:path';

import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {PortableIdSchema} from '../contracts/primitives.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {
  fsyncTransactionDirectoryV1,
  writeAllSyncV1,
  writeExclusiveDurableFileV1,
} from './transaction-create-only-writer-v1.ts';
import {
  appendTransactionLedgerRecordV1,
  assertRecordedTransactionSequenceV1,
  readRecordedTransactionReceiptV1,
  readTransactionReceiptV1,
  type RecordedReceiptBindingV1,
  type TransactionLedgerInputV1,
} from './transaction-durable-receipts-v1.ts';
import type {TransactionLedgerStateV1} from './transaction-run-inspection-v1.ts';
import {ensureTransactionDirectoryV1} from './transaction-path-guard-v1.ts';
import {ActiveTransactionRunRegistryV1} from './transaction-run-identity-v1.ts';
import {assertSupportedTransactionFilesystemV1} from './stable-root-capability-v1.ts';

export {assertPersistableTransactionReceiptV1} from './transaction-durable-receipts-v1.ts';
export type {RecordedReceiptBindingV1} from './transaction-durable-receipts-v1.ts';

// prettier-ignore
export type TransactionDurableSeamV1 = 'LOCK_FSYNC' | 'RUN_BINDING_FSYNC' | 'RECEIPT_FSYNC' | 'LEDGER_FSYNC' | 'LOCK_RELEASE' | 'RECOVERY_RECEIPT_FSYNC' | 'RECOVERY_LEDGER_FSYNC';
export interface TransactionDurableHooksV1 {
  readonly onSeam?: (seam: TransactionDurableSeamV1) => void;
}
export interface PersistedTransactionReceiptV1 {
  readonly receiptId: string;
  readonly physicalSha256: string;
  readonly recordSha256: string;
}
export class TransactionDurableStoreSupportV1 {
  readonly #held = new Set<string>();
  readonly #activeRuns = new ActiveTransactionRunRegistryV1();
  readonly #rootIdentity: Readonly<{dev: number; ino: number}>;
  public readonly root: string;
  public constructor(
    root: string,
    public readonly hooks: TransactionDurableHooksV1 = {},
  ) {
    if (!isAbsolute(root) || resolve(root) !== root)
      failTransactionV1('LEDGER_INVALID', 'Durable root must be absolute and normalized.');
    this.root = realpathSync(root);
    if (this.root !== root) failTransactionV1('LEDGER_INVALID', 'Durable root must be realpath.');
    const info = lstatSync(this.root);
    if (info.isSymbolicLink() || !info.isDirectory())
      failTransactionV1('LEDGER_INVALID', 'Durable root must be a real directory.');
    assertSupportedTransactionFilesystemV1(this.root);
    this.#rootIdentity = {dev: info.dev, ino: info.ino};
  }
  public isHeld(runId: string): boolean {
    return this.#held.has(runId);
  }
  public runPath(runIdRaw: string): string {
    const current = lstatSync(this.root);
    if (
      current.isSymbolicLink() ||
      !current.isDirectory() ||
      current.dev !== this.#rootIdentity.dev ||
      current.ino !== this.#rootIdentity.ino ||
      realpathSync(this.root) !== this.root
    )
      return failTransactionV1('ROOT_IDENTITY_DRIFT', 'Durable root identity drifted.');
    const runId = PortableIdSchema.parse(runIdRaw);
    const run = resolve(this.root, runId);
    this.#activeRuns.assert(runId, run);
    return run;
  }
  public receiptPath(runId: string, receiptId: string): string {
    return resolve(this.runPath(runId), 'receipts', `${PortableIdSchema.parse(receiptId)}.json`);
  }
  public assertHeld(runId: string): void {
    if (!this.#held.has(runId))
      failTransactionV1('LOCK_CONFLICT', 'Durable append requires run lock.');
  }
  public writeReceipt(path: string, raw: string, seam: TransactionDurableSeamV1): void {
    writeExclusiveDurableFileV1(path, raw);
    this.hooks.onSeam?.(seam);
  }
  public readReceipt(runIdRaw: string, receiptIdRaw: string, expectedSha256: string): unknown {
    return readTransactionReceiptV1(this, runIdRaw, receiptIdRaw, expectedSha256);
  }
  public readRecordedReceipt(
    runIdRaw: string,
    receiptIdRaw: string,
    physicalSha256: string,
    state?: TransactionLedgerStateV1,
    requireLatest = false,
  ): unknown {
    return readRecordedTransactionReceiptV1(
      this,
      runIdRaw,
      receiptIdRaw,
      physicalSha256,
      state,
      requireLatest,
    );
  }
  public assertRecordedSequence(
    runIdRaw: string,
    bindings: readonly RecordedReceiptBindingV1[],
  ): void {
    assertRecordedTransactionSequenceV1(this, runIdRaw, bindings);
  }
  public append(
    path: string,
    input: TransactionLedgerInputV1,
    seam: TransactionDurableSeamV1 = 'LEDGER_FSYNC',
  ): string {
    return appendTransactionLedgerRecordV1(path, input, seam, this.hooks.onSeam);
  }
  public withLock<T>(
    runIdRaw: string,
    lockName: string,
    payload: object,
    trackRun: boolean,
    operation: (resumed: boolean) => T,
    resumeExisting = false,
  ): T {
    const runId = PortableIdSchema.parse(runIdRaw);
    const run = this.#ensureRun(runId);
    this.#activeRuns.begin(runId, run);
    const lock = resolve(run, lockName);
    let fd = -1;
    let resumed = false;
    try {
      fd = openSync(
        lock,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
        0o400,
      );
    } catch {
      if (!resumeExisting) {
        this.#activeRuns.end(runId);
        return failTransactionV1('LOCK_CONFLICT', `Durable lock exists: ${lockName}`);
      }
      try {
        fd = openSync(lock, constants.O_RDONLY | constants.O_NOFOLLOW);
        if (readFileSync(fd, 'utf8') !== canonicalize(payload))
          return failTransactionV1(
            'LOCK_CONFLICT',
            `Durable lock belongs to another action: ${lockName}`,
          );
        resumed = true;
      } catch (resumeError) {
        if (fd >= 0) closeSync(fd);
        this.#activeRuns.end(runId);
        throw resumeError;
      }
    }
    try {
      if (!resumed) {
        writeAllSyncV1(fd, canonicalize(payload));
        fsyncSync(fd);
        fsyncTransactionDirectoryV1(run);
      }
      const identity = fstatSync(fd);
      if (!resumed) this.hooks.onSeam?.('LOCK_FSYNC');
      if (trackRun) this.#held.add(runId);
      const result = operation(resumed);
      const current = lstatSync(resolve(this.runPath(runId), lockName));
      if (
        !current.isFile() ||
        current.isSymbolicLink() ||
        current.nlink !== 1 ||
        identity.nlink !== 1 ||
        current.dev !== identity.dev ||
        current.ino !== identity.ino
      )
        return failTransactionV1('BLOCKED_UNCERTAIN', 'Durable lock identity drifted.');
      closeSync(fd);
      fd = -1;
      unlinkSync(lock);
      fsyncTransactionDirectoryV1(this.runPath(runId));
      this.hooks.onSeam?.('LOCK_RELEASE');
      return result;
    } finally {
      if (fd >= 0) closeSync(fd);
      this.#held.delete(runId);
      this.#activeRuns.end(runId);
    }
  }
  #ensureRun(runId: string): string {
    const run = this.runPath(runId);
    ensureTransactionDirectoryV1(run);
    ensureTransactionDirectoryV1(resolve(run, 'receipts'));
    return run;
  }
}
