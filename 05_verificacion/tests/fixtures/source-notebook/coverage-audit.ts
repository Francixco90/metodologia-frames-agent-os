import type {CanonicalSourceGaps} from './content-schemas.ts';

export const auditCanonicalCoverage = (gaps: CanonicalSourceGaps): string[] => {
  const errors: string[] = [];
  const confirmedSlots = gaps.slots.filter(({source_id: sourceId}) => sourceId !== null);
  if (confirmedSlots.length !== gaps.confirmed_count) {
    errors.push('confirmed_count does not match populated canonical slots');
  }
  if (gaps.confirmed_count < gaps.expected_count) {
    if (
      gaps.consequence.source_locked ||
      gaps.consequence.may_claim_canonical_corpus_ingested ||
      gaps.consequence.may_publish
    ) {
      errors.push('incomplete canonical corpus must remain fail-closed');
    }
    for (const slot of gaps.slots) {
      if (
        slot.source_id === null &&
        (slot.raw_sha256 !== null || slot.normalized_sha256 !== null)
      ) {
        errors.push('empty canonical slot cannot carry content hashes');
      }
    }
  }
  return errors;
};
