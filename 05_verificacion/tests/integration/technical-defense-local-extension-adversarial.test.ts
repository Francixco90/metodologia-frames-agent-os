import {readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import type {FramesWorkOrderV1} from 'core/contracts/index.ts';
import {hashCanonical} from 'core/evidence/hash.ts';
import {
  SandboxProbeSchema,
  createLocalActivationReceipt,
  type TechnicalDefensePrivacyAuthorityPortV1,
  type TechnicalDefenseReviewAuthorityPortV1,
} from 'workflows/local-extensions/index.ts';
import {
  TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
  TechnicalDefenseCaseV1Schema,
  type TechnicalDefenseCaseV1,
} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';
import {transactionDigest} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';
import {
  digest,
  loadTechnicalDefenseBundle,
  makeTechnicalDefensePrivacyAuthority,
  refreshPiiReceipt,
  setupTechnicalDefenseRun,
} from './technical-defense-local-extension.harness.ts';

describe('R8 technical-defense adversarial boundaries', () => {
  type WorkOrderDraft = Omit<FramesWorkOrderV1, 'canonicalSha256'>;
  it.each([
    [
      'mutable evidence',
      (value: TechnicalDefenseCaseV1) => {
        value.evidence[0]!.content = 'changed after freeze';
      },
    ],
    [
      'unsupported claim',
      (value: TechnicalDefenseCaseV1) => {
        value.claims[0]!.evidence_ids = ['ev.absent'];
      },
    ],
    [
      'omitted second rehearsal',
      (value: TechnicalDefenseCaseV1) => {
        value.rehearsals = value.rehearsals.slice(0, 1);
      },
    ],
    [
      'red-team self-approval',
      (value: TechnicalDefenseCaseV1) => {
        value.red_team.actor_instance_id = value.producer_actor_instance_id;
      },
    ],
    [
      'D1 red-team blocker',
      (value: TechnicalDefenseCaseV1) => {
        value.red_team.findings.push({severity: 'D1', description: 'Unresolved high risk.'});
      },
    ],
    [
      'D2 without signoff',
      (value: TechnicalDefenseCaseV1) => {
        delete value.red_team.findings[0]!.signoff_sha256;
      },
    ],
  ])('blocks %s even when the outer case hash is refreshed', async (_name, mutate) => {
    const binding = loadTechnicalDefenseBundle();
    const id = `r8-negative-${transactionDigest(_name)}`;
    const candidate = {
      ...structuredClone(binding.positive),
      producer_actor_instance_id: `actor.producer.${id}`,
    };
    mutate(candidate);
    await expect(
      setupTechnicalDefenseRun(id, binding, refreshPiiReceipt(candidate)).execute(),
    ).rejects.toThrow();
  });

  it('binds the declared producer and red-team to actual execution identities', async () => {
    const binding = loadTechnicalDefenseBundle();
    const id = 'r8-actor-drift';
    const candidate = structuredClone(binding.positive);
    candidate.producer_actor_instance_id = 'actor.nominal.other';
    candidate.red_team.actor_instance_id = `actor.producer.${id}`;
    const rebound = refreshPiiReceipt(candidate);
    expect(TechnicalDefenseCaseV1Schema.safeParse(rebound).success).toBe(true);
    await expect(setupTechnicalDefenseRun(id, binding, rebound).execute()).rejects.toThrow(
      /producer binding drifted/u,
    );
  });

  it('blocks forged reviewer authority even when case and PII receipt are rebound', async () => {
    const binding = loadTechnicalDefenseBundle();
    const candidate = structuredClone(binding.positive);
    candidate.producer_actor_instance_id = 'actor.producer.r8-review-authority-drift';
    candidate.rehearsals[0]!.observer_authority_sha256 = 'f'.repeat(64);
    await expect(
      setupTechnicalDefenseRun(
        'r8-review-authority-drift',
        binding,
        refreshPiiReceipt(candidate),
      ).execute(),
    ).rejects.toThrow(/authority was not verified/u);
  });

  it('blocks detectable PII despite a freshly forged no-PII receipt', async () => {
    const binding = loadTechnicalDefenseBundle();
    const candidate = structuredClone(binding.positive);
    candidate.producer_actor_instance_id = 'actor.producer.r8-pii';
    candidate.objective = 'Contactar a real.person@example.com para la defensa.';
    const run = setupTechnicalDefenseRun('r8-pii', binding, refreshPiiReceipt(candidate));
    await expect(run.execute()).rejects.toThrow(/PII/u);
    expect(readdirSync(run.effect)).toEqual([]);
  });

  const replaceWorkOrder = (key: keyof WorkOrderDraft, value: unknown) => (draft: WorkOrderDraft) =>
    Object.assign(draft, {[key]: value});
  // prettier-ignore
  it.each([
    ['workOrderId', replaceWorkOrder('workOrderId', 'WO.R8.rehashed-alternate')],
    ['requestHash', replaceWorkOrder('requestHash', 'e'.repeat(64))],
    ['route', replaceWorkOrder('routeId', 'R7')],
    ['workflow', replaceWorkOrder('workflowId', 'workflow.rehashed')],
    ['step', replaceWorkOrder('stepId', 'step.rehashed')],
    ['skill', replaceWorkOrder('skillId', 'local.metodologia.rehashed')],
    ['actor', replaceWorkOrder('actorId', 'actor.producer.rehashed')],
    ['read set', (draft: WorkOrderDraft) => void draft.readSet.reverse()],
    ['write set', (draft: WorkOrderDraft) => {draft.writeSet = draft.writeSet.slice(1)}],
    ['inputs', (draft: WorkOrderDraft) => {draft.inputs[0]!.sha256 = 'e'.repeat(64)}],
    ['outputs', (draft: WorkOrderDraft) => {draft.expectedOutputs = draft.expectedOutputs.slice(1)}],
    ['tools', replaceWorkOrder('tools', ['filesystem.local'])],
    ['effect', (draft: WorkOrderDraft) => {draft.effectClass = 'READ_ONLY'; draft.writeSet = []}],
    ['budget', (draft: WorkOrderDraft) => {draft.budget.targetTokens = 2}],
    ['acceptance', replaceWorkOrder('acceptanceCriteria', ['A rehashed but unauthorized acceptance criterion.'])],
    ['stop rule', replaceWorkOrder('stopRule', 'A rehashed but unauthorized stop rule.')],
  ] satisfies [string, (draft: WorkOrderDraft) => void][])(
    'blocks rehashed %s WorkOrder semantic drift',
    async (name, mutateWorkOrder) => {
      const binding = loadTechnicalDefenseBundle();
      const id = `r8-workorder-${transactionDigest(name)}`;
      await expect(
        setupTechnicalDefenseRun(id, binding, undefined, TECHNICAL_DEFENSE_OUTPUT_REFS_V1, {
          mutateWorkOrder,
        }).execute(),
      ).rejects.toThrow(/WorkOrder differs/u);
    },
  );

  it('blocks authorization whose own hash is rebound to a stale WorkOrder hash', async () => {
    const binding = loadTechnicalDefenseBundle();
    await expect(
      setupTechnicalDefenseRun(
        'r8-authorization-workorder-drift',
        binding,
        undefined,
        TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
        {
          mutateAuthorization: (authorization) =>
            (authorization.work_order_sha256 = 'f'.repeat(64)),
        },
      ).execute(),
    ).rejects.toThrow(/WorkOrder differs/u);
  });

  it.each([
    ['missing port', {privacyAuthority: null}],
    ['missing session', {privacySession: null}],
    ['denied', {privacyAuthority: makeTechnicalDefensePrivacyAuthority('DENIED')}],
    ['capability gap', {privacyAuthority: makeTechnicalDefensePrivacyAuthority('CAPABILITY_GAP')}],
    [
      'stale verdict',
      {privacyAuthority: makeTechnicalDefensePrivacyAuthority('VERIFIED', '2026-08-29T14:59:59Z')},
    ],
  ] as const)('blocks %s privacy/provenance authority', async (_name, options) => {
    const binding = loadTechnicalDefenseBundle();
    await expect(
      setupTechnicalDefenseRun(
        `r8-privacy-${transactionDigest(_name)}`,
        binding,
        undefined,
        TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
        options,
      ).execute(),
    ).rejects.toThrow(/[Pp]rivacy/u);
  });

  it.each([
    [
      'stale case hash',
      (session: {casePayloadSha256: string}) => {
        session.casePayloadSha256 = 'f'.repeat(64);
      },
    ],
    [
      'producer actor collision',
      (session: {actorInstanceId: string}) => {
        session.actorInstanceId = 'actor.producer.r8-privacy-producer-actor-collision';
      },
    ],
    [
      'producer task collision',
      (session: {taskId: string}) => {
        session.taskId = 'task.producer.r8-privacy-producer-task-collision';
      },
    ],
    [
      'reviewer actor collision',
      (session: {actorInstanceId: string}) => {
        session.actorInstanceId = 'actor.observer.one';
      },
    ],
  ])('blocks %s privacy/provenance session', async (_name, mutatePrivacySession) => {
    const binding = loadTechnicalDefenseBundle();
    const id = `r8-privacy-${_name.replaceAll(' ', '-')}`;
    await expect(
      setupTechnicalDefenseRun(id, binding, undefined, TECHNICAL_DEFENSE_OUTPUT_REFS_V1, {
        mutatePrivacySession,
      }).execute(),
    ).rejects.toThrow(/(?:[Pp]rivacy|collision)/u);
  });

  it('blocks authority ports that return canonical verdicts for mutated sessions', async () => {
    const forge = (session: Record<string, unknown>, schemaVersion: string, extra = {}) => {
      const payload = {
        schemaVersion,
        status: 'VERIFIED',
        ...session,
        ...extra,
        evidenceSha256: 'd'.repeat(64),
        verifiedAt: '2026-08-29T17:30:00.000Z',
      };
      return {...payload, canonicalSha256: hashCanonical(payload)};
    };
    for (const target of ['privacy', 'review'] as const) {
      const binding = loadTechnicalDefenseBundle();
      const id = `r8-${target}-session-mutation`;
      const mutated = (session: Record<string, unknown>) => ({
        ...session,
        taskId: `task.producer.${id}`,
        actorInstanceId: `actor.producer.${id}`,
      });
      const options =
        target === 'privacy'
          ? {
              privacyAuthority: {
                verify: (session: Record<string, unknown>) =>
                  forge(
                    mutated(session),
                    'technical-defense-privacy-provenance-verdict-v1',
                  ) as ReturnType<TechnicalDefensePrivacyAuthorityPortV1['verify']>,
              },
            }
          : {
              reviewAuthority: {
                verify: (session: Record<string, unknown>, expectedRole: string) =>
                  forge(mutated(session), 'technical-defense-review-authority-verdict-v1', {
                    expectedRole,
                  }) as ReturnType<TechnicalDefenseReviewAuthorityPortV1['verify']>,
              },
            };
      const run = setupTechnicalDefenseRun(
        id,
        binding,
        undefined,
        TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
        options,
      );
      await expect(run.execute()).rejects.toThrow(/authority/u);
      expect(readdirSync(run.effect)).toEqual([]);
    }
  });

  it('rejects self-hashed activation not reproduced by the trusted loader', async () => {
    const binding = loadTechnicalDefenseBundle();
    const forgedProbe = {
      ...SandboxProbeSchema.parse(JSON.parse(binding.probeBytes.toString('utf8'))),
      runner_id: 'attacker.untrusted-runner',
      runner_sha256: digest('attacker runner'),
      evidence: [{ref: 'attacker.txt', sha256: digest('absent')}],
    };
    binding.probeBytes = Buffer.from(JSON.stringify(forgedProbe));
    binding.record = {
      ...binding.record,
      sandbox_probe_sha256: digest(binding.probeBytes),
      state: 'ACTIVE_LOCAL',
      reason_codes: [],
    };
    binding.receipt = createLocalActivationReceipt(binding.record);
    await expect(
      setupTechnicalDefenseRun('r8-forged-activation', binding).execute(),
    ).rejects.toThrow(/[Tt]rusted loader/u);
  });

  it('blocks materialized helper or aggregate runner byte drift', async () => {
    const helperBinding = loadTechnicalDefenseBundle();
    writeFileSync(
      resolve(helperBinding.record.source_root, 'technical-defense-render-v1.ts'),
      'export const compromised = true;\n',
    );
    await expect(
      setupTechnicalDefenseRun('r8-helper-drift', helperBinding).execute(),
    ).rejects.toThrow(/[Tt]rusted loader/u);

    const runnerBinding = loadTechnicalDefenseBundle();
    runnerBinding.runnerAuthority = {
      ...runnerBinding.runnerAuthority,
      runnerSha256: digest('drifted aggregate runner'),
    };
    await expect(
      setupTechnicalDefenseRun('r8-runner-drift', runnerBinding).execute(),
    ).rejects.toThrow(/runner authority drifted/u);
  });

  it('blocks network, sandbox-hash and exact write-set drift', async () => {
    const networkBinding = loadTechnicalDefenseBundle();
    const probe = JSON.parse(networkBinding.probeBytes.toString('utf8')) as Record<string, unknown>;
    probe.network = 'ALLOWED';
    networkBinding.probeBytes = Buffer.from(JSON.stringify(probe));
    networkBinding.record.sandbox_probe_sha256 = digest(networkBinding.probeBytes);
    networkBinding.receipt = createLocalActivationReceipt(networkBinding.record);
    await expect(
      setupTechnicalDefenseRun('r8-network', networkBinding).execute(),
    ).rejects.toThrow();

    const sandboxBinding = loadTechnicalDefenseBundle();
    sandboxBinding.probeBytes = Buffer.concat([sandboxBinding.probeBytes, Buffer.from(' ')]);
    await expect(
      setupTechnicalDefenseRun('r8-sandbox-drift', sandboxBinding).execute(),
    ).rejects.toThrow(/sandbox binding drifted/u);

    const writeSetBinding = loadTechnicalDefenseBundle();
    await expect(
      setupTechnicalDefenseRun(
        'r8-write-set-drift',
        writeSetBinding,
        {
          ...structuredClone(writeSetBinding.positive),
          producer_actor_instance_id: 'actor.producer.r8-write-set-drift',
        },
        TECHNICAL_DEFENSE_OUTPUT_REFS_V1.slice(1),
      ).execute(),
    ).rejects.toThrow(/WorkOrder differs/u);
  });
});
