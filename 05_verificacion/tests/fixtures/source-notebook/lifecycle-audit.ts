import type {SourceLifecycleContract} from './lifecycle-contract.ts';
import {auditSourceEntryLifecycle} from './lifecycle-entry-audit.ts';
import {
  isHashSemanticsMigrationReceipt,
  isTransitionReceipt,
  type ImportReceipt,
} from './receipt-schemas.ts';
import type {SourceRegistry} from './registry-schema.ts';

type ReceiptRecord = {path: string; receipt: ImportReceipt};

export const auditSourceLifecycle = ({
  lifecycle,
  registry,
  receipts,
}: {
  lifecycle: SourceLifecycleContract;
  registry: SourceRegistry;
  receipts: ReceiptRecord[];
}): string[] => {
  const errors: string[] = [];
  const allowedTransitions = new Set(
    lifecycle.allowed_transitions.map(({from, to}) => `${from ?? 'null'}>${to}`),
  );
  const receiptByPath = new Map(receipts.map(({path, receipt}) => [path, receipt]));
  const receiptPathById = new Map(receipts.map(({path, receipt}) => [receipt.receipt_id, path]));
  const receiptIds = new Set<string>();
  const sourceIds = new Set<string>();

  for (const {receipt} of receipts) {
    if (receiptIds.has(receipt.receipt_id))
      errors.push(`duplicate receipt_id ${receipt.receipt_id}`);
    receiptIds.add(receipt.receipt_id);
    if (isTransitionReceipt(receipt)) {
      const key = `${receipt.transition.from ?? 'null'}>${receipt.transition.to}`;
      if (!allowedTransitions.has(key)) errors.push(`forbidden transition ${key}`);
    }
  }

  for (const reference of registry.semantic_migrations) {
    const receipt = receiptByPath.get(reference.receipt);
    if (
      receipt === undefined ||
      !isHashSemanticsMigrationReceipt(receipt) ||
      receipt.migration_id !== reference.migration_id ||
      receipt.source_id !== reference.source_id
    ) {
      errors.push(`${reference.migration_id}: registry migration receipt mismatch`);
    }
  }

  for (const entry of registry.entries) {
    if (sourceIds.has(entry.source_id)) errors.push(`duplicate source_id ${entry.source_id}`);
    sourceIds.add(entry.source_id);
    const sourceReceipts = entry.receipts
      .map((path) => {
        const receipt = receiptByPath.get(path);
        if (receipt === undefined) errors.push(`${entry.source_id}: missing receipt ${path}`);
        return receipt;
      })
      .filter((receipt): receipt is ImportReceipt => receipt !== undefined)
      .sort((first, second) => first.event_order - second.event_order);
    errors.push(
      ...auditSourceEntryLifecycle({
        entry,
        lifecycle,
        sourceReceipts,
        receiptPathById,
      }),
    );
  }

  const sourcesByHash = new Map<string, SourceRegistry['entries']>();
  for (const entry of registry.entries) {
    const hash = entry.hashes.source_normalized_sha256;
    if (hash === null) continue;
    const entries = sourcesByHash.get(hash) ?? [];
    entries.push(entry);
    sourcesByHash.set(hash, entries);
  }
  for (const entries of sourcesByHash.values()) {
    if (
      entries.length > 1 &&
      entries.every(({deduplication}) => deduplication.verdict === 'unique')
    ) {
      errors.push('duplicate normalized hash incorrectly marked unique');
    }
  }
  return errors;
};
