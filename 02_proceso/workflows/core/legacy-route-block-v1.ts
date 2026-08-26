import {
  AssistanceEnvelopeV1Schema,
  type AssistanceEnvelopeV1,
  type ExperienceRouteIdV1,
} from '../../core/contracts/index.ts';

export function buildUnsupportedLegacyRouteEnvelopeV1(input: {
  routeId: Exclude<ExperienceRouteIdV1, 'R0' | 'R4' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10'>;
  requestHash: string;
  understoodOutcome: string;
  knownInputs: string[];
  sensitivity: AssistanceEnvelopeV1['sensitivity'];
}): AssistanceEnvelopeV1 {
  return AssistanceEnvelopeV1Schema.parse({
    schemaVersion: 'assistance-envelope-v1',
    requestHash: input.requestHash,
    interactionClass: 'ACTIONABLE',
    understoodOutcome: input.understoodOutcome,
    knownInputs: input.knownInputs,
    blockingGaps: [
      `coverage_gap: ${input.routeId} no tiene handler ejecutable en este incremento.`,
    ],
    sensitivity: input.sensitivity,
    routeCandidates: [
      {routeId: input.routeId, confidence: 1, reasonCodes: ['LEGACY_ROUTE_SIGNAL']},
    ],
    selectedRoute: input.routeId,
    workflowPlan: [],
    activeStep: null,
    skillBindings: [],
    briefPreview: null,
    recommendedNextAction: 'Usar el procedimiento gobernado existente para esta ruta.',
    ghostOptions: [],
    writePolicy: 'NONE',
    effects: [],
    state: 'BLOCKED',
  });
}
