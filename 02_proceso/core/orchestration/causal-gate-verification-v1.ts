// prettier-ignore
import {ActorSessionV1Schema, RecordVerificationInputV1Schema, TransactionVerificationReceiptV1Schema, type ActorAuthorityPortV1, type ActorSessionV1, type TransactionActorRoleV1, type TransactionVerificationReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
import {
  TransactionEffectReceiptV1Schema,
  failTransactionV1,
  type TransactionEffectReceiptV1,
} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {computeDeclaredContractSha256} from './hash-bound.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import type {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
import {verifyTransactionEffectOutputsV1} from './transaction-output-verifier-v1.ts';
import {verifyTransactionActorAuthorityV1} from './transaction-recovery-v1.ts';

export type TransactionChainBoundV1 = {
  attemptId: string;
  graphSha256: string;
  workOrderSha256: string;
  authorizationSha256: string;
  inputsSha256: string;
  outputsSha256: string;
  candidateSha256: string;
};
export const transactionChainV1 = (value: TransactionChainBoundV1) => ({
  attemptId: value.attemptId,
  graphSha256: value.graphSha256,
  workOrderSha256: value.workOrderSha256,
  authorizationSha256: value.authorizationSha256,
  inputsSha256: value.inputsSha256,
  outputsSha256: value.outputsSha256,
  candidateSha256: value.candidateSha256,
});
export const signTransactionCausalReceiptV1 = <T extends object>(
  draft: T,
): T & {canonicalSha256: string} => ({
  ...draft,
  canonicalSha256: computeDeclaredContractSha256(draft, 'canonicalSha256'),
});
export const assertDistinctTransactionActorsV1 = (
  actors: readonly string[],
  tasks: readonly string[],
): void => {
  if (new Set(actors).size !== actors.length || new Set(tasks).size !== tasks.length)
    failTransactionV1('ACTOR_COLLISION', 'Causal roles require distinct actor and task instances.');
};
export const sameTransactionChainV1 = (...values: TransactionChainBoundV1[]): boolean =>
  new Set(values.map((value) => hashCanonical(transactionChainV1(value)))).size === 1;
export const verifyCausalActorAuthorityV1 = (
  port: ActorAuthorityPortV1,
  raw: ActorSessionV1,
  role: TransactionActorRoleV1,
  actionSha256: string,
  recordedAt: string,
): string => {
  const session = ActorSessionV1Schema.parse(raw);
  if (session.actionSha256 !== actionSha256)
    return failTransactionV1('AUTHORITY_DENIED', `${role} session is not action-bound.`);
  return verifyTransactionActorAuthorityV1(session, role, recordedAt, port);
};

export const computeVerificationAuthorityActionSha256V1 = (
  effect: TransactionEffectReceiptV1,
  effectReceiptPhysicalSha256: string,
  decision: 'PASS' | 'FAIL',
  evidenceSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'VERIFY_EFFECT',
    runId: effect.runId,
    nodeId: effect.nodeId,
    ...transactionChainV1(effect),
    effectReceiptId: effect.receiptId,
    effectReceiptPhysicalSha256,
    decision,
    evidenceSha256,
  });

export const recordTransactionVerificationV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1,
  raw: unknown,
): TransactionVerificationReceiptV1 => {
  const input = RecordVerificationInputV1Schema.parse(raw);
  return store.withRunLock(
    input.runId,
    `${input.receiptId}.lock`,
    input.verifierSession.actorInstanceId,
    input.recordedAt,
    () => {
      const effect = TransactionEffectReceiptV1Schema.parse(
        store.readRecordedReceipt(
          input.runId,
          input.effectReceiptId,
          input.effectReceiptPhysicalSha256,
          'EFFECT_SUCCEEDED',
          true,
        ),
      );
      store.assertRunBinding(input.runId, effect.graphSha256);
      if (
        effect.runId !== input.runId ||
        effect.nodeId !== input.nodeId ||
        effect.receiptId !== input.effectReceiptId ||
        effect.producerActorInstanceId !== input.producerActorInstanceId ||
        Date.parse(input.recordedAt) <= Date.parse(effect.occurredAt)
      )
        return failTransactionV1('CAUSAL_ORDER', 'Verification effect binding failed.');
      if (input.decision === 'PASS') verifyTransactionEffectOutputsV1(effect);
      const actionSha256 = computeVerificationAuthorityActionSha256V1(
        effect,
        input.effectReceiptPhysicalSha256,
        input.decision,
        input.evidenceSha256,
      );
      const authorityVerdictSha256 = verifyCausalActorAuthorityV1(
        authority,
        input.verifierSession,
        'VERIFIER',
        actionSha256,
        input.recordedAt,
      );
      assertDistinctTransactionActorsV1(
        [effect.producerActorInstanceId, input.verifierSession.actorInstanceId],
        [effect.producerTaskId, input.verifierSession.taskId],
      );
      const draft = {
        schemaVersion: 'transaction-verification-receipt-v1' as const,
        environment: 'LOCAL_SIMULATION' as const,
        receiptId: input.receiptId,
        runId: input.runId,
        nodeId: input.nodeId,
        ...transactionChainV1(effect),
        state:
          input.decision === 'PASS' ? ('VERIFIED_PASS' as const) : ('BLOCKED_UNCERTAIN' as const),
        effectReceiptId: input.effectReceiptId,
        effectReceiptPhysicalSha256: input.effectReceiptPhysicalSha256,
        producerTaskId: effect.producerTaskId,
        verifierTaskId: input.verifierSession.taskId,
        producerActorInstanceId: effect.producerActorInstanceId,
        verifierActorInstanceId: input.verifierSession.actorInstanceId,
        producerAuthorityVerdictSha256: effect.producerAuthorityVerdictSha256,
        authorityVerdictSha256,
        evidenceSha256: input.evidenceSha256,
        recordedAt: input.recordedAt,
      };
      const receipt = TransactionVerificationReceiptV1Schema.parse(
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
