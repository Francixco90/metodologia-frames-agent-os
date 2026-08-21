import {describe, expect, it, vi} from 'vitest';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  FakeSkillAdapterV1,
  autoPrimeExperienceV1,
  compileExperienceWorkflowPlanV1,
  createFramesWorkOrderV1,
  runFirstTurnGatewayV1,
  type ExperienceWorkflowDefinitionV1,
  type GatewayRouteHandlerV1,
} from 'workflows/core/index.ts';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

const digest = 'a'.repeat(64);
const r6Handler = vi.fn<GatewayRouteHandlerV1>(({routeId}) => ({
  routeId,
  workflowPlan: ['P03.interpret', 'P05.design', 'P07.review', 'P08.edit'],
  activeStep: 'P03.interpret',
  skillBindings: [
    {stepId: 'P03.interpret', primarySkillId: 'content-os-router'},
    {stepId: 'P07.review', primarySkillId: 'content-os-creative', verifierSkillId: 'RT-09'},
  ],
  briefPreview: {
    briefKind: 'content-brief',
    summary: 'Brief de una pieza sintética.',
    materialized: false,
  },
  recommendedNextAction: 'Revisar y aprobar el brief.',
  ghostOptions: ['Ajustar el brief', 'Ver ruta'],
}));
const r7Handler = vi.fn<GatewayRouteHandlerV1>(({routeId}) => ({
  routeId,
  workflowPlan: ['C00.intake', 'C01.evidence', 'C02.position', 'C06.cv', 'C08.qa'],
  activeStep: 'C00.intake',
  skillBindings: [{stepId: 'C00.intake', primarySkillId: 'career-application-orchestrator'}],
  briefPreview: {
    briefKind: 'candidate-foundation-brief',
    summary: 'Brief profesional sintético.',
    materialized: false,
  },
  recommendedNextAction: 'Revisar y aprobar el brief profesional.',
}));

const definition: ExperienceWorkflowDefinitionV1 = {
  routeId: 'R6',
  workflowId: 'CONTENT.MINIMAL',
  actorId: 'RT-04',
  steps: [
    {
      stepId: 'P03.interpret',
      primarySkillId: 'content-os-router',
      templateRef: '02_proceso/workflows/multimedia/_assets/brief-document-template.md',
      sourceRefs: ['02_proceso/governance/router.yml'],
      expectedOutputs: ['work/preview/brief.md'],
      acceptanceCriteria: ['El brief representa el pedido.'],
      stopRule: 'Detener antes de producir.',
    },
    {
      stepId: 'P05.design',
      primarySkillId: 'content-os-creative',
      templateRef: '02_proceso/workflows/multimedia/p05-disenar-pieza/task-template.yaml',
      sourceRefs: [],
      expectedOutputs: ['work/preview/spec.md'],
      acceptanceCriteria: ['La especificación es verificable.'],
      stopRule: 'Detener ante UNKNOWN.',
    },
    {
      stepId: 'P07.review',
      primarySkillId: 'content-os-creative',
      verifierSkillId: 'RT-09',
      templateRef: '02_proceso/workflows/multimedia/p07-revisar/task-template.yaml',
      sourceRefs: [],
      expectedOutputs: ['work/preview/verdict.md'],
      acceptanceCriteria: ['El candidate fue revisado.'],
      stopRule: 'Detener ante REVISE.',
    },
    {
      stepId: 'P08.edit',
      primarySkillId: 'content-os-creative',
      templateRef: '02_proceso/workflows/multimedia/p08-editar/task-template.yaml',
      sourceRefs: [],
      expectedOutputs: ['work/preview/successor.md'],
      acceptanceCriteria: ['El successor preserva lineage.'],
      stopRule: 'Detener en RENDERED_DRAFT.',
    },
  ],
};

const selectedContentExperience = () => {
  const prompt = 'Ayúdame a generar una pieza';
  const requestHash = runFirstTurnGatewayV1({prompt}, {R6: r6Handler, R7: r7Handler}).requestHash;
  const decision = materializeDecisionFunnelFixture(requestHash);
  const envelope = runFirstTurnGatewayV1(
    {prompt, decisionFunnel: decision.funnel, decisionSelection: decision.selection},
    {R6: r6Handler, R7: r7Handler},
  );
  return {
    envelope,
    decision,
    decisionRefs: {
      funnel: {ref: 'evidence/decision-funnel.json', sha256: decision.funnel.canonicalSha256},
      selection: {
        ref: 'evidence/decision-selection.json',
        sha256: decision.selection.canonicalSha256,
      },
    },
  };
};

describe('Frames causal orchestration', () => {
  it('records real R6/R7 adapter invocation and leaves R0 uninvoked', async () => {
    const module = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {
      dispatchIntent: (input: Record<string, unknown>) => {
        route_id: string;
        adapter_invoked: boolean;
        next_gate: string | null;
        decision: string;
        coverage_gap: string | null;
        domain_intent: null | {schema_version: string; next_gate: string};
      };
    };
    const content = module.dispatchIntent({request: 'Ayúdame a generar una pieza'});
    const career = module.dispatchIntent({request: 'Créame un CV'});
    const ambiguous = module.dispatchIntent({request: 'Necesito ayuda con algo'});

    expect(content).toMatchObject({
      route_id: 'R6',
      adapter_invoked: true,
      decision: 'NEEDS_INPUT',
      next_gate: null,
      domain_intent: {schema_version: 'content-intent-v2', next_gate: 'MW_BRIEF_APPROVED'},
    });
    expect(career).toMatchObject({
      route_id: 'R7',
      adapter_invoked: true,
      decision: 'NEEDS_INPUT',
      next_gate: null,
      domain_intent: {schema_version: 'career-intent-v1', next_gate: 'CR_BRIEF_APPROVED'},
    });
    expect(ambiguous).toMatchObject({
      route_id: 'R0',
      adapter_invoked: false,
      decision: 'NEEDS_INPUT',
      domain_intent: null,
      next_gate: null,
    });
  });

  it('derives blocked metadata from the envelope instead of advertising a future gate', async () => {
    const {dispatchIntent} = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {dispatchIntent: (input: Record<string, unknown>) => Record<string, unknown>};
    const result = dispatchIntent({request: 'Ayúdame a generar una pieza'}) as {
      coverage_gap: string;
    };
    expect(result).toMatchObject({
      route_id: 'R6',
      decision: 'NEEDS_INPUT',
      next_gate: null,
      experience_envelope: {state: 'BLOCKED'},
    });
    expect(result.coverage_gap).not.toHaveLength(0);
    expect(dispatchIntent({request: '/ruta Ayúdame a generar una pieza'})).toMatchObject({
      next_gate: null,
      command_view: {nextGate: 'NEEDS_INPUT', readOnly: true, effects: []},
    });
  });

  it.each([
    ['Ayúdame a generar una pieza', 'R6', r6Handler, r7Handler],
    ['Créame un CV', 'R7', r7Handler, r6Handler],
  ] as const)(
    'dispatches %s only through its selected injected handler',
    (prompt, route, selected, other) => {
      selected.mockClear();
      other.mockClear();
      const envelope = runFirstTurnGatewayV1({prompt}, {R6: r6Handler, R7: r7Handler});
      expect(envelope).toMatchObject({interactionClass: 'ACTIONABLE', selectedRoute: route});
      expect(selected).toHaveBeenCalledOnce();
      expect(other).not.toHaveBeenCalled();
    },
  );

  it('compiles exact steps and primes only the active context', () => {
    const {envelope, decision} = selectedContentExperience();
    const plan = compileExperienceWorkflowPlanV1(envelope, [definition], decision);
    const prime = autoPrimeExperienceV1(plan);
    expect(plan.steps.map(({stepId}) => stepId)).toEqual(envelope.workflowPlan);
    expect(prime.loadedRefs).toEqual([
      definition.steps[0]!.templateRef,
      definition.steps[0]!.sourceRefs[0],
    ]);
    expect(prime.deferredStepIds).toEqual(['P05.design', 'P07.review', 'P08.edit']);
    expect(prime.contextBudget).toEqual({
      targetFiles: 8,
      maxFiles: 14,
      targetTokens: 8_000,
      maxTokens: 14_000,
    });
  });

  it('rejects a selection or decision reference that is not bound to the envelope', () => {
    const {envelope, decision, decisionRefs} = selectedContentExperience();
    expect(() =>
      compileExperienceWorkflowPlanV1(envelope, [definition], {
        ...decision,
        selection: {...decision.selection, canonicalSha256: '0'.repeat(64)},
      }),
    ).toThrow();
    const plan = compileExperienceWorkflowPlanV1(envelope, [definition], decision);
    expect(() =>
      createFramesWorkOrderV1(
        {
          ...plan,
          decisionFunnelSha256: '0'.repeat(64),
          decisionSelectionSha256: '1'.repeat(64),
        },
        envelope,
        {
          workOrderId: 'WO.EXP.PLAN-FORGE',
          actorId: 'RT-04',
          inputRefs: [],
          decision,
          definitions: [definition],
          decisionRefs: {
            funnel: {ref: 'evidence/forged-funnel.json', sha256: '0'.repeat(64)},
            selection: {ref: 'evidence/forged-selection.json', sha256: '1'.repeat(64)},
          },
        },
      ),
    ).toThrow(/EXPERIENCE-DECISION-PLAN-DRIFT/u);
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.DRIFT',
        actorId: 'RT-04',
        inputRefs: [],
        decision,
        definitions: [definition],
        decisionRefs: {
          ...decisionRefs,
          selection: {...decisionRefs.selection, sha256: '0'.repeat(64)},
        },
      }),
    ).toThrow(/EXPERIENCE-DECISION-REF-DRIFT/u);
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.ALIAS',
        actorId: 'RT-04',
        inputRefs: [{...decisionRefs.funnel}],
        decision,
        definitions: [definition],
        decisionRefs,
      }),
    ).toThrow(/EXPERIENCE-DECISION-REF-ALIAS/u);
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.WRITE-DRIFT',
        actorId: 'RT-04',
        inputRefs: [],
        decision,
        definitions: [definition],
        decisionRefs,
        effectClass: 'LOCAL_REVERSIBLE',
        writeSet: ['work/arbitrary/**'],
      }),
    ).toThrow(/EXPERIENCE-WRITE-SET-DRIFT/u);
  });

  it('requires a material invocation receipt before planned becomes executed', async () => {
    const {envelope, decision, decisionRefs} = selectedContentExperience();
    const plan = compileExperienceWorkflowPlanV1(envelope, [definition], decision);
    const workOrder = createFramesWorkOrderV1(plan, envelope, {
      workOrderId: 'WO.EXP.001',
      actorId: 'RT-04',
      inputRefs: [{ref: 'evidence/request.json', sha256: digest}],
      decisionRefs,
      decision,
      definitions: [definition],
    });
    const emptyPass = new FakeSkillAdapterV1({
      'content-os-router': () => ({
        status: 'PASS',
        outputs: [],
        evidence: [],
        publicSummary: 'Declarado, pero no materializado.',
      }),
    });
    const timestamps = {
      startedAt: '2026-08-09T12:00:00.000Z',
      completedAt: '2026-08-09T12:00:01.000Z',
    };
    expect(
      (await emptyPass.invoke({invocationId: 'INV.EXP.001', workOrder, ...timestamps})).status,
    ).toBe('UNKNOWN');

    const material = new FakeSkillAdapterV1({
      'content-os-router': () => ({
        status: 'PASS',
        outputs: [{ref: 'work/preview/brief.md', sha256: digest}],
        evidence: [{ref: 'evidence/brief-check.json', sha256: digest}],
        publicSummary: 'Brief materializado y verificado.',
      }),
    });
    const receipt = await material.invoke({
      invocationId: 'INV.EXP.002',
      workOrder,
      ...timestamps,
    });
    expect(receipt).toMatchObject({
      status: 'UNKNOWN',
      skillId: 'content-os-router',
      metrics: {materialExecutionAccredited: false, simulationOnly: true},
    });
    expect(receipt.outputs).toHaveLength(1);
    expect(receipt.evidence).toHaveLength(1);
  });

  it('fails closed when a selected route handler is unavailable or invalid', () => {
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Crear contenido'},
      {
        R6: () => {
          throw new Error('offline');
        },
        R7: r7Handler,
      },
    );
    expect(envelope).toMatchObject({
      interactionClass: 'ACTIONABLE',
      selectedRoute: 'R6',
      workflowPlan: [],
      writePolicy: 'NONE',
      effects: [],
      state: 'BLOCKED',
    });
    expect(envelope.blockingGaps).toHaveLength(1);
  });
});
