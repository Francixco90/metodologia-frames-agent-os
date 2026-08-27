import {z} from 'zod';

import {NotebookStudioTypeSchema} from '../notebooklm-os-v1.ts';
import {TextSchema} from './shared.ts';

export const PromptTemplateFamilyV1Schema = z.enum(['studio', 'channel']);

export const ContentChannelV1Schema = z.enum([
  'linkedin-post',
  'linkedin-carousel',
  'one-pager',
  'executive-deck',
  'commercial-proposal-deck',
  'learning-deck',
  'podcast-script',
  'short-video-script',
  'newsletter-article',
  'email',
  'landing-page',
  'case-study',
  'branded-static-visual',
]);

export const PromptTemplateV1Schema = z
  .strictObject({
    templateId: z.string().regex(/^prompt\.(?:studio|channel)\.[a-z0-9-]+\.v1$/u),
    version: z.literal('1.0'),
    family: PromptTemplateFamilyV1Schema,
    title: z.string().trim().min(3).max(200),
    markdownRef: z
      .string()
      .regex(/^\.\.\/knowledge-base\/30-templates\/(?:studio|channels)\/[a-z0-9-]+--v1\.0\.md$/u),
    jsonPointer: z.string().regex(/^\/templates\/\d+$/u),
    inputs: z.strictObject({
      required: z.array(z.string().trim().min(1)).min(5),
      optional: z.array(z.string().trim().min(1)),
    }),
    sourceRoles: z
      .array(
        z.enum([
          'control',
          'canon',
          'evidence',
          'template',
          'reference',
          'asset',
          'pedagogy',
          'working',
        ]),
      )
      .min(2),
    outputContract: z.strictObject({
      format: TextSchema,
      structure: z.array(TextSchema).min(3),
      state: z.literal('DRAFT'),
      languagePolicy: z.literal('user-language-with-es-419-default'),
    }),
    studioConfig: z.strictObject({
      enabled: z.boolean(),
      artifactType: NotebookStudioTypeSchema.nullable(),
      sourcePolicy: z.strictObject({
        min: z.number().int().min(3).max(4),
        max: z.number().int().min(8).max(12),
        rejectEmpty: z.literal(true),
        rejectAllSources: z.literal(true),
      }),
      requiresGenerationGate: z.boolean(),
    }),
    executionGate: z.literal('NLM_STUDIO_GENERATION_APPROVED').nullable(),
    negativePrompt: z.array(TextSchema).min(4),
    acceptance: z.array(TextSchema).min(4),
    idempotency: z.strictObject({
      algorithm: z.literal('sha256-canonical-json'),
      fields: z.array(z.string().trim().min(1)).min(4),
      onDuplicate: z.literal('RETURN_EXISTING_ACTIVE_OR_VERIFIED_ARTIFACT'),
    }),
  })
  .superRefine((value, context) => {
    const isStudio = value.family === 'studio';
    const expectedMin = isStudio ? 4 : 3;
    const expectedMax = isStudio ? 12 : 8;
    if (isStudio !== value.studioConfig.enabled) {
      context.addIssue({
        code: 'custom',
        path: ['studioConfig', 'enabled'],
        message: 'studio_config.enabled must match the STUDIO category.',
      });
    }
    if (isStudio !== (value.studioConfig.artifactType !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['studioConfig', 'artifactType'],
        message: 'Studio templates require an artifactType; channel templates forbid it.',
      });
    }
    if (
      value.studioConfig.sourcePolicy.min !== expectedMin ||
      value.studioConfig.sourcePolicy.max !== expectedMax
    ) {
      context.addIssue({
        code: 'custom',
        path: ['studioConfig', 'sourcePolicy'],
        message: `${value.family} source policy must be ${expectedMin}-${expectedMax}.`,
      });
    }
    if (isStudio !== value.studioConfig.requiresGenerationGate) {
      context.addIssue({
        code: 'custom',
        path: ['studioConfig', 'requiresGenerationGate'],
        message: 'Only Studio templates require the generation gate.',
      });
    }
    if (isStudio !== (value.executionGate === 'NLM_STUDIO_GENERATION_APPROVED')) {
      context.addIssue({
        code: 'custom',
        path: ['executionGate'],
        message: 'Studio requires its generation gate; channel draft creation requires no gate.',
      });
    }
    for (const [field, values] of [
      ['inputs.required', value.inputs.required],
      ['inputs.optional', value.inputs.optional],
      ['sourceRoles', value.sourceRoles],
      ['negativePrompt', value.negativePrompt],
      ['acceptance', value.acceptance],
      ['idempotency.fields', value.idempotency.fields],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({code: 'custom', message: `${field} values must be unique.`});
      }
    }
  });

export type PromptTemplateV1 = z.infer<typeof PromptTemplateV1Schema>;
