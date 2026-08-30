import {createHash} from 'node:crypto';
import {z} from 'zod';

import type {ActorSessionV1} from '../../core/contracts/transaction-causal-gates-v1.ts';
import {
  TransactionExecutionDraftV1Schema,
  TransactionExecutionInputV1Schema,
  failTransactionV1,
  type TransactionEffectReceiptV1,
  type TransactionExecutionInputV1,
} from '../../core/contracts/transaction-kernel-v1.ts';
import {hashExperienceValue} from '../../core/contracts/experience-normalization.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';
import {immutableClone} from '../../core/evidence/immutable.ts';
import {
  computeTransactionExecutionInputSha256V1,
  computeProducerActionSha256V1,
  transactionOutputsSha256V1,
  validateTransactionGraphV1,
} from '../../core/orchestration/transaction-dag-v1.ts';
import {withStableRootCapabilityV1} from '../../core/orchestration/stable-root-capability-v1.ts';
import {
  assertSnapshotCreatesOnlyV1,
  captureTransactionSnapshotV1,
} from '../../core/orchestration/transaction-path-guard-v1.ts';
import type {TransactionKernelV1} from '../../core/contracts/transaction-kernel-v1.ts';

export interface MaterialCreateIntentV2 {
  readonly ref: string;
  readonly bytes: Uint8Array;
}
export interface MaterialSkillResultV2 {
  readonly intents: readonly MaterialCreateIntentV2[];
}
export type MaterialSkillHandlerV2 = (
  workOrder: Readonly<TransactionExecutionInputV1['workOrder']>,
) => MaterialSkillResultV2;
export interface ProducerActionAuthorizerV1 {
  authorize(seed: Readonly<ActorSessionV1>, actionSha256: string): ActorSessionV1;
}
export type MaterialSkillExecutionDraftV2 = Omit<
  TransactionExecutionInputV1,
  'canonicalSha256' | 'intents'
>;
const MaterialInvocationV2Schema = z.strictObject({execution: TransactionExecutionDraftV1Schema});

export class MaterialSkillAdapterV2 {
  public readonly simulationOnly = true;
  readonly #handlers: ReadonlyMap<string, MaterialSkillHandlerV2>;
  public constructor(
    private readonly kernel: TransactionKernelV1,
    handlers: Readonly<Record<string, MaterialSkillHandlerV2>>,
    private readonly producerAuthorizer: ProducerActionAuthorizerV1,
  ) {
    this.#handlers = new Map(Object.entries(handlers));
  }

  public async invoke(raw: unknown): Promise<TransactionEffectReceiptV1> {
    await Promise.resolve();
    const {execution} = MaterialInvocationV2Schema.parse(raw);
    const graph = validateTransactionGraphV1(execution.graph);
    const node = graph.nodes.find(({nodeId}) => nodeId === execution.nodeId);
    // prettier-ignore
    const bindings = {workOrderSha256: hashCanonical(execution.workOrder), authorizationSha256: hashCanonical(execution.authorization), inputsSha256: hashCanonical(execution.workOrder.inputs), outputsSha256: transactionOutputsSha256V1(execution.workOrder.expectedOutputs)};
    if (
      node === undefined ||
      hashExperienceValue(execution.workOrder) !== execution.workOrder.canonicalSha256 ||
      execution.workOrder.actorId !== execution.producerActorInstanceId ||
      execution.producerSession.actorInstanceId !== execution.producerActorInstanceId ||
      execution.producerSession.taskId !== execution.producerTaskId ||
      Object.entries(bindings).some(
        ([key, value]) =>
          execution[key as keyof typeof bindings] !== value ||
          node[key as keyof typeof bindings] !== value,
      )
    ) {
      return failTransactionV1('AUTHORIZATION_DRIFT', 'Draft differs from graph binding.');
    }
    const handler = this.#handlers.get(execution.workOrder.skillId);
    if (handler === undefined) {
      return failTransactionV1('CONTRACT_INVALID', 'No registered V2 material handler.');
    }
    const intents = withStableRootCapabilityV1(execution.rootAuthority, (capability) => {
      const before = captureTransactionSnapshotV1(capability);
      const produced = handler(immutableClone(execution.workOrder));
      if (produced !== null && typeof produced === 'object' && 'then' in produced)
        return failTransactionV1(
          'CAPABILITY_GAP',
          'V2 handlers must be synchronous pure functions.',
        );
      const materialized = produced.intents.map(({ref, bytes}) => {
        if (!(bytes instanceof Uint8Array))
          return failTransactionV1('CONTRACT_INVALID', 'V2 handler must return byte intents.');
        const copy = Buffer.from(bytes);
        return {
          effect: 'CREATE_FILE' as const,
          ref,
          contentBase64: copy.toString('base64'),
          contentSha256: createHash('sha256').update(copy).digest('hex'),
          sizeBytes: copy.byteLength,
        };
      });
      assertSnapshotCreatesOnlyV1(before, captureTransactionSnapshotV1(capability), []);
      return materialized;
    });
    if (transactionOutputsSha256V1(intents.map(({ref}) => ref)) !== execution.outputsSha256) {
      return failTransactionV1('AUTHORIZATION_DRIFT', 'Handler outputs differ from graph binding.');
    }
    const actionDraft = {...execution, intents};
    const actionSha256 = computeProducerActionSha256V1(actionDraft);
    const producerSession = this.producerAuthorizer.authorize(
      immutableClone(execution.producerSession),
      actionSha256,
    );
    if (
      producerSession.taskId !== execution.producerTaskId ||
      producerSession.actorInstanceId !== execution.producerActorInstanceId ||
      producerSession.authoritySha256 !== execution.producerSession.authoritySha256 ||
      producerSession.environment !== 'LOCAL_SIMULATION' ||
      producerSession.actionSha256 !== actionSha256
    )
      return failTransactionV1(
        'AUTHORITY_DENIED',
        'Producer authorizer returned an unbound session.',
      );
    const draft = {...actionDraft, producerSession};
    const finalized = TransactionExecutionInputV1Schema.parse({
      ...draft,
      canonicalSha256: computeTransactionExecutionInputSha256V1(draft),
    });
    return this.kernel.execute(finalized);
  }
}
