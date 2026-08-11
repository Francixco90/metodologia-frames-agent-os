import {z} from 'zod';

import {
  CareerGateIdSchema,
  CareerWorkflowIdSchema,
  PortableRefSchema,
} from './primitives-v1.schema.ts';

const ContextBudgetSchema = z
  .strictObject({
    target_files: z.number().int().positive().max(20),
    max_files: z.number().int().positive().max(20),
    target_tokens: z.number().int().positive().max(28_000),
    max_tokens: z.number().int().positive().max(28_000),
  })
  .refine((value) => value.target_files <= value.max_files)
  .refine((value) => value.target_tokens <= value.max_tokens);

export const CareerWorkflowStepV1Schema = z.strictObject({
  step_id: z.string().regex(/^S[0-9]{2}$/u),
  purpose: z.string().min(1).max(300),
  inputs: z.array(z.string().min(1).max(200)).max(20),
  conditional_inputs: z
    .array(
      z.strictObject({
        when: z.string().min(1).max(160),
        inputs: z.array(z.string().min(1).max(200)).min(1).max(12),
      }),
    )
    .max(4)
    .optional(),
  primary_skill: z.string().min(1).max(80),
  optional_skills: z.array(z.string().min(1).max(80)).max(5),
  verifier: z.string().min(1).max(80).nullable(),
  outputs: z.array(z.string().min(1).max(120)).min(1).max(12),
  template_id: z.string().regex(/^TPL-C[0-9]{2}-[A-Z0-9-]{3,70}$/u),
  gate: CareerGateIdSchema,
  stop_rule: z.string().min(1).max(500),
  context_budget: ContextBudgetSchema,
});

export const CareerWorkflowV1Schema = z.strictObject({
  schema_version: z.literal('career-workflow-v1'),
  workflow_id: CareerWorkflowIdSchema,
  command: z.string().regex(/^\/career-[a-z-]+$/u),
  title: z.string().min(1).max(160),
  purpose: z.string().min(1).max(600),
  inputs: z.array(z.string().min(1).max(160)).max(20),
  deliverables: z
    .array(z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u))
    .min(1)
    .max(12),
  capability_map: z.array(z.string().min(1).max(80)).min(1).max(10),
  execution_steps: z.array(CareerWorkflowStepV1Schema).min(1).max(9),
  gates: z.array(CareerGateIdSchema).min(1).max(5),
  next_workflow: CareerWorkflowIdSchema.nullable(),
  template_ref: PortableRefSchema,
  stop_rule: z.string().min(1).max(600),
  metadata: z.strictObject({
    status: z.literal('candidate'),
    execution_scope: z.literal('local-evaluation'),
    publication_authority: z.literal(false),
  }),
});

export type CareerWorkflowV1 = z.infer<typeof CareerWorkflowV1Schema>;
