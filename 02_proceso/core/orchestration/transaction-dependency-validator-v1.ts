// prettier-ignore
import {TransactionGuardianReceiptV1Schema, TransactionHumanApprovalReceiptV1Schema, TransactionPromotionReceiptV1Schema, TransactionVerificationReceiptV1Schema} from '../contracts/transaction-causal-gates-v1.ts';
import {
  TransactionEffectReceiptV1Schema,
  failTransactionV1,
  type TransactionExecutionInputV1,
} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
import type {StableRootHooksV1} from './stable-root-capability-v1.ts';
import type {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
import {verifyTransactionEffectOutputsV1} from './transaction-output-verifier-v1.ts';

const chainFields = (value: {
  attemptId: string;
  graphSha256: string;
  workOrderSha256: string;
  authorizationSha256: string;
  inputsSha256: string;
  outputsSha256: string;
  candidateSha256: string;
}) => ({
  attemptId: value.attemptId,
  graphSha256: value.graphSha256,
  workOrderSha256: value.workOrderSha256,
  authorizationSha256: value.authorizationSha256,
  inputsSha256: value.inputsSha256,
  outputsSha256: value.outputsSha256,
  candidateSha256: value.candidateSha256,
});

export const verifyTransactionDependenciesV1 = (
  input: TransactionExecutionInputV1,
  store: TransactionDurableStoreV1,
  rootHooks?: StableRootHooksV1,
): void => {
  if (input.dependencyPromotions.length === 0) return;
  store.assertRunBinding(input.runId, input.graph.canonicalSha256);
  for (const binding of input.dependencyPromotions) {
    const promotion = TransactionPromotionReceiptV1Schema.parse(
      store.readRecordedReceipt(input.runId, binding.receiptId, binding.physicalSha256, 'PROMOTED'),
    );
    const approval = TransactionHumanApprovalReceiptV1Schema.parse(
      store.readRecordedReceipt(
        input.runId,
        promotion.humanApprovalReceiptId,
        promotion.humanApprovalReceiptPhysicalSha256,
        'H01_APPROVED',
      ),
    );
    const guardian = TransactionGuardianReceiptV1Schema.parse(
      store.readRecordedReceipt(
        input.runId,
        promotion.guardianReceiptId,
        promotion.guardianReceiptPhysicalSha256,
        'GUARDIAN_PASS',
      ),
    );
    const verification = TransactionVerificationReceiptV1Schema.parse(
      store.readRecordedReceipt(
        input.runId,
        promotion.verificationReceiptId,
        promotion.verificationReceiptPhysicalSha256,
        'VERIFIED_PASS',
      ),
    );
    const effect = TransactionEffectReceiptV1Schema.parse(
      store.readRecordedReceipt(
        input.runId,
        promotion.effectReceiptId,
        promotion.effectReceiptPhysicalSha256,
        'EFFECT_SUCCEEDED',
      ),
    );
    store.assertRecordedSequence(input.runId, [
      {
        receiptId: effect.receiptId,
        physicalSha256: promotion.effectReceiptPhysicalSha256,
        state: 'EFFECT_SUCCEEDED',
      },
      {
        receiptId: verification.receiptId,
        physicalSha256: promotion.verificationReceiptPhysicalSha256,
        state: 'VERIFIED_PASS',
      },
      {
        receiptId: guardian.receiptId,
        physicalSha256: promotion.guardianReceiptPhysicalSha256,
        state: 'GUARDIAN_PASS',
      },
      {
        receiptId: approval.receiptId,
        physicalSha256: promotion.humanApprovalReceiptPhysicalSha256,
        state: 'H01_APPROVED',
      },
      {receiptId: promotion.receiptId, physicalSha256: binding.physicalSha256, state: 'PROMOTED'},
    ]);
    const common = hashCanonical(chainFields(promotion));
    const node = input.graph.nodes.find(({nodeId}) => nodeId === binding.nodeId);
    const pointers =
      promotion.humanApprovalReceiptId === approval.receiptId &&
      promotion.guardianReceiptId === guardian.receiptId &&
      promotion.verificationReceiptId === verification.receiptId &&
      promotion.effectReceiptId === effect.receiptId &&
      approval.guardianReceiptId === guardian.receiptId &&
      approval.guardianReceiptPhysicalSha256 === promotion.guardianReceiptPhysicalSha256 &&
      approval.verificationReceiptId === verification.receiptId &&
      approval.verificationReceiptPhysicalSha256 === promotion.verificationReceiptPhysicalSha256 &&
      approval.effectReceiptId === effect.receiptId &&
      approval.effectReceiptPhysicalSha256 === promotion.effectReceiptPhysicalSha256 &&
      guardian.verificationReceiptId === verification.receiptId &&
      guardian.verificationReceiptPhysicalSha256 === promotion.verificationReceiptPhysicalSha256 &&
      guardian.effectReceiptId === effect.receiptId &&
      guardian.effectReceiptPhysicalSha256 === promotion.effectReceiptPhysicalSha256 &&
      verification.effectReceiptId === effect.receiptId &&
      verification.effectReceiptPhysicalSha256 === promotion.effectReceiptPhysicalSha256;
    const bound = [approval, guardian, verification, effect].every(
      (receipt) =>
        receipt.runId === input.runId &&
        receipt.nodeId === binding.nodeId &&
        hashCanonical(chainFields(receipt)) === common,
    );
    const nodeBound =
      node !== undefined &&
      node.workOrderSha256 === promotion.workOrderSha256 &&
      node.authorizationSha256 === promotion.authorizationSha256 &&
      node.inputsSha256 === promotion.inputsSha256 &&
      node.outputsSha256 === promotion.outputsSha256;
    const identities = [
      promotion.producerActorInstanceId,
      promotion.verifierActorInstanceId,
      promotion.guardianActorInstanceId,
      promotion.approverActorInstanceId,
      promotion.recorderActorInstanceId,
    ];
    const tasks = [
      promotion.producerTaskId,
      promotion.verifierTaskId,
      promotion.guardianTaskId,
      promotion.approverTaskId,
      promotion.recorderTaskId,
    ];
    const candidate = verifyTransactionEffectOutputsV1(effect, rootHooks).candidateSha256;
    if (
      promotion.receiptId !== binding.receiptId ||
      promotion.runId !== input.runId ||
      promotion.nodeId !== binding.nodeId ||
      promotion.graphSha256 !== input.graph.canonicalSha256 ||
      !pointers ||
      !bound ||
      !nodeBound ||
      candidate !== promotion.candidateSha256 ||
      new Set(identities).size !== identities.length ||
      new Set(tasks).size !== tasks.length
    )
      return failTransactionV1('CAUSAL_ORDER', 'Dependency physical promotion chain is invalid.');
  }
};
