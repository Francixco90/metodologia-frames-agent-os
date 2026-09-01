import {resolve} from 'node:path';
// prettier-ignore
import {TransactionRunBindingV1Schema, failTransactionV1, type TransactionInspectionV1, type TransactionRecoveryReceiptV1, type TransactionRunBindingV1} from '../contracts/transaction-kernel-v1.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {hashCanonical, sha256Text} from '../evidence/hash.ts';
// prettier-ignore
import {inspectTransactionRunV1, readTransactionRunBindingV1, type TransactionLedgerStateV1} from './transaction-run-inspection-v1.ts';
import {computeDeclaredContractSha256} from './hash-bound.ts';
import {persistRecoveryReceiptV1} from './transaction-recovery-persistence-v1.ts';
// prettier-ignore
import {TransactionDurableStoreSupportV1, assertPersistableTransactionReceiptV1, type PersistedTransactionReceiptV1, type RecordedReceiptBindingV1, type TransactionDurableHooksV1} from './transaction-durable-store-support-v1.ts';
export * from './transaction-durable-store-support-v1.ts';
export class TransactionDurableStoreV1 {
  readonly #support: TransactionDurableStoreSupportV1;
  public constructor(
    root: string,
    private readonly hooks: TransactionDurableHooksV1 = {},
  ) {
    this.#support = new TransactionDurableStoreSupportV1(root, hooks);
  }
  public get root(): string {
    return this.#support.root;
  }
  public withRunLock<T>(
    runIdRaw: string,
    lockId: string,
    actorId: string,
    recordedAt: string,
    operation: () => T,
  ): T {
    return this.#support.withLock(
      runIdRaw,
      'run.lock',
      {lockId, runId: runIdRaw, actorId, recordedAt},
      true,
      operation,
    );
  }

  public bindRun(runIdRaw: string, graphSha256: string, boundAt: string): TransactionRunBindingV1 {
    const runId = runIdRaw;
    this.#support.assertHeld(runId);
    const path = resolve(this.#support.runPath(runId), 'run-binding.json');
    const current = readTransactionRunBindingV1(path, runId);
    if (current.issues.length > 0)
      return failTransactionV1('LEDGER_INVALID', 'Run binding is invalid.');
    if (current.binding !== null) {
      if (current.binding.graphSha256 !== graphSha256)
        return failTransactionV1(
          'AUTHORIZATION_DRIFT',
          'Run graph is already bound to another digest.',
        );
      return current.binding;
    }
    const unsigned = {
      schemaVersion: 'transaction-run-binding-v1' as const,
      runId,
      graphSha256,
      boundAt,
    };
    const binding = TransactionRunBindingV1Schema.parse({
      ...unsigned,
      canonicalSha256: computeDeclaredContractSha256(unsigned, 'canonicalSha256'),
    });
    this.#support.writeReceipt(path, canonicalize(binding), 'RUN_BINDING_FSYNC');
    return binding;
  }

  public assertRunBinding(runIdRaw: string, graphSha256: string): TransactionRunBindingV1 {
    const runId = runIdRaw;
    const result = readTransactionRunBindingV1(
      resolve(this.#support.runPath(runId), 'run-binding.json'),
      runId,
    );
    if (
      result.issues.length > 0 ||
      result.binding === null ||
      result.binding.graphSha256 !== graphSha256
    ) {
      return failTransactionV1(
        'AUTHORIZATION_DRIFT',
        'Missing, invalid or drifted run graph binding.',
      );
    }
    return result.binding;
  }

  public appendEvent(
    runId: string,
    eventId: string,
    state: 'PREPARED' | 'RUNNING',
    payload: unknown,
    recordedAt: string,
  ): string {
    this.#support.assertHeld(runId);
    if (state !== 'PREPARED' && state !== 'RUNNING')
      return failTransactionV1('LEDGER_INVALID', 'Event-only append cannot mint a receipt state.');
    return this.#support.append(resolve(this.#support.runPath(runId), 'ledger.jsonl'), {
      eventId,
      runId,
      state,
      payloadSha256: hashCanonical(payload),
      receiptId: null,
      receiptPhysicalSha256: null,
      recordedAt,
    });
  }

  public persistReceipt(
    runId: string,
    receiptId: string,
    state: TransactionLedgerStateV1,
    receipt: unknown,
    recordedAt: string,
  ): PersistedTransactionReceiptV1 {
    this.#support.assertHeld(runId);
    const validated = assertPersistableTransactionReceiptV1(receipt, runId, receiptId, state);
    const graphSha256 = validated.graphSha256;
    if (typeof graphSha256 !== 'string')
      return failTransactionV1('RECEIPT_INVALID', 'Transaction receipt must bind a graph.');
    this.assertRunBinding(runId, graphSha256);
    const raw = canonicalize(validated);
    const physicalSha256 = sha256Text(raw);
    this.#support.writeReceipt(this.#support.receiptPath(runId, receiptId), raw, 'RECEIPT_FSYNC');
    const recordSha256 = this.#support.append(
      resolve(this.#support.runPath(runId), 'ledger.jsonl'),
      {
        eventId: `${receiptId}.persisted`,
        runId,
        state,
        payloadSha256: hashCanonical(validated),
        receiptId,
        receiptPhysicalSha256: physicalSha256,
        recordedAt,
      },
    );
    return {receiptId, physicalSha256, recordSha256};
  }

  public readReceipt(runIdRaw: string, receiptIdRaw: string, expectedSha256: string): unknown {
    return this.#support.readReceipt(runIdRaw, receiptIdRaw, expectedSha256);
  }

  public readRecordedReceipt(
    runIdRaw: string,
    receiptIdRaw: string,
    physicalSha256: string,
    state?: TransactionLedgerStateV1,
    requireLatest = false,
  ): unknown {
    return this.#support.readRecordedReceipt(
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
    this.#support.assertRecordedSequence(runIdRaw, bindings);
  }

  public inspect(runIdRaw: string): TransactionInspectionV1 {
    const runId = runIdRaw;
    this.#support.runPath(runId);
    return inspectTransactionRunV1(
      this.#support.root,
      runId,
      this.#support.isHeld(runId),
      (receiptId, sha256) => this.readReceipt(runId, receiptId, sha256),
    );
  }
  public persistRecovery(
    runId: string,
    recoveryId: string,
    receipt: unknown,
    recordedAt: string,
  ): TransactionRecoveryReceiptV1 {
    return persistRecoveryReceiptV1(this.#support, runId, recoveryId, receipt, recordedAt);
  }
}
