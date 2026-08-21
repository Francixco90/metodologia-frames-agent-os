import {describe, expect, it, vi} from 'vitest';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  FakeSkillAdapterV1,
  autoPrimeExperienceV1,
  compileExperienceWorkflowPlanV1,
  createProductiveExperienceWorkflowDefinitionsV1,
  createFramesWorkOrderV1,
  runFirstTurnGatewayV1,
  type ExperienceWorkflowDefinitionV1,
  type GatewayRouteHandlerV1,
} from 'workflows/core/index.ts';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

const digest = 'a'.repeat(64);
const outputDirectoryRef = 'work/private/experience/test-case';
const r6Handler = vi.fn<GatewayRouteHandlerV1>(({routeId}) => ({
  routeId,
  workflowPlan: ['P03', 'P05', 'P07', 'P08'],
  activeStep: 'P03',
  skillBindings: [
    {stepId: 'P03', primarySkillId: 'content-os-creative'},
    {stepId: 'P07', primarySkillId: 'content-os-core', verifierSkillId: 'RT-09'},
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

const definition: ExperienceWorkflowDefinitionV1 = createProductiveExperienceWorkflowDefinitionsV1({
  briefMarkdownRef: 'work/preview/brief.md',
  briefHtmlRef: 'work/preview/brief.html',
  sourceRefs: ['02_proceso/governance/router.yml'],
})[0]!;

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

const productivePlan = (
  context: ReturnType<typeof selectedContentExperience>,
  inputRefs: Array<{ref: string; sha256: string}> = [],
) =>
  compileExperienceWorkflowPlanV1(
    context.envelope,
    createProductiveExperienceWorkflowDefinitionsV1({
      briefMarkdownRef: `${outputDirectoryRef}/brief.md`,
      briefHtmlRef: `${outputDirectoryRef}/brief.html`,
      sourceRefs: inputRefs.map(({ref}) => ref),
    }),
    context.decision,
  );

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
    expect(prime.loadedRefs).toEqual([plan.steps[0]!.templateRef, plan.steps[0]!.sourceRefs[0]]);
    expect(prime.deferredStepIds).toEqual(['P05', 'P07', 'P08']);
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
    const plan = productivePlan({envelope, decision, decisionRefs});
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
          inputRefs: [],
          decision,
          outputDirectoryRef,
          decisionRefs,
        },
      ),
    ).toThrow(/EXPERIENCE-DECISION-PLAN-DRIFT/u);
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.DRIFT',
        inputRefs: [],
        decision,
        outputDirectoryRef,
        decisionRefs: {
          ...decisionRefs,
          selection: {...decisionRefs.selection, sha256: '0'.repeat(64)},
        },
      }),
    ).toThrow(/EXPERIENCE-DECISION-REF-DRIFT/u);
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.ALIAS',
        inputRefs: [{...decisionRefs.funnel}],
        decision,
        outputDirectoryRef,
        decisionRefs,
      }),
    ).toThrow(/EXPERIENCE-DECISION-REF-ALIAS/u);
    const forgedInput: Parameters<typeof createFramesWorkOrderV1>[2] & Record<string, unknown> = {
      workOrderId: 'WO.EXP.WRITE-DRIFT',
      inputRefs: [],
      decision,
      outputDirectoryRef,
      decisionRefs,
      effectClass: 'LOCAL_REVERSIBLE',
      definitions: [definition],
      actorId: 'ATTACKER',
      writeSet: ['work/forged/**'],
    };
    expect(() => createFramesWorkOrderV1(plan, envelope, forgedInput)).toThrow(
      /EXPERIENCE-WORK-ORDER-INPUT-EXTRA/u,
    );
    expect(() =>
      createFramesWorkOrderV1(plan, envelope, {
        workOrderId: 'WO.EXP.OUTPUT-FORGE',
        inputRefs: [],
        decision,
        outputDirectoryRef: 'work/forged',
        decisionRefs,
      }),
    ).toThrow(/EXPERIENCE-OUTPUT-NAMESPACE-DRIFT/u);
  });

  it('requires a material invocation receipt before planned becomes executed', async () => {
    const {envelope, decision, decisionRefs} = selectedContentExperience();
    const sourceRefs = [{ref: 'evidence/request.json', sha256: digest}];
    const plan = productivePlan({envelope, decision, decisionRefs}, sourceRefs);
    const workOrder = createFramesWorkOrderV1(plan, envelope, {
      workOrderId: 'WO.EXP.001',
      inputRefs: sourceRefs,
      decisionRefs,
      decision,
      outputDirectoryRef,
    });
    expect(workOrder).toMatchObject({
      actorId: 'RT-04',
      workflowId: 'FRAMES.CONTENT.BRIEF',
      skillId: 'content-os-creative',
      writeSet: [],
    });
    const emptyPass = new FakeSkillAdapterV1({
      [workOrder.skillId]: () => ({
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
      [workOrder.skillId]: () => ({
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
      skillId: workOrder.skillId,
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
