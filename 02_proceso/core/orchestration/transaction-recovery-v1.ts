// prettier-ignore
import {ActorAuthorityVerdictV1Schema, type ActorAuthorityPortV1, type ActorSessionV1, type TransactionActorRoleV1} from '../contracts/transaction-causal-gates-v1.ts';
// prettier-ignore
import {TransactionRecoveryAssessmentV1Schema, TransactionRecoveryInputV1Schema, TransactionRecoveryReceiptV1Schema, failTransactionV1, type TransactionRecoveryAssessmentV1, type TransactionRecoveryReceiptV1} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {immutableClone} from '../evidence/immutable.ts';
import {assertDeclaredContractSha256, computeDeclaredContractSha256} from './hash-bound.ts';
import {transactionAuthorityActionSha256V1} from './transaction-dag-v1.ts';
import type {TransactionDurableStoreV1} from './transaction-durable-store-v1.ts';

export const verifyTransactionActorAuthorityV1 = (
  session: ActorSessionV1,
  role: TransactionActorRoleV1,
  recordedAt: string,
  port: ActorAuthorityPortV1,
): string => {
  const verdict = ActorAuthorityVerdictV1Schema.parse(port.verify(session, role));
  try {
    assertDeclaredContractSha256(verdict, 'canonicalSha256');
  } catch {
    return failTransactionV1('AUTHORITY_DENIED', 'Authority verdict self-hash mismatch.');
  }
  if (
    verdict.status !== 'VERIFIED' ||
    verdict.expectedRole !== role ||
    verdict.taskId !== session.taskId ||
    verdict.actorInstanceId !== session.actorInstanceId ||
    verdict.authoritySha256 !== session.authoritySha256 ||
    verdict.actionSha256 !== session.actionSha256 ||
    verdict.environment !== 'LOCAL_SIMULATION' ||
    Date.parse(verdict.verifiedAt) > Date.parse(recordedAt)
  )
    return failTransactionV1('AUTHORITY_DENIED', `${role} authority is future or action-unbound.`);
  return hashCanonical(verdict);
};

export const inspectTransactionRecoveryV1 = (
  store: TransactionDurableStoreV1,
  runId: string,
): TransactionRecoveryAssessmentV1 => {
  const inspection = store.inspect(runId);
  return TransactionRecoveryAssessmentV1Schema.parse({
    ...inspection,
    recoveryRequired:
      inspection.status === 'BLOCKED_UNCERTAIN' ||
      inspection.latestState === 'PREPARED' ||
      inspection.latestState === 'RUNNING' ||
      inspection.latestState === 'BLOCKED_UNCERTAIN',
    originalLockPresent: inspection.issues.some(
      (issue) => issue === 'ORPHAN_LOCK' || issue === 'ORPHAN_RECOVERY_LOCK',
    ),
  });
};

export const recoverTransactionV1 = (
  store: TransactionDurableStoreV1,
  authority: ActorAuthorityPortV1 | undefined,
  raw: unknown,
): TransactionRecoveryReceiptV1 => {
  const input = TransactionRecoveryInputV1Schema.parse(raw);
  try {
    assertDeclaredContractSha256(input, 'canonicalSha256');
  } catch {
    return failTransactionV1('HASH_MISMATCH', 'Recovery input self-hash mismatch.');
  }
  if (authority === undefined)
    return failTransactionV1('RECOVERY_UNAUTHORIZED', 'Recovery authority port is required.');
  const observed = inspectTransactionRecoveryV1(store, input.runId);
  const remainingIssues = observed.issues.filter((issue) => issue !== 'ORPHAN_RECOVERY_LOCK');
  const assessment = observed.issues.includes('ORPHAN_RECOVERY_LOCK')
    ? TransactionRecoveryAssessmentV1Schema.parse({
        ...observed,
        issues: remainingIssues,
        status: remainingIssues.length === 0 ? 'CLEAN' : 'BLOCKED_UNCERTAIN',
        originalLockPresent: remainingIssues.includes('ORPHAN_LOCK'),
      })
    : observed;
  if (!assessment.recoveryRequired)
    return failTransactionV1('RECOVERY_UNAUTHORIZED', 'Recovery is not required.');
  const actionSha256 = transactionAuthorityActionSha256V1({
    action: 'RECOVER_APPEND_ONLY',
    runId: input.runId,
    recoveryId: input.recoveryId,
    reason: input.reason,
    assessmentSha256: hashCanonical(assessment),
  });
  const authoritySession = {
    taskId: input.taskId,
    actorInstanceId: input.actorInstanceId,
    authoritySha256: input.authoritySha256,
    actionSha256,
    environment: 'LOCAL_SIMULATION' as const,
  };
  const authorityVerdictSha256 = verifyTransactionActorAuthorityV1(
    authoritySession,
    'RECOVERY_OPERATOR',
    input.recordedAt,
    authority,
  );
  const draft = {
    schemaVersion: 'transaction-recovery-receipt-v1' as const,
    recoveryId: input.recoveryId,
    runId: input.runId,
    actorInstanceId: input.actorInstanceId,
    authoritySessionSha256: hashCanonical(authoritySession),
    authorityVerdictSha256,
    state: 'BLOCKED_UNCERTAIN' as const,
    assessmentSha256: hashCanonical(assessment),
    reason: input.reason,
    recordedAt: input.recordedAt,
  };
  const receipt = TransactionRecoveryReceiptV1Schema.parse({
    ...draft,
    canonicalSha256: computeDeclaredContractSha256(draft, 'canonicalSha256'),
  });
  return immutableClone(
    store.persistRecovery(input.runId, input.recoveryId, receipt, input.recordedAt),
  );
};
