import {AssistanceEnvelopeV1Schema, type AssistanceEnvelopeV1} from '../../core/contracts/index.ts';
import {
  assertDecisionFunnelV1,
  assertDecisionSelectionV1,
  type DecisionFunnelV1,
  type DecisionSelectionV1,
} from '../../core/contracts/experience-decision-v1.ts';

export interface GatewayRoutePlanV1 {
  routeId: 'R6' | 'R7' | 'R8' | 'R9';
  workflowPlan: string[];
  activeStep: string;
  skillBindings: AssistanceEnvelopeV1['skillBindings'];
  briefPreview: NonNullable<AssistanceEnvelopeV1['briefPreview']>;
  blockingGaps?: string[];
  recommendedNextAction: string;
  ghostOptions?: string[];
  decisionFunnel?: DecisionFunnelV1;
  decisionSelection?: DecisionSelectionV1;
}

export interface GatewayResumeCandidateV1 {
  routeId: AssistanceEnvelopeV1['selectedRoute'];
  activeStep: string;
  summary: string;
  briefPreview: NonNullable<AssistanceEnvelopeV1['briefPreview']>;
}

export interface FirstTurnGatewayInputV1 {
  prompt: string;
  sensitivity?: AssistanceEnvelopeV1['sensitivity'];
  knownInputs?: string[];
  activeProjectId?: string;
  explicitRoute?: 'R6' | 'R7' | 'R8' | 'R9';
  resumeCandidate?: GatewayResumeCandidateV1;
}

export type GatewayRouteHandlerV1 = (
  input: Readonly<FirstTurnGatewayInputV1> & {
    requestHash: string;
    routeId: 'R6' | 'R7' | 'R8' | 'R9';
  },
) => GatewayRoutePlanV1;

interface GatewayOutcomeContextV1 {
  requestHash: string;
  understoodOutcome: string;
  knownInputs: string[];
  sensitivity: AssistanceEnvelopeV1['sensitivity'];
  routeId: 'R6' | 'R7' | 'R8' | 'R9';
  reasonCode: string;
}

export function buildGatewayRouteOutcomeV1(
  plan: GatewayRoutePlanV1,
  context: GatewayOutcomeContextV1,
): AssistanceEnvelopeV1 {
  if (plan.routeId !== context.routeId)
    throw new Error('Route handler returned a mismatched route.');
  const gaps = [...(plan.blockingGaps ?? [])];
  let decisionState: 'MISSING' | 'OPTIONS_READY' | 'SELECTED' = 'MISSING';
  if (plan.decisionFunnel !== undefined) {
    const funnel = assertDecisionFunnelV1(plan.decisionFunnel);
    if (funnel.requestHash !== context.requestHash) throw new Error('DECISION-REQUEST-DRIFT');
    decisionState = 'OPTIONS_READY';
    if (plan.decisionSelection !== undefined) {
      assertDecisionSelectionV1(funnel, plan.decisionSelection);
      decisionState = 'SELECTED';
    }
  }
  const state =
    gaps.length > 0 ? 'BLOCKED' : decisionState === 'OPTIONS_READY' ? 'ROUTED' : 'READY_FOR_BRIEF';
  const options = plan.decisionFunnel?.options.map(({label, summary}) => `${label}: ${summary}`);
  return AssistanceEnvelopeV1Schema.parse({
    schemaVersion: 'assistance-envelope-v1',
    requestHash: context.requestHash,
    interactionClass: 'ACTIONABLE',
    understoodOutcome: context.understoodOutcome,
    knownInputs: context.knownInputs,
    blockingGaps: gaps,
    sensitivity: context.sensitivity,
    routeCandidates: [{routeId: context.routeId, confidence: 1, reasonCodes: [context.reasonCode]}],
    selectedRoute: context.routeId,
    workflowPlan: plan.workflowPlan,
    activeStep: plan.activeStep,
    skillBindings: plan.skillBindings,
    briefPreview: state === 'ROUTED' ? null : plan.briefPreview,
    recommendedNextAction:
      decisionState === 'OPTIONS_READY'
        ? 'Selecciona una de las dos direcciones.'
        : plan.recommendedNextAction,
    ghostOptions: options ?? plan.ghostOptions ?? [],
    decisionFunnel: plan.decisionFunnel ?? null,
    decisionSelection: plan.decisionSelection ?? null,
    writePolicy: decisionState === 'OPTIONS_READY' ? 'NONE' : 'PREVIEW_ONLY',
    effects: decisionState === 'OPTIONS_READY' ? [] : ['READ_ONLY'],
    state,
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
