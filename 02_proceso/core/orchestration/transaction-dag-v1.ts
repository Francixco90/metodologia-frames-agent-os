// prettier-ignore
import {TransactionExecutionInputV1Schema, TransactionGraphV1Schema, failTransactionV1, type TransactionExecutionInputV1, type TransactionGraphV1} from '../contracts/transaction-kernel-v1.ts';
import {hashExperienceValue} from '../contracts/experience-normalization.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {assertDeclaredContractSha256, computeDeclaredContractSha256} from './hash-bound.ts';

export * from './transaction-run-inspection-v1.ts';

const normalized = (value: string): string => value.normalize('NFC').toLowerCase();
const sorted = (values: readonly string[]): readonly string[] => [...values].sort();

export const transactionOutputsSha256V1 = (refs: readonly string[]): string =>
  hashCanonical(sorted(refs));
export const transactionAuthorityActionSha256V1 = (
  action: Readonly<Record<string, unknown>>,
): string => hashCanonical({...action, schemaVersion: 'transaction-authority-action-v1'});
export const computeTransactionExecutionInputSha256V1 = (
  input: Omit<TransactionExecutionInputV1, 'canonicalSha256'> | TransactionExecutionInputV1,
): string => computeDeclaredContractSha256(input, 'canonicalSha256');
export const computeProducerActionSha256V1 = (
  input: Omit<TransactionExecutionInputV1, 'canonicalSha256'> | TransactionExecutionInputV1,
): string => {
  const actionBound = {...input} as Partial<TransactionExecutionInputV1>;
  delete actionBound.producerSession;
  delete actionBound.canonicalSha256;
  return transactionAuthorityActionSha256V1({
    action: 'EXECUTE_CREATE_FILE',
    executionSha256: hashCanonical(actionBound),
  });
};

export const validateTransactionGraphV1 = (raw: unknown): TransactionGraphV1 => {
  const parsed = TransactionGraphV1Schema.safeParse(raw);
  if (!parsed.success) return failTransactionV1('GRAPH_INVALID', 'Invalid transaction graph.');
  try {
    assertDeclaredContractSha256(parsed.data, 'canonicalSha256');
  } catch {
    return failTransactionV1('HASH_MISMATCH', 'Transaction graph self-hash mismatch.');
  }
  const nodes = new Map(parsed.data.nodes.map((node) => [node.nodeId, node]));
  if (nodes.size !== parsed.data.nodes.length)
    return failTransactionV1('GRAPH_INVALID', 'Duplicate graph node.');
  const identities = new Set<string>();
  for (const node of parsed.data.nodes) {
    for (const identity of [node.nodeId, ...node.aliases]) {
      const key = normalized(identity);
      if (identities.has(key)) return failTransactionV1('GRAPH_INVALID', 'Graph alias collision.');
      identities.add(key);
    }
    if (new Set(node.dependsOn).size !== node.dependsOn.length)
      return failTransactionV1('GRAPH_INVALID', 'Duplicate dependency.');
    for (const dependencyId of node.dependsOn) {
      const dependency = nodes.get(dependencyId);
      if (dependency === undefined || dependency.nodeId === node.nodeId)
        return failTransactionV1('GRAPH_INVALID', 'Missing or self dependency.');
      if (dependency.wave >= node.wave)
        return failTransactionV1('GRAPH_INVALID', 'Dependency wave must be strictly earlier.');
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) failTransactionV1('GRAPH_INVALID', 'Transaction graph cycle.');
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const dependency of nodes.get(nodeId)?.dependsOn ?? []) visit(dependency);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const nodeId of nodes.keys()) visit(nodeId);
  return parsed.data;
};

export const assertTransactionNodeBindingV1 = (raw: unknown): TransactionExecutionInputV1 => {
  const parsed = TransactionExecutionInputV1Schema.safeParse(raw);
  if (!parsed.success) return failTransactionV1('CONTRACT_INVALID', 'Invalid execution input.');
  const input = parsed.data;
  const graph = validateTransactionGraphV1(input.graph);
  try {
    assertDeclaredContractSha256(input, 'canonicalSha256');
  } catch {
    return failTransactionV1('HASH_MISMATCH', 'Execution input self-hash mismatch.');
  }
  if (hashExperienceValue(input.workOrder) !== input.workOrder.canonicalSha256) {
    return failTransactionV1('HASH_MISMATCH', 'WorkOrder logical self-hash mismatch.');
  }
  const node = graph.nodes.find(({nodeId}) => nodeId === input.nodeId);
  if (node === undefined) return failTransactionV1('GRAPH_INVALID', 'Execution node absent.');
  const actual = {
    workOrderSha256: hashCanonical(input.workOrder),
    authorizationSha256: hashCanonical(input.authorization),
    inputsSha256: hashCanonical(input.workOrder.inputs),
    outputsSha256: transactionOutputsSha256V1(input.workOrder.expectedOutputs),
  };
  for (const key of Object.keys(actual) as (keyof typeof actual)[]) {
    if (input[key] !== actual[key] || node[key] !== actual[key])
      return failTransactionV1('AUTHORIZATION_DRIFT', `Node binding drift: ${key}`);
  }
  if (
    input.producerSession.taskId !== input.producerTaskId ||
    input.producerSession.actorInstanceId !== input.producerActorInstanceId ||
    input.workOrder.actorId !== input.producerActorInstanceId ||
    input.producerSession.actionSha256 !== computeProducerActionSha256V1(input)
  )
    return failTransactionV1('AUTHORITY_DENIED', 'Producer identity or action binding failed.');
  const dependencies = sorted(node.dependsOn);
  const promotions = sorted(input.dependencyPromotions.map(({nodeId}) => nodeId));
  if (hashCanonical(dependencies) !== hashCanonical(promotions))
    return failTransactionV1('CAUSAL_ORDER', 'Dependencies require exact promotion receipts.');
  return input;
};
