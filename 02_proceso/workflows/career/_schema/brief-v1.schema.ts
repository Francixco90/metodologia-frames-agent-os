import {z} from 'zod';

import {
  CareerGateIdSchema,
  CareerWorkflowIdSchema,
  PortableRefSchema,
  Sha256Schema,
} from './primitives-v1.schema.ts';

export const CAREER_BRIEF_SECTIONS = [
  'Resultado esperado',
  'Pedido interpretado',
  'Candidato, audiencia y objetivo',
  'Evidencia, fuentes y supuestos',
  'Vacante o familia de rol',
  'Estrategia de posicionamiento',
  'Steps y milestones',
  'Deliverables',
  'Skills y responsabilidades',
  'Riesgos, límites y casos borde',
  'Criterios de aceptación',
  'Decisión y siguiente gate',
] as const;

export const CareerBriefFrontmatterV1Schema = z.strictObject({
  schema_version: z.literal('career-brief-v1'),
  brief_id: z.string().regex(/^CBRIEF-[A-Z0-9-]{3,72}$/u),
  brief_kind: z.enum(['candidate-foundation', 'job-search', 'application', 'intervention']),
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
  application_id: z
    .string()
    .regex(/^APP-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  display_identity: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
  generated_by: z.literal('MetodologIA'),
  request: z.string().min(1).max(1_000),
  request_hash: Sha256Schema,
  sources: z.array(z.strictObject({ref: PortableRefSchema, sha256: Sha256Schema})).max(40),
  language: z.enum(['es', 'en', 'pt']),
  workflow_selected: z.array(CareerWorkflowIdSchema).min(1).max(10),
  skills: z.array(z.string().min(1).max(80)).min(1).max(20),
  state: z.enum(['INTAKE', 'BRIEF_DRAFT', 'BRIEF_APPROVED', 'RENDERED_DRAFT', 'BLOCKED']),
  next_gate: CareerGateIdSchema,
  content_sha256: Sha256Schema,
});

export const CareerBriefV1Schema = z.strictObject({
  frontmatter: CareerBriefFrontmatterV1Schema,
  sections: z
    .array(
      z.strictObject({id: z.enum(CAREER_BRIEF_SECTIONS), markdown: z.string().min(1).max(20_000)}),
    )
    .length(CAREER_BRIEF_SECTIONS.length)
    .superRefine((sections, context) => {
      sections.forEach((section, index) => {
        if (section.id !== CAREER_BRIEF_SECTIONS[index]) {
          context.addIssue({
            code: 'custom',
            path: [index, 'id'],
            message: `Expected section ${index + 1}`,
          });
        }
      });
    }),
});

export type CareerBriefV1 = z.infer<typeof CareerBriefV1Schema>;
export type CareerBriefFrontmatterV1 = z.infer<typeof CareerBriefFrontmatterV1Schema>;
