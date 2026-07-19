import {CommitteeApprovalSchema} from '../../../approvals/schemas/index.ts';
import {CommitteeReceiptSchema} from '../../../receipts/schemas/index.ts';

const hash = (character: string): string => character.repeat(64);

const committeeApproval = () => ({
  schemaVersion: 1,
  approvalId: 'approval-committee-01',
  committeeId: 'committee-vs-001',
  decisionId: 'decision-vs-001',
  gate: 'G10',
  authority: 'COMMITTEE_GATE_ONLY',
  requestedByActorId: 'actor-producer',
  decidedByActorId: 'actor-verifier',
  decision: 'APPROVED',
  targetSha256: hash('a'),
  evidenceRefs: ['evidence-test-01'],
  conditions: [],
  issuedAt: '2026-07-19T12:30:00-05:00',
  releaseEffect: 'NONE',
});

describe('committee gate schemas', () => {
  it('accepts a G10 approval with distinct requester and decider', () => {
    const result = CommitteeApprovalSchema.safeParse(committeeApproval());

    expect(result.success).toBe(true);
  });

  it('rejects self-approval', () => {
    const result = CommitteeApprovalSchema.safeParse({
      ...committeeApproval(),
      decidedByActorId: 'actor-producer',
    });

    expect(result.success).toBe(false);
  });

  it.each(['H01', 'RT-11'])('rejects reserved actor %s as the G10 verifier', (actorId) => {
    const result = CommitteeApprovalSchema.safeParse({
      ...committeeApproval(),
      decidedByActorId: actorId,
    });

    expect(result.success).toBe(false);
  });

  it.each(['H01', 'RT-11'])('rejects reserved actor %s as the G10 producer', (actorId) => {
    const result = CommitteeApprovalSchema.safeParse({
      ...committeeApproval(),
      requestedByActorId: actorId,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a hash-bound passing receipt with no release effect', () => {
    const result = CommitteeReceiptSchema.safeParse({
      schemaVersion: 1,
      receiptId: 'receipt-committee-01',
      committeeId: 'committee-vs-001',
      workProductId: 'work-product-vs-001',
      gate: 'G10',
      committeeSha256: hash('a'),
      decisionSha256: hash('b'),
      proposalSha256s: [hash('c'), hash('d'), hash('e'), hash('f'), hash('1')],
      approvalSha256: hash('2'),
      status: 'PASS',
      testEvidence: [
        {
          testId: 'test-committee-unit',
          status: 'PASS',
          evidenceSha256: hash('3'),
        },
      ],
      coverageGaps: ['Human approval is outside G10.'],
      createdAt: '2026-07-19T12:45:00-05:00',
      nextGate: 'G08-CONTRACTS',
      humanApprovalGranted: false,
      releaseEffect: 'NONE',
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate proposal hashes and PASS receipts with failing tests', () => {
    const duplicateHash = hash('c');
    const result = CommitteeReceiptSchema.safeParse({
      schemaVersion: 1,
      receiptId: 'receipt-committee-01',
      committeeId: 'committee-vs-001',
      workProductId: 'work-product-vs-001',
      gate: 'G10',
      committeeSha256: hash('a'),
      decisionSha256: hash('b'),
      proposalSha256s: [duplicateHash, duplicateHash, duplicateHash, duplicateHash, duplicateHash],
      approvalSha256: hash('2'),
      status: 'PASS',
      testEvidence: [
        {
          testId: 'test-committee-unit',
          status: 'FAIL',
          evidenceSha256: hash('3'),
        },
      ],
      coverageGaps: [],
      createdAt: '2026-07-19T12:45:00-05:00',
      nextGate: 'G08-CONTRACTS',
      humanApprovalGranted: false,
      releaseEffect: 'NONE',
    });

    expect(result.success).toBe(false);
  });
});
