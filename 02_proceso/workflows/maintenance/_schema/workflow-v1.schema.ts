import {z} from 'zod';

import {MutationClassV1Schema} from '../../../core/contracts/documentation-governance-v1.ts';
import {PortableIdSchema, RelativePathSchema} from '../../../core/contracts/primitives.ts';

export const MaintenanceWorkflowIdV1Schema = z.enum([
  'M00',
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
]);

const StepSchema = z.strictObject({
  step_id: z.string().regex(/^S[0-9]{2}$/u),
  purpose: z.string().min(1).max(280),
  primary_skill: PortableIdSchema,
  verifier: PortableIdSchema.nullable(),
  inputs: z.array(PortableIdSchema).max(12),
  outputs: z.array(PortableIdSchema).min(1).max(12),
  gate: z.enum([
    'HM_CHANGE_APPROVED',
    'HM_CANDIDATE_VERIFIED',
    'DOCS_TRANSVERSAL_COMPLETE',
    'HM_PROMOTION_APPROVED',
  ]),
  stop_rule: z.string().min(1).max(400),
});

export const MaintenanceWorkflowV1Schema = z.strictObject({
  schema_version: z.literal('maintenance-workflow-v1'),
  workflow_id: MaintenanceWorkflowIdV1Schema,
  title: z.string().min(1).max(120),
  purpose: z.string().min(1).max(500),
  change_classes: z.array(MutationClassV1Schema).min(1),
  capability_map: z.array(PortableIdSchema).min(1).max(8),
  authority_refs: z.array(RelativePathSchema).min(1).max(12),
  execution_steps: z.array(StepSchema).min(1).max(5),
  next_workflow: MaintenanceWorkflowIdV1Schema.nullable(),
  stop_rule: z.string().min(1).max(500),
  metadata: z.strictObject({
    status: z.literal('active'),
    execution_scope: z.literal('local-evaluation'),
    external_effects: z.literal(false),
  }),
});
export type MaintenanceWorkflowV1 = z.infer<typeof MaintenanceWorkflowV1Schema>;
