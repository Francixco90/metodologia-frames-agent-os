import {z} from 'zod';

import {RelativePathSchema, Sha256Schema} from './primitives.ts';

const IdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/u);
const TextSchema = z.string().trim().min(1).max(2_000);
const SourceIdSchema = z.string().regex(/^NLS-[A-Z0-9-]+$/u);

export const NotebookProviderSchema = z.enum(['notebooklm', 'gemini-notebook']);
export const NotebookOperationSchema = z.enum([
  'audit',
  'create',
  'configure',
  'curate',
  'ground',
  'studio',
  'verify',
  'sync',
  'share',
  'evolve',
  'archive',
  'delete',
]);
export const NotebookSensitivitySchema = z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'RESTRICTED']);
export const NotebookStudioTypeSchema = z.enum([
  'audio',
  'video',
  'infographic',
  'slide-deck',
  'report',
  'flashcards',
  'quiz',
  'data-table',
  'mind-map',
]);
export const NotebookGateSchema = z.enum([
  'NLM_BRAND_PROFILE_APPROVED',
  'NLM_PLAN_APPROVED',
  'NLM_SYNC_APPROVED',
  'NLM_STUDIO_GENERATION_APPROVED',
  'NLM_SHARE_AUTHORIZED',
  'NLM_DESTRUCTIVE_AUTHORIZED',
]);

export const NotebookIntentV1Schema = z.strictObject({
  schemaVersion: z.literal('notebook-intent-v1'),
  purpose: TextSchema,
  domain: IdSchema,
  audience: z.array(TextSchema).min(1).max(8),
  operation: NotebookOperationSchema,
  deliverable: TextSchema,
  sensitivity: NotebookSensitivitySchema,
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/u),
  effects: z.array(z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE', 'EXTERNAL_MUTATION'])).min(1),
});

export const NotebookSystemPromptV1Schema = z.strictObject({
  schemaVersion: z.literal('notebook-system-prompt-v1'),
  profileId: IdSchema,
  version: z.string().regex(/^v\d+\.\d+$/u),
  owner: TextSchema,
  identity: TextSchema,
  purpose: TextSchema,
  audiences: z.array(TextSchema).min(1),
  capabilities: z.array(TextSchema).min(1),
  limits: z.array(TextSchema).min(1),
  sourceHierarchy: z.array(TextSchema).min(1),
  evidenceTaxonomy: z.array(TextSchema).min(1),
  privacyAndRights: z.array(TextSchema).min(1),
  studioContract: z.array(TextSchema).min(1),
  responseContract: z.array(TextSchema).min(1),
  promptInjectionDefense: z.literal(true),
  inventionForbidden: z.literal(true),
  compiledPromptSource: RelativePathSchema.optional(),
  compiledPromptSha256: Sha256Schema.optional(),
});

export const NotebookProfileV1Schema = z.strictObject({
  schemaVersion: z.literal('notebook-profile-v1'),
  profileId: IdSchema,
  displayName: TextSchema,
  provider: NotebookProviderSchema,
  identity: TextSchema,
  systemPrompt: NotebookSystemPromptV1Schema,
  taxonomy: z
    .array(
      z.enum([
        '00 Control',
        '10 Canon',
        '20 Evidence',
        '30 Templates',
        '40 Golden References',
        '50 Assets',
        '60 Operations',
        '90 Archive',
      ]),
    )
    .length(8),
  sourceBudget: z.strictObject({
    controls: z.number().int().nonnegative().max(15),
    assetsAndExamples: z.number().int().nonnegative().max(15),
    working: z.number().int().nonnegative().max(20),
  }),
  roles: z
    .array(
      z.enum([
        'Notebook Conductor',
        'Profile Architect',
        'Source Curator',
        'Asset Steward',
        'Studio Director',
        'Grounding Verifier',
        'Notebook Guardian',
      ]),
    )
    .length(7),
  policies: z.array(TextSchema).min(1),
  gates: z.array(NotebookGateSchema).min(1),
});

export const NotebookSourceManifestV1Schema = z.strictObject({
  schemaVersion: z.literal('notebook-source-manifest-v1'),
  sourceId: SourceIdSchema,
  name: z.string().regex(/^\d{2}-[a-z0-9-]+--[a-z0-9-]+--v\d+\.\d+$/u),
  title: TextSchema,
  tags: z.array(TextSchema).min(1),
  scope: TextSchema,
  audiences: z.array(TextSchema).min(1),
  confidentiality: NotebookSensitivitySchema,
  sourceType: IdSchema,
  authority: z.enum([
    'CONTROL',
    'CANON',
    'EVIDENCE',
    'TEMPLATE',
    'REFERENCE',
    'ASSET',
    'OPERATIONAL',
  ]),
  owner: TextSchema,
  version: z.string().regex(/^v\d+\.\d+$/u),
  validFrom: z.string().date(),
  validUntil: z.string().date().nullable(),
  notebookRole: TextSchema,
  provenance: TextSchema,
  contentSha256: Sha256Schema,
  portableIdentityDigest: Sha256Schema,
  rights: z.enum(['APPROVED', 'REVIEW', 'BLOCKED']),
  replaces: SourceIdSchema.nullable(),
  status: z.enum(['ACTIVE', 'REVIEW', 'SUPERSEDED', 'ARCHIVED', 'BLOCKED']),
  sourceRef: RelativePathSchema.optional(),
});

export const NotebookPlanOperationV1Schema = z.strictObject({
  operationId: IdSchema,
  stage: z.enum(['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09']),
  action: NotebookOperationSchema,
  sourceIds: z.array(SourceIdSchema),
  requiredGate: NotebookGateSchema.nullable(),
  effect: z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE', 'EXTERNAL_MUTATION', 'DESTRUCTIVE']),
});

export const NotebookPlanV1Schema = z
  .strictObject({
    schemaVersion: z.literal('notebook-plan-v1'),
    planId: IdSchema,
    profileId: IdSchema,
    provider: NotebookProviderSchema,
    targetNotebookDigest: Sha256Schema.nullable(),
    operations: z.array(NotebookPlanOperationV1Schema).min(1),
    sourceIds: z.array(SourceIdSchema).max(50),
    permissions: z.array(TextSchema),
    stopRules: z.array(TextSchema).min(1),
    rollback: z.array(TextSchema).min(1),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.operations.map(({operationId}) => operationId)).size !== value.operations.length
    ) {
      context.addIssue({code: 'custom', message: 'operationId values must be unique.'});
    }
    if (new Set(value.sourceIds).size !== value.sourceIds.length) {
      context.addIssue({code: 'custom', message: 'sourceIds must be unique.'});
    }
  });

export type NotebookIntentV1 = z.infer<typeof NotebookIntentV1Schema>;
export type NotebookGate = z.infer<typeof NotebookGateSchema>;
export type NotebookSystemPromptV1 = z.infer<typeof NotebookSystemPromptV1Schema>;
export type NotebookProfileV1 = z.infer<typeof NotebookProfileV1Schema>;
export type NotebookSourceManifestV1 = z.infer<typeof NotebookSourceManifestV1Schema>;
export type NotebookPlanV1 = z.infer<typeof NotebookPlanV1Schema>;
