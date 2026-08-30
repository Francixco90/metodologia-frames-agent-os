// prettier-ignore
import {RecordGuardianVerdictInputV1Schema, TransactionGuardianReceiptV1Schema, TransactionVerificationReceiptV1Schema, type ActorAuthorityPortV1, type TransactionGuardianReceiptV1, type TransactionVerificationReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import type {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, signTransactionCausalReceiptV1, transactionChainV1, verifyCausalActorAuthorityV1} from './causal-gate-verification-v1.ts';

export const computeGuardianAuthorityActionSha256V1 = (
  verification: TransactionVerificationReceiptV1,
  verificationReceiptPhysicalSha256: string,
  decision: 'PASS' | 'FAIL',
  evidenceSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'GUARDIAN_VERDICT',
    runId: verification.runId,
    nodeId: verification.nodeId,
    ...transactionChainV1(verification),
    verificationReceiptId: verification.receiptId,
    verificationReceiptPhysicalSha256,
    decision,
    evidenceSha256,
  });

export const recordTransactionGuardianVerdictV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1,
  raw: unknown,
): TransactionGuardianReceiptV1 => {
  const input = RecordGuardianVerdictInputV1Schema.parse(raw);
  return store.withRunLock(
    input.runId,
    `${input.receiptId}.lock`,
    input.guardianSession.actorInstanceId,
    input.recordedAt,
    () => {
      const prior = TransactionVerificationReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          input.verificationReceiptId,
          input.verificationReceiptPhysicalSha256,
          'VERIFIED_PASS',
          true,
        ),
      );
      store.assertRunBinding(input.runId, prior.graphSha256);
      if (
        prior.runId !== input.runId ||
        prior.nodeId !== input.nodeId ||
        prior.receiptId !== input.verificationReceiptId ||
        Date.parse(input.recordedAt) <= Date.parse(prior.recordedAt)
      )
        return failTransactionV1('CAUSAL_ORDER', 'Guardian predecessor binding failed.');
      const actionSha256 = computeGuardianAuthorityActionSha256V1(
        prior,
        input.verificationReceiptPhysicalSha256,
        input.decision,
        input.evidenceSha256,
      );
      const authorityVerdictSha256 = verifyCausalActorAuthorityV1(
        authority,
        input.guardianSession,
        'GUARDIAN',
        actionSha256,
        input.recordedAt,
      );
      assertDistinctTransactionActorsV1(
        [
          prior.producerActorInstanceId,
          prior.verifierActorInstanceId,
          input.guardianSession.actorInstanceId,
        ],
        [prior.producerTaskId, prior.verifierTaskId, input.guardianSession.taskId],
      );
      const draft = {
        schemaVersion: 'transaction-guardian-receipt-v1' as const,
        environment: 'LOCAL_SIMULATION' as const,
        receiptId: input.receiptId,
        runId: input.runId,
        nodeId: input.nodeId,
        ...transactionChainV1(prior),
        state:
          input.decision === 'PASS' ? ('GUARDIAN_PASS' as const) : ('BLOCKED_UNCERTAIN' as const),
        effectReceiptId: prior.effectReceiptId,
        effectReceiptPhysicalSha256: prior.effectReceiptPhysicalSha256,
        verificationReceiptId: prior.receiptId,
        verificationReceiptPhysicalSha256: input.verificationReceiptPhysicalSha256,
        producerTaskId: prior.producerTaskId,
        verifierTaskId: prior.verifierTaskId,
        guardianTaskId: input.guardianSession.taskId,
        producerActorInstanceId: prior.producerActorInstanceId,
        verifierActorInstanceId: prior.verifierActorInstanceId,
        guardianActorInstanceId: input.guardianSession.actorInstanceId,
        authorityVerdictSha256,
        evidenceSha256: input.evidenceSha256,
        recordedAt: input.recordedAt,
      };
      const receipt = TransactionGuardianReceiptV1Schema.parse(
        signTransactionCausalReceiptV1(draft),
      );
      store.persistReceipt(
        input.runId,
        receipt.receiptId,
        receipt.state,
        receipt,
        input.recordedAt,
      );
      return immutableClone(receipt);
    },
  );
};
