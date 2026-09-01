import {
  TransactionEffectReceiptV1Schema,
  type TransactionEffectReceiptV1,
  type TransactionExecutionInputV1,
  type TransactionKernelErrorV1,
  type TransactionOutputV1,
} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {computeDeclaredContractSha256} from './hash-bound.ts';
import {TRANSACTION_ROOT_COVERAGE_GAPS} from './stable-root-capability-v1.ts';
import {computeTransactionExecutionInputSha256V1} from './transaction-dag-v1.ts';
import {computeTransactionCandidateSha256V1} from './transaction-output-verifier-v1.ts';

export const createTransactionEffectReceiptV1 = (
  input: TransactionExecutionInputV1,
  producerAuthorityVerdictSha256: string,
  state: 'EFFECT_SUCCEEDED' | 'BLOCKED_UNCERTAIN',
  outputs: TransactionOutputV1[],
  errorCode: TransactionKernelErrorV1['code'] | null,
): TransactionEffectReceiptV1 => {
  const draft = {
    schemaVersion: 'transaction-effect-receipt-v1' as const,
    environment: 'LOCAL_SIMULATION' as const,
    receiptId: input.receiptId,
    runId: input.runId,
    nodeId: input.nodeId,
    attemptId: input.attemptId,
    producerTaskId: input.producerTaskId,
    producerActorInstanceId: input.producerActorInstanceId,
    producerAuthorityVerdictSha256,
    state,
    executionInputSha256: computeTransactionExecutionInputSha256V1(input),
    graphSha256: input.graph.canonicalSha256,
    workOrderSha256: input.workOrderSha256,
    authorizationSha256: input.authorizationSha256,
    inputsSha256: input.inputsSha256,
    outputsSha256: input.outputsSha256,
    candidateSha256: computeTransactionCandidateSha256V1(outputs),
    rootAuthority: input.rootAuthority,
    outputs,
    errorCode,
    coverageGaps: state === 'EFFECT_SUCCEEDED' ? [] : ['TRANSACTION_EFFECT_NOT_VERIFIED'],
    assuranceLimitations: [...TRANSACTION_ROOT_COVERAGE_GAPS],
    occurredAt: input.occurredAt,
  };
  return immutableClone(
    TransactionEffectReceiptV1Schema.parse({
      ...draft,
      canonicalSha256: computeDeclaredContractSha256(draft, 'canonicalSha256'),
    }),
  );
};
