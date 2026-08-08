import {z} from 'zod';

import {BriefSourceSchema} from './brief-v1.schema.ts';
import {MultimediaWorkflowIdSchema} from './workflow-v1.schema.ts';

export const FRAMES_DELIVERABLE_SECTIONS = [
  'Resultado y decisión',
  'Audiencia y uso',
  'Entradas, evidencia y supuestos',
  'Contenido estructurado',
  'Componentes, activos y prompts',
  'Secuencia, hitos y dependencias',
  'Skills, ownership y handoffs',
  'Riesgos, límites y casos borde',
  'Criterios de aceptación y QA',
  'Estado, lineage y siguiente gate',
] as const;

export const DeliverableClassV1Schema = z.enum([
  'brand',
  'source',
  'research',
  'strategy',
  'planning',
  'creative-spec',
  'prompt-pack',
  'asset',
  'review',
  'edit',
  'distribution',
  'measurement',
]);

export const PieceFamilyV1Schema = z.enum([
  'image',
  'miniclip',
  'graphic',
  'carousel',
  'story',
  'presentation',
  'dashboard',
  'calendar',
  'other',
]);

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, 'Expected lowercase SHA-256');

export const DeliverableFieldV1Schema = z.strictObject({
  field_id: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/u),
  label: z.string().min(1).max(120),
  value_type: z.enum(['text', 'list', 'number', 'boolean', 'date', 'table', 'reference']),
  status: z.enum(['observed', 'inferred', 'assumed', 'unknown']),
  value: z.union([z.string().max(20_000), z.array(z.string().max(2_000)).max(200)]),
  source_refs: z.array(z.string().min(1).max(500)).max(40),
});

export const FramesDeliverableFrontmatterV1Schema = z
  .strictObject({
    schema_version: z.literal('frames-deliverable-v1'),
    instance_id: z.string().regex(/^DELIV-[A-Z0-9][A-Z0-9-]{2,79}$/u),
    deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
    display_name: z.string().min(1).max(160),
    workflow_id: MultimediaWorkflowIdSchema,
    deliverable_class: DeliverableClassV1Schema,
    touchpoint: z.enum(['intermediate', 'final']),
    identity: z.strictObject({brand: z.literal('MetodologIA'), owner: z.string().min(1).max(120)}),
    audience: z.string().min(1).max(600),
    purpose: z.string().min(1).max(600),
    sources: z.array(BriefSourceSchema).max(40),
    formats: z
      .array(z.enum(['md', 'html', 'json', 'csv', 'image', 'video', 'audio', 'pdf', 'pptx']))
      .min(1)
      .max(9),
    piece_families: z.array(PieceFamilyV1Schema).max(9),
    companion_for: z.string().min(1).max(500).nullable(),
    skills: z.array(z.string().min(1).max(80)).min(1).max(20),
    fields: z.array(DeliverableFieldV1Schema).min(1).max(80),
    state: z.enum(['DRAFT', 'RENDERED_DRAFT', 'REVIEWED', 'HUMAN_APPROVED', 'BLOCKED']),
    next_gate: z.string().min(1).max(80),
    content_sha256: Sha256Schema,
  })
  .superRefine(({fields, state}, context) => {
    if (!['DRAFT', 'BLOCKED'].includes(state) && fields.some(({status}) => status === 'unknown')) {
      context.addIssue({
        code: 'custom',
        path: ['fields'],
        message: `state ${state} forbids unknown fields`,
      });
    }
  });

export const DeliverableSectionV1Schema = z.strictObject({
  id: z.enum(FRAMES_DELIVERABLE_SECTIONS),
  markdown: z.string().min(1).max(20_000),
});

const DeliverableSectionsV1Schema = z
  .array(DeliverableSectionV1Schema)
  .length(FRAMES_DELIVERABLE_SECTIONS.length)
  .superRefine((sections, context) => {
    sections.forEach((section, index) => {
      if (section.id !== FRAMES_DELIVERABLE_SECTIONS[index]) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Expected section ${index + 1}: ${FRAMES_DELIVERABLE_SECTIONS[index]}`,
        });
      }
    });
  });

export const FramesDeliverableV1Schema = z.strictObject({
  frontmatter: FramesDeliverableFrontmatterV1Schema,
  sections: DeliverableSectionsV1Schema,
});

export const DeliverableDefinitionV1Schema = z
  .strictObject({
    deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
    display_name: z.string().min(1).max(160),
    workflow_id: MultimediaWorkflowIdSchema,
    deliverable_class: DeliverableClassV1Schema,
    touchpoint: z.enum(['intermediate', 'final']),
    purpose: z.string().min(1).max(600),
    audience: z.string().min(1).max(300),
    formats: z.array(
      z.enum(['md', 'html', 'json', 'csv', 'image', 'video', 'audio', 'pdf', 'pptx']),
    ),
    piece_families: z.array(PieceFamilyV1Schema),
    required_fields: z
      .array(z.string().regex(/^[a-z][a-z0-9-]{1,79}$/u))
      .min(1)
      .max(40),
    consumers: z.array(z.union([MultimediaWorkflowIdSchema, z.literal('human')])).min(1),
    template_id: z.string().regex(/^TPL-[A-Z0-9][A-Z0-9-]{2,79}$/u),
    acceptance_gate: z.string().regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u),
    word_budget: z
      .strictObject({target: z.number().int().positive(), max: z.number().int().positive()})
      .refine(({target, max}) => target <= max, 'target must not exceed max'),
  })
  .refine(({formats}) => formats.includes('md') && formats.includes('html'), {
    message: 'Every deliverable requires canonical md and regenerable html',
    path: ['formats'],
  });

export const DeliverableDefinitionRegistryV1Schema = z
  .strictObject({
    schema_version: z.literal('deliverable-definition-registry-v1'),
    definitions: z.array(DeliverableDefinitionV1Schema).min(1),
  })
  .superRefine(({definitions}, context) => {
    const seen = new Set<string>();
    definitions.forEach(({deliverable_id}, index) => {
      if (seen.has(deliverable_id)) {
        context.addIssue({code: 'custom', path: ['definitions', index], message: 'Duplicate id'});
      }
      seen.add(deliverable_id);
    });
  });

export type FramesDeliverableFrontmatterV1 = z.infer<typeof FramesDeliverableFrontmatterV1Schema>;
export type FramesDeliverableV1 = z.infer<typeof FramesDeliverableV1Schema>;
export type DeliverableDefinitionV1 = z.infer<typeof DeliverableDefinitionV1Schema>;
