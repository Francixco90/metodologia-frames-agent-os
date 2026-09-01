import type {SourceLifecycleContract} from './lifecycle-contract.ts';
import {auditReceiptHashesAndMigrations} from './lifecycle-migration-audit.ts';
import {
  isTransitionReceipt,
  type ImportReceipt,
  type TransitionImportReceipt,
} from './receipt-schemas.ts';
import type {SourceRegistry} from './registry-schema.ts';

export const auditSourceEntryLifecycle = ({
  entry,
  lifecycle,
  sourceReceipts,
  receiptPathById,
}: {
  entry: SourceRegistry['entries'][number];
  lifecycle: SourceLifecycleContract;
  sourceReceipts: ImportReceipt[];
  receiptPathById: ReadonlyMap<string, string>;
}): string[] => {
  const errors: string[] = [];
  let previousState: TransitionImportReceipt['transition']['to'] | null = null;
  const eventOrders = new Set<number>();
  for (const [index, receipt] of sourceReceipts.entries()) {
    if (receipt.source_id !== entry.source_id)
      errors.push(`${entry.source_id}: receipt source mismatch`);
    if (eventOrders.has(receipt.event_order))
      errors.push(`${entry.source_id}: duplicate event_order`);
    eventOrders.add(receipt.event_order);
    if (receipt.event_order !== index + 1) {
      errors.push(`${entry.source_id}: receipt event_order sequence has a gap`);
    }
    if (isTransitionReceipt(receipt)) {
      if (receipt.transition.from !== previousState) {
        errors.push(`${entry.source_id}: receipt chain is discontinuous`);
      }
      previousState = receipt.transition.to;
    } else if (receipt.state_preserved !== previousState) {
      errors.push(`${entry.source_id}: semantic migration does not preserve current state`);
    }
  }
  if (previousState !== entry.current_state) {
    errors.push(`${entry.source_id}: receipt chain does not reach current_state`);
  }

  const hasRawHash = entry.hashes.raw_sha256 !== null;
  const hasSourceNormalizedHash = entry.hashes.source_normalized_sha256 !== null;
  if (entry.current_state === 'active') {
    auditActiveSource(entry, lifecycle, sourceReceipts, errors);
  } else if (
    (!hasRawHash || !hasSourceNormalizedHash) &&
    (entry.coverage_gaps?.length ?? 0) === 0
  ) {
    errors.push(`${entry.source_id}: missing hashes without coverage_gap`);
  }
  errors.push(...auditReceiptHashesAndMigrations(entry, sourceReceipts, receiptPathById));
  return errors;
};

const auditActiveSource = (
  entry: SourceRegistry['entries'][number],
  lifecycle: SourceLifecycleContract,
  sourceReceipts: ImportReceipt[],
  errors: string[],
): void => {
  if (entry.hashes.raw_sha256 === null || entry.hashes.source_normalized_sha256 === null) {
    errors.push(`${entry.source_id}: active source is missing hashes`);
  }
  if (
    entry.deduplication.verdict.includes('pending') ||
    entry.deduplication.verdict.includes('unresolved')
  ) {
    errors.push(`${entry.source_id}: active source has unresolved dedupe`);
  }
  for (const field of lifecycle.rights_gate.required_for_active) {
    if (!(field in entry.rights))
      errors.push(`${entry.source_id}: active source missing rights ${field}`);
  }
  if (
    !lifecycle.rights_gate.allowed_verdicts.includes(
      entry.rights.rights_verdict as
        | 'allowed_internal_editorial'
        | 'allowed_internal_implementation'
        | 'allowed_local_test_only'
        | 'allowed_publication',
    )
  ) {
    errors.push(`${entry.source_id}: active source rights do not allow use`);
  }
  for (const field of lifecycle.authority_gate.required_for_active) {
    if (!(field in entry.authority)) {
      errors.push(`${entry.source_id}: active source missing authority ${field}`);
    }
  }
  const authorityClass = entry.authority.authority_class as
    | 'first_party'
    | 'first_party_synthetic'
    | 'methodology_reference'
    | 'official_agent_guidance'
    | 'promotional_unverified'
    | 'technical_authority';
  if (
    !lifecycle.authority_gate.authority_classes.includes(authorityClass) ||
    entry.authority.authority_verdict === 'pending'
  ) {
    errors.push(`${entry.source_id}: active source authority is unresolved`);
  }
  const transitions = sourceReceipts.filter(isTransitionReceipt);
  const evaluated = transitions.find(({transition}) => transition.to === 'evaluated');
  const active = transitions.find(({transition}) => transition.to === 'active');
  if (evaluated === undefined || active === undefined) {
    errors.push(`${entry.source_id}: active source lacks gate receipts`);
  }
  if (
    active !== undefined &&
    (active.verifier_id === undefined || active.verifier_id === active.actor_id)
  ) {
    errors.push(`${entry.source_id}: active receipt lacks independent verifier`);
  }
};
