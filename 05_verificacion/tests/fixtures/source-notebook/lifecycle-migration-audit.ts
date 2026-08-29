import {
  isHashSemanticsMigrationReceipt,
  isTransitionReceipt,
  type ImportReceipt,
} from './receipt-schemas.ts';
import type {SourceRegistry} from './registry-schema.ts';

export const auditReceiptHashesAndMigrations = (
  entry: SourceRegistry['entries'][number],
  sourceReceipts: ImportReceipt[],
  receiptPathById: ReadonlyMap<string, string>,
): string[] => {
  const errors: string[] = [];
  const migrations = sourceReceipts.filter(isHashSemanticsMigrationReceipt);
  for (const receipt of sourceReceipts) {
    if (!isTransitionReceipt(receipt)) continue;
    const hashes =
      'hashes' in receipt && receipt.hashes !== null && typeof receipt.hashes === 'object'
        ? (receipt.hashes as Record<string, unknown>)
        : undefined;
    if (
      hashes !== undefined &&
      entry.hashes.raw_sha256 !== null &&
      hashes.raw_sha256 !== entry.hashes.raw_sha256
    ) {
      errors.push(`${entry.source_id}: raw hash differs across receipts`);
    }
    if (
      hashes !== undefined &&
      entry.hashes.source_normalized_sha256 !== null &&
      hashes.normalized_sha256 !== entry.hashes.source_normalized_sha256
    ) {
      const superseding = migrations.find(
        (migration) =>
          migration.superseded_receipt_ids.includes(receipt.receipt_id) &&
          migration.legacy_semantics.recorded_sha256 === hashes.normalized_sha256 &&
          migration.corrected_source_hashes.source_normalized_sha256 ===
            entry.hashes.source_normalized_sha256,
      );
      if (superseding === undefined) {
        errors.push(`${entry.source_id}: source-normalized hash differs without migration`);
      }
    }
  }

  for (const migration of migrations) {
    if (
      migration.corrected_source_hashes.raw_sha256 !== entry.hashes.raw_sha256 ||
      migration.corrected_source_hashes.source_normalized_sha256 !==
        entry.hashes.source_normalized_sha256
    ) {
      errors.push(`${entry.source_id}: semantic migration corrected hashes mismatch registry`);
    }
    if (
      entry.projection === undefined ||
      migration.replacement_projection.projection_id !== entry.projection.projection_id ||
      migration.replacement_projection.projection_sha256 !== entry.projection.projection_sha256 ||
      migration.replacement_projection.projection_locator !== entry.projection.projection_locator
    ) {
      errors.push(`${entry.source_id}: semantic migration projection mismatch registry`);
    }
    const transitionIds = sourceReceipts
      .filter(isTransitionReceipt)
      .map(({receipt_id: receiptId}) => receiptId);
    const supersededIds = new Set(migration.superseded_receipt_ids);
    if (
      supersededIds.size !== transitionIds.length ||
      transitionIds.some((receiptId) => !supersededIds.has(receiptId))
    ) {
      errors.push(`${entry.source_id}: semantic migration lineage is incomplete`);
    }
    const historicalIds = new Set(
      migration.historical_receipts.map(({receipt_id: receiptId}) => receiptId),
    );
    if (
      historicalIds.size !== transitionIds.length ||
      transitionIds.some((receiptId) => !historicalIds.has(receiptId)) ||
      migration.historical_receipts.some(
        ({path, receipt_id: receiptId}) => receiptPathById.get(receiptId) !== path,
      )
    ) {
      errors.push(`${entry.source_id}: historical receipt hash lineage is incomplete`);
    }
  }
  return errors;
};
