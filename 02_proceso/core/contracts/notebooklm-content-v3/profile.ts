import {z} from 'zod';

import {
  NotebookGateSchema,
  NotebookProviderSchema,
  NotebookSensitivitySchema,
} from '../notebooklm-os-v1.ts';
import {RelativePathSchema, Sha256Schema} from '../primitives.ts';
import {IdSchema, TextSchema, VersionSchema} from './shared.ts';

const TaxonomySchema = z.tuple([
  z.literal('00 Control'),
  z.literal('10 Canon'),
  z.literal('20 Evidence'),
  z.literal('30 Templates'),
  z.literal('50 Assets'),
  z.literal('60 Operations'),
  z.literal('70 Pedagogy'),
  z.literal('40 Golden References'),
  z.literal('90 Archive'),
]);

export const NotebookSystemPromptV2Schema = z.strictObject({
  schemaVersion: z.literal('notebook-system-prompt-v2'),
  profileId: IdSchema,
  version: VersionSchema,
  owner: TextSchema,
  identity: TextSchema,
  purpose: TextSchema,
  audiences: z.array(TextSchema).min(1),
  capabilities: z.array(TextSchema).min(1),
  limits: z.array(TextSchema).min(1),
  sourceHierarchy: TaxonomySchema,
  evidenceTaxonomy: z.array(TextSchema).min(5),
  privacyAndRights: z.array(TextSchema).min(1),
  studioContract: z.array(TextSchema).min(1),
  responseContract: z.array(TextSchema).min(1),
  promptInjectionDefense: z.literal(true),
  inventionForbidden: z.literal(true),
  bootstrapSource: RelativePathSchema,
  bootstrapSha256: Sha256Schema,
  fullPromptSource: RelativePathSchema,
  fullPromptSha256: Sha256Schema,
  compiledCharacterLimit: z.literal(9_500),
  languageRouting: z.strictObject({
    sourceLanguage: z.literal('en'),
    detectUserLanguage: z.literal(true),
    defaultLocale: z.literal('es-419'),
    spanishLocale: z.literal('es-419'),
    spanishSecondPerson: z.literal('tú'),
    noVoseo: z.literal(true),
    preserveProperNounsAndCitations: z.literal(true),
  }),
  sourceSubsetPolicy: z.strictObject({
    chat: z.strictObject({min: z.literal(3), max: z.literal(8)}),
    studio: z.strictObject({min: z.literal(4), max: z.literal(12)}),
    audit: z.strictObject({min: z.number().int().min(1), max: z.literal(20)}),
    emptySelectionBlocked: z.literal(true),
    allSourcesBlocked: z.literal(true),
  }),
});

export const NotebookProfileV2Schema = z.strictObject({
  schemaVersion: z.literal('notebook-profile-v2'),
  profileId: IdSchema,
  displayName: TextSchema,
  provider: NotebookProviderSchema,
  identity: TextSchema,
  sensitivity: NotebookSensitivitySchema,
  systemPrompt: NotebookSystemPromptV2Schema,
  taxonomy: TaxonomySchema,
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

export type NotebookSystemPromptV2 = z.infer<typeof NotebookSystemPromptV2Schema>;
export type NotebookProfileV2 = z.infer<typeof NotebookProfileV2Schema>;
