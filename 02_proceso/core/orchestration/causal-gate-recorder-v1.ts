// prettier-ignore
import {RecordHumanApprovalInputV1Schema, TransactionGuardianReceiptV1Schema, TransactionHumanApprovalReceiptV1Schema, type ActorAuthorityPortV1, type CausalGateRecorderV1, type HumanApprovalRecorderV1, type TransactionGuardianReceiptV1, type TransactionHumanApprovalReceiptV1, type TransactionPromotionReceiptV1, type TransactionVerificationReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, signTransactionCausalReceiptV1, transactionChainV1, verifyCausalActorAuthorityV1, recordTransactionVerificationV1} from './causal-gate-verification-v1.ts';
import {recordTransactionGuardianVerdictV1} from './causal-gate-guardian-v1.ts';
import {recordTransactionPromotionV1} from './causal-gate-promotion-v1.ts';

export {computeVerificationAuthorityActionSha256V1} from './causal-gate-verification-v1.ts';
export {computeGuardianAuthorityActionSha256V1} from './causal-gate-guardian-v1.ts';
export {computePromotionAuthorityActionSha256V1} from './causal-gate-promotion-v1.ts';

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

export class DurableCausalGateRecorderV1 implements CausalGateRecorderV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly authority: ActorAuthorityPortV1,
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot);
  }
  public recordVerification(raw: unknown): TransactionVerificationReceiptV1 {
    return recordTransactionVerificationV1(this.#store, this.authority, raw);
  }
  public recordGuardianVerdict(raw: unknown): TransactionGuardianReceiptV1 {
    return recordTransactionGuardianVerdictV1(this.#store, this.authority, raw);
  }
  public promote(raw: unknown): TransactionPromotionReceiptV1 {
    return recordTransactionPromotionV1(this.#store, this.authority, raw);
  }
}

export class DurableHumanApprovalRecorderV1 implements HumanApprovalRecorderV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly authority: ActorAuthorityPortV1,
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot);
  }
  public recordHumanApproval(raw: unknown): TransactionHumanApprovalReceiptV1 {
    const input = RecordHumanApprovalInputV1Schema.parse(raw);
    return this.#store.withRunLock(
      input.runId,
      `${input.receiptId}.lock`,
      input.approverSession.actorInstanceId,
      input.recordedAt,
      () => {
        const guardian = TransactionGuardianReceiptV1Schema.parse(
          this.#store.readRecordedReceipt(
            input.runId,
            input.guardianReceiptId,
            input.guardianReceiptPhysicalSha256,
            'GUARDIAN_PASS',
            true,
          ),
        );
        this.#store.assertRunBinding(input.runId, guardian.graphSha256);
        if (
          guardian.runId !== input.runId ||
          guardian.nodeId !== input.nodeId ||
          Date.parse(input.recordedAt) <= Date.parse(guardian.recordedAt)
        )
          return failTransactionV1('CAUSAL_ORDER', 'H01 Guardian binding failed.');
        const actionSha256 = computeHumanApprovalAuthorityActionSha256V1(
          guardian,
          input.guardianReceiptPhysicalSha256,
        );
        const authorityVerdictSha256 = verifyCausalActorAuthorityV1(
          this.authority,
          input.approverSession,
          'H01_APPROVER',
          actionSha256,
          input.recordedAt,
        );
        assertDistinctTransactionActorsV1(
          [
            guardian.producerActorInstanceId,
            guardian.verifierActorInstanceId,
            guardian.guardianActorInstanceId,
            input.approverSession.actorInstanceId,
          ],
          [
            guardian.producerTaskId,
            guardian.verifierTaskId,
            guardian.guardianTaskId,
            input.approverSession.taskId,
          ],
        );
        const draft = {
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
          approverTaskId: input.approverSession.taskId,
          producerActorInstanceId: guardian.producerActorInstanceId,
          verifierActorInstanceId: guardian.verifierActorInstanceId,
          guardianActorInstanceId: guardian.guardianActorInstanceId,
          approverActorInstanceId: input.approverSession.actorInstanceId,
          authorityVerdictSha256,
          recordedAt: input.recordedAt,
        };
        const receipt = TransactionHumanApprovalReceiptV1Schema.parse(
          signTransactionCausalReceiptV1(draft),
        );
        this.#store.persistReceipt(
          input.runId,
          receipt.receiptId,
          receipt.state,
          receipt,
          input.recordedAt,
        );
        return immutableClone(receipt);
      },
    );
  }
}
