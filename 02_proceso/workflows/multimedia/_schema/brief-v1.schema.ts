import {z} from 'zod';

import {MultimediaWorkflowIdSchema} from './workflow-v1.schema.ts';

export const FRAMES_BRIEF_SECTIONS = [
  'Resultado esperado',
  'Pedido interpretado',
  'Audiencia, problema y acción',
  'Evidencia, fuentes y supuestos',
  'Propuesta creativa',
  'Steps y milestones',
  'Deliverables',
  'Skills y responsabilidades',
  'Riesgos, límites y casos borde',
  'Criterios de aceptación',
  'Diagrama',
  'Decisión y siguiente gate',
] as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, 'Expected lowercase SHA-256');

export const BriefSourceSchema = z.strictObject({
  source_id: z.string().min(1).max(120),
  ref: z.string().min(1).max(500),
  sha256: Sha256Schema.nullable(),
  authority: z.enum(['verified', 'user_assertion', 'unknown']),
  rights: z.enum(['cleared', 'restricted', 'unknown']),
});
export type BriefSourceV1 = z.infer<typeof BriefSourceSchema>;

export const BriefSourceAuthorityReceiptV1Schema = z.strictObject({
  schemaVersion: z.literal('brief-source-authority-receipt-v1'),
  receiptId: z.string().min(3).max(160),
  source: BriefSourceSchema,
  authorityMode: z.literal('LOCAL_SIMULATION'),
  authorityActorId: z.literal('LOCAL-USER-ASSERTION'),
  rightsBasis: z.literal('user_supplied_for_local_brief'),
  allowedUseScope: z.literal('local_internal_brief_only'),
  restrictions: z
    .array(z.enum(['no_external_distribution', 'no_claim_promotion']))
    .length(2)
    .refine((items) => new Set(items).size === 2, 'Both fail-closed restrictions are required'),
  recordedAt: z.iso.datetime({offset: true}),
  canonicalSha256: Sha256Schema,
});
export type BriefSourceAuthorityReceiptV1 = z.infer<typeof BriefSourceAuthorityReceiptV1Schema>;

export const FramesBriefFrontmatterV1Schema = z.strictObject({
  schema_version: z.literal('frames-brief-v1'),
  brief_id: z.string().regex(/^BRIEF-[A-Z0-9][A-Z0-9-]{2,79}$/u),
  identity: z.strictObject({
    brand: z.literal('MetodologIA'),
    owner: z.string().min(1).max(120),
  }),
  intent: z.strictObject({
    request: z.string().min(1).max(1_000),
    request_hash: Sha256Schema,
    content_class: z.string().min(1).max(80),
  }),
  sources: z.array(BriefSourceSchema).max(40),
  audience: z.string().min(1).max(600),
  objective: z.string().min(1).max(600),
  format: z.strictObject({
    medium: z.string().min(1).max(80),
    channel: z.string().min(1).max(80),
    specification: z.string().min(1).max(300),
  }),
  workflow_selected: z.array(MultimediaWorkflowIdSchema).min(1).max(10),
  skills: z.array(z.string().min(1).max(80)).min(1).max(20),
  restrictions: z.array(z.string().min(1).max(300)).max(30),
  state: z.enum(['INTAKE', 'BRIEF_DRAFT', 'BRIEF_APPROVED', 'RENDERED_DRAFT', 'BLOCKED']),
  next_gate: z.string().min(1).max(80),
  content_sha256: Sha256Schema,
});

export const BriefSectionV1Schema = z.strictObject({
  id: z.enum(FRAMES_BRIEF_SECTIONS),
  markdown: z.string().min(1).max(20_000),
});

const FramesBriefSectionsV1Schema = z
  .array(BriefSectionV1Schema)
  .length(FRAMES_BRIEF_SECTIONS.length)
  .superRefine((sections, context) => {
    sections.forEach((section, index) => {
      if (section.id !== FRAMES_BRIEF_SECTIONS[index]) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Expected section ${index + 1}: ${FRAMES_BRIEF_SECTIONS[index]}`,
        });
      }
    });
  });

export const FramesBriefV1Schema = z.strictObject({
  frontmatter: FramesBriefFrontmatterV1Schema,
  sections: FramesBriefSectionsV1Schema,
});

export type FramesBriefFrontmatterV1 = z.infer<typeof FramesBriefFrontmatterV1Schema>;
export type FramesBriefV1 = z.infer<typeof FramesBriefV1Schema>;
