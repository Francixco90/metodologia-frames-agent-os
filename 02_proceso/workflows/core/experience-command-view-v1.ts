import {
  ExperienceCommandViewV1Schema,
  hashExperienceValue,
  type AssistanceEnvelopeV1,
  type ExperienceCommandViewV1,
} from '../../core/contracts/index.ts';

export const renderExperienceMenuV1 = (): ExperienceCommandViewV1 =>
  ExperienceCommandViewV1Schema.parse({
    schemaVersion: 'experience-command-view-v1',
    command: 'MENU',
    identity: 'Frames ContentOS · por MetodologIA',
    title: '¿Qué quieres lograr?',
    primaryAction: 'Escribe tu objetivo o elige una entrada.',
    options: ['Crear', 'Mejorar', 'Planear', 'Explorar'],
    selectedRoute: null,
    workflowPlan: [],
    activeStep: null,
    nextGate: 'R0',
    envelopeHash: null,
    readOnly: true,
    effects: [],
  });

export const renderExperienceRouteV1 = (
  envelope: AssistanceEnvelopeV1,
  nextGate?: string,
): ExperienceCommandViewV1 =>
  ExperienceCommandViewV1Schema.parse({
    schemaVersion: 'experience-command-view-v1',
    command: 'ROUTE',
    identity: 'Frames ContentOS · por MetodologIA',
    title:
      envelope.selectedRoute === null ? 'Ruta aún no resuelta' : `Ruta ${envelope.selectedRoute}`,
    primaryAction: envelope.recommendedNextAction,
    options: envelope.ghostOptions,
    selectedRoute: envelope.selectedRoute,
    workflowPlan: envelope.workflowPlan,
    activeStep: envelope.activeStep,
    nextGate:
      nextGate ??
      (envelope.state === 'READY_FOR_BRIEF'
        ? 'EXP_BRIEF_APPROVED'
        : (envelope.selectedRoute ?? 'R0')),
    envelopeHash: hashExperienceValue(envelope),
    readOnly: true,
    effects: [],
  });
