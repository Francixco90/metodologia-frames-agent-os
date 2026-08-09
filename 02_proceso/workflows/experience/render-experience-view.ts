import {
  AssistanceEnvelopeV1Schema,
  ExperienceViewV1Schema,
  type AssistanceEnvelopeV1,
  type ExperienceViewV1,
} from '../../core/contracts/experience-assistance-v1.ts';
import type {JsonValue} from '../../core/contracts/primitives.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';

const MENU = ['Crear', 'Mejorar', 'Planear', 'Explorar'];
export const EXPERIENCE_COMPONENTS_BY_STATE: Record<
  AssistanceEnvelopeV1['state'],
  readonly ExperienceViewV1['components'][number]['kind'][]
> = {
  ASSISTING: ['WelcomeCard', 'ConciseMenu'],
  ROUTED: ['IntentSummary', 'ProgressStepper', 'EvidenceGapCard', 'DecisionGate'],
  READY_FOR_BRIEF: [
    'IntentSummary',
    'BriefPreview',
    'ProgressStepper',
    'EvidenceGapCard',
    'DecisionGate',
  ],
  RESUMABLE: ['IntentSummary', 'BriefPreview', 'ProgressStepper', 'ResumeCard'],
  BLOCKED: ['IntentSummary', 'BriefPreview', 'ProgressStepper', 'EvidenceGapCard', 'RecoveryCard'],
};
const short = (value: string): string =>
  value.length <= 48 ? value : `${value.slice(0, 47).trimEnd()}…`;

export const renderExperienceTextFallback = (input: AssistanceEnvelopeV1): string => {
  const envelope = AssistanceEnvelopeV1Schema.parse(input);
  const lines = [
    'Frames ContentOS · por MetodologIA',
    `Entendí: ${envelope.understoodOutcome}`,
    `Estado: ${envelope.state}`,
  ];
  if (envelope.selectedRoute) lines.push(`Ruta: ${envelope.selectedRoute}`);
  if (envelope.workflowPlan.length > 0) lines.push(`Plan: ${envelope.workflowPlan.join(' → ')}`);
  if (envelope.briefPreview) lines.push(`Brief: ${envelope.briefPreview.summary}`);
  if (envelope.blockingGaps.length > 0) lines.push(`Falta: ${envelope.blockingGaps.join(' · ')}`);
  lines.push(`Recomendación: ${envelope.recommendedNextAction}`);
  const options = envelope.interactionClass === 'ASSIST_ONLY' ? MENU : envelope.ghostOptions;
  if (options.length > 0) lines.push(`Opciones: ${options.join(' · ')}`);
  return lines.join('\n');
};

export const renderExperienceView = (input: AssistanceEnvelopeV1): ExperienceViewV1 => {
  const envelope = AssistanceEnvelopeV1Schema.parse(input);
  const components: ExperienceViewV1['components'] = [];
  const add = (
    kind: ExperienceViewV1['components'][number]['kind'],
    data: Record<string, JsonValue>,
  ): void => {
    components.push({componentId: `view-${kind.toLowerCase()}`, kind, data});
  };
  if (envelope.interactionClass === 'ASSIST_ONLY') {
    add('WelcomeCard', {
      identity: 'Frames ContentOS · por MetodologIA',
      message: envelope.understoodOutcome,
      conciseMenu: MENU,
    });
    add('ConciseMenu', {options: MENU, freeTextAllowed: true});
  } else {
    add('IntentSummary', {
      understoodOutcome: envelope.understoodOutcome,
      route: envelope.selectedRoute,
      state: envelope.state,
    });
  }
  if (envelope.briefPreview) {
    add('BriefPreview', {
      briefKind: envelope.briefPreview.briefKind,
      canonicalRef: envelope.briefPreview.canonicalRef ?? null,
      summary: envelope.briefPreview.summary,
      materialized: envelope.briefPreview.materialized,
    });
  }
  if (envelope.workflowPlan.length > 0) {
    add('ProgressStepper', {
      steps: envelope.workflowPlan,
      active: envelope.activeStep,
    });
  }
  if (envelope.blockingGaps.length > 0) {
    add('EvidenceGapCard', {
      gaps: envelope.blockingGaps,
      resolution: envelope.recommendedNextAction,
    });
  }
  if (envelope.interactionClass === 'RESUME_CANDIDATE') {
    add('ResumeCard', {
      state: envelope.state,
      recommendedNextAction: envelope.recommendedNextAction,
    });
  }
  if (envelope.state === 'BLOCKED') {
    add('RecoveryCard', {
      preserved: envelope.briefPreview?.summary ?? envelope.understoodOutcome,
      failure: envelope.blockingGaps,
      recovery: envelope.recommendedNextAction,
    });
  } else if (envelope.interactionClass === 'ACTIONABLE') {
    add('DecisionGate', {
      decision: envelope.recommendedNextAction,
      consequence: 'Avanzar únicamente dentro del write policy declarado.',
    });
  }
  const secondary = envelope.ghostOptions.slice(0, 2).map((option, index) => ({
    actionId: `action-secondary-${index + 1}`,
    label: short(option),
    intent: option,
  }));
  const view = ExperienceViewV1Schema.parse({
    schemaVersion: 'experience-view-v1',
    envelopeHash: hashCanonical(envelope),
    components,
    primaryAction: {
      actionId: 'action-primary',
      label: short(envelope.recommendedNextAction),
      intent: envelope.recommendedNextAction,
    },
    secondaryActions: secondary,
    textFallback: renderExperienceTextFallback(envelope),
  });
  const brief = view.components.find(({kind}) => kind === 'BriefPreview');
  if (brief && Object.keys(brief.data).some((key) => key.toLowerCase().includes('ghost'))) {
    throw new Error('EXP-VIEW-GHOST-BRIEF: ghost actions cannot enter brief data');
  }
  const allowed = EXPERIENCE_COMPONENTS_BY_STATE[envelope.state];
  if (view.components.some(({kind}) => !allowed.includes(kind))) {
    throw new Error(`EXP-VIEW-STATE: component is not allowed in ${envelope.state}`);
  }
  return view;
};
