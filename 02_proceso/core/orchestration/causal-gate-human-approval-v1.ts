// prettier-ignore
import {RecordHumanApprovalInputV1Schema, TransactionGuardianReceiptV1Schema, TransactionHumanApprovalReceiptV1Schema, type ActorAuthorityPortV1, type HumanApprovalRecorderV1, type TransactionGuardianReceiptV1, type TransactionHumanApprovalReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {verifyImmutableCausalActorAuthorityV1} from './causal-gate-guardian-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, signTransactionCausalReceiptV1, transactionChainV1} from './causal-gate-verification-v1.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import {
  TransactionDurableStoreV1,
  type TransactionDurableHooksV1,
} from './transaction-durable-store-v1.ts';

export const computeHumanApprovalAuthorityActionSha256V1 = (
  guardian: TransactionGuardianReceiptV1,
  guardianReceiptPhysicalSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'H01_APPROVE_CANDIDATE',
    runId: guardian.runId,
    nodeId: guardian.nodeId,
    ...transactionChainV1(guardian),
    guardianReceiptId: guardian.receiptId,
    guardianReceiptPhysicalSha256,
  });

export const recordTransactionHumanApprovalV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1,
  raw: unknown,
): TransactionHumanApprovalReceiptV1 => {
  const input = RecordHumanApprovalInputV1Schema.parse(raw);
  return store.withRunLock(
    input.runId,
    `${input.receiptId}.lock`,
    input.approverSession.actorInstanceId,
    input.recordedAt,
    () => {
      const guardian = TransactionGuardianReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          input.guardianReceiptId,
          input.guardianReceiptPhysicalSha256,
          'GUARDIAN_PASS',
          true,
        ),
      );
      store.assertRunBinding(input.runId, guardian.graphSha256);
      if (
        guardian.runId !== input.runId ||
        guardian.nodeId !== input.nodeId ||
        guardian.receiptId !== input.guardianReceiptId ||
        guardian.candidateSha256 !== input.candidateSha256 ||
        Date.parse(input.recordedAt) <= Date.parse(guardian.recordedAt)
      )
        return failTransactionV1('CAUSAL_ORDER', 'H01 Guardian candidate binding failed.');
      const authorityVerdictSha256 = verifyImmutableCausalActorAuthorityV1(
        authority,
        input.approverSession,
        'H01_APPROVER',
        computeHumanApprovalAuthorityActionSha256V1(guardian, input.guardianReceiptPhysicalSha256),
        input.recordedAt,
      );
      assertDistinctTransactionActorsV1(
        [
          guardian.producerActorInstanceId,
          guardian.verifierActorInstanceId,
          guardian.guardianActorInstanceId,
          guardian.recorderActorInstanceId,
          input.approverSession.actorInstanceId,
        ],
        [
          guardian.producerTaskId,
          guardian.verifierTaskId,
          guardian.guardianTaskId,
          guardian.recorderTaskId,
          input.approverSession.taskId,
        ],
      );
      const receipt = TransactionHumanApprovalReceiptV1Schema.parse(
        signTransactionCausalReceiptV1({
          schemaVersion: 'transaction-human-approval-receipt-v1' as const,
          environment: 'LOCAL_SIMULATION' as const,
          receiptId: input.receiptId,
          runId: input.runId,
          nodeId: input.nodeId,
          ...transactionChainV1(guardian),
          state: 'H01_APPROVED' as const,
          effectReceiptId: guardian.effectReceiptId,
          effectReceiptPhysicalSha256: guardian.effectReceiptPhysicalSha256,
          verificationReceiptId: guardian.verificationReceiptId,
          verificationReceiptPhysicalSha256: guardian.verificationReceiptPhysicalSha256,
          guardianReceiptId: guardian.receiptId,
          guardianReceiptPhysicalSha256: input.guardianReceiptPhysicalSha256,
          producerTaskId: guardian.producerTaskId,
          verifierTaskId: guardian.verifierTaskId,
          guardianTaskId: guardian.guardianTaskId,
          recorderTaskId: guardian.recorderTaskId,
          approverTaskId: input.approverSession.taskId,
          producerActorInstanceId: guardian.producerActorInstanceId,
          verifierActorInstanceId: guardian.verifierActorInstanceId,
          guardianActorInstanceId: guardian.guardianActorInstanceId,
          guardianAuthoritySha256: guardian.guardianAuthoritySha256,
          recorderActorInstanceId: guardian.recorderActorInstanceId,
          recorderAuthoritySha256: guardian.recorderAuthoritySha256,
          approverActorInstanceId: input.approverSession.actorInstanceId,
          authorityVerdictSha256,
          recordedAt: input.recordedAt,
        }),
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

export interface DurableHumanApprovalRecorderOptionsV1 {
  readonly durableHooks?: TransactionDurableHooksV1;
}
export class DurableHumanApprovalRecorderV1 implements HumanApprovalRecorderV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly authority: ActorAuthorityPortV1,
    options: DurableHumanApprovalRecorderOptionsV1 = {},
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot, options.durableHooks);
  }
  public recordHumanApproval(raw: unknown): TransactionHumanApprovalReceiptV1 {
    return recordTransactionHumanApprovalV1(this.#store, this.authority, raw);
  }
}
