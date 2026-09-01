import {Buffer} from 'node:buffer';

// prettier-ignore
import {ActorSessionV1Schema, EmitGuardianVerdictInputV1Schema, TransactionGuardianVerdictV1Schema, TransactionVerificationReceiptV1Schema, type ActorAuthorityPortV1, type ActorSessionV1, type ReadOnlyGuardianVerdictEmitterPortV1, type TransactionActorRoleV1, type TransactionGuardianVerdictV1, type TransactionVerificationReceiptV1} from '../contracts/transaction-causal-gates-v1.ts';
// prettier-ignore
import {TransactionEffectReceiptV1Schema, failTransactionV1} from '../contracts/transaction-kernel-v1.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {sha256Text} from '../evidence/hash.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {assertDeclaredContractSha256} from './hash-bound.ts';
import type {StableRootHooksV1} from './stable-root-capability-v1.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';
import {verifyTransactionEffectOutputsV1 as verifyOutputs} from './transaction-output-verifier-v1.ts';
import {verifyTransactionActorAuthorityV1} from './transaction-recovery-v1.ts';
// prettier-ignore
import {assertDistinctTransactionActorsV1, sameTransactionChainV1, signTransactionCausalReceiptV1, transactionChainV1} from './causal-gate-verification-v1.ts';

export const verifyImmutableCausalActorAuthorityV1 = (
  port: ActorAuthorityPortV1,
  raw: ActorSessionV1,
  role: TransactionActorRoleV1,
  actionSha256: string,
  recordedAt: string,
): string => {
  const session = immutableClone(ActorSessionV1Schema.parse(raw));
  if (session.actionSha256 !== actionSha256)
    return failTransactionV1('AUTHORITY_DENIED', `${role} session is not action-bound.`);
  return verifyTransactionActorAuthorityV1(session, role, recordedAt, port);
};

export const computeGuardianAuthorityActionSha256V1 = (
  verification: TransactionVerificationReceiptV1,
  verificationReceiptPhysicalSha256: string,
  decision: 'PASS' | 'FAIL',
  evidenceSha256: string,
): string =>
  transactionAuthorityActionSha256V1({
    action: 'GUARDIAN_VERDICT',
    runId: verification.runId,
    nodeId: verification.nodeId,
    ...transactionChainV1(verification),
    verificationReceiptId: verification.receiptId,
    verificationReceiptPhysicalSha256,
    decision,
    evidenceSha256,
  });

const assertGuardianPredecessorsV1 = (
  store: TransactionDurableStoreV1,
  input: ReturnType<typeof EmitGuardianVerdictInputV1Schema.parse>,
) => {
  const verification = TransactionVerificationReceiptV1Schema.parse(
    store.readRecordedReceipt(
      input.runId,
      input.verificationReceiptId,
      input.verificationReceiptPhysicalSha256,
      'VERIFIED_PASS',
      true,
    ),
  );
  const effect = TransactionEffectReceiptV1Schema.parse(
    store.readRecordedReceipt(
      input.runId,
      verification.effectReceiptId,
      verification.effectReceiptPhysicalSha256,
      'EFFECT_SUCCEEDED',
    ),
  );
  store.assertRunBinding(input.runId, verification.graphSha256);
  store.assertRecordedSequence(input.runId, [
    {
      receiptId: effect.receiptId,
      physicalSha256: verification.effectReceiptPhysicalSha256,
      state: 'EFFECT_SUCCEEDED',
    },
    {
      receiptId: verification.receiptId,
      physicalSha256: input.verificationReceiptPhysicalSha256,
      state: 'VERIFIED_PASS',
    },
  ]);
  if (
    verification.runId !== input.runId ||
    verification.nodeId !== input.nodeId ||
    verification.receiptId !== input.verificationReceiptId ||
    verification.effectReceiptId !== effect.receiptId ||
    !sameTransactionChainV1(verification, effect) ||
    Date.parse(input.emittedAt) <= Date.parse(verification.recordedAt)
  )
    return failTransactionV1('CAUSAL_ORDER', 'Guardian predecessor binding failed.');
  return {verification, effect};
};

export interface ReadOnlyGuardianVerdictEmitterOptionsV1 {
  readonly rootHooks?: StableRootHooksV1;
}
export class ReadOnlyGuardianVerdictEmitterV1 implements ReadOnlyGuardianVerdictEmitterPortV1 {
  readonly #store: TransactionDurableStoreV1;
  public constructor(
    stateRoot: string,
    private readonly authority: ActorAuthorityPortV1,
    private readonly options: ReadOnlyGuardianVerdictEmitterOptionsV1 = {},
  ) {
    this.#store = new TransactionDurableStoreV1(stateRoot);
  }
  public emit(raw: unknown): TransactionGuardianVerdictV1 {
    const input = EmitGuardianVerdictInputV1Schema.parse(raw);
    const {verification, effect} = assertGuardianPredecessorsV1(this.#store, input);
    const candidate = verifyOutputs(effect, this.options.rootHooks).candidateSha256;
    if (candidate !== verification.candidateSha256 || input.evidenceSha256 !== candidate)
      return failTransactionV1('HASH_MISMATCH', 'Guardian evidence is stale.');
    const actionSha256 = computeGuardianAuthorityActionSha256V1(
      verification,
      input.verificationReceiptPhysicalSha256,
      input.decision,
      input.evidenceSha256,
    );
    const authorityVerdictSha256 = verifyImmutableCausalActorAuthorityV1(
      this.authority,
      input.guardianSession,
      'GUARDIAN',
      actionSha256,
      input.emittedAt,
    );
    assertDistinctTransactionActorsV1(
      [
        verification.producerActorInstanceId,
        verification.verifierActorInstanceId,
        input.guardianSession.actorInstanceId,
      ],
      [verification.producerTaskId, verification.verifierTaskId, input.guardianSession.taskId],
    );
    return immutableClone(
      TransactionGuardianVerdictV1Schema.parse(
        signTransactionCausalReceiptV1({
          schemaVersion: 'transaction-guardian-verdict-v1' as const,
          environment: 'LOCAL_SIMULATION' as const,
          runId: input.runId,
          nodeId: input.nodeId,
          ...transactionChainV1(verification),
          effectReceiptId: effect.receiptId,
          effectReceiptPhysicalSha256: verification.effectReceiptPhysicalSha256,
          verificationReceiptId: verification.receiptId,
          verificationReceiptPhysicalSha256: input.verificationReceiptPhysicalSha256,
          producerTaskId: verification.producerTaskId,
          verifierTaskId: verification.verifierTaskId,
          guardianTaskId: input.guardianSession.taskId,
          producerActorInstanceId: verification.producerActorInstanceId,
          verifierActorInstanceId: verification.verifierActorInstanceId,
          guardianActorInstanceId: input.guardianSession.actorInstanceId,
          guardianAuthoritySha256: input.guardianSession.authoritySha256,
          decision: input.decision,
          authorityVerdictSha256,
          evidenceSha256: input.evidenceSha256,
          emittedAt: input.emittedAt,
        }),
      ),
    );
  }
}

export const serializeTransactionGuardianVerdictV1 = (raw: unknown) => {
  const verdict = TransactionGuardianVerdictV1Schema.parse(raw);
  try {
    assertDeclaredContractSha256(verdict, 'canonicalSha256');
  } catch {
    return failTransactionV1('HASH_MISMATCH', 'Guardian verdict self-hash mismatch.');
  }
  const text = canonicalize(verdict);
  return Object.freeze({
    guardianVerdictBytesBase64: Buffer.from(text, 'utf8').toString('base64'),
    guardianVerdictPhysicalSha256: sha256Text(text),
  });
};

export const parseTransactionGuardianVerdictBytesV1 = (
  encoded: string,
  physicalSha256: string,
): TransactionGuardianVerdictV1 => {
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded)
    return failTransactionV1('HASH_MISMATCH', 'Guardian verdict base64 is not canonical.');
  let text: string;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    return failTransactionV1('CONTRACT_INVALID', 'Guardian verdict is not UTF-8.');
  }
  if (sha256Text(text) !== physicalSha256)
    return failTransactionV1('HASH_MISMATCH', 'Guardian verdict physical hash drifted.');
  try {
    const verdict = TransactionGuardianVerdictV1Schema.parse(JSON.parse(text));
    assertDeclaredContractSha256(verdict, 'canonicalSha256');
    if (canonicalize(verdict) !== text) throw new Error('non-canonical');
    return immutableClone(verdict);
  } catch {
    return failTransactionV1('HASH_MISMATCH', 'Guardian verdict is not canonical or hash-bound.');
  }
};
