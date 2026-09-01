import {describe, expect, it} from 'vitest';

import {
  AssistanceEnvelopeV1Schema,
  EXPERIENCE_ROUTE_IDS_V1,
  ExperienceReleaseCapsuleV1Schema,
  ExperienceViewV1Schema,
  FramesWorkOrderV1Schema,
  HospitalityPolicyV1Schema,
  SkillInvocationReceiptV1Schema,
  hashExperienceValue,
} from 'core/contracts/index.ts';

const digest = 'a'.repeat(64);
const evidence = {ref: 'evidence/check.json', sha256: digest};

const greeting = {
  schemaVersion: 'assistance-envelope-v1',
  requestHash: digest,
  interactionClass: 'ASSIST_ONLY',
  understoodOutcome: 'Conocer cómo puede ayudar Frames.',
  knownInputs: [],
  blockingGaps: [],
  sensitivity: 'PUBLIC',
  routeCandidates: [],
  selectedRoute: null,
  workflowPlan: [],
  activeStep: null,
  skillBindings: [],
  briefPreview: null,
  recommendedNextAction: 'Elige Crear, Mejorar, Planear o Explorar.',
  ghostOptions: ['Crear', 'Explorar'],
  writePolicy: 'NONE',
  effects: [],
  state: 'ASSISTING',
} as const;

const workOrder = {
  schemaVersion: 'frames-work-order-v1',
  workOrderId: 'WO.EXP.001',
  requestHash: digest,
  routeId: 'R6',
  workflowId: 'P03',
  stepId: 'P03.interpret',
  skillId: 'content-os-router',
  actorId: 'RT-04',
  readSet: ['02_proceso/governance/router.yml'],
  writeSet: [],
  inputs: [evidence],
  expectedOutputs: ['work/preview/brief.md'],
  tools: ['Read'],
  effectClass: 'READ_ONLY',
  budget: {targetFiles: 4, maxFiles: 8, targetTokens: 4_000, maxTokens: 8_000},
  acceptanceCriteria: ['La ruta y el siguiente gate son inequívocos.'],
  stopRule: 'Detener ante UNKNOWN.',
  canonicalSha256: digest,
} as const;

describe('Frames Experience OS contracts', () => {
  it('uses one exact route tuple across assistance and release contracts', () => {
    expect(EXPERIENCE_ROUTE_IDS_V1).toEqual([
      'R0',
      'R1',
      'R2',
      'R3',
      'R3-LOOSE',
      'R4',
      'R5',
      'R6',
      'R7',
      'R8',
      'R9',
      'R10',
    ]);
  });
  it('keeps assistance non-mutating and bounds questions and alternatives', () => {
    expect(AssistanceEnvelopeV1Schema.parse(greeting)).toEqual(greeting);
    expect(() =>
      AssistanceEnvelopeV1Schema.parse({...greeting, effects: ['LOCAL_REVERSIBLE']}),
    ).toThrow(/Only ACTIONABLE|forbids local effects/u);
    expect(() =>
      AssistanceEnvelopeV1Schema.parse({...greeting, blockingGaps: ['a', 'b', 'c', 'd']}),
    ).toThrow();
    expect(
      AssistanceEnvelopeV1Schema.parse({
        ...greeting,
        ghostOptions: ['Crear', 'Mejorar', 'Planear', 'Explorar'],
      }).ghostOptions,
    ).toHaveLength(4);
    expect(() =>
      AssistanceEnvelopeV1Schema.parse({
        ...greeting,
        interactionClass: 'AMBIGUOUS',
        ghostOptions: ['a', 'b', 'c'],
      }),
    ).toThrow(/at most two/u);
  });

  it('requires an explicit route for actionable requests', () => {
    expect(() =>
      AssistanceEnvelopeV1Schema.parse({
        ...greeting,
        interactionClass: 'ACTIONABLE',
        recommendedNextAction: 'Preparar el brief.',
      }),
    ).toThrow(/selected route/u);
  });

  it('allows only governed GenUI components and at most one plus two actions', () => {
    const view = {
      schemaVersion: 'experience-view-v1',
      envelopeHash: digest,
      components: [{componentId: 'welcome', kind: 'WelcomeCard', data: {identity: 'Frames'}}],
      primaryAction: {actionId: 'create', label: 'Crear', intent: 'Crear una pieza.'},
      secondaryActions: [
        {actionId: 'improve', label: 'Mejorar', intent: 'Mejorar una pieza.'},
        {actionId: 'explore', label: 'Explorar', intent: 'Explorar opciones.'},
      ],
      textFallback: 'Frames ContentOS · por MetodologIA. Crear, Mejorar o Explorar.',
    } as const;
    expect(ExperienceViewV1Schema.parse(view)).toEqual(view);
    expect(() =>
      ExperienceViewV1Schema.parse({
        ...view,
        components: [{componentId: 'remote', kind: 'RemoteWidget', data: {}}],
      }),
    ).toThrow();
    expect(() =>
      ExperienceViewV1Schema.parse({
        ...view,
        secondaryActions: [...view.secondaryActions, view.primaryAction],
      }),
    ).toThrow();
  });

  it('enforces hospitality identity, privacy boundary and external-effects denial', () => {
    expect(
      HospitalityPolicyV1Schema.parse({
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
        externalEffectsPolicy: 'FORBIDDEN',
      }),
    ).toMatchObject({externalEffectsPolicy: 'FORBIDDEN'});
  });

  it('rejects unsafe work orders and contradictory budgets', () => {
    expect(FramesWorkOrderV1Schema.parse(workOrder)).toEqual(workOrder);
    expect(() =>
      FramesWorkOrderV1Schema.parse({...workOrder, writeSet: ['work/output.md']}),
    ).toThrow(/empty write set/u);
    expect(() =>
      FramesWorkOrderV1Schema.parse({
        ...workOrder,
        budget: {...workOrder.budget, targetTokens: 9_000},
      }),
    ).toThrow(/hard maxima/u);
    expect(() =>
      FramesWorkOrderV1Schema.parse({...workOrder, readSet: ['../private/source.md']}),
    ).toThrow(/Path traversal/u);
  });

  it('does not let a declaration impersonate an executed skill', () => {
    const baseReceipt = {
      schemaVersion: 'skill-invocation-receipt-v1',
      invocationId: 'INV.EXP.001',
      workOrderId: workOrder.workOrderId,
      workOrderSha256: digest,
      skillId: workOrder.skillId,
      actorId: workOrder.actorId,
      status: 'PASS',
      outputs: [],
      evidence: [],
      publicSummary: 'Invocación completada.',
      metrics: {},
      startedAt: '2026-08-09T12:00:00.000Z',
      completedAt: '2026-08-09T12:00:01.000Z',
      canonicalSha256: digest,
    } as const;
    expect(() => SkillInvocationReceiptV1Schema.parse(baseReceipt)).toThrow(
      /material outputs and evidence/u,
    );
    expect(
      SkillInvocationReceiptV1Schema.parse({
        ...baseReceipt,
        outputs: [{ref: 'work/output.md', sha256: digest}],
        evidence: [evidence],
      }).status,
    ).toBe('PASS');
  });

  it('requires independent release decisions and excludes time from canonical hashes', () => {
    const capsule = {
      schemaVersion: 'experience-release-capsule-v1',
      releaseId: 'EXP.1.0.0',
      parentReleaseId: null,
      commitSha: 'b'.repeat(40),
      releaseClass: 'COMPATIBLE',
      status: 'APPROVED',
      artifacts: [evidence],
      compatibleRoutes: ['R6', 'R7'],
      compatibleHosts: ['TEXT_FALLBACK'],
      invalidatedObjects: [],
      gaps: [],
      migration: evidence,
      restore: evidence,
      acceptanceEvidence: [evidence],
      decisions: [
        {actorId: 'RT-09', role: 'RT-09', decision: 'PASS', evidence},
        {actorId: 'RT-11', role: 'RT-11', decision: 'PASS', evidence},
        {actorId: 'H01', role: 'H01', decision: 'APPROVE', evidence},
      ],
      canonicalSha256: digest,
    } as const;
    expect(ExperienceReleaseCapsuleV1Schema.parse(capsule).status).toBe('APPROVED');
    expect(
      ExperienceReleaseCapsuleV1Schema.parse({
        ...capsule,
        compatibleRoutes: [...EXPERIENCE_ROUTE_IDS_V1],
      }).compatibleRoutes,
    ).toEqual(EXPERIENCE_ROUTE_IDS_V1);
    expect(() =>
      ExperienceReleaseCapsuleV1Schema.parse({
        ...capsule,
        compatibleRoutes: ['R6', 'R6'],
      }),
    ).toThrow(/unique/u);
    expect(() =>
      ExperienceReleaseCapsuleV1Schema.parse({
        ...capsule,
        decisions: capsule.decisions.slice(0, 2),
      }),
    ).toThrow(/RT-09 PASS, RT-11 PASS and H01 APPROVE/u);
    expect(hashExperienceValue({value: 1, startedAt: '2026-01-01T00:00:00Z'})).toBe(
      hashExperienceValue({value: 1, startedAt: '2027-01-01T00:00:00Z'}),
    );
  });
});
