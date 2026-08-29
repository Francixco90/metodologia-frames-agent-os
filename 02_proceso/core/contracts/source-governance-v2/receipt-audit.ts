import {parse} from 'yaml';

import {sameArray, sha256Bytes} from './common.ts';
import {receiptMatchesRepositoryLockV2, type PinnedRepositoryReceiptRecordV2} from './coherence.ts';
import {
  PinnedRepositoryTransitionReceiptV2Schema,
  type PinnedRepositoryTransitionReceiptV2,
} from './receipt-schemas.ts';
import type {PinnedRepositorySourceEntryV2} from './repository-schemas.ts';

const EXPECTED_TRANSITIONS = [
  {from: null, to: 'candidate'},
  {from: 'candidate', to: 'quarantined'},
  {from: 'quarantined', to: 'evaluated'},
] as const;

const parseReceipt = (bytes: Uint8Array): unknown =>
  parse(new TextDecoder().decode(bytes)) as unknown;

const PENDING_DEDUPLICATION = 'pending_source_registry_v2_comparison';

const auditReceiptIdentity = (
  entry: PinnedRepositorySourceEntryV2,
  receipt: PinnedRepositoryTransitionReceiptV2,
  receiptIds: Set<string>,
  errors: string[],
): void => {
  const expectedId = `RCP-IMP-${entry.source_id}-${String(receipt.event_order).padStart(3, '0')}`;
  if (receipt.receipt_id !== expectedId) {
    errors.push(`${entry.source_id}: receipt_id is not bound to source and event order`);
  }
  if (receiptIds.has(receipt.receipt_id)) {
    errors.push(`${entry.source_id}: duplicate receipt_id ${receipt.receipt_id}`);
  }
  receiptIds.add(receipt.receipt_id);
};

const auditStageCoherence = (
  entry: PinnedRepositorySourceEntryV2,
  receipt: PinnedRepositoryTransitionReceiptV2,
  isFinal: boolean,
  errors: string[],
): void => {
  const authority = entry.authority;
  const deduplication = entry.deduplication;
  if (isFinal) {
    if (
      receipt.authority.authority_class !== authority.authority_class ||
      receipt.authority.authority_verdict !== authority.authority_verdict ||
      receipt.authority.provenance_evidence !== authority.provenance_evidence
    ) {
      errors.push(`${entry.source_id}: evaluated receipt authority differs from registry`);
    }
    if (
      receipt.deduplication.verdict !== deduplication.verdict ||
      receipt.deduplication.checked_against_registry !== deduplication.checked_against_registry
    ) {
      errors.push(`${entry.source_id}: evaluated receipt deduplication differs from registry`);
    }
  } else {
    if (
      receipt.authority.authority_class !== authority.authority_class ||
      receipt.authority.authority_verdict === authority.authority_verdict
    ) {
      errors.push(`${entry.source_id}: pre-evaluation authority is not coherently pending`);
    }
    if (
      receipt.deduplication.verdict !== PENDING_DEDUPLICATION ||
      receipt.deduplication.checked_against_registry !== 'source-registry-v2'
    ) {
      errors.push(`${entry.source_id}: pre-evaluation deduplication is not explicitly pending`);
    }
  }
};

const auditCoverageProgression = (
  entry: PinnedRepositorySourceEntryV2,
  records: readonly PinnedRepositoryReceiptRecordV2[],
  errors: string[],
): void => {
  for (const [index, record] of records.entries()) {
    const previous = records[index - 1]?.receipt.coverage_gaps ?? [];
    const current = new Set(record.receipt.coverage_gaps);
    const removed = previous.filter((gap) => !current.has(gap));
    const resolutions = record.receipt.coverage_gap_resolutions ?? [];
    if (removed.some((gap) => !resolutions.some((resolution) => resolution.gap === gap))) {
      errors.push(`${entry.source_id}: removed coverage gap lacks explicit resolution`);
    }
    if (
      resolutions.some(
        ({gap}, resolutionIndex) =>
          !removed.includes(gap) ||
          resolutions.findIndex((resolution) => resolution.gap === gap) !== resolutionIndex,
      )
    ) {
      errors.push(`${entry.source_id}: coverage gap resolution is stale or duplicated`);
    }
  }
  const finalGaps = records.at(-1)?.receipt.coverage_gaps ?? [];
  if (!sameArray(finalGaps, entry.coverage_gaps)) {
    errors.push(`${entry.source_id}: evaluated receipt coverage gaps differ from registry`);
  }
};

const auditReview = (
  entry: PinnedRepositorySourceEntryV2,
  receipt: PinnedRepositoryTransitionReceiptV2,
  isFinal: boolean,
  errors: string[],
): void => {
  const review = receipt.review;
  const valid = isFinal
    ? review.registry_integration_authorized &&
      review.contract_hash_chain === 'physically_bound_verified' &&
      [
        'pending_independent_guardian_revalidation',
        'independent_guardian_revalidation_pass',
      ].includes(review.guardian_revalidation)
    : !review.registry_integration_authorized &&
      review.contract_hash_chain === 'physically_bound_pending_governance_readback' &&
      review.guardian_revalidation === 'pending';
  if (!valid) errors.push(`${entry.source_id}: receipt review is incoherent for its stage`);
};

export const auditPinnedRepositoryReceiptsV2 = (
  entry: PinnedRepositorySourceEntryV2,
  evidenceByPath: ReadonlyMap<string, Uint8Array>,
): string[] => {
  const errors: string[] = [];
  const receiptRecords: PinnedRepositoryReceiptRecordV2[] = [];
  const receiptIds = new Set<string>();
  for (const binding of entry.receipt_bindings) {
    const bytes = evidenceByPath.get(binding.path);
    if (bytes === undefined) {
      errors.push(`${entry.source_id}: missing physical receipt ${binding.path}`);
      continue;
    }
    if (sha256Bytes(bytes) !== binding.sha256) {
      errors.push(`${entry.source_id}: physical receipt hash mismatch ${binding.path}`);
    }
    const result = PinnedRepositoryTransitionReceiptV2Schema.safeParse(parseReceipt(bytes));
    if (!result.success) {
      const issues = result.error.issues
        .map(({message, path}) => `${path.join('.')}: ${message}`)
        .join('; ');
      errors.push(`${entry.source_id}: receipt contract mismatch ${binding.path}: ${issues}`);
      continue;
    }
    if (result.data.event_order !== binding.event_order) {
      errors.push(`${entry.source_id}: receipt event_order differs from binding ${binding.path}`);
    }
    auditReceiptIdentity(entry, result.data, receiptIds, errors);
    receiptRecords.push({binding, receipt: result.data});
  }

  for (const [index, record] of receiptRecords.entries()) {
    const expected = EXPECTED_TRANSITIONS[index];
    const previousBinding = index === 0 ? undefined : receiptRecords[index - 1]?.binding;
    const receipt: PinnedRepositoryTransitionReceiptV2 = record.receipt;
    if (
      expected === undefined ||
      receipt.event_order !== index + 1 ||
      receipt.transition.from !== expected.from ||
      receipt.transition.to !== expected.to
    ) {
      errors.push(`${entry.source_id}: receipt transition chain is not candidate→evaluated`);
    }
    if (receipt.previous_receipt_sha256 !== (previousBinding?.sha256 ?? null)) {
      errors.push(`${entry.source_id}: previous receipt SHA-256 chain is broken`);
    }
    if (!receiptMatchesRepositoryLockV2(receipt, entry)) {
      errors.push(
        `${entry.source_id}: receipt scope or repository lock drift at event ${index + 1}`,
      );
    }
    auditStageCoherence(entry, receipt, index === 2, errors);
    auditReview(entry, receipt, index === 2, errors);
  }
  if (new Set(receiptRecords.map(({receipt}) => receipt.package_id)).size > 1) {
    errors.push(`${entry.source_id}: package_id changes across receipt chain`);
  }
  if (
    receiptRecords.some(
      ({receipt}, index) =>
        index > 0 &&
        Date.parse(receipt.recorded_at) <=
          Date.parse(receiptRecords[index - 1]?.receipt.recorded_at ?? ''),
    )
  ) {
    errors.push(`${entry.source_id}: recorded_at is not strictly monotonic`);
  }
  auditCoverageProgression(entry, receiptRecords, errors);
  if (receiptRecords.length !== 3) {
    errors.push(`${entry.source_id}: evaluated source requires exactly three valid receipts`);
  }
  return errors;
};
