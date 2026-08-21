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
import {
  DecisionFunnelV1Schema,
  assertDecisionSelectionV1,
  buildDecisionFunnelV1,
  createDecisionSelectionV1,
  type DecisionFunnelV1,
} from 'core/contracts/experience-decision-v1.ts';
import {renderExperienceView} from 'workflows/experience/index.ts';

const digest = 'a'.repeat(64);
const decisionFor = (
  requestHash: string,
): {
  decisionFunnel: DecisionFunnelV1;
  decisionSelection: ReturnType<typeof createDecisionSelectionV1>;
} => {
  const decisionFunnel = buildDecisionFunnelV1({
    requestHash,
    riskClass: 'STANDARD',
    interactions: [1, 2].map((index) => ({
      interactionId: `interaction-${index}`,
      source: 'CURRENT' as const,
      summary: `Contexto verificado ${index}.`,
      evidenceSha256: String.fromCharCode(96 + index).repeat(64),
      verified: true as const,
    })),
    candidates: Array.from({length: 5}, (_, index) => ({
      candidateId: `candidate-${index + 1}`,
      rank: index + 1,
      title: `Candidato ${index + 1}`,
      summary: `Dirección ${index + 1}.`,
      evidenceRefs: [digest],
      scores: {
        evidence: 20,
        publishability: 18,
        audienceValue: 17,
        visualImpact: 12,
        reuse: 8,
        effort: 7,
      },
      total: 82,
    })),
    options: [
      {
        optionId: 'option-a',
        label: 'Dirección A',
        summary: 'Síntesis A.',
        primaryCandidateId: 'candidate-1',
        absorbedCandidateIds: ['candidate-1', 'candidate-3', 'candidate-4', 'candidate-5'],
      },
      {
        optionId: 'option-b',
        label: 'Dirección B',
        summary: 'Síntesis B.',
        primaryCandidateId: 'candidate-2',
        absorbedCandidateIds: ['candidate-2', 'candidate-3', 'candidate-4', 'candidate-5'],
      },
    ],
  });
  return {
    decisionFunnel,
    decisionSelection: createDecisionSelectionV1(decisionFunnel, {
      selectedOptionId: 'option-a',
      actorId: 'human-javier',
      selectedAt: '2026-08-21T12:00:00.000Z',
    }),
  };
};
const r6Handler = vi.fn<GatewayRouteHandlerV1>(({routeId, requestHash}) => ({
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
  ...decisionFor(requestHash),
}));
const r7Handler = vi.fn<GatewayRouteHandlerV1>(({routeId, requestHash}) => ({
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
  ...decisionFor(requestHash),
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

describe('Frames causal orchestration', () => {
  it('records real R6/R7 adapter invocation and leaves R0 uninvoked', async () => {
    const module = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {
      dispatchIntent: (input: Record<string, unknown>) => {
        route_id: string;
        adapter_invoked: boolean;
        next_gate: string;
        domain_intent: null | {schema_version: string; next_gate: string};
      };
    };
    const content = module.dispatchIntent({request: 'Ayúdame a generar una pieza'});
    const career = module.dispatchIntent({request: 'Créame un CV'});
    const ambiguous = module.dispatchIntent({request: 'Necesito ayuda con algo'});

    expect(content).toMatchObject({
      route_id: 'R6',
      adapter_invoked: true,
      next_gate: 'MW_BRIEF_APPROVED',
      domain_intent: {schema_version: 'content-intent-v2', next_gate: 'MW_BRIEF_APPROVED'},
    });
    expect(career).toMatchObject({
      route_id: 'R7',
      adapter_invoked: true,
      next_gate: 'CR_BRIEF_APPROVED',
      domain_intent: {schema_version: 'career-intent-v1', next_gate: 'CR_BRIEF_APPROVED'},
    });
    expect(ambiguous).toMatchObject({
      route_id: 'R0',
      adapter_invoked: false,
      domain_intent: null,
      next_gate: 'R0',
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

  it('renders exactly two synthesized options and no write effect before selection', () => {
    const optionsOnly: GatewayRouteHandlerV1 = (input) => {
      const plan = structuredClone(r6Handler(input));
      delete plan.decisionSelection;
      return plan;
    };
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Ayúdame a generar una pieza'},
      {R6: optionsOnly, R7: r7Handler},
    );
    const view = renderExperienceView(envelope);
    expect(envelope).toMatchObject({state: 'ROUTED', writePolicy: 'NONE', effects: []});
    expect(envelope.briefPreview).toBeNull();
    expect(envelope.ghostOptions).toEqual(['Dirección A: Síntesis A.', 'Dirección B: Síntesis B.']);
    expect(view.components.some(({kind}) => kind === 'DecisionGate')).toBe(true);
  });

  it('rejects forged selections, duplicate candidates and shallow privacy context', () => {
    const valid = decisionFor(digest);
    expect(DecisionFunnelV1Schema.parse(valid.decisionFunnel).candidates).toHaveLength(5);
    expect(valid.decisionFunnel.options).toHaveLength(2);
    expect(() =>
      assertDecisionSelectionV1(
        {...valid.decisionFunnel, canonicalSha256: 'f'.repeat(64)},
        valid.decisionSelection,
      ),
    ).toThrow(/HASH-DRIFT/u);
    expect(() =>
      DecisionFunnelV1Schema.parse({
        ...valid.decisionFunnel,
        candidates: valid.decisionFunnel.candidates.map((candidate, index) =>
          index === 1 ? {...candidate, candidateId: 'candidate-1'} : candidate,
        ),
      }),
    ).toThrow(/unique/u);
    expect(() => buildDecisionFunnelV1({...valid.decisionFunnel, riskClass: 'PRIVACY'})).toThrow(
      /three interactions/u,
    );
  });

  it('compiles exact steps and primes only the active context', () => {
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Ayúdame a generar una pieza'},
      {R6: r6Handler, R7: r7Handler},
    );
    const plan = compileExperienceWorkflowPlanV1(envelope, [definition]);
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

  it('requires a material invocation receipt before planned becomes executed', async () => {
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Ayúdame a generar una pieza'},
      {R6: r6Handler, R7: r7Handler},
    );
    const plan = compileExperienceWorkflowPlanV1(envelope, [definition]);
    const workOrder = createFramesWorkOrderV1(plan, envelope, {
      workOrderId: 'WO.EXP.001',
      actorId: 'RT-04',
      inputRefs: [{ref: 'evidence/request.json', sha256: digest}],
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
