import {
  AssistanceEnvelopeV1Schema,
  assertDecisionFunnelV1,
  assertDecisionSelectionV1,
  type AssistanceEnvelopeV1,
} from '../../core/contracts/index.ts';

export interface GatewayRoutePlanV1 {
  routeId: 'R6' | 'R7' | 'R8' | 'R9';
  workflowPlan: string[];
  activeStep: string;
  skillBindings: AssistanceEnvelopeV1['skillBindings'];
  briefPreview: NonNullable<AssistanceEnvelopeV1['briefPreview']>;
  blockingGaps?: string[];
  recommendedNextAction: string;
  ghostOptions?: string[];
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
  decisionFunnel?: unknown;
  decisionSelection?: unknown;
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
  decision: Pick<FirstTurnGatewayInputV1, 'decisionFunnel' | 'decisionSelection'>,
): AssistanceEnvelopeV1 {
  if (plan.routeId !== context.routeId)
    throw new Error('Route handler returned a mismatched route.');
  const hasBlockingGaps = (plan.blockingGaps?.length ?? 0) > 0;
  let funnelSha256: string | null = null;
  let selectionSha256: string | null = null;
  let optionLabels = plan.ghostOptions ?? [];
  if (!hasBlockingGaps && decision.decisionFunnel !== undefined) {
    const funnel = assertDecisionFunnelV1(decision.decisionFunnel);
    if (funnel.requestHash !== context.requestHash) throw new Error('DECISION-REQUEST-DRIFT');
    funnelSha256 = funnel.canonicalSha256;
    optionLabels = funnel.options.map(({label}) => label);
    if (decision.decisionSelection !== undefined) {
      selectionSha256 = assertDecisionSelectionV1(funnel, decision.decisionSelection).selection
        .canonicalSha256;
    }
  } else if (!hasBlockingGaps && decision.decisionSelection !== undefined) {
    throw new Error('DECISION-SELECTION-WITHOUT-FUNNEL');
  }
  const missingDecision = !hasBlockingGaps && funnelSha256 === null;
  const awaitingSelection = !hasBlockingGaps && funnelSha256 !== null && selectionSha256 === null;
  return AssistanceEnvelopeV1Schema.parse({
    schemaVersion: 'assistance-envelope-v1',
    requestHash: context.requestHash,
    interactionClass: 'ACTIONABLE',
    understoodOutcome: context.understoodOutcome,
    knownInputs: context.knownInputs,
    blockingGaps: missingDecision
      ? ['Completar decision-funnel-v1 antes de preparar o escribir el brief.']
      : (plan.blockingGaps ?? []),
    sensitivity: context.sensitivity,
    routeCandidates: [{routeId: context.routeId, confidence: 1, reasonCodes: [context.reasonCode]}],
    selectedRoute: context.routeId,
    workflowPlan: plan.workflowPlan,
    activeStep: plan.activeStep,
    skillBindings: plan.skillBindings,
    briefPreview: plan.briefPreview,
    decisionFunnelSha256: funnelSha256,
    decisionSelectionSha256: selectionSha256,
    recommendedNextAction: awaitingSelection
      ? 'Elige una de las dos direcciones antes de preparar el brief.'
      : plan.recommendedNextAction,
    ghostOptions: optionLabels,
    writePolicy: selectionSha256 === null ? 'NONE' : 'PREVIEW_ONLY',
    effects: selectionSha256 === null ? [] : ['READ_ONLY'],
    state:
      hasBlockingGaps || missingDecision
        ? 'BLOCKED'
        : awaitingSelection
          ? 'ROUTED'
          : 'READY_FOR_BRIEF',
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
    decisionFunnelSha256: null,
    decisionSelectionSha256: null,
    recommendedNextAction: 'Revisar la configuración de la ruta.',
    ghostOptions: [],
    writePolicy: 'NONE',
    effects: [],
    state: 'BLOCKED',
  });
}
