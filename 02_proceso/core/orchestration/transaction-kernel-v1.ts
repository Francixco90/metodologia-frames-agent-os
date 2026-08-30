import {isAbsolute, relative, sep} from 'node:path';

import type {ActorAuthorityPortV1} from '../contracts/transaction-causal-gates-v1.ts';
// prettier-ignore
import {TransactionInspectionInputV1Schema, TransactionKernelErrorV1, failTransactionV1, type TransactionEffectReceiptV1, type TransactionInspectionV1, type TransactionKernelV1, type TransactionOutputV1, type TransactionRecoveryAssessmentV1, type TransactionRecoveryReceiptV1} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
// prettier-ignore
import {withStableRootCapabilityV1, type StableRootHooksV1} from './stable-root-capability-v1.ts';
// prettier-ignore
import {assertDeclaredParentsV1, assertExactWriteSetV1, assertSnapshotCreatesOnlyV1, captureTransactionSnapshotV1} from './transaction-path-guard-v1.ts';
// prettier-ignore
import {assertTransactionNodeBindingV1} from './transaction-dag-v1.ts';
import {
  writeCreateOnlyV1,
  type TransactionWriterHooksV1,
} from './transaction-create-only-writer-v1.ts';
import {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
import type {TransactionDurableHooksV1} from './transaction-durable-store-support-v1.ts';
import {createTransactionEffectReceiptV1} from './transaction-effect-receipt-v1.ts';

export interface DefaultTransactionKernelOptionsV1 {
  readonly producerAuthority: ActorAuthorityPortV1;
  readonly durableHooks?: TransactionDurableHooksV1;
  readonly rootHooks?: StableRootHooksV1;
  readonly writerHooks?: TransactionWriterHooksV1;
  readonly recoveryAuthority?: ActorAuthorityPortV1;
}
const sameRefs = (left: readonly string[], right: readonly string[]): boolean =>
  hashCanonical([...left].sort()) === hashCanonical([...right].sort());
import {verifyTransactionDependenciesV1} from './transaction-dependency-validator-v1.ts';
import {
  inspectTransactionRecoveryV1,
  recoverTransactionV1,
  verifyTransactionActorAuthorityV1,
} from './transaction-recovery-v1.ts';

export class DefaultTransactionKernelV1 implements TransactionKernelV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly options: DefaultTransactionKernelOptionsV1,
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot, options.durableHooks);
  }

  public execute(raw: unknown): TransactionEffectReceiptV1 {
    const input = assertTransactionNodeBindingV1(raw);
    this.#assertDisjoint(input.rootAuthority.expectedRealpath);
    const refs = assertExactWriteSetV1(input.intents.map(({ref}) => ref));
    if (
      input.workOrder.effectClass !== 'LOCAL_REVERSIBLE' ||
      !sameRefs(refs, assertExactWriteSetV1(input.workOrder.expectedOutputs)) ||
      !sameRefs(refs, assertExactWriteSetV1(input.workOrder.writeSet))
    ) {
      return failTransactionV1('CONTRACT_INVALID', 'CREATE_FILE intents require exact V1 outputs.');
    }
    const producerVerdictSha256 = verifyTransactionActorAuthorityV1(
      input.producerSession,
      'PRODUCER',
      input.occurredAt,
      this.options.producerAuthority,
    );
    verifyTransactionDependenciesV1(input, this.#store, this.options.rootHooks);
    return this.#store.withRunLock(
      input.runId,
      `${input.attemptId}.lock`,
      input.producerActorInstanceId,
      input.occurredAt,
      () => {
        const outputs: TransactionOutputV1[] = [];
        try {
          this.#store.bindRun(input.runId, input.graph.canonicalSha256, input.occurredAt);
          this.#store.appendEvent(
            input.runId,
            `${input.attemptId}.prepared`,
            'PREPARED',
            {
              attemptId: input.attemptId,
              executionInputSha256: input.canonicalSha256,
              graphSha256: input.graph.canonicalSha256,
              nodeId: input.nodeId,
            },
            input.occurredAt,
          );
          this.#store.appendEvent(
            input.runId,
            `${input.attemptId}.running`,
            'RUNNING',
            {
              attemptId: input.attemptId,
              executionInputSha256: input.canonicalSha256,
              graphSha256: input.graph.canonicalSha256,
              nodeId: input.nodeId,
            },
            input.occurredAt,
          );
          withStableRootCapabilityV1(
            input.rootAuthority,
            (capability) => {
              assertDeclaredParentsV1(capability, refs);
              const before = captureTransactionSnapshotV1(capability);
              for (const [index, intent] of input.intents.entries())
                outputs.push(
                  writeCreateOnlyV1(
                    capability,
                    intent,
                    `${input.attemptId}.${index}`,
                    this.options.writerHooks,
                  ),
                );
              assertSnapshotCreatesOnlyV1(
                before,
                captureTransactionSnapshotV1(capability),
                refs,
                outputs,
              );
            },
            this.options.rootHooks,
          );
          const receipt = createTransactionEffectReceiptV1(
            input,
            producerVerdictSha256,
            'EFFECT_SUCCEEDED',
            outputs,
            null,
          );
          this.#store.persistReceipt(
            input.runId,
            receipt.receiptId,
            receipt.state,
            receipt,
            input.occurredAt,
          );
          return receipt;
        } catch (error) {
          const code = error instanceof TransactionKernelErrorV1 ? error.code : 'BLOCKED_UNCERTAIN';
          const receipt = createTransactionEffectReceiptV1(
            input,
            producerVerdictSha256,
            'BLOCKED_UNCERTAIN',
            [],
            code,
          );
          this.#store.persistReceipt(
            input.runId,
            receipt.receiptId,
            receipt.state,
            receipt,
            input.occurredAt,
          );
          return receipt;
        }
      },
    );
  }

  public inspect(raw: unknown): TransactionInspectionV1 {
    const input = TransactionInspectionInputV1Schema.safeParse(raw);
    if (!input.success) return failTransactionV1('CONTRACT_INVALID', 'Invalid inspection input.');
    return this.#store.inspect(input.data.runId);
  }
  public inspectRecovery(raw: unknown): TransactionRecoveryAssessmentV1 {
    const input = TransactionInspectionInputV1Schema.parse(raw);
    return inspectTransactionRecoveryV1(this.#store, input.runId);
  }
  public recover(raw: unknown): TransactionRecoveryReceiptV1 {
    return recoverTransactionV1(this.#store, this.options.recoveryAuthority, raw);
  }
  #assertDisjoint(effectRoot: string): void {
    const nested = (value: string): boolean =>
      value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value));
    if (
      nested(relative(this.#store.root, effectRoot)) ||
      nested(relative(effectRoot, this.#store.root))
    )
      return failTransactionV1(
        'ROOT_AUTHORITY_INVALID',
        'State and effect roots must be disjoint.',
      );
  }
}
