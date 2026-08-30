// prettier-ignore
import {RecordGuardianVerdictInputV1Schema, TransactionGuardianReceiptV1Schema, TransactionVerificationReceiptV1Schema, type ActorAuthorityPortV1, type CausalGateRecorderV1, type TransactionGuardianReceiptV1, type TransactionGuardianVerdictV1, type TransactionPromotionReceiptV1, type TransactionVerificationReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
// prettier-ignore
import {TransactionEffectReceiptV1Schema, failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {immutableClone} from '../evidence/immutable.ts';
// prettier-ignore
import {computeGuardianAuthorityActionSha256V1, parseTransactionGuardianVerdictBytesV1, verifyImmutableCausalActorAuthorityV1} from './causal-gate-guardian-v1.ts';
import {recordTransactionPromotionV1} from './causal-gate-promotion-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, sameTransactionChainV1, signTransactionCausalReceiptV1, transactionChainV1, recordTransactionVerificationV1} from './causal-gate-verification-v1.ts';
import type {StableRootHooksV1} from './stable-root-capability-v1.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
// prettier-ignore
import {TransactionDurableStoreV1, type TransactionDurableHooksV1} from './transaction-durable-store-v1.ts';
import {verifyTransactionEffectOutputsV1} from './transaction-output-verifier-v1.ts';

export {computeVerificationAuthorityActionSha256V1} from './causal-gate-verification-v1.ts';

export const computeGuardianRecorderAuthorityActionSha256V1 = (
  verdict: TransactionGuardianVerdictV1,
  physicalSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'RECORD_GUARDIAN_VERDICT',
    runId: verdict.runId,
    nodeId: verdict.nodeId,
    ...transactionChainV1(verdict),
    guardianVerdictCanonicalSha256: verdict.canonicalSha256,
    guardianVerdictPhysicalSha256: physicalSha256,
  });

export const recordTransactionGuardianVerdictV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1,
  raw: unknown,
  rootHooks?: StableRootHooksV1,
): TransactionGuardianReceiptV1 => {
  const input = RecordGuardianVerdictInputV1Schema.parse(raw);
  const verdict = parseTransactionGuardianVerdictBytesV1(
    input.guardianVerdictBytesBase64,
    input.guardianVerdictPhysicalSha256,
  );
  return store.withRunLock(
    input.runId,
    `${input.receiptId}.lock`,
    input.recorderSession.actorInstanceId,
    input.recordedAt,
    () => {
      // prettier-ignore
      const verification = TransactionVerificationReceiptV1Schema.parse(store.readRecordedReceipt(input.runId, verdict.verificationReceiptId, verdict.verificationReceiptPhysicalSha256, 'VERIFIED_PASS', true));
      // prettier-ignore
      const effect = TransactionEffectReceiptV1Schema.parse(store.readRecordedReceipt(input.runId, verdict.effectReceiptId, verdict.effectReceiptPhysicalSha256, 'EFFECT_SUCCEEDED'));
      store.assertRunBinding(input.runId, verdict.graphSha256);
      store.assertRecordedSequence(input.runId, [
        {
          receiptId: effect.receiptId,
          physicalSha256: verdict.effectReceiptPhysicalSha256,
          state: 'EFFECT_SUCCEEDED',
        },
        {
          receiptId: verification.receiptId,
          physicalSha256: verdict.verificationReceiptPhysicalSha256,
          state: 'VERIFIED_PASS',
        },
      ]);
      const candidate = verifyTransactionEffectOutputsV1(effect, rootHooks).candidateSha256;
      if (
        verdict.runId !== input.runId ||
        verdict.nodeId !== input.nodeId ||
        verdict.verificationReceiptId !== verification.receiptId ||
        verdict.effectReceiptId !== effect.receiptId ||
        verification.effectReceiptId !== effect.receiptId ||
        verification.effectReceiptPhysicalSha256 !== verdict.effectReceiptPhysicalSha256 ||
        !sameTransactionChainV1(verdict, verification, effect) ||
        candidate !== verdict.candidateSha256 ||
        verdict.evidenceSha256 !== candidate ||
        Date.parse(verdict.emittedAt) <= Date.parse(verification.recordedAt) ||
        Date.parse(input.recordedAt) <= Date.parse(verdict.emittedAt)
      )
        return failTransactionV1('CAUSAL_ORDER', 'Guardian verdict physical chain is invalid.');
      const guardianActionSha256 = computeGuardianAuthorityActionSha256V1(
        verification,
        verdict.verificationReceiptPhysicalSha256,
        verdict.decision,
        verdict.evidenceSha256,
      );
      const guardianAuthorityVerdictSha256 = verifyImmutableCausalActorAuthorityV1(
        authority,
        {
          taskId: verdict.guardianTaskId,
          actorInstanceId: verdict.guardianActorInstanceId,
          authoritySha256: verdict.guardianAuthoritySha256,
          actionSha256: guardianActionSha256,
          environment: 'LOCAL_SIMULATION',
        },
        'GUARDIAN',
        guardianActionSha256,
        verdict.emittedAt,
      );
      if (guardianAuthorityVerdictSha256 !== verdict.authorityVerdictSha256)
        return failTransactionV1('AUTHORITY_DENIED', 'Guardian authority verdict drifted.');
      const recorderAuthorityVerdictSha256 = verifyImmutableCausalActorAuthorityV1(
        authority,
        input.recorderSession,
        'RECORDER',
        computeGuardianRecorderAuthorityActionSha256V1(
          verdict,
          input.guardianVerdictPhysicalSha256,
        ),
        input.recordedAt,
      );
      assertDistinctTransactionActorsV1(
        [
          verdict.producerActorInstanceId,
          verdict.verifierActorInstanceId,
          verdict.guardianActorInstanceId,
          input.recorderSession.actorInstanceId,
        ],
        [
          verdict.producerTaskId,
          verdict.verifierTaskId,
          verdict.guardianTaskId,
          input.recorderSession.taskId,
        ],
      );
      const receipt = TransactionGuardianReceiptV1Schema.parse(
        signTransactionCausalReceiptV1({
          schemaVersion: 'transaction-guardian-receipt-v1' as const,
          environment: 'LOCAL_SIMULATION' as const,
          receiptId: input.receiptId,
          runId: input.runId,
          nodeId: input.nodeId,
          ...transactionChainV1(verdict),
          state:
            verdict.decision === 'PASS'
              ? ('GUARDIAN_PASS' as const)
              : ('BLOCKED_UNCERTAIN' as const),
          effectReceiptId: verdict.effectReceiptId,
          effectReceiptPhysicalSha256: verdict.effectReceiptPhysicalSha256,
          verificationReceiptId: verdict.verificationReceiptId,
          verificationReceiptPhysicalSha256: verdict.verificationReceiptPhysicalSha256,
          producerTaskId: verdict.producerTaskId,
          verifierTaskId: verdict.verifierTaskId,
          guardianTaskId: verdict.guardianTaskId,
          recorderTaskId: input.recorderSession.taskId,
          producerActorInstanceId: verdict.producerActorInstanceId,
          verifierActorInstanceId: verdict.verifierActorInstanceId,
          guardianActorInstanceId: verdict.guardianActorInstanceId,
          guardianAuthoritySha256: verdict.guardianAuthoritySha256,
          recorderActorInstanceId: input.recorderSession.actorInstanceId,
          recorderAuthoritySha256: input.recorderSession.authoritySha256,
          guardianVerdictCanonicalSha256: verdict.canonicalSha256,
          guardianVerdictPhysicalSha256: input.guardianVerdictPhysicalSha256,
          authorityVerdictSha256: verdict.authorityVerdictSha256,
          recorderAuthorityVerdictSha256,
          evidenceSha256: verdict.evidenceSha256,
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

export interface DurableCausalGateRecorderOptionsV1 {
  readonly durableHooks?: TransactionDurableHooksV1;
  readonly rootHooks?: StableRootHooksV1;
}
export class DurableCausalGateRecorderV1 implements CausalGateRecorderV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly authority: ActorAuthorityPortV1,
    private readonly options: DurableCausalGateRecorderOptionsV1 = {},
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot, options.durableHooks);
  }
  public recordVerification(raw: unknown): TransactionVerificationReceiptV1 {
    return recordTransactionVerificationV1(this.#store, this.authority, raw);
  }
  public recordGuardianVerdict(raw: unknown): TransactionGuardianReceiptV1 {
    return recordTransactionGuardianVerdictV1(
      this.#store,
      this.authority,
      raw,
      this.options.rootHooks,
    );
  }
  public promote(raw: unknown): TransactionPromotionReceiptV1 {
    return recordTransactionPromotionV1(this.#store, this.authority, raw, this.options.rootHooks);
  }
}
