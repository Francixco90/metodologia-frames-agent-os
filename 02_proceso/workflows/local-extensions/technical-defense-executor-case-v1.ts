// prettier-ignore
import type {LocalExtensionManifest, TechnicalDefensePrivacyAuthorityPortV1, TechnicalDefensePrivacyProvenanceSessionV1, TechnicalDefenseReviewAuthorityPortV1, TechnicalDefenseReviewRoleV1, TechnicalDefenseReviewSessionV1} from './contracts.ts';
// prettier-ignore
import {TechnicalDefensePrivacyProvenanceSessionV1Schema, TechnicalDefensePrivacyProvenanceVerdictV1Schema, TechnicalDefenseReviewAuthorityVerdictV1Schema} from './contracts.ts';
// prettier-ignore
import type {LocalExtensionExecutionInputV1, LocalExtensionRunnerAuthorityV1} from './technical-defense-executor-attestation-v1.ts';
import {technicalDefenseAuthorizationV1} from './technical-defense-executor-attestation-v1.ts';
import {failTransactionV1} from '../../core/contracts/transaction-kernel-v1.ts';
import {canonicalize} from '../../core/evidence/canonical-json.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';
import {immutableClone} from '../../core/evidence/immutable.ts';
// prettier-ignore
import {TECHNICAL_DEFENSE_EXTENSION_ID, TECHNICAL_DEFENSE_OUTPUT_REFS_V1, TechnicalDefenseCaseV1Schema, type TechnicalDefenseCaseV1} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';

// prettier-ignore
const sameRefs = (left: readonly string[], right: readonly string[]): boolean => hashCanonical([...left].sort()) === hashCanonical([...right].sort());
const parseCanonicalCase = (bytes: Uint8Array): unknown => {
  try {
    const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    const value: unknown = JSON.parse(text);
    if (canonicalize(value) !== text)
      return failTransactionV1('HASH_MISMATCH', 'Case bytes are not canonical JSON.');
    return value;
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionKernelErrorV1') throw error;
    return failTransactionV1('CONTRACT_INVALID', 'Case bytes are not valid UTF-8 JSON.');
  }
};
// prettier-ignore
const assertBoundVerdict = (value: Record<string, unknown>, expectedSession: Record<string, unknown>, message: string): string => {
  const {canonicalSha256, ...payload} = value;
  // prettier-ignore
  const observedSession = Object.fromEntries(Object.entries(payload).filter(([key]) => !['schemaVersion', 'status', 'evidenceSha256', 'verifiedAt'].includes(key)));
  const {status, verifiedAt} = payload;
  if (
    status !== 'VERIFIED' ||
    hashCanonical(observedSession) !== hashCanonical(expectedSession) ||
    canonicalSha256 !== hashCanonical(payload)
  )
    return failTransactionV1('AUTHORITY_DENIED', message);
  return String(verifiedAt);
};
const verifyReviewer = (
  authority: TechnicalDefenseReviewAuthorityPortV1,
  session: TechnicalDefenseReviewSessionV1,
  expectedRole: TechnicalDefenseReviewRoleV1,
): void => {
  const expected = immutableClone(session);
  let result: unknown;
  // prettier-ignore
  try { result = authority.verify(immutableClone(expected), expectedRole); } catch { return failTransactionV1('AUTHORITY_DENIED', `Technical-defense ${expectedRole} authority failed closed.`); }
  const verdict = TechnicalDefenseReviewAuthorityVerdictV1Schema.safeParse(result);
  if (!verdict.success)
    return failTransactionV1('AUTHORITY_DENIED', `Invalid ${expectedRole} verdict.`);
  // prettier-ignore
  assertBoundVerdict(verdict.data, {expectedRole, ...expected}, `Technical-defense ${expectedRole} authority was not verified.`);
};
const verifyPrivacyProvenance = (
  authority: TechnicalDefensePrivacyAuthorityPortV1 | undefined,
  sessionValue: TechnicalDefensePrivacyProvenanceSessionV1 | undefined,
  caseSha256: string,
  frozenAt: string,
  reservedActors: readonly string[],
  reservedTasks: readonly string[],
): void => {
  const session = TechnicalDefensePrivacyProvenanceSessionV1Schema.safeParse(sessionValue);
  if (!authority || !session.success)
    return failTransactionV1('AUTHORITY_DENIED', 'Privacy/provenance authority is missing.');
  const expected = immutableClone(session.data);
  if (reservedActors.includes(expected.actorInstanceId) || reservedTasks.includes(expected.taskId))
    return failTransactionV1(
      'ACTOR_COLLISION',
      'Privacy/provenance authority must be independent of production and review.',
    );
  let result: unknown;
  // prettier-ignore
  try { result = authority.verify(immutableClone(expected)); } catch { return failTransactionV1('AUTHORITY_DENIED', 'Privacy/provenance authority failed closed.'); }
  const verdict = TechnicalDefensePrivacyProvenanceVerdictV1Schema.safeParse(result);
  if (!verdict.success) return failTransactionV1('AUTHORITY_DENIED', 'Invalid privacy verdict.');
  const verifiedAt = assertBoundVerdict(
    verdict.data,
    expected,
    'Privacy/provenance authority is denied or unbound.',
  );
  if (
    expected.casePayloadSha256 !== caseSha256 ||
    expected.caseFrozenAt !== frozenAt ||
    Date.parse(verifiedAt) < Date.parse(frozenAt)
  )
    return failTransactionV1(
      'AUTHORITY_DENIED',
      'Privacy/provenance authority is stale or denied.',
    );
};

export const validateTechnicalDefenseCaseExecutionV1 = (
  input: LocalExtensionExecutionInputV1,
  manifest: LocalExtensionManifest,
  runnerAuthority: LocalExtensionRunnerAuthorityV1,
  reviewAuthority: TechnicalDefenseReviewAuthorityPortV1,
  privacyAuthority: TechnicalDefensePrivacyAuthorityPortV1 | undefined,
): TechnicalDefenseCaseV1 => {
  const {record, activationReceipt: receipt, execution} = input;
  // prettier-ignore
  const expectedInputs = [
    {ref: 'technical-defense-case.json', sha256: input.caseSha256}, {ref: 'extension.yml', sha256: record.manifest_sha256!},
    {ref: 'sandbox-probe.json', sha256: record.sandbox_probe_sha256!}, {ref: 'activation-receipt.json', sha256: receipt.receipt_sha256}];
  const runSuffix = execution.runId.startsWith('run.') ? execution.runId.slice(4) : '';
  // prettier-ignore
  const workOrderDraft = {
    schemaVersion: 'frames-work-order-v1', workOrderId: `WO.R8.${runSuffix}`,
    requestHash: input.caseSha256, routeId: 'R8', workflowId: 'workflow.technical-defense',
    stepId: 'step.technical-defense', skillId: TECHNICAL_DEFENSE_EXTENSION_ID, actorId: `actor.producer.${runSuffix}`,
    readSet: expectedInputs.map(({ref}) => ref), writeSet: [...TECHNICAL_DEFENSE_OUTPUT_REFS_V1], inputs: expectedInputs,
    expectedOutputs: [...TECHNICAL_DEFENSE_OUTPUT_REFS_V1], tools: [], effectClass: 'LOCAL_REVERSIBLE',
    budget: {targetFiles: 9, maxFiles: 12, targetTokens: 1, maxTokens: 100}, acceptanceCriteria: ['Create only the exact R8 technical-defense package.'],
    stopRule: 'Stop after the local effect receipt; do not infer verification or promotion.'};
  const expectedWorkOrder = {...workOrderDraft, canonicalSha256: hashCanonical(workOrderDraft)};
  const workOrderSha256 = hashCanonical(expectedWorkOrder);
  const expectedAuthorization = technicalDefenseAuthorizationV1(
    record,
    receipt,
    input.caseSha256,
    workOrderSha256,
    runnerAuthority,
  );
  if (
    hashCanonical(execution.workOrder) !== workOrderSha256 ||
    execution.workOrderSha256 !== workOrderSha256 ||
    !sameRefs(manifest.write_set, TECHNICAL_DEFENSE_OUTPUT_REFS_V1) ||
    !sameRefs(
      manifest.read_set,
      expectedInputs.map(({ref}) => ref),
    ) ||
    !sameRefs(manifest.outputs, TECHNICAL_DEFENSE_OUTPUT_REFS_V1) ||
    execution.authorizationSha256 !== hashCanonical(expectedAuthorization) ||
    hashCanonical(execution.authorization) !== hashCanonical(expectedAuthorization)
  )
    return failTransactionV1('AUTHORIZATION_DRIFT', 'WorkOrder differs from the local bundle.');
  const technicalCase = TechnicalDefenseCaseV1Schema.parse(parseCanonicalCase(input.caseBytes));
  if (
    technicalCase.producer_actor_instance_id !== execution.producerActorInstanceId ||
    execution.workOrder.actorId !== execution.producerActorInstanceId
  )
    return failTransactionV1('AUTHORIZATION_DRIFT', 'Technical-defense producer binding drifted.');
  const reviewActors = [
    execution.producerActorInstanceId,
    ...technicalCase.rehearsals.map(({observer_actor_instance_id}) => observer_actor_instance_id),
    technicalCase.red_team.actor_instance_id,
  ];
  const reviewTasks = [
    execution.producerTaskId,
    ...technicalCase.rehearsals.map(({observer_task_id}) => observer_task_id),
    technicalCase.red_team.task_id,
  ];
  if (
    new Set(reviewActors).size !== reviewActors.length ||
    new Set(reviewTasks).size !== reviewTasks.length
  )
    return failTransactionV1(
      'AUTHORIZATION_DRIFT',
      'Producer, rehearsal observers and red-team require distinct actor and task instances.',
    );
  verifyPrivacyProvenance(
    privacyAuthority,
    input.privacyProvenanceSession,
    input.caseSha256,
    technicalCase.frozen_at,
    reviewActors,
    reviewTasks,
  );
  for (const rehearsal of technicalCase.rehearsals)
    verifyReviewer(
      reviewAuthority,
      {
        taskId: rehearsal.observer_task_id,
        actorInstanceId: rehearsal.observer_actor_instance_id,
        authoritySha256: rehearsal.observer_authority_sha256,
        actionSha256: hashCanonical({caseSha256: input.caseSha256, rehearsal}),
        environment: 'LOCAL_SIMULATION',
      },
      'REHEARSAL_OBSERVER',
    );
  verifyReviewer(
    reviewAuthority,
    {
      taskId: technicalCase.red_team.task_id,
      actorInstanceId: technicalCase.red_team.actor_instance_id,
      authoritySha256: technicalCase.red_team.authority_sha256,
      actionSha256: hashCanonical({caseSha256: input.caseSha256, redTeam: technicalCase.red_team}),
      environment: 'LOCAL_SIMULATION',
    },
    'RED_TEAM',
  );
  return technicalCase;
};
