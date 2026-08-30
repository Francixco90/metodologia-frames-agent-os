import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {afterEach} from 'vitest';

import {FramesWorkOrderV1Schema, type FramesWorkOrderV1} from 'core/contracts/index.ts';
import {canonicalize} from 'core/evidence/canonical-json.ts';
import {hashCanonical} from 'core/evidence/hash.ts';
import {DefaultTransactionKernelV1} from 'core/orchestration/index.ts';
import {
  LocalExtensionExecutorV1,
  technicalDefenseAuthorizationV1,
  type LocalExtensionRunnerAuthorityV1,
} from 'workflows/local-extensions/executor-v1.ts';
import {
  SandboxProbeSchema,
  createLocalActivationReceipt,
  discoverLocalExtensions,
  type LocalActivationReceiptV1,
  type LocalExtensionRecord,
  type TechnicalDefensePrivacyAuthorityPortV1,
  type TechnicalDefensePrivacyProvenanceSessionV1,
  type TechnicalDefenseReviewAuthorityPortV1,
} from 'workflows/local-extensions/index.ts';
import {
  TECHNICAL_DEFENSE_EXTENSION_ID,
  TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
  TechnicalDefenseCaseV1Schema,
  type TechnicalDefenseCaseV1,
} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionDraft,
  makeTransactionGraph,
  makeTransactionSandbox,
  transactionAuthorityPort,
  transactionProducerAuthorizer,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

export const digest = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
export const bundleRoot = resolve(
  '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense',
);
const temporaryRoots: string[] = [];
export const createTechnicalDefenseTemporaryRoot = (prefix: string): string => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
};
const trustedReviewers = new Map([
  [
    'actor.observer.one',
    {taskId: 'task.observer.one', role: 'REHEARSAL_OBSERVER', authoritySha256: '1'.repeat(64)},
  ],
  [
    'actor.observer.two',
    {taskId: 'task.observer.two', role: 'REHEARSAL_OBSERVER', authoritySha256: '2'.repeat(64)},
  ],
  [
    'actor.red-team.r8',
    {taskId: 'task.red-team.r8', role: 'RED_TEAM', authoritySha256: '3'.repeat(64)},
  ],
]);
const reviewAuthorityPort: TechnicalDefenseReviewAuthorityPortV1 = {
  verify(session, expectedRole) {
    const trusted = trustedReviewers.get(session.actorInstanceId);
    const payload = {
      schemaVersion: 'technical-defense-review-authority-verdict-v1' as const,
      status:
        trusted?.taskId === session.taskId &&
        trusted.role === expectedRole &&
        trusted.authoritySha256 === session.authoritySha256
          ? ('VERIFIED' as const)
          : ('DENIED' as const),
      expectedRole,
      ...session,
      evidenceSha256: hashCanonical({trusted, expectedRole, session}),
      verifiedAt: '2026-08-29T17:30:00.000Z',
    };
    return {...payload, canonicalSha256: hashCanonical(payload)};
  },
};
const trustedPrivacy = {
  taskId: 'task.privacy-provenance.r8',
  actorInstanceId: 'actor.privacy-provenance.r8',
  authoritySha256: '4'.repeat(64),
};
export const makeTechnicalDefensePrivacyAuthority = (
  forcedStatus?: 'VERIFIED' | 'DENIED' | 'CAPABILITY_GAP',
  verifiedAt = '2026-08-29T17:30:00.000Z',
): TechnicalDefensePrivacyAuthorityPortV1 => ({
  verify(session) {
    const payload = {
      schemaVersion: 'technical-defense-privacy-provenance-verdict-v1' as const,
      status:
        forcedStatus ??
        (session.taskId === trustedPrivacy.taskId &&
        session.actorInstanceId === trustedPrivacy.actorInstanceId &&
        session.authoritySha256 === trustedPrivacy.authoritySha256
          ? ('VERIFIED' as const)
          : ('DENIED' as const)),
      ...session,
      evidenceSha256: hashCanonical({trustedPrivacy, session}),
      verifiedAt,
    };
    return {...payload, canonicalSha256: hashCanonical(payload)};
  },
});

export const refreshPiiReceipt = <T extends Record<string, unknown>>(value: T): T => {
  const clone = structuredClone(value);
  const current = clone.pii_redaction_receipt as Record<string, unknown>;
  delete clone.pii_redaction_receipt;
  const receiptPayload = {
    schema_version: 'technical-defense-pii-redaction-receipt-v1',
    policy: 'SYNTHETIC_ONLY',
    detector_id: 'frames.synthetic-pii-detector-v1',
    status: 'NO_PII_DETECTED',
    findings_count: 0,
    redactions_count: 0,
    case_payload_sha256: hashCanonical(clone),
    evidence_sha256: hashCanonical({
      detector_id: 'frames.synthetic-pii-detector-v1',
      policy: 'SYNTHETIC_ONLY',
      scanned: 'ALL_NON_DIGEST_TEXT_FIELDS',
      findings_count: 0,
    }),
  };
  return {
    ...clone,
    pii_redaction_receipt: {
      ...current,
      ...receiptPayload,
      receipt_sha256: hashCanonical(receiptPayload),
    },
  };
};

export interface TechnicalDefenseBundleBinding {
  repositoryRoot: string;
  record: LocalExtensionRecord;
  receipt: LocalActivationReceiptV1;
  runnerAuthority: LocalExtensionRunnerAuthorityV1;
  probeBytes: Buffer;
  positive: TechnicalDefenseCaseV1;
}

export const loadTechnicalDefenseBundle = (): TechnicalDefenseBundleBinding => {
  const repositoryRoot = createTechnicalDefenseTemporaryRoot('frames-r8-execution-');
  const target = resolve(
    repositoryRoot,
    '04_estado/local/extensions/metodologia/technical-defense-preparation',
  );
  mkdirSync(target, {recursive: true});
  cpSync(bundleRoot, target, {recursive: true});
  const probeBytes = readFileSync(resolve(target, 'sandbox-probe.json'));
  const probe = SandboxProbeSchema.parse(JSON.parse(probeBytes.toString('utf8')));
  const runnerAuthority: LocalExtensionRunnerAuthorityV1 = {
    runnerId: 'frames.local-extension-executor-v1',
    runnerSha256: probe.runner_sha256,
  };
  const [record] = discoverLocalExtensions({
    repository_root: repositoryRoot,
    trusted_sandbox_runners: {[runnerAuthority.runnerId]: runnerAuthority.runnerSha256},
  }).records;
  if (!record) throw new Error('Expected materialized technical-defense extension.');
  const fixture = JSON.parse(readFileSync(resolve(bundleRoot, 'fixtures.json'), 'utf8')) as {
    positive: unknown;
  };
  return {
    repositoryRoot,
    record,
    receipt: createLocalActivationReceipt(record),
    runnerAuthority,
    probeBytes,
    positive: TechnicalDefenseCaseV1Schema.parse(fixture.positive),
  };
};

const makeWorkOrder = (
  id: string,
  binding: TechnicalDefenseBundleBinding,
  caseSha256: string,
  refs: readonly string[],
  mutate?: (draft: Omit<FramesWorkOrderV1, 'canonicalSha256'>) => void,
) => {
  const inputs = [
    {ref: 'technical-defense-case.json', sha256: caseSha256},
    {ref: 'extension.yml', sha256: binding.record.manifest_sha256!},
    {ref: 'sandbox-probe.json', sha256: binding.record.sandbox_probe_sha256!},
    {ref: 'activation-receipt.json', sha256: binding.receipt.receipt_sha256},
  ];
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: `WO.R8.${id}`,
    requestHash: caseSha256,
    routeId: 'R8' as const,
    workflowId: 'workflow.technical-defense',
    stepId: 'step.technical-defense',
    skillId: TECHNICAL_DEFENSE_EXTENSION_ID,
    actorId: `actor.producer.${id}`,
    readSet: inputs.map(({ref}) => ref),
    writeSet: [...refs],
    inputs,
    expectedOutputs: [...refs],
    tools: [],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {targetFiles: refs.length, maxFiles: 12, targetTokens: 1, maxTokens: 100},
    acceptanceCriteria: ['Create only the exact R8 technical-defense package.'],
    stopRule: 'Stop after the local effect receipt; do not infer verification or promotion.',
  };
  mutate?.(draft);
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashCanonical(draft)});
};

export interface TechnicalDefenseRunOptions {
  mutateWorkOrder?: (draft: Omit<FramesWorkOrderV1, 'canonicalSha256'>) => void;
  mutateAuthorization?: (authorization: Record<string, string>) => void;
  reviewAuthority?: TechnicalDefenseReviewAuthorityPortV1;
  privacyAuthority?: TechnicalDefensePrivacyAuthorityPortV1 | null;
  privacySession?: TechnicalDefensePrivacyProvenanceSessionV1 | null;
  mutatePrivacySession?: (session: TechnicalDefensePrivacyProvenanceSessionV1) => void;
}

export const setupTechnicalDefenseRun = (
  id: string,
  binding: TechnicalDefenseBundleBinding,
  caseValue?: TechnicalDefenseCaseV1,
  refs: readonly string[] = TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
  options: TechnicalDefenseRunOptions = {},
) => {
  const selectedCase =
    caseValue ??
    refreshPiiReceipt({
      ...structuredClone(binding.positive),
      producer_actor_instance_id: `actor.producer.${id}`,
    });
  const caseBytes = Buffer.from(canonicalize(selectedCase));
  const caseSha256 = digest(caseBytes);
  const sandbox = makeTransactionSandbox();
  const workOrder = makeWorkOrder(id, binding, caseSha256, refs, options.mutateWorkOrder);
  const workOrderSha256 = hashCanonical(workOrder);
  const authorization = technicalDefenseAuthorizationV1(
    binding.record,
    binding.receipt,
    caseSha256,
    workOrderSha256,
    binding.runnerAuthority,
  );
  options.mutateAuthorization?.(authorization);
  const graph = makeTransactionGraph(id, workOrder, authorization);
  const execution = makeTransactionDraft(id, sandbox.authority, graph, workOrder, authorization);
  const privacyProvenanceSession: TechnicalDefensePrivacyProvenanceSessionV1 | undefined =
    options.privacySession === null
      ? undefined
      : (options.privacySession ?? {
          ...trustedPrivacy,
          casePayloadSha256: caseSha256,
          caseFrozenAt: selectedCase.frozen_at,
          classification: 'SYNTHETIC_ONLY' as const,
          environment: 'LOCAL_SIMULATION' as const,
        });
  if (privacyProvenanceSession) options.mutatePrivacySession?.(privacyProvenanceSession);
  const executor = new LocalExtensionExecutorV1(
    new DefaultTransactionKernelV1(sandbox.state, {producerAuthority: transactionAuthorityPort}),
    transactionProducerAuthorizer,
    binding.runnerAuthority,
    options.reviewAuthority ?? reviewAuthorityPort,
    options.privacyAuthority === null
      ? undefined
      : (options.privacyAuthority ?? makeTechnicalDefensePrivacyAuthority()),
  );
  return {
    ...sandbox,
    execute: () =>
      executor.execute({
        repositoryRoot: binding.repositoryRoot,
        record: binding.record,
        activationReceipt: binding.receipt,
        sandboxProbeBytes: binding.probeBytes,
        caseBytes,
        caseSha256,
        ...(privacyProvenanceSession ? {privacyProvenanceSession} : {}),
        execution,
      }),
  };
};

afterEach(() => {
  cleanupTransactionFixtures();
  for (const root of temporaryRoots.splice(0)) rmSync(root, {recursive: true, force: true});
});
