import {parse, stringify} from 'yaml';

import {
  PinnedRepositoryTransitionReceiptV2Schema,
  auditPinnedRepositorySourceV2,
  sha256,
  type PinnedRepositoryTransitionReceiptV2,
} from '../fixtures/source-notebook/contracts-v2.ts';
import {loadPinnedAuditFixture} from '../fixtures/source-notebook/test-support.ts';

const mutateEvaluatedReceipt = async (
  mutate: (receipt: PinnedRepositoryTransitionReceiptV2) => void,
): Promise<string[]> => {
  const {entry, evidence} = await loadPinnedAuditFixture();
  const mutatedEntry = structuredClone(entry);
  const binding = mutatedEntry.receipt_bindings[2];
  if (binding === undefined) throw new Error('Expected evaluated receipt binding.');
  const original = evidence.find(({path}) => path === binding.path)?.bytes;
  if (original === undefined) throw new Error('Expected evaluated receipt evidence.');
  const receipt = PinnedRepositoryTransitionReceiptV2Schema.parse(
    parse(Buffer.from(original).toString('utf8')) as unknown,
  );
  mutate(receipt);
  const bytes = Buffer.from(stringify(receipt, {lineWidth: 0}));
  binding.sha256 = sha256(bytes);
  const mutatedEvidence = evidence.map((record) =>
    record.path === binding.path ? {path: record.path, bytes} : record,
  );
  return auditPinnedRepositorySourceV2({entry: mutatedEntry, evidence: mutatedEvidence});
};

describe('pinned source receipt governance rejection', () => {
  it('rejects a duplicate receipt_id not tied to its event', async () => {
    const errors = await mutateEvaluatedReceipt((receipt) => {
      receipt.receipt_id = `RCP-IMP-${receipt.source_id}-001`;
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('receipt_id is not bound to source and event order'),
        expect.stringContaining('duplicate receipt_id'),
      ]),
    );
  });

  it('rejects package drift and non-monotonic recorded_at', async () => {
    const packageErrors = await mutateEvaluatedReceipt((receipt) => {
      receipt.package_id = 'AWF-DRIFT';
    });
    expect(packageErrors).toContain(
      'SRC-PROPOSAL-MEASURE-E0D6BA4: package_id changes across receipt chain',
    );
    const timeErrors = await mutateEvaluatedReceipt((receipt) => {
      receipt.recorded_at = '2026-08-29T18:14:20Z';
    });
    expect(timeErrors).toContain(
      'SRC-PROPOSAL-MEASURE-E0D6BA4: recorded_at is not strictly monotonic',
    );
  });

  it('rejects evaluated authority and deduplication drift', async () => {
    const errors = await mutateEvaluatedReceipt((receipt) => {
      receipt.authority.provenance_evidence = 'unbound_observation';
      receipt.deduplication.verdict = 'unique_without_registry_binding';
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('evaluated receipt authority differs from registry'),
        expect.stringContaining('evaluated receipt deduplication differs from registry'),
      ]),
    );
  });

  it('rejects incoherent review state and silent coverage-gap removal', async () => {
    const errors = await mutateEvaluatedReceipt((receipt) => {
      receipt.review.registry_integration_authorized = false;
      receipt.coverage_gaps = [receipt.coverage_gaps[0] ?? 'unresolved_gap'];
      receipt.coverage_gap_resolutions = [];
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('receipt review is incoherent for its stage'),
        expect.stringContaining('removed coverage gap lacks explicit resolution'),
        expect.stringContaining('evaluated receipt coverage gaps differ from registry'),
      ]),
    );
  });
});
