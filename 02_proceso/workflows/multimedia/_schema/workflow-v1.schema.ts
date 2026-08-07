/**
 * workflow-v1.schema.ts — B1 of multimedia-workflows plan.
 *
 * Zod schema validating every `02_proceso/workflows/multimedia/p{NN}-{slug}/
 * workflow.yml`. The YAML is the source of truth (hybrid format); each
 * workflow's `build.ts` runner parses it through this schema before advancing
 * the work-product state machine. [CÓDIGO]
 *
 * Source: prompts P00–P09 from `MIA-MEDIA-LIB-2.0.0` (MetodologIA Universal
 * Multimedia Creation Library, v2.0.0-candidato). [DOC]
 */
import {z} from 'zod';

import {RelativePathSchema} from '../../../core/contracts/primitives.ts';
import {AnyWorkStateSchema} from '../../../core/contracts/schemas.ts';

export const MultimediaWorkflowIdSchema = z.enum([
  'P00',
  'P01',
  'P02',
  'P03',
  'P04',
  'P05',
  'P06',
  'P07',
  'P08',
  'P09',
]);

export type MultimediaWorkflowId = z.infer<typeof MultimediaWorkflowIdSchema>;

const GateIdSchema = z
  .string()
  .regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u, 'Expected a gate id (GNN or MW_*)');

export const WorkflowModeSchema = z.strictObject({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
});

export const WorkflowOutputSchema = z.strictObject({
  artifact: z.string().min(1).max(120),
  schema_ref: RelativePathSchema,
  required: z.boolean(),
});

export const WorkflowModelSchema = z.strictObject({
  preferred: z.string().min(1),
  alt: z.string().min(1),
  avoid: z.string().min(1),
});

export const MultimediaWorkflowSchema = z.strictObject({
  schema_version: z.literal('multimedia-workflow-v1'),
  workflow_id: MultimediaWorkflowIdSchema,
  command: z.string().regex(/^\/[a-z-]+$/u, 'Expected a /command slug'),
  title: z.string().min(1).max(160),
  purpose: z.string().min(1).max(600),
  discipline: z.string().min(1).max(80),
  phase: z.string().min(1).max(80),
  tags: z.array(z.string().min(1).max(40)).min(1),
  modes: z.array(WorkflowModeSchema).min(1),
  inputs: z.array(RelativePathSchema).default([]),
  outputs: z.array(WorkflowOutputSchema).min(1),
  work_product_state: AnyWorkStateSchema,
  gates: z.array(GateIdSchema).min(1),
  next_workflow: MultimediaWorkflowIdSchema.nullable(),
  task_template_ref: RelativePathSchema,
  prompt_spec_ref: RelativePathSchema,
  model: WorkflowModelSchema,
  no_regression: z.array(z.string().min(1)).min(1),
  dod: z.array(z.string().min(1)).min(1),
  fallback: z.string().min(1).max(800),
  // BLUF brief — Bottom Line Up Front. outputs/deliverables declared first
  // so the stage's verifiable result is visible before context. [CONFIG]
  brief: z
    .strictObject({
      outputs: z.array(z.string().min(1).max(200)).min(1),
      deliverables: z.array(z.string().min(1).max(200)).min(1),
      context: z.string().min(1).max(400),
      cta: z.string().min(1).max(200),
    })
    .optional(),
  // Deterministic skill + asset binding. skills resolve against creation-v3 /
  // v2 skill registries or vendor skills (03_artefactos/skills/vendor/*);
  // assets resolve against _assets/artifact-registry.md IDs. [CONFIG]
  capability_map: z
    .strictObject({
      skills: z.array(z.string().min(1).max(80)).default([]),
      assets: z.array(z.string().min(1).max(80)).default([]),
    })
    .optional(),
  metadata: z.strictObject({
    source_id: z.literal('MIA-MEDIA-LIB-2.0.0'),
    version: z.literal('2.0.0-candidato'),
    status: z.literal('candidate'),
    locale: z.array(z.enum(['es', 'en', 'pt'])),
  }),
});

export type MultimediaWorkflow = z.infer<typeof MultimediaWorkflowSchema>;
