import {describe, expect, it} from 'vitest';

import {hashExperienceValue} from 'core/contracts/index.ts';
import {runFirstTurnGatewayV1, type GatewayRouteHandlerV1} from 'workflows/core/index.ts';
import {renderExperienceTextFallback, renderExperienceView} from 'workflows/experience/index.ts';

const unused: GatewayRouteHandlerV1 = () => {
  throw new Error('handler must not run');
};
const content: GatewayRouteHandlerV1 = ({routeId}) => ({
  routeId,
  workflowPlan: ['P03.interpret', 'P05.design'],
  activeStep: 'P03.interpret',
  skillBindings: [{stepId: 'P03.interpret', primarySkillId: 'content-os-router'}],
  briefPreview: {
    briefKind: 'content-brief',
    summary: 'Pieza educativa para equipos.',
    materialized: false,
  },
  recommendedNextAction: 'Aprobar el brief.',
  ghostOptions: ['Ajustar', 'Ver ruta'],
});

describe('AssistanceEnvelope to governed ExperienceView', () => {
  it('preserves the complete greeting menu in GenUI and textual fallback', () => {
    const envelope = runFirstTurnGatewayV1({prompt: '¡Hola!'}, {R6: unused, R7: unused});
    const view = renderExperienceView(envelope);
    expect(view.envelopeHash).toBe(hashExperienceValue(envelope));
    expect(view.components.map(({kind}) => kind)).toEqual(['WelcomeCard', 'ConciseMenu']);
    expect(view.components[1]?.data).toMatchObject({
      options: ['Crear', 'Mejorar', 'Planear', 'Explorar'],
      freeTextAllowed: true,
    });
    for (const value of [
      'Frames ContentOS · por MetodologIA',
      envelope.understoodOutcome,
      envelope.state,
      envelope.recommendedNextAction,
      'Crear · Mejorar · Planear · Explorar',
    ]) {
      expect(view.textFallback).toContain(value);
    }
    expect(view.primaryAction).not.toBeNull();
    expect(view.secondaryActions).toHaveLength(2);
  });

  it('keeps actionable route, plan, brief, recommendation and CTAs equivalent', () => {
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Ayúdame a generar una pieza'},
      {R6: content, R7: unused},
    );
    const view = renderExperienceView(envelope);
    expect(view.components.map(({kind}) => kind)).toEqual([
      'IntentSummary',
      'BriefPreview',
      'ProgressStepper',
      'DecisionGate',
    ]);
    expect(view.primaryAction?.intent).toBe(envelope.recommendedNextAction);
    expect(view.secondaryActions.map(({intent}) => intent)).toEqual(envelope.ghostOptions);
    for (const value of [
      envelope.understoodOutcome,
      envelope.state,
      envelope.selectedRoute!,
      envelope.workflowPlan.join(' → '),
      envelope.briefPreview!.summary,
      envelope.recommendedNextAction,
      envelope.ghostOptions.join(' · '),
    ]) {
      expect(view.textFallback).toContain(value);
    }
    const brief = view.components.find(({kind}) => kind === 'BriefPreview');
    expect(
      Object.keys(brief?.data ?? {}).every((key) => !key.toLowerCase().includes('ghost')),
    ).toBe(true);
    expect(view.textFallback).toBe(renderExperienceTextFallback(envelope));
  });

  it('renders ambiguity as an evidence gap plus recovery, without hidden execution', () => {
    const envelope = runFirstTurnGatewayV1(
      {prompt: 'Necesito ayuda con algo'},
      {R6: unused, R7: unused},
    );
    const view = renderExperienceView(envelope);
    expect(view.components.map(({kind}) => kind)).toEqual([
      'IntentSummary',
      'EvidenceGapCard',
      'RecoveryCard',
    ]);
    expect(envelope.effects).toEqual([]);
    expect(view.primaryAction?.intent).toBe(envelope.recommendedNextAction);
    expect(view.secondaryActions).toHaveLength(2);
    expect(view.textFallback).toContain(envelope.blockingGaps[0]);
  });
});
