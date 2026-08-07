/**
 * prompt-spec-v1.schema.ts — B1 of multimedia-workflows plan.
 *
 * Validates the YAML frontmatter of each `prompt-spec.md`. The SPEC body (7
 * sections + O/I/A/R tuple) is verified structurally by the `build.ts` runner
 * at parse time; this schema is the frontmatter contract. [CÓDIGO]
 *
 * Source: prompts P00–P09 from `MIA-MEDIA-LIB-2.0.0`. [DOC]
 */
import {z} from 'zod';

import {MultimediaWorkflowIdSchema} from './workflow-v1.schema.ts';

export const PromptSpecSectionSchema = z.enum([
  'SITUACIÓN',
  'PEDIDO',
  'EJECUCIÓN',
  'LÍMITES_Y_CASOS_BORDE',
  'CRITERIO',
  'DEFINITION_OF_DONE',
  'FALLBACK',
]);

export const PromptSpecVariableSchema = z.strictObject({
  name: z
    .string()
    .regex(
      /^[\p{Lu}][\p{Lu}\p{N}_]*$/u,
      'Expected an UPPER_SNAKE variable name (Unicode uppercase allowed)',
    ),
  default: z.string().min(1).max(600),
});

export const PromptSpecFrontmatterSchema = z
  .strictObject({
    schema_version: z.literal('prompt-spec-v1'),
    prompt_id: MultimediaWorkflowIdSchema,
    command: z.string().regex(/^\/[a-z-]+$/u),
    title: z.string().min(1).max(160),
    purpose: z.string().min(1).max(600),
    variables: z.array(PromptSpecVariableSchema).length(3),
    evidence_tuple: z.strictObject({
      observado: z.literal(true),
      inferido: z.literal(true),
      supuesto: z.literal(true),
      dato_requerido: z.literal(true),
    }),
    sections: z.array(PromptSpecSectionSchema).length(7),
    model: z.strictObject({
      preferred: z.string().min(1),
      alt: z.string().min(1),
      avoid: z.string().min(1),
    }),
    metadata: z.strictObject({
      source_id: z.literal('MIA-MEDIA-LIB-2.0.0'),
      version: z.literal('2.0.0-candidato'),
      status: z.literal('candidate'),
      locale: z.array(z.enum(['es', 'en', 'pt'])),
    }),
  })
  .superRefine((c, ctx) => {
    const expected: readonly string[] = [
      'SITUACIÓN',
      'PEDIDO',
      'EJECUCIÓN',
      'LÍMITES_Y_CASOS_BORDE',
      'CRITERIO',
      'DEFINITION_OF_DONE',
      'FALLBACK',
    ];
    if (c.sections.some((s, i) => s !== expected[i])) {
      ctx.addIssue({
        code: 'custom',
        message: 'sections must be in canonical 7-section order',
        path: ['sections'],
      });
    }
  });

export type PromptSpecFrontmatter = z.infer<typeof PromptSpecFrontmatterSchema>;
