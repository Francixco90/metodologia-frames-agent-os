import {createHash} from 'node:crypto';
import {lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statfsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {
  FramesWorkOrderV1Schema,
  type ActorAuthorityPortV1,
  type ActorSessionV1,
  type TransactionGraphV1,
  type TransactionRootAuthorityV1,
} from 'core/contracts/index.ts';
import {canonicalize} from 'core/evidence/canonical-json.ts';
import {hashCanonical, sha256Text} from 'core/evidence/hash.ts';
import {
  computeDeclaredContractSha256,
  computeProducerActionSha256V1,
  computeTransactionExecutionInputSha256V1,
  transactionOutputsSha256V1,
} from 'core/orchestration/index.ts';

const roots: string[] = [];

export const transactionDigest = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

export const signTransactionFixture = <T extends object>(
  draft: T,
): T & {canonicalSha256: string} => ({
  ...draft,
  canonicalSha256: computeDeclaredContractSha256(draft, 'canonicalSha256'),
});

export const cleanupTransactionFixtures = (): void => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
};

export const makeTransactionSandbox = () => {
  const parent = realpathSync(mkdtempSync(resolve(tmpdir(), 'frames-tx-test-')));
  roots.push(parent);
  const effect = resolve(parent, 'effect');
  const state = resolve(parent, 'state');
  mkdirSync(effect);
  mkdirSync(state);
  const info = lstatSync(effect);
  const authority: TransactionRootAuthorityV1 = {
    rootPath: effect,
    expectedRealpath: effect,
    expectedDev: info.dev,
    expectedIno: info.ino,
    expectedFilesystemType: Number(statfsSync(effect).type),
  };
  return {effect, state, authority};
};

export const makeTransactionWorkOrder = (id: string, refs: string[]) => {
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: `WO.TX.${id}`,
    requestHash: 'a'.repeat(64),
    routeId: 'R6' as const,
    workflowId: 'workflow.tx',
    stepId: `step.${id}`,
    skillId: `skill.${id}`,
    actorId: `actor.producer.${id}`,
    readSet: [],
    writeSet: refs,
    inputs: [],
    expectedOutputs: refs,
    tools: [],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {targetFiles: refs.length, maxFiles: 12, targetTokens: 1, maxTokens: 100},
    acceptanceCriteria: ['Only the declared files are created.'],
    stopRule: 'Stop after the local create-only effect.',
  };
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashCanonical(draft)});
};

export const makeTransactionGraph = (
  id: string,
  workOrder: ReturnType<typeof makeTransactionWorkOrder>,
  authorization: Record<string, string>,
  dependencies: TransactionGraphV1['nodes'] = [],
  dependsOn: string[] = [],
): TransactionGraphV1 => {
  const node = {
    nodeId: `node.${id}`,
    aliases: [`alias.${id}`],
    wave: dependsOn.length,
    dependsOn,
    workOrderSha256: hashCanonical(workOrder),
    authorizationSha256: hashCanonical(authorization),
    inputsSha256: hashCanonical(workOrder.inputs),
    outputsSha256: transactionOutputsSha256V1(workOrder.expectedOutputs),
  };
  return signTransactionFixture({
    schemaVersion: 'transaction-graph-v1' as const,
    graphId: `graph.${id}`,
    nodes: [...dependencies, node],
  });
};

export const makeTransactionDraft = (
  id: string,
  authority: TransactionRootAuthorityV1,
  graph: TransactionGraphV1,
  workOrder: ReturnType<typeof makeTransactionWorkOrder>,
  authorization: Record<string, string>,
  dependencyPromotions: {nodeId: string; receiptId: string; physicalSha256: string}[] = [],
) => {
  const producerTaskId = `task.producer.${id}`;
  const producerActorInstanceId = `actor.producer.${id}`;
  const producerSession = {
    taskId: producerTaskId,
    actorInstanceId: producerActorInstanceId,
    authoritySha256: transactionDigest(`authority:producer:${id}`),
    actionSha256: '0'.repeat(64),
    environment: 'LOCAL_SIMULATION' as const,
  };
  const draft = {
    schemaVersion: 'transaction-execution-input-v1' as const,
    environment: 'LOCAL_SIMULATION' as const,
    runId: `run.${id}`,
    attemptId: `attempt.${id}`,
    receiptId: `effect.${id}`,
    nodeId: `node.${id}`,
    producerTaskId,
    producerActorInstanceId,
    producerSession,
    occurredAt: '2026-08-29T12:00:00.000Z',
    rootAuthority: authority,
    graph,
    workOrder,
    authorization,
    workOrderSha256: hashCanonical(workOrder),
    authorizationSha256: hashCanonical(authorization),
    inputsSha256: hashCanonical(workOrder.inputs),
    outputsSha256: transactionOutputsSha256V1(workOrder.expectedOutputs),
    dependencyPromotions,
  };
  return draft;
};

export const makeTransactionExecution = (
  id: string,
  sandbox = makeTransactionSandbox(),
  ref = 'result.md',
  authorization: Record<string, string> = {scope: 'PROJECT_LOCAL'},
) => {
  const workOrder = makeTransactionWorkOrder(id, [ref]);
  const graph = makeTransactionGraph(id, workOrder, authorization);
  const draft = makeTransactionDraft(id, sandbox.authority, graph, workOrder, authorization);
  const inputDraft = {
    ...draft,
    intents: [
      {
        effect: 'CREATE_FILE' as const,
        ref,
        contentBase64: 'eA==',
        contentSha256: transactionDigest('x'),
        sizeBytes: 1,
      },
    ],
  };
  const authorizedDraft = {
    ...inputDraft,
    producerSession: {
      ...inputDraft.producerSession,
      actionSha256: computeProducerActionSha256V1(inputDraft),
    },
  };
  return {
    ...sandbox,
    input: {
      ...authorizedDraft,
      canonicalSha256: computeTransactionExecutionInputSha256V1(authorizedDraft),
    },
  };
};

export const transactionProducerAuthorizer = {
  authorize(seed: ActorSessionV1, actionSha256: string): ActorSessionV1 {
    return {...seed, actionSha256};
  },
};

export const transactionSession = (role: string, actionSha256: string): ActorSessionV1 => ({
  taskId: `task.${role}`,
  actorInstanceId: `actor.${role}`,
  authoritySha256: transactionDigest(`authority:${role}`),
  actionSha256,
  environment: 'LOCAL_SIMULATION',
});

export const transactionAuthorityPort: ActorAuthorityPortV1 = {
  verify(actorSession, expectedRole) {
    return signTransactionFixture({
      schemaVersion: 'actor-authority-verdict-v1' as const,
      status: 'VERIFIED' as const,
      expectedRole,
      ...actorSession,
      evidenceSha256: hashCanonical({actorSession, expectedRole}),
      verifiedAt: '2026-08-29T11:59:59.000Z',
    });
  },
};

export const physicalTransactionReceipt = (receipt: unknown): string =>
  sha256Text(canonicalize(receipt));
