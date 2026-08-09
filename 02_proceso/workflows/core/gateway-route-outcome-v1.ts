import {AssistanceEnvelopeV1Schema, type AssistanceEnvelopeV1} from '../../core/contracts/index.ts';

export interface GatewayRoutePlanV1 {
  routeId: 'R6' | 'R7';
  workflowPlan: string[];
  activeStep: string;
  skillBindings: AssistanceEnvelopeV1['skillBindings'];
  briefPreview: NonNullable<AssistanceEnvelopeV1['briefPreview']>;
  blockingGaps?: string[];
  recommendedNextAction: string;
  ghostOptions?: string[];
}

interface GatewayOutcomeContextV1 {
  requestHash: string;
  understoodOutcome: string;
  knownInputs: string[];
  sensitivity: AssistanceEnvelopeV1['sensitivity'];
  routeId: 'R6' | 'R7';
  reasonCode: string;
}

export function buildGatewayRouteOutcomeV1(
  plan: GatewayRoutePlanV1,
  context: GatewayOutcomeContextV1,
): AssistanceEnvelopeV1 {
  if (plan.routeId !== context.routeId)
    throw new Error('Route handler returned a mismatched route.');
  return AssistanceEnvelopeV1Schema.parse({
    schemaVersion: 'assistance-envelope-v1',
    requestHash: context.requestHash,
    interactionClass: 'ACTIONABLE',
    understoodOutcome: context.understoodOutcome,
    knownInputs: context.knownInputs,
    blockingGaps: plan.blockingGaps ?? [],
    sensitivity: context.sensitivity,
    routeCandidates: [{routeId: context.routeId, confidence: 1, reasonCodes: [context.reasonCode]}],
    selectedRoute: context.routeId,
    workflowPlan: plan.workflowPlan,
    activeStep: plan.activeStep,
    skillBindings: plan.skillBindings,
    briefPreview: plan.briefPreview,
    recommendedNextAction: plan.recommendedNextAction,
    ghostOptions: plan.ghostOptions ?? [],
    writePolicy: 'PREVIEW_ONLY',
    effects: ['READ_ONLY'],
    state: (plan.blockingGaps?.length ?? 0) > 0 ? 'BLOCKED' : 'READY_FOR_BRIEF',
  });
}

export function buildGatewayRouteFailureV1(context: GatewayOutcomeContextV1): AssistanceEnvelopeV1 {
  return AssistanceEnvelopeV1Schema.parse({
    schemaVersion: 'assistance-envelope-v1',
    requestHash: context.requestHash,
    interactionClass: 'ACTIONABLE',
    understoodOutcome: context.understoodOutcome,
    knownInputs: context.knownInputs,
    blockingGaps: ['La ruta existe, pero su handler no produjo un plan verificable.'],
    sensitivity: context.sensitivity,
    routeCandidates: [{routeId: context.routeId, confidence: 1, reasonCodes: [context.reasonCode]}],
    selectedRoute: context.routeId,
    workflowPlan: [],
    activeStep: null,
    skillBindings: [],
    briefPreview: null,
    recommendedNextAction: 'Revisar la configuración de la ruta.',
    ghostOptions: [],
    writePolicy: 'NONE',
    effects: [],
    state: 'BLOCKED',
  });
}
