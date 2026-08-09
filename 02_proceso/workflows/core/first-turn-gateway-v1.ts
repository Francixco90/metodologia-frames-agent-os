import {
  AssistanceEnvelopeV1Schema,
  hashExperienceValue,
  type AssistanceEnvelopeV1,
} from '../../core/contracts/index.ts';
import {
  CAREER_SIGNALS_V1,
  CONTENT_SIGNALS_V1,
  RESUME_SIGNALS_V1,
  classifyGovernedLegacyRouteV1,
  hasFirstTurnSignalV1,
  normalizeFirstTurnPromptV1,
} from './first-turn-signals-v1.ts';
import {buildUnsupportedLegacyRouteEnvelopeV1} from './legacy-route-block-v1.ts';
import {
  buildGatewayRouteFailureV1,
  buildGatewayRouteOutcomeV1,
  type GatewayRoutePlanV1,
} from './gateway-route-outcome-v1.ts';

export type {GatewayRoutePlanV1} from './gateway-route-outcome-v1.ts';

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
  explicitRoute?: 'R6' | 'R7';
  resumeCandidate?: GatewayResumeCandidateV1;
}

export type GatewayRouteHandlerV1 = (
  input: Readonly<FirstTurnGatewayInputV1> & {requestHash: string; routeId: 'R6' | 'R7'},
) => GatewayRoutePlanV1;

function baseEnvelope(
  input: FirstTurnGatewayInputV1,
  requestHash: string,
): Pick<AssistanceEnvelopeV1, 'requestHash' | 'knownInputs' | 'sensitivity'> {
  return {
    requestHash,
    knownInputs: input.knownInputs ?? [],
    sensitivity: input.sensitivity ?? 'UNKNOWN',
  };
}

export function runFirstTurnGatewayV1(
  input: FirstTurnGatewayInputV1,
  handlers: Readonly<Record<'R6' | 'R7', GatewayRouteHandlerV1>>,
): AssistanceEnvelopeV1 {
  const prompt = normalizeFirstTurnPromptV1(input.prompt);
  const requestHash = hashExperienceValue({prompt});
  const common = baseEnvelope(input, requestHash);
  const understoodOutcome =
    input.prompt.trim().slice(0, 280) || 'Solicitar asistencia sin objetivo definido.';

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|menu)[.!?\s]*$/u.test(prompt)) {
    return AssistanceEnvelopeV1Schema.parse({
      schemaVersion: 'assistance-envelope-v1',
      ...common,
      interactionClass: 'ASSIST_ONLY',
      understoodOutcome: 'Recibir orientación de Frames ContentOS.',
      blockingGaps: [],
      routeCandidates: [],
      selectedRoute: null,
      workflowPlan: [],
      activeStep: null,
      skillBindings: [],
      briefPreview: null,
      recommendedNextAction:
        'Elige Crear, Mejorar, Planear o Explorar; también puedes escribir lo que necesitas.',
      ghostOptions: ['Crear', 'Mejorar', 'Planear', 'Explorar'],
      writePolicy: 'NONE',
      effects: [],
      state: 'ASSISTING',
    });
  }

  if (input.resumeCandidate !== undefined && hasFirstTurnSignalV1(prompt, RESUME_SIGNALS_V1)) {
    const resume = input.resumeCandidate;
    return AssistanceEnvelopeV1Schema.parse({
      schemaVersion: 'assistance-envelope-v1',
      ...common,
      interactionClass: 'RESUME_CANDIDATE',
      understoodOutcome: resume.summary,
      blockingGaps: [],
      routeCandidates: [{routeId: 'R4', confidence: 1, reasonCodes: ['RESUME_MATCH']}],
      selectedRoute: 'R4',
      workflowPlan: [],
      activeStep: resume.activeStep,
      skillBindings: [],
      briefPreview: resume.briefPreview,
      recommendedNextAction: `Continuar desde ${resume.activeStep}.`,
      ghostOptions: ['Ver ruta', 'Cambiar dirección'],
      writePolicy: 'NONE',
      effects: [],
      state: 'RESUMABLE',
    });
  }

  const legacyRoute = classifyGovernedLegacyRouteV1(prompt, input.activeProjectId !== undefined);
  if (legacyRoute !== null) {
    return buildUnsupportedLegacyRouteEnvelopeV1({
      routeId: legacyRoute,
      requestHash,
      understoodOutcome,
      knownInputs: common.knownInputs,
      sensitivity: common.sensitivity,
    });
  }

  const contentMatch =
    input.explicitRoute === 'R6' ||
    (input.explicitRoute === undefined && hasFirstTurnSignalV1(prompt, CONTENT_SIGNALS_V1));
  const careerMatch =
    input.explicitRoute === 'R7' ||
    (input.explicitRoute === undefined && hasFirstTurnSignalV1(prompt, CAREER_SIGNALS_V1));
  if (contentMatch === careerMatch) {
    const candidates = contentMatch
      ? [
          {routeId: 'R6' as const, confidence: 0.5, reasonCodes: ['CONTENT_SIGNAL']},
          {routeId: 'R7' as const, confidence: 0.5, reasonCodes: ['CAREER_SIGNAL']},
        ]
      : [];
    return AssistanceEnvelopeV1Schema.parse({
      schemaVersion: 'assistance-envelope-v1',
      ...common,
      interactionClass: 'AMBIGUOUS',
      understoodOutcome,
      blockingGaps: ['Confirma si buscas crear contenido o gestionar una candidatura profesional.'],
      routeCandidates:
        candidates.length > 0
          ? candidates
          : [{routeId: 'R0', confidence: 1, reasonCodes: ['NO_ROUTE_SIGNAL']}],
      selectedRoute: candidates.length > 0 ? null : 'R0',
      workflowPlan: [],
      activeStep: null,
      skillBindings: [],
      briefPreview: null,
      recommendedNextAction: 'Describe el resultado que quieres obtener.',
      ghostOptions: ['Crear contenido', 'Carrera y empleo'],
      writePolicy: 'NONE',
      effects: [],
      state: 'BLOCKED',
    });
  }

  const routeId: 'R6' | 'R7' = contentMatch ? 'R6' : 'R7';
  const reasonCode = contentMatch ? 'CONTENT_SIGNAL' : 'CAREER_SIGNAL';
  const context = {...common, understoodOutcome, routeId, reasonCode};
  try {
    const result = handlers[routeId]({...input, requestHash, routeId});
    return buildGatewayRouteOutcomeV1(result, context);
  } catch {
    return buildGatewayRouteFailureV1(context);
  }
}
