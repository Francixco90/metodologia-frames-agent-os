import {Buffer} from 'node:buffer';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {sha256Text} from 'core/evidence/hash.ts';
import {
  DefaultTransactionKernelV1,
  DurableCausalGateRecorderV1,
  DurableHumanApprovalRecorderV1,
  ReadOnlyGuardianVerdictEmitterV1,
  computeGuardianAuthorityActionSha256V1,
  computeGuardianRecorderAuthorityActionSha256V1,
  computeHumanApprovalAuthorityActionSha256V1,
  computePromotionAuthorityActionSha256V1,
  computeVerificationAuthorityActionSha256V1,
  serializeTransactionGuardianVerdictV1,
  type TransactionDurableSeamV1,
} from 'core/orchestration/index.ts';
import {TransactionDurableStoreV1} from 'core/orchestration/transaction-durable-store-v1.ts';
import {MaterialSkillAdapterV2} from 'workflows/core/index.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionDraft,
  makeTransactionGraph,
  makeTransactionSandbox,
  makeTransactionWorkOrder,
  physicalTransactionReceipt,
  transactionAuthorityPort,
  transactionProducerAuthorizer,
  transactionSession,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

afterEach(cleanupTransactionFixtures);

const prepareGuardianVerdict = async (id: string) => {
  const {effect: effectRoot, state, authority} = makeTransactionSandbox();
  mkdirSync(resolve(effectRoot, 'out'));
  const workOrder = makeTransactionWorkOrder(id, ['out/result.md']);
  const authorization = {scope: 'PROJECT_LOCAL'};
  const graph = makeTransactionGraph(id, workOrder, authorization);
  const draft = makeTransactionDraft(id, authority, graph, workOrder, authorization);
  // prettier-ignore
  const effectReceipt = await new MaterialSkillAdapterV2(new DefaultTransactionKernelV1(state, {producerAuthority: transactionAuthorityPort}), {[workOrder.skillId]: () => ({intents: [{ref: 'out/result.md', bytes: Buffer.from('candidate\n')}]}),}, transactionProducerAuthorizer).invoke({execution: draft});
  const recorder = new DurableCausalGateRecorderV1(state, transactionAuthorityPort);
  const effectPhysicalSha256 = physicalTransactionReceipt(effectReceipt);
  // prettier-ignore
  const verification = recorder.recordVerification({runId: draft.runId, nodeId: draft.nodeId, receiptId: `verification.${id}`, effectReceiptId: effectReceipt.receiptId, effectReceiptPhysicalSha256: effectPhysicalSha256, producerActorInstanceId: effectReceipt.producerActorInstanceId, verifierSession: transactionSession(`verifier.${id}`, computeVerificationAuthorityActionSha256V1(effectReceipt, effectPhysicalSha256, 'PASS', effectReceipt.candidateSha256)), decision: 'PASS', evidenceSha256: effectReceipt.candidateSha256, recordedAt: '2026-08-29T12:00:01.000Z'});
  const verificationPhysicalSha256 = physicalTransactionReceipt(verification);
  const runPath = resolve(state, draft.runId);
  const ledgerBefore = readFileSync(resolve(runPath, 'ledger.jsonl'), 'utf8');
  const receiptsBefore = readdirSync(resolve(runPath, 'receipts')).sort();
  // prettier-ignore
  const verdict = new ReadOnlyGuardianVerdictEmitterV1(state, transactionAuthorityPort).emit({runId: draft.runId, nodeId: draft.nodeId, verificationReceiptId: verification.receiptId, verificationReceiptPhysicalSha256: verificationPhysicalSha256, guardianSession: transactionSession(`guardian.${id}`, computeGuardianAuthorityActionSha256V1(verification, verificationPhysicalSha256, 'PASS', effectReceipt.candidateSha256)), decision: 'PASS', evidenceSha256: effectReceipt.candidateSha256, emittedAt: '2026-08-29T12:00:02.000Z'});
  const serialized = serializeTransactionGuardianVerdictV1(verdict);
  // prettier-ignore
  const guardianRecordInput = {runId: draft.runId, nodeId: draft.nodeId, receiptId: `guardian.${id}`, ...serialized, recorderSession: transactionSession(`recorder.${id}`, computeGuardianRecorderAuthorityActionSha256V1(verdict, serialized.guardianVerdictPhysicalSha256)), recordedAt: '2026-08-29T12:00:03.000Z'};
  return {
    draft,
    effectRoot,
    state,
    store: new TransactionDurableStoreV1(state),
    effectReceipt,
    verdict,
    guardianRecordInput,
    ledgerBefore,
    receiptsBefore,
    runPath,
  };
};

const persistGuardian = (prepared: Awaited<ReturnType<typeof prepareGuardianVerdict>>) =>
  new DurableCausalGateRecorderV1(prepared.state, transactionAuthorityPort).recordGuardianVerdict(
    prepared.guardianRecordInput,
  );
const approve = (
  prepared: Awaited<ReturnType<typeof prepareGuardianVerdict>>,
  guardian: ReturnType<typeof persistGuardian>,
  id: string,
  candidateSha256 = guardian.candidateSha256,
) => {
  const physical = physicalTransactionReceipt(guardian);
  // prettier-ignore
  return new DurableHumanApprovalRecorderV1(prepared.state, transactionAuthorityPort).recordHumanApproval({runId: prepared.draft.runId, nodeId: prepared.draft.nodeId, receiptId: `approval.${id}`, guardianReceiptId: guardian.receiptId, guardianReceiptPhysicalSha256: physical, candidateSha256, approverSession: transactionSession(`approver.${id}`, computeHumanApprovalAuthorityActionSha256V1(guardian, physical)), recordedAt: '2026-08-29T12:00:04.000Z'});
};
const promote = (
  prepared: Awaited<ReturnType<typeof prepareGuardianVerdict>>,
  approval: ReturnType<typeof approve>,
  id: string,
  recorderRole = `recorder.${id}`,
) => {
  const physical = physicalTransactionReceipt(approval);
  // prettier-ignore
  return new DurableCausalGateRecorderV1(prepared.state, transactionAuthorityPort).promote({runId: prepared.draft.runId, nodeId: prepared.draft.nodeId, promotionReceiptId: `promotion.${id}`, humanApprovalReceiptId: approval.receiptId, humanApprovalReceiptPhysicalSha256: physical, recorderSession: transactionSession(recorderRole, computePromotionAuthorityActionSha256V1(approval, physical)), recordedAt: '2026-08-29T12:00:05.000Z'});
};

describe('Transaction causal gates V1', () => {
  it('keeps Guardian emission read-only and persists only through a distinct recorder', async () => {
    const prepared = await prepareGuardianVerdict('read-only');
    expect(prepared.verdict).not.toHaveProperty('receiptId');
    expect(prepared.verdict).not.toHaveProperty('state');
    expect(readFileSync(resolve(prepared.runPath, 'ledger.jsonl'), 'utf8')).toBe(
      prepared.ledgerBefore,
    );
    expect(readdirSync(resolve(prepared.runPath, 'receipts')).sort()).toEqual(
      prepared.receiptsBefore,
    );
    expect(prepared.store.inspect(prepared.draft.runId)).toMatchObject({
      status: 'CLEAN',
      latestState: 'VERIFIED_PASS',
      receiptCount: 2,
    });

    const guardian = persistGuardian(prepared);
    expect(guardian).toMatchObject({
      state: 'GUARDIAN_PASS',
      guardianTaskId: prepared.verdict.guardianTaskId,
      recorderTaskId: prepared.guardianRecordInput.recorderSession.taskId,
      guardianVerdictCanonicalSha256: prepared.verdict.canonicalSha256,
      guardianVerdictPhysicalSha256: prepared.guardianRecordInput.guardianVerdictPhysicalSha256,
    });
    expect(guardian.guardianActorInstanceId).not.toBe(guardian.recorderActorInstanceId);
    expect(prepared.store.inspect(prepared.draft.runId)).toMatchObject({
      status: 'CLEAN',
      latestState: 'GUARDIAN_PASS',
      receiptCount: 3,
    });
  });

  it('requires exact H01 candidate binding and the same recorder for promotion', async () => {
    const prepared = await prepareGuardianVerdict('full-chain');
    const guardian = persistGuardian(prepared);
    const promotion = promote(prepared, approve(prepared, guardian, 'full-chain'), 'full-chain');
    expect(promotion.state).toBe('PROMOTED');
    expect(
      new Set([
        promotion.producerActorInstanceId,
        promotion.verifierActorInstanceId,
        promotion.guardianActorInstanceId,
        promotion.recorderActorInstanceId,
        promotion.approverActorInstanceId,
      ]).size,
    ).toBe(5);
    expect(prepared.store.inspect(prepared.draft.runId)).toMatchObject({
      status: 'CLEAN',
      latestState: 'PROMOTED',
      receiptCount: 5,
    });
  });

  it('rejects output drift between Guardian emission and recorder persistence', async () => {
    const prepared = await prepareGuardianVerdict('output-drift');
    writeFileSync(resolve(prepared.effectRoot, 'out/result.md'), 'tampered\n');
    expect(() => persistGuardian(prepared)).toThrow(/drifted/u);
    expect(prepared.store.inspect(prepared.draft.runId).latestState).toBe('VERIFIED_PASS');
    expect(existsSync(resolve(prepared.runPath, 'receipts', 'guardian.output-drift.json'))).toBe(
      false,
    );
  });

  it.each(['physical-sha', 'non-canonical'] as const)(
    'rejects %s Guardian verdict bytes before persistence',
    async (mode) => {
      const prepared = await prepareGuardianVerdict(`bytes-${mode}`);
      const input = {...prepared.guardianRecordInput};
      if (mode === 'physical-sha') input.guardianVerdictPhysicalSha256 = 'f'.repeat(64);
      else {
        const text = Buffer.from(input.guardianVerdictBytesBase64, 'base64').toString('utf8');
        const nonCanonical = JSON.stringify(JSON.parse(text), null, 2);
        input.guardianVerdictBytesBase64 = Buffer.from(nonCanonical).toString('base64');
        input.guardianVerdictPhysicalSha256 = sha256Text(nonCanonical);
      }
      expect(() =>
        new DurableCausalGateRecorderV1(
          prepared.state,
          transactionAuthorityPort,
        ).recordGuardianVerdict(input),
      ).toThrow(/hash|canonical/u);
      expect(prepared.store.inspect(prepared.draft.runId)).toMatchObject({
        status: 'CLEAN',
        latestState: 'VERIFIED_PASS',
        receiptCount: 2,
      });
    },
  );

  it.each([
    'LOCK_FSYNC',
    'RECEIPT_FSYNC',
    'LEDGER_FSYNC',
    'LOCK_RELEASE',
  ] satisfies TransactionDurableSeamV1[])(
    'never creates H01 or promotion after Guardian durable seam %s',
    async (seam) => {
      const prepared = await prepareGuardianVerdict(`crash-${seam.toLowerCase()}`);
      const recorder = new DurableCausalGateRecorderV1(prepared.state, transactionAuthorityPort, {
        durableHooks: {
          onSeam: (current) => {
            if (current === seam) throw new Error(`crash:${seam}`);
          },
        },
      });
      expect(() => recorder.recordGuardianVerdict(prepared.guardianRecordInput)).toThrow(
        `crash:${seam}`,
      );
      const inspection = prepared.store.inspect(prepared.draft.runId);
      const ledger = readFileSync(resolve(prepared.runPath, 'ledger.jsonl'), 'utf8');
      expect(ledger).not.toMatch(/H01_APPROVED|PROMOTED/u);
      expect(inspection.latestState).not.toBe('H01_APPROVED');
      expect(inspection.latestState).not.toBe('PROMOTED');
      if (seam === 'LOCK_RELEASE')
        expect(inspection).toMatchObject({status: 'CLEAN', latestState: 'GUARDIAN_PASS'});
      else expect(inspection.status).toBe('BLOCKED_UNCERTAIN');
    },
  );

  it('rejects an H01 candidate drift without creating approval', async () => {
    const prepared = await prepareGuardianVerdict('h01-drift');
    const guardian = persistGuardian(prepared);
    expect(() => approve(prepared, guardian, 'h01-drift', 'f'.repeat(64))).toThrow(/candidate/u);
    expect(readFileSync(resolve(prepared.runPath, 'ledger.jsonl'), 'utf8')).not.toContain(
      'H01_APPROVED',
    );
  });

  it('rejects promotion by a recorder different from the Guardian recorder', async () => {
    const prepared = await prepareGuardianVerdict('recorder-drift');
    const guardian = persistGuardian(prepared);
    const approval = approve(prepared, guardian, 'recorder-drift');
    expect(() => promote(prepared, approval, 'recorder-drift', 'recorder.other')).toThrow(/chain/u);
    expect(readFileSync(resolve(prepared.runPath, 'ledger.jsonl'), 'utf8')).not.toContain(
      'PROMOTED',
    );
  });
});
