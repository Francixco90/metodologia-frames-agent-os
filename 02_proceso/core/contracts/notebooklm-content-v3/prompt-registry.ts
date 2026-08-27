import {z} from 'zod';

import {ContentChannelV1Schema, PromptTemplateV1Schema} from './prompt-template.ts';

export const PromptRegistryV1Schema = z
  .strictObject({
    $schema: z.literal('./prompt-registry.schema.json'),
    schema: z.literal('PromptRegistryV1'),
    registryId: z.literal('prompt.registry.v1'),
    version: z.literal('1.0'),
    status: z.enum(['ACTIVE_PRIVATE_DRAFT', 'ACTIVE']),
    languagePolicy: z.literal('user-language-with-es-419-default'),
    sourcePolicies: z.strictObject({
      chat: z.strictObject({
        min: z.literal(3),
        max: z.literal(8),
        rejectEmpty: z.literal(true),
        rejectAllSources: z.literal(true),
      }),
      studio: z.strictObject({
        min: z.literal(4),
        max: z.literal(12),
        rejectEmpty: z.literal(true),
        rejectAllSources: z.literal(true),
      }),
      audit: z.strictObject({
        min: z.number().int().min(1).max(20),
        max: z.literal(20),
        rejectEmpty: z.literal(true),
        rejectAllSources: z.literal(true),
      }),
    }),
    templates: z.array(PromptTemplateV1Schema).length(22),
  })
  .superRefine((value, context) => {
    const templateIds = value.templates.map(({templateId: id}) => id);
    const pointers = value.templates.map(({jsonPointer: pointer}) => pointer);
    const paths = value.templates.map(({markdownRef: path}) => path);
    for (const [field, values] of [
      ['template_id', templateIds],
      ['json_pointer', pointers],
      ['markdown_path', paths],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({code: 'custom', message: `${field} values must be unique.`});
      }
    }
    const studioTypes = value.templates
      .filter(({family}) => family === 'studio')
      .map(({studioConfig}) => studioConfig.artifactType);
    const channels = value.templates
      .filter(({family}) => family === 'channel')
      .map(({templateId}) => templateId.replace(/^prompt\.channel\./u, '').replace(/\.v1$/u, ''));
    if (studioTypes.length !== 9 || new Set(studioTypes).size !== 9) {
      context.addIssue({code: 'custom', message: 'Registry requires nine distinct Studio types.'});
    }
    if (channels.length !== 13 || new Set(channels).size !== 13) {
      context.addIssue({code: 'custom', message: 'Registry requires thirteen distinct channels.'});
    } else if (
      [...channels].sort().join('|') !== [...ContentChannelV1Schema.options].sort().join('|')
    ) {
      context.addIssue({code: 'custom', message: 'Registry channel set is not canonical.'});
    }
    for (const [index, template] of value.templates.entries()) {
      if (template.jsonPointer !== `/templates/${index}`) {
        context.addIssue({
          code: 'custom',
          path: ['templates', index, 'jsonPointer'],
          message: 'jsonPointer must resolve to the template at its stable array index.',
        });
      }
    }
  });

export type PromptRegistryV1 = z.infer<typeof PromptRegistryV1Schema>;
