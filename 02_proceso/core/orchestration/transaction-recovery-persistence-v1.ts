import {resolve} from 'node:path';

import {
  TransactionRecoveryReceiptV1Schema,
  failTransactionV1,
  type TransactionRecoveryReceiptV1,
} from '../contracts/transaction-kernel-v1.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {hashCanonical, sha256Text} from '../evidence/hash.ts';
import {assertDeclaredContractSha256} from './hash-bound.ts';
import type {TransactionDurableStoreSupportV1} from './transaction-durable-store-support-v1.ts';
import {readTransactionLedgerV1} from './transaction-run-inspection-v1.ts';
import {
  ensureTransactionDirectoryV1,
  readBoundTransactionFileV1,
} from './transaction-path-guard-v1.ts';

const stableRecoveryFieldsV1 = (receipt: TransactionRecoveryReceiptV1): string => {
  const fields = {...receipt} as Partial<TransactionRecoveryReceiptV1>;
  delete fields.authorityVerdictSha256;
  delete fields.canonicalSha256;
  return hashCanonical(fields);
};
const readExistingRecoveryV1 = (
  path: string,
): Readonly<{raw: string; receipt: TransactionRecoveryReceiptV1}> | null => {
  try {
    const raw = readBoundTransactionFileV1(path);
    const receipt = TransactionRecoveryReceiptV1Schema.parse(JSON.parse(raw));
    assertDeclaredContractSha256(receipt, 'canonicalSha256');
    if (canonicalize(receipt) !== raw) {
      return failTransactionV1('RECEIPT_INVALID', 'Recovery receipt is not canonical.');
    }
    return {raw, receipt};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

type RecoveryPersistenceOutcomeV1 =
  Readonly<{status: 'OK'; receipt: TransactionRecoveryReceiptV1}> | Readonly<{status: 'CONFLICT'}>;

export const persistRecoveryReceiptV1 = (
  support: TransactionDurableStoreSupportV1,
  runId: string,
  recoveryId: string,
  rawReceipt: unknown,
  recordedAt: string,
): TransactionRecoveryReceiptV1 => {
  const requested = TransactionRecoveryReceiptV1Schema.parse(rawReceipt);
  const outcome: RecoveryPersistenceOutcomeV1 = support.withLock(
    runId,
    'recovery.lock',
    {
      runId,
      recoveryId,
      recordedAt,
      stableRecoverySha256: stableRecoveryFieldsV1(requested),
    },
    false,
    () => {
      const run = support.runPath(runId);
      const recoveryDir = resolve(run, 'recovery-receipts');
      ensureTransactionDirectoryV1(recoveryDir);
      const path = resolve(recoveryDir, `${recoveryId}.json`);
      const existing = readExistingRecoveryV1(path);
      if (
        existing !== null &&
        stableRecoveryFieldsV1(existing.receipt) !== stableRecoveryFieldsV1(requested)
      ) {
        return {status: 'CONFLICT'} as const;
      }
      const receipt = existing?.receipt ?? requested;
      const raw = existing?.raw ?? canonicalize(receipt);
      if (existing === null) support.writeReceipt(path, raw, 'RECOVERY_RECEIPT_FSYNC');
      const physicalSha256 = sha256Text(raw);
      const ledgerPath = resolve(run, 'recovery-ledger.jsonl');
      const ledger = readTransactionLedgerV1(ledgerPath, runId);
      if (ledger.issues.length > 0) {
        return failTransactionV1('LEDGER_INVALID', 'Recovery ledger is invalid.');
      }
      const eventId = `${recoveryId}.recovery`;
      const prior = ledger.records.filter((record) => record.eventId === eventId);
      if (prior.length > 0) {
        const record = prior.length === 1 ? prior[0]! : undefined;
        if (record?.receiptId !== recoveryId || record.receiptPhysicalSha256 !== physicalSha256) {
          return failTransactionV1('LEDGER_INVALID', 'Recovery replay binding differs.');
        }
        return {status: 'OK', receipt};
      }
      support.append(
        ledgerPath,
        {
          eventId,
          runId,
          state: 'BLOCKED_UNCERTAIN',
          payloadSha256: hashCanonical(receipt),
          receiptId: recoveryId,
          receiptPhysicalSha256: physicalSha256,
          recordedAt,
        },
        'RECOVERY_LEDGER_FSYNC',
      );
      return {status: 'OK', receipt};
    },
    true,
  );
  if (outcome.status === 'CONFLICT') {
    return failTransactionV1(
      'RECOVERY_UNAUTHORIZED',
      'Recovery replay differs from persisted action.',
    );
  }
  return outcome.receipt;
};
