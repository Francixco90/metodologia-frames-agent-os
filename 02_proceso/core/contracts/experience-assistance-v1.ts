import {z} from 'zod';

import {
  JsonObjectSchema,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
} from './primitives.ts';
export const InteractionClassV1Schema = z.enum([
  'ASSIST_ONLY',
  'ACTIONABLE',
  'AMBIGUOUS',
  'RESUME_CANDIDATE',
]);
export const ExperienceStateV1Schema = z.enum([
  'ASSISTING',
  'ROUTED',
  'READY_FOR_BRIEF',
  'RESUMABLE',
  'BLOCKED',
]);
export const ExperienceRouteIdV1Schema = z.enum([
  'R0',
  'R1',
  'R2',
  'R3',
  'R3-LOOSE',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
]);
export type ExperienceRouteIdV1 = z.infer<typeof ExperienceRouteIdV1Schema>;

const ShortTextSchema = z.string().trim().min(1).max(280);
const RouteCandidateV1Schema = z.strictObject({
  routeId: ExperienceRouteIdV1Schema,
  confidence: z.number().min(0).max(1),
  reasonCodes: z.array(PortableIdSchema).min(1).max(8),
});
const SkillBindingV1Schema = z.strictObject({
  stepId: PortableIdSchema,
  primarySkillId: PortableIdSchema,
  verifierSkillId: PortableIdSchema.optional(),
});
const BriefPreviewV1Schema = z.strictObject({
  briefKind: PortableIdSchema,
  canonicalRef: RelativePathSchema.optional(),
  summary: ShortTextSchema,
  materialized: z.boolean(),
});

export const AssistanceEnvelopeV1Schema = z
  .strictObject({
    schemaVersion: z.literal('assistance-envelope-v1'),
    requestHash: Sha256Schema,
    interactionClass: InteractionClassV1Schema,
    understoodOutcome: ShortTextSchema,
    knownInputs: z.array(ShortTextSchema).max(16),
    blockingGaps: z.array(ShortTextSchema).max(3),
    sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'UNKNOWN']),
    routeCandidates: z.array(RouteCandidateV1Schema).max(2),
    selectedRoute: ExperienceRouteIdV1Schema.nullable(),
    workflowPlan: z.array(PortableIdSchema).max(10),
    activeStep: PortableIdSchema.nullable(),
    skillBindings: z.array(SkillBindingV1Schema).max(10),
    briefPreview: BriefPreviewV1Schema.nullable(),
    decisionFunnelSha256: Sha256Schema.nullable().optional(),
    decisionSelectionSha256: Sha256Schema.nullable().optional(),
    recommendedNextAction: ShortTextSchema,
    ghostOptions: z.array(ShortTextSchema).max(4),
    writePolicy: z.enum(['NONE', 'PREVIEW_ONLY', 'LOCAL_REVERSIBLE']),
    effects: z.array(z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE'])).max(2),
    state: ExperienceStateV1Schema,
  })
  .superRefine((value, context) => {
    const issue = (message: string): void => context.addIssue({code: 'custom', message});
    if (value.interactionClass === 'ACTIONABLE' && value.selectedRoute === null) {
      issue('ACTIONABLE requires a selected route.');
    }
    if (value.interactionClass !== 'ASSIST_ONLY' && value.ghostOptions.length > 2) {
      issue('Contextual ghost menus allow at most two alternatives.');
    }
    if (value.interactionClass !== 'ACTIONABLE' && value.effects.length > 0) {
      issue('Only ACTIONABLE interactions may declare effects.');
    }
    if (value.writePolicy === 'NONE' && value.effects.includes('LOCAL_REVERSIBLE')) {
      issue('NONE write policy forbids local effects.');
    }
    if (value.decisionSelectionSha256 != null && value.decisionFunnelSha256 == null) {
      issue('Selection requires its decision funnel.');
    }
    if (
      value.interactionClass !== 'ACTIONABLE' &&
      (value.decisionFunnelSha256 != null || value.decisionSelectionSha256 != null)
    ) {
      issue('Only ACTIONABLE interactions bind decisions.');
    }
    if (value.state === 'ROUTED') {
      if (
        value.interactionClass !== 'ACTIONABLE' ||
        value.decisionFunnelSha256 == null ||
        value.decisionSelectionSha256 != null ||
        value.ghostOptions.length !== 2 ||
        value.blockingGaps.length !== 0 ||
        value.writePolicy !== 'NONE' ||
        value.effects.length !== 0
      ) {
        issue('ROUTED is an options-only decision state with zero effects.');
      }
    }
    if (
      value.selectedRoute !== null &&
      !value.routeCandidates.some(({routeId}) => routeId === value.selectedRoute)
    ) {
      issue('Selected route must resolve from candidates.');
    }
    if (value.state === 'READY_FOR_BRIEF') {
      const activeBinding = value.skillBindings.find(({stepId}) => stepId === value.activeStep);
      if (
        !['R6', 'R7', 'R8', 'R9'].includes(value.selectedRoute ?? '') ||
        value.activeStep === null ||
        !value.workflowPlan.includes(value.activeStep) ||
        activeBinding === undefined ||
        value.briefPreview === null ||
        value.decisionFunnelSha256 == null ||
        value.decisionSelectionSha256 == null ||
        value.writePolicy !== 'PREVIEW_ONLY' ||
        value.effects.length !== 1 ||
        value.effects[0] !== 'READ_ONLY' ||
        value.blockingGaps.length !== 0
      ) {
        issue('READY_FOR_BRIEF requires selected decision, executable plan and read-only preview.');
      }
    }
    if (value.state === 'BLOCKED' && (value.writePolicy !== 'NONE' || value.effects.length !== 0)) {
      issue('BLOCKED forbids write policy and effects.');
    }
  });
export type AssistanceEnvelopeV1 = z.infer<typeof AssistanceEnvelopeV1Schema>;
const ExperienceActionV1Schema = z.strictObject({
  actionId: PortableIdSchema,
  label: z.string().trim().min(1).max(48),
  intent: ShortTextSchema,
});
export const ExperienceComponentKindV1Schema = z.enum([
  'WelcomeCard',
  'IntentSummary',
  'ConciseMenu',
  'BriefPreview',
  'ProgressStepper',
  'EvidenceGapCard',
  'DecisionGate',
  'ArtifactGallery',
  'QualityStatus',
  'ResumeCard',
  'RecoveryCard',
]);
export const ExperienceViewV1Schema = z.strictObject({
  schemaVersion: z.literal('experience-view-v1'),
  envelopeHash: Sha256Schema,
  components: z
    .array(
      z.strictObject({
        componentId: PortableIdSchema,
        kind: ExperienceComponentKindV1Schema,
        data: JsonObjectSchema,
      }),
    )
    .min(1)
    .max(8),
  primaryAction: ExperienceActionV1Schema.nullable(),
  secondaryActions: z.array(ExperienceActionV1Schema).max(2),
  textFallback: z.string().trim().min(1).max(1_200),
});
export type ExperienceViewV1 = z.infer<typeof ExperienceViewV1Schema>;

export const HospitalityPolicyV1Schema = z.strictObject({
  schemaVersion: z.literal('hospitality-policy-v1'),
  identity: z.literal('Frames ContentOS · por MetodologIA'),
  maxBlockingQuestions: z.number().int().min(0).max(3),
  maxSecondaryActions: z.number().int().min(0).max(2),
  principles: z
    .array(
      z.enum([
        'RECOGNITION',
        'ANTICIPATION',
        'EFFORT_CARE',
        'HUMAN_TRANSITION',
        'RECOVERY',
        'USER_CONTROL',
      ]),
    )
    .length(6),
  privateContextPolicy: z.literal('EXPLICIT_SESSION_BINDING_ONLY'),
  externalEffectsPolicy: z.literal('FORBIDDEN'),
});
export type HospitalityPolicyV1 = z.infer<typeof HospitalityPolicyV1Schema>;
