import {resolve} from 'node:path';

import {
  TransactionGuardianReceiptV1Schema,
  TransactionHumanApprovalReceiptV1Schema,
  TransactionPromotionReceiptV1Schema,
  TransactionVerificationReceiptV1Schema,
} from '../contracts/transaction-causal-gates-v1.ts';
import {
  TransactionEffectReceiptV1Schema,
  failTransactionV1,
} from '../contracts/transaction-kernel-v1.ts';
import {PortableIdSchema} from '../contracts/primitives.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {hashCanonical, sha256Text} from '../evidence/hash.ts';
import {appendDurableLineV1} from './transaction-create-only-writer-v1.ts';
import {
  TransactionLedgerRecordV1Schema,
  readTransactionLedgerV1,
  type TransactionLedgerRecordV1,
  type TransactionLedgerStateV1,
} from './transaction-run-inspection-v1.ts';
import {readBoundTransactionFileV1} from './transaction-bound-file-v1.ts';
import type {TransactionDurableSeamV1} from './transaction-durable-store-support-v1.ts';

export interface RecordedReceiptBindingV1 {
  readonly receiptId: string;
  readonly physicalSha256: string;
  readonly state: TransactionLedgerStateV1;
}
export type TransactionLedgerInputV1 = Omit<
  TransactionLedgerRecordV1,
  'schemaVersion' | 'previousRecordSha256' | 'recordSha256'
>;
interface ReceiptReadPortV1 {
  runPath(runId: string): string;
  receiptPath(runId: string, receiptId: string): string;
}
const receiptSchemas = {
  'transaction-effect-receipt-v1': TransactionEffectReceiptV1Schema,
  'transaction-verification-receipt-v1': TransactionVerificationReceiptV1Schema,
  'transaction-guardian-receipt-v1': TransactionGuardianReceiptV1Schema,
  'transaction-human-approval-receipt-v1': TransactionHumanApprovalReceiptV1Schema,
  'transaction-promotion-receipt-v1': TransactionPromotionReceiptV1Schema,
} as const;

export const assertPersistableTransactionReceiptV1 = (
  raw: unknown,
  runId: string,
  receiptId: string,
  state: TransactionLedgerStateV1,
): Record<string, unknown> => {
  const version = (raw as {schemaVersion?: unknown})?.schemaVersion;
  if (typeof version !== 'string' || !(version in receiptSchemas)) {
    return failTransactionV1('RECEIPT_INVALID', 'Unknown transaction receipt schema.');
  }
  const parsed = receiptSchemas[version as keyof typeof receiptSchemas].parse(raw);
  if (parsed.runId !== runId || parsed.receiptId !== receiptId || parsed.state !== state) {
    return failTransactionV1('RECEIPT_INVALID', 'Receipt identity or state binding failed.');
  }
  return parsed;
};

export const readTransactionReceiptV1 = (
  port: ReceiptReadPortV1,
  runIdRaw: string,
  receiptIdRaw: string,
  expectedSha256: string,
): unknown => {
  const runId = PortableIdSchema.parse(runIdRaw);
  const receiptId = PortableIdSchema.parse(receiptIdRaw);
  const raw = readBoundTransactionFileV1(port.receiptPath(runId, receiptId));
  if (sha256Text(raw) !== expectedSha256) {
    return failTransactionV1('RECEIPT_INVALID', `Receipt binding failed: ${receiptId}`);
  }
  const parsed: unknown = JSON.parse(raw);
  if (canonicalize(parsed) !== raw)
    failTransactionV1('RECEIPT_INVALID', 'Receipt is not canonical.');
  if (parsed === null || typeof parsed !== 'object') {
    return failTransactionV1('RECEIPT_INVALID', 'Receipt must be an object.');
  }
  const {canonicalSha256, ...unsigned} = parsed as Record<string, unknown>;
  if (typeof canonicalSha256 !== 'string' || hashCanonical(unsigned) !== canonicalSha256) {
    return failTransactionV1('RECEIPT_INVALID', 'Receipt self-hash mismatch.');
  }
  return parsed;
};

export const readRecordedTransactionReceiptV1 = (
  port: ReceiptReadPortV1,
  runIdRaw: string,
  receiptIdRaw: string,
  physicalSha256: string,
  state?: TransactionLedgerStateV1,
  requireLatest = false,
): unknown => {
  const runId = PortableIdSchema.parse(runIdRaw);
  const receiptId = PortableIdSchema.parse(receiptIdRaw);
  const ledger = readTransactionLedgerV1(resolve(port.runPath(runId), 'ledger.jsonl'), runId);
  if (ledger.issues.length > 0) {
    return failTransactionV1('LEDGER_INVALID', 'Cannot trust invalid causal ledger.');
  }
  const matches = ledger.records.filter(
    (record) => record.receiptId === receiptId && record.receiptPhysicalSha256 === physicalSha256,
  );
  if (matches.length !== 1 || (state !== undefined && matches[0]?.state !== state)) {
    return failTransactionV1(
      'CAUSAL_ORDER',
      'Receipt is not recorded with the expected physical binding.',
    );
  }
  if (requireLatest && ledger.records.at(-1)?.recordSha256 !== matches[0]?.recordSha256) {
    return failTransactionV1(
      'CAUSAL_ORDER',
      'Receipt is not the exact latest durable predecessor.',
    );
  }
  return readTransactionReceiptV1(port, runId, receiptId, physicalSha256);
};

export const assertRecordedTransactionSequenceV1 = (
  port: ReceiptReadPortV1,
  runIdRaw: string,
  bindings: readonly RecordedReceiptBindingV1[],
): void => {
  const runId = PortableIdSchema.parse(runIdRaw);
  const ledger = readTransactionLedgerV1(resolve(port.runPath(runId), 'ledger.jsonl'), runId);
  if (ledger.issues.length > 0) {
    return failTransactionV1('LEDGER_INVALID', 'Cannot order an invalid causal ledger.');
  }
  let priorIndex = -1;
  for (const binding of bindings) {
    const matches = ledger.records
      .map((record, index) => ({record, index}))
      .filter(
        ({record}) =>
          record.receiptId === binding.receiptId &&
          record.receiptPhysicalSha256 === binding.physicalSha256 &&
          record.state === binding.state,
      );
    if (matches.length !== 1 || matches[0]!.index <= priorIndex) {
      return failTransactionV1(
        'CAUSAL_ORDER',
        'Physical receipt sequence is missing, duplicated or out of order.',
      );
    }
    priorIndex = matches[0]!.index;
  }
};

export const appendTransactionLedgerRecordV1 = (
  path: string,
  input: TransactionLedgerInputV1,
  seam: TransactionDurableSeamV1,
  onSeam?: (seam: TransactionDurableSeamV1) => void,
): string => {
  const prior = readTransactionLedgerV1(path, input.runId);
  if (prior.issues.length > 0 || prior.records.some(({eventId}) => eventId === input.eventId)) {
    return failTransactionV1('LEDGER_INVALID', 'Ledger is invalid or event duplicated.');
  }
  const unsigned = {
    schemaVersion: 'transaction-ledger-record-v1' as const,
    ...input,
    previousRecordSha256: prior.records.at(-1)?.recordSha256 ?? null,
  };
  const record = TransactionLedgerRecordV1Schema.parse({
    ...unsigned,
    recordSha256: hashCanonical(unsigned),
  });
  appendDurableLineV1(path, canonicalize(record));
  onSeam?.(seam);
  return record.recordSha256;
};
