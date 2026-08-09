import {z} from 'zod';

import {RelativePathSchema} from '../../../core/contracts/primitives.ts';

export const WorkflowContextBudgetV1Schema = z
  .strictObject({
    target_files: z.number().int().positive().max(20),
    max_files: z.number().int().positive().max(20),
    target_tokens: z.number().int().positive().max(28_000),
    max_tokens: z.number().int().positive().max(28_000),
  })
  .refine(
    (value) => value.target_files <= value.max_files,
    'target_files must not exceed max_files',
  )
  .refine(
    (value) => value.target_tokens <= value.max_tokens,
    'target_tokens must not exceed max_tokens',
  );

export const WorkflowStepV1Schema = z.strictObject({
  step_id: z.string().regex(/^S[0-9]{2}$/u, 'Expected SNN'),
  purpose: z.string().min(1).max(300),
  inputs: z.array(z.string().min(1).max(200)).max(20),
  primary_skill: z.string().min(1).max(80),
  optional_skills: z.array(z.string().min(1).max(80)).max(5),
  verifier: z.string().min(1).max(80).nullable(),
  outputs: z.array(z.string().min(1).max(120)).min(1).max(10),
  template_id: z.string().regex(/^TPL-[A-Z0-9][A-Z0-9-]{2,79}$/u),
  gate: z.string().regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u),
  stop_rule: z.string().min(1).max(500),
  context_budget: WorkflowContextBudgetV1Schema,
});

export const DeliverableTemplateV1Schema = z.strictObject({
  template_id: z.string().regex(/^TPL-[A-Z0-9][A-Z0-9-]{2,79}$/u),
  markdown_template_ref: RelativePathSchema,
  html_template_ref: RelativePathSchema,
  required_sections: z.array(z.string().min(1).max(120)).min(1).max(30),
  data_schema_ref: RelativePathSchema,
  parity: z.literal('semantic'),
  design_profile: z.literal('metodologia-html-v7'),
  acceptance_gate: z.string().regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u),
  word_budget: z
    .strictObject({target: z.number().int().positive(), max: z.number().int().positive()})
    .refine((value) => value.target <= value.max, 'target must not exceed max'),
});

export const DeliverableTemplateRegistryV1Schema = z.strictObject({
  schema_version: z.literal('deliverable-template-registry-v1'),
  templates: z.array(DeliverableTemplateV1Schema).min(1),
});

export type WorkflowStepV1 = z.infer<typeof WorkflowStepV1Schema>;
export type DeliverableTemplateV1 = z.infer<typeof DeliverableTemplateV1Schema>;
