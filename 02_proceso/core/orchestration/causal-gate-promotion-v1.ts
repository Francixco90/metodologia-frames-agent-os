// prettier-ignore
import {PromoteTransactionInputV1Schema, TransactionGuardianReceiptV1Schema, TransactionHumanApprovalReceiptV1Schema, TransactionPromotionReceiptV1Schema, TransactionVerificationReceiptV1Schema, type ActorAuthorityPortV1, type TransactionHumanApprovalReceiptV1, type TransactionPromotionReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
import {
  TransactionEffectReceiptV1Schema,
  failTransactionV1,
} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {verifyImmutableCausalActorAuthorityV1} from './causal-gate-guardian-v1.ts';
import type {StableRootHooksV1} from './stable-root-capability-v1.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import type {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
import {verifyTransactionEffectOutputsV1} from './transaction-output-verifier-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, sameTransactionChainV1, signTransactionCausalReceiptV1, transactionChainV1} from './causal-gate-verification-v1.ts';

export const computePromotionAuthorityActionSha256V1 = (
  approval: TransactionHumanApprovalReceiptV1,
  humanApprovalReceiptPhysicalSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'RECORD_PROMOTION',
    runId: approval.runId,
    nodeId: approval.nodeId,
    ...transactionChainV1(approval),
    humanApprovalReceiptId: approval.receiptId,
    humanApprovalReceiptPhysicalSha256,
  });

export const recordTransactionPromotionV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1,
  raw: unknown,
  rootHooks?: StableRootHooksV1,
): TransactionPromotionReceiptV1 => {
  const input = PromoteTransactionInputV1Schema.parse(raw);
  return store.withRunLock(
    input.runId,
    `${input.promotionReceiptId}.lock`,
    input.recorderSession.actorInstanceId,
    input.recordedAt,
    () => {
      const approval = TransactionHumanApprovalReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          input.humanApprovalReceiptId,
          input.humanApprovalReceiptPhysicalSha256,
          'H01_APPROVED',
          true,
        ),
      );
      store.assertRunBinding(input.runId, approval.graphSha256);
      const guardian = TransactionGuardianReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          approval.guardianReceiptId,
          approval.guardianReceiptPhysicalSha256,
          'GUARDIAN_PASS',
        ),
      );
      const verification = TransactionVerificationReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          approval.verificationReceiptId,
          approval.verificationReceiptPhysicalSha256,
          'VERIFIED_PASS',
        ),
      );
      const effect = TransactionEffectReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          approval.effectReceiptId,
          approval.effectReceiptPhysicalSha256,
          'EFFECT_SUCCEEDED',
        ),
      );
      store.assertRecordedSequence(input.runId, [
        {
          receiptId: effect.receiptId,
          physicalSha256: approval.effectReceiptPhysicalSha256,
          state: 'EFFECT_SUCCEEDED',
        },
        {
          receiptId: verification.receiptId,
          physicalSha256: approval.verificationReceiptPhysicalSha256,
          state: 'VERIFIED_PASS',
        },
        {
          receiptId: guardian.receiptId,
          physicalSha256: approval.guardianReceiptPhysicalSha256,
          state: 'GUARDIAN_PASS',
        },
        {
          receiptId: approval.receiptId,
          physicalSha256: input.humanApprovalReceiptPhysicalSha256,
          state: 'H01_APPROVED',
        },
      ]);
      const candidate = verifyTransactionEffectOutputsV1(effect, rootHooks).candidateSha256;
      const pointers =
        guardian.verificationReceiptId === verification.receiptId &&
        guardian.verificationReceiptPhysicalSha256 === approval.verificationReceiptPhysicalSha256 &&
        guardian.effectReceiptId === effect.receiptId &&
        guardian.effectReceiptPhysicalSha256 === approval.effectReceiptPhysicalSha256 &&
        verification.effectReceiptId === effect.receiptId &&
        verification.effectReceiptPhysicalSha256 === approval.effectReceiptPhysicalSha256;
      if (
        approval.runId !== input.runId ||
        approval.nodeId !== input.nodeId ||
        Date.parse(input.recordedAt) <= Date.parse(approval.recordedAt) ||
        !sameTransactionChainV1(approval, guardian, verification, effect) ||
        !pointers ||
        approval.recorderTaskId !== guardian.recorderTaskId ||
        approval.recorderActorInstanceId !== guardian.recorderActorInstanceId ||
        approval.guardianAuthoritySha256 !== guardian.guardianAuthoritySha256 ||
        approval.recorderAuthoritySha256 !== guardian.recorderAuthoritySha256 ||
        input.recorderSession.taskId !== guardian.recorderTaskId ||
        input.recorderSession.actorInstanceId !== guardian.recorderActorInstanceId ||
        input.recorderSession.authoritySha256 !== guardian.recorderAuthoritySha256 ||
        candidate !== approval.candidateSha256
      )
        return failTransactionV1('CAUSAL_ORDER', 'H01 physical chain is invalid.');
      const actionSha256 = computePromotionAuthorityActionSha256V1(
        approval,
        input.humanApprovalReceiptPhysicalSha256,
      );
      const authorityVerdictSha256 = verifyImmutableCausalActorAuthorityV1(
        authority,
        input.recorderSession,
        'RECORDER',
        actionSha256,
        input.recordedAt,
      );
      assertDistinctTransactionActorsV1(
        [
          approval.producerActorInstanceId,
          approval.verifierActorInstanceId,
          approval.guardianActorInstanceId,
          approval.approverActorInstanceId,
          input.recorderSession.actorInstanceId,
        ],
        [
          approval.producerTaskId,
          approval.verifierTaskId,
          approval.guardianTaskId,
          approval.approverTaskId,
          input.recorderSession.taskId,
        ],
      );
      const draft = {
        schemaVersion: 'transaction-promotion-receipt-v1' as const,
        environment: 'LOCAL_SIMULATION' as const,
        receiptId: input.promotionReceiptId,
        runId: input.runId,
        nodeId: input.nodeId,
        ...transactionChainV1(approval),
        state: 'PROMOTED' as const,
        effectReceiptId: approval.effectReceiptId,
        effectReceiptPhysicalSha256: approval.effectReceiptPhysicalSha256,
        verificationReceiptId: approval.verificationReceiptId,
        verificationReceiptPhysicalSha256: approval.verificationReceiptPhysicalSha256,
        guardianReceiptId: approval.guardianReceiptId,
        guardianReceiptPhysicalSha256: approval.guardianReceiptPhysicalSha256,
        humanApprovalReceiptId: approval.receiptId,
        humanApprovalReceiptPhysicalSha256: input.humanApprovalReceiptPhysicalSha256,
        producerTaskId: approval.producerTaskId,
        verifierTaskId: approval.verifierTaskId,
        guardianTaskId: approval.guardianTaskId,
        approverTaskId: approval.approverTaskId,
        recorderTaskId: input.recorderSession.taskId,
        producerActorInstanceId: approval.producerActorInstanceId,
        verifierActorInstanceId: approval.verifierActorInstanceId,
        guardianActorInstanceId: approval.guardianActorInstanceId,
        guardianAuthoritySha256: approval.guardianAuthoritySha256,
        approverActorInstanceId: approval.approverActorInstanceId,
        recorderActorInstanceId: input.recorderSession.actorInstanceId,
        recorderAuthoritySha256: input.recorderSession.authoritySha256,
        authorityVerdictSha256,
        recordedAt: input.recordedAt,
      };
      const receipt = TransactionPromotionReceiptV1Schema.parse(
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
