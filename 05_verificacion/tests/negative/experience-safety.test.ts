import {describe, expect, it, vi} from 'vitest';

import {
  AssistanceEnvelopeV1Schema,
  FramesWorkOrderV1Schema,
  HospitalityPolicyV1Schema,
  hashExperienceValue,
} from 'core/contracts/index.ts';
import {FakeSkillAdapterV1, runFirstTurnGatewayV1} from 'workflows/core/index.ts';

const digest = 'a'.repeat(64);
const workOrderDraft = {
  schemaVersion: 'frames-work-order-v1',
  workOrderId: 'WO.EXP.SAFETY',
  requestHash: digest,
  routeId: 'R6',
  workflowId: 'CONTENT.MINIMAL',
  stepId: 'P03.interpret',
  skillId: 'content-os-router',
  actorId: 'RT-04',
  readSet: ['02_proceso/governance/router.yml'],
  writeSet: [],
  inputs: [{ref: 'evidence/request.json', sha256: digest}],
  expectedOutputs: ['work/preview/brief.md'],
  tools: [],
  effectClass: 'READ_ONLY',
  budget: {targetFiles: 8, maxFiles: 14, targetTokens: 8_000, maxTokens: 14_000},
  acceptanceCriteria: ['Producir un brief verificable.'],
  stopRule: 'Detener ante UNKNOWN.',
} as const;
const workOrder = FramesWorkOrderV1Schema.parse({
  ...workOrderDraft,
  canonicalSha256: hashExperienceValue(workOrderDraft),
});
const timestamps = {
  startedAt: '2026-08-09T12:00:00.000Z',
  completedAt: '2026-08-09T12:00:01.000Z',
};

describe('Frames Experience adversarial fail-closed behavior', () => {
  it('blocks a stale or tampered work order before invoking its skill', async () => {
    const handler = vi.fn(() => ({
      status: 'PASS' as const,
      outputs: [{ref: 'work/preview/brief.md', sha256: digest}],
      evidence: [{ref: 'evidence/check.json', sha256: digest}],
      publicSummary: 'No debe ejecutarse.',
    }));
    const adapter = new FakeSkillAdapterV1({'content-os-router': handler});
    const receipt = await adapter.invoke({
      invocationId: 'INV.EXP.TAMPER',
      workOrder: {...workOrder, readSet: ['02_proceso/governance/tool-policy.yml']},
      ...timestamps,
    });
    expect(receipt).toMatchObject({
      status: 'BLOCKED',
      metrics: {handlerInvoked: false},
      publicSummary: 'Work order hash mismatch.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('blocks an unregistered skill and degrades handler crashes to UNKNOWN', async () => {
    const unavailable = new FakeSkillAdapterV1({});
    expect(
      (await unavailable.invoke({invocationId: 'INV.EXP.MISSING', workOrder, ...timestamps}))
        .status,
    ).toBe('BLOCKED');

    const failing = new FakeSkillAdapterV1({
      'content-os-router': () => {
        throw new Error('synthetic crash');
      },
    });
    expect(
      (await failing.invoke({invocationId: 'INV.EXP.CRASH', workOrder, ...timestamps})).status,
    ).toBe('UNKNOWN');
  });

  it('rejects external-effect escalation in envelopes and hospitality policy', () => {
    const envelope = {
      schemaVersion: 'assistance-envelope-v1',
      requestHash: digest,
      interactionClass: 'ACTIONABLE',
      understoodOutcome: 'Publicar una pieza.',
      knownInputs: [],
      blockingGaps: [],
      sensitivity: 'PUBLIC',
      routeCandidates: [{routeId: 'R6', confidence: 1, reasonCodes: ['CONTENT_SIGNAL']}],
      selectedRoute: 'R6',
      workflowPlan: ['P09.publish'],
      activeStep: 'P09.publish',
      skillBindings: [{stepId: 'P09.publish', primarySkillId: 'content-os-router'}],
      briefPreview: null,
      recommendedNextAction: 'Solicitar autorización humana.',
      ghostOptions: [],
      writePolicy: 'LOCAL_REVERSIBLE',
      effects: ['EXTERNAL_IRREVERSIBLE'],
      state: 'READY_FOR_BRIEF',
    };
    expect(AssistanceEnvelopeV1Schema.safeParse(envelope).success).toBe(false);
    expect(
      HospitalityPolicyV1Schema.safeParse({
        schemaVersion: 'hospitality-policy-v1',
        identity: 'Frames ContentOS · por MetodologIA',
        maxBlockingQuestions: 3,
        maxSecondaryActions: 2,
        principles: [
          'RECOGNITION',
          'ANTICIPATION',
          'EFFORT_CARE',
          'HUMAN_TRANSITION',
          'RECOVERY',
          'USER_CONTROL',
        ],
        privateContextPolicy: 'EXPLICIT_SESSION_BINDING_ONLY',
        externalEffectsPolicy: 'ALLOWED',
      }).success,
    ).toBe(false);
  });

  it('does not route governed R1-R5 language through R6 or R7 handlers', () => {
    const handler = vi.fn(() => {
      throw new Error('must not run');
    });
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'crear proyecto nuevo'},
      {R6: handler, R7: handler},
    );
    expect(envelope).toMatchObject({selectedRoute: 'R1', state: 'BLOCKED', effects: []});
    expect(handler).not.toHaveBeenCalled();
    const routed = runFirstTurnGatewayV1(
      {prompt: 'crear proyecto nuevo'},
      {
        R6: handler,
        R7: handler,
        R1: () => ({
          routeId: 'R1',
          workflowPlan: ['PJ00-intake'],
          activeStep: 'PJ00-intake',
          skillBindings: [{stepId: 'PJ00-intake', primarySkillId: 'frames-harness-maintainer'}],
          briefPreview: {briefKind: 'maintenance-brief', summary: 'Brief R1.', materialized: false},
          blockingGaps: ['¿Qué identificador tendrá el proyecto?'],
          recommendedNextAction: 'Responder la pregunta.',
        }),
      },
    );
    expect(routed).toMatchObject({selectedRoute: 'R1', state: 'BLOCKED', writePolicy: 'NONE'});
    expect(handler).not.toHaveBeenCalled();
  });
});
