import {lstatSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';

// prettier-ignore
import {TransactionInspectionV1Schema, TransactionRunBindingV1Schema, type TransactionInspectionV1, type TransactionRunBindingV1} from '../contracts/transaction-kernel-v1.ts';
import {PortableIdSchema, Sha256Schema, TimestampSchema} from '../contracts/primitives.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {assertDeclaredContractSha256} from './hash-bound.ts';
import {readBoundTransactionFileV1} from './transaction-path-guard-v1.ts';

// prettier-ignore
export const TransactionLedgerStateV1Schema = z.enum(['PREPARED', 'RUNNING', 'EFFECT_SUCCEEDED', 'VERIFIED_PASS', 'GUARDIAN_PASS', 'H01_APPROVED', 'PROMOTED', 'BLOCKED_UNCERTAIN']);
export type TransactionLedgerStateV1 = z.infer<typeof TransactionLedgerStateV1Schema>;
export const TransactionLedgerRecordV1Schema = z.strictObject({
  schemaVersion: z.literal('transaction-ledger-record-v1'),
  eventId: PortableIdSchema,
  runId: PortableIdSchema,
  state: TransactionLedgerStateV1Schema,
  payloadSha256: Sha256Schema,
  receiptId: PortableIdSchema.nullable(),
  receiptPhysicalSha256: Sha256Schema.nullable(),
  previousRecordSha256: Sha256Schema.nullable(),
  recordedAt: TimestampSchema,
  recordSha256: Sha256Schema,
});
export type TransactionLedgerRecordV1 = z.infer<typeof TransactionLedgerRecordV1Schema>;

export const readTransactionLedgerV1 = (
  path: string,
  runId: string,
): {records: TransactionLedgerRecordV1[]; issues: string[]} => {
  let raw: string;
  try {
    raw = readBoundTransactionFileV1(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {records: [], issues: []};
    return {records: [], issues: ['INVALID_LEDGER_FILE']};
  }
  if (raw !== '' && !raw.endsWith('\n')) return {records: [], issues: ['PARTIAL_LEDGER_LINE']};
  const records: TransactionLedgerRecordV1[] = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    try {
      const parsed = TransactionLedgerRecordV1Schema.parse(JSON.parse(line));
      const {recordSha256, ...unsigned} = parsed;
      const previous = records.at(-1);
      const eventOnly = parsed.state === 'PREPARED' || parsed.state === 'RUNNING';
      const hasReceipt = parsed.receiptId !== null && parsed.receiptPhysicalSha256 !== null;
      if (
        canonicalize(parsed) !== line ||
        parsed.runId !== runId ||
        recordSha256 !== hashCanonical(unsigned) ||
        parsed.previousRecordSha256 !== (previous?.recordSha256 ?? null) ||
        (previous !== undefined &&
          Date.parse(parsed.recordedAt) < Date.parse(previous.recordedAt)) ||
        eventOnly === hasReceipt
      )
        throw new Error('ledger chain');
      records.push(parsed);
    } catch {
      return {records, issues: ['INVALID_LEDGER_CHAIN']};
    }
  }
  return {records, issues: []};
};

export const readTransactionRunBindingV1 = (
  path: string,
  runId: string,
): {binding: TransactionRunBindingV1 | null; issues: string[]} => {
  try {
    const raw = readBoundTransactionFileV1(path);
    const binding = TransactionRunBindingV1Schema.parse(JSON.parse(raw));
    if (canonicalize(binding) !== raw || binding.runId !== runId)
      throw new Error('binding mismatch');
    assertDeclaredContractSha256(binding, 'canonicalSha256');
    return {binding, issues: []};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {binding: null, issues: []};
    return {binding: null, issues: ['INVALID_RUN_BINDING']};
  }
};

export const inspectTransactionRunV1 = (
  root: string,
  runId: string,
  ignoreLock: boolean,
  readReceipt: (receiptId: string, sha256: string) => unknown,
): TransactionInspectionV1 => {
  const run = resolve(root, runId);
  try {
    const info = lstatSync(run);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('unsafe run');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return TransactionInspectionV1Schema.parse({
      runId,
      status: 'EMPTY',
      latestState: null,
      boundGraphSha256: null,
      latestReceiptId: null,
      latestReceiptPhysicalSha256: null,
      latestRecordSha256: null,
      receiptCount: 0,
      issues: [],
    });
  }
  const ledger = readTransactionLedgerV1(resolve(run, 'ledger.jsonl'), runId);
  const binding = readTransactionRunBindingV1(resolve(run, 'run-binding.json'), runId);
  const issues = [...ledger.issues, ...binding.issues];
  if (ledger.records.length > 0 && binding.binding === null) issues.push('MISSING_RUN_BINDING');
  if (ledger.records.length === 0 && binding.binding !== null) issues.push('ORPHAN_RUN_BINDING');
  let receipts: string[] = [];
  try {
    receipts = readdirSync(resolve(run, 'receipts')).filter((name) => name.endsWith('.json'));
  } catch {
    issues.push('MISSING_RECEIPT_DIRECTORY');
  }
  const receiptRefs = ledger.records.flatMap((item) => (item.receiptId ? [item.receiptId] : []));
  const referenced = new Set(receiptRefs);
  for (const name of receipts) {
    const receiptId = name.slice(0, -5);
    const record = ledger.records.find((item) => item.receiptId === receiptId);
    if (record === undefined) issues.push(`ORPHAN_RECEIPT:${receiptId}`);
    else
      try {
        const receipt = readReceipt(receiptId, record.receiptPhysicalSha256 ?? '');
        const graph = (receipt as {graphSha256?: unknown}).graphSha256;
        if (binding.binding !== null && graph !== binding.binding.graphSha256)
          issues.push(`RECEIPT_GRAPH_DRIFT:${receiptId}`);
      } catch {
        issues.push(`INVALID_RECEIPT:${receiptId}`);
      }
  }
  if (referenced.size !== receipts.length) issues.push('MISSING_OR_DUPLICATE_RECEIPT');
  if (receiptRefs.length !== referenced.size) issues.push('DUPLICATE_RECEIPT_BINDING');
  try {
    lstatSync(resolve(run, 'run.lock'));
    if (!ignoreLock) issues.push('ORPHAN_LOCK');
  } catch {
    /* absent is expected */
  }
  try {
    lstatSync(resolve(run, 'recovery.lock'));
    issues.push('ORPHAN_RECOVERY_LOCK');
  } catch {
    /* absent is expected */
  }
  const latest = ledger.records.at(-1);
  const empty =
    latest === undefined &&
    receipts.length === 0 &&
    binding.binding === null &&
    issues.length === 0;
  return TransactionInspectionV1Schema.parse({
    runId,
    status: empty ? 'EMPTY' : issues.length === 0 ? 'CLEAN' : 'BLOCKED_UNCERTAIN',
    latestState: latest?.state ?? null,
    boundGraphSha256: binding.binding?.graphSha256 ?? null,
    latestReceiptId: latest?.receiptId ?? null,
    latestReceiptPhysicalSha256: latest?.receiptPhysicalSha256 ?? null,
    latestRecordSha256: latest?.recordSha256 ?? null,
    receiptCount: receipts.length,
    issues,
  });
};
