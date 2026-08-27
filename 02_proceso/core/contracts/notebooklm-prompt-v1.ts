import {z} from 'zod';

const IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const TokenSchema = z.string().regex(/^[a-z][a-z0-9_]*$/u);
const TextSchema = z.string().trim().min(1).max(2_000);

export const PromptTemplateV1Schema = z.strictObject({
  template_id: IdSchema,
  kind: z.enum(['studio', 'channel']),
  file: z.string().regex(/^[a-z0-9-]+\.md$/u),
  json_pointer: z.string().regex(/^#\/entries\/\d+$/u),
  required_inputs: z.array(TokenSchema).min(1),
  source_roles: z.array(TokenSchema).min(1),
  output_contract: TextSchema,
  negative_prompt: z.array(TextSchema).min(1),
  acceptance: z.array(TextSchema).min(1),
  idempotency: z.array(TokenSchema).min(1),
});

export const PromptRegistryV1Schema = z
  .strictObject({
    schema: z.literal('prompt-registry-v1'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    entries: z.array(PromptTemplateV1Schema).length(22),
  })
  .superRefine((value, context) => {
    const ids = value.entries.map(({template_id: id}) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({code: 'custom', message: 'template_id values must be unique.'});
    }
    value.entries.forEach((entry, index) => {
      if (entry.json_pointer !== `#/entries/${index}`) {
        context.addIssue({
          code: 'custom',
          message: `${entry.template_id} has a stale json_pointer.`,
        });
      }
    });
  });

export type PromptTemplateV1 = z.infer<typeof PromptTemplateV1Schema>;
export type PromptRegistryV1 = z.infer<typeof PromptRegistryV1Schema>;
