import {z} from 'zod';

import {
  CareerGateIdSchema,
  CareerWorkflowIdSchema,
  PortableRefSchema,
  Sha256Schema,
} from './primitives-v1.schema.ts';
import {careerRegistryPolicyIssues} from './registry-policy-v1.ts';

export const CareerDeliverableDefinitionV1Schema = z.strictObject({
  deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
  display_name: z.string().min(1).max(160),
  workflow_id: CareerWorkflowIdSchema,
  artifact_kind: z.enum(['human_document', 'structured_data', 'receipt', 'binary_projection']),
  canonical_format: z.enum(['md', 'json', 'yaml']),
  projections: z.array(z.enum(['html', 'docx', 'pdf', 'csv'])).max(4),
  template_ref: PortableRefSchema,
  acceptance_gate: CareerGateIdSchema,
  required: z.boolean(),
});

const CareerDeliverableIdSchema = CareerDeliverableDefinitionV1Schema.shape.deliverable_id;

const CareerCompatibilityMigrationV1Schema = z.discriminatedUnion('mode', [
  z.strictObject({mode: z.literal('migrator-only'), ref: PortableRefSchema}),
  z.strictObject({mode: z.literal('rebuild-only'), ref: PortableRefSchema}),
  z.strictObject({mode: z.literal('blocked')}),
]);

export const CareerDeliverableLifecycleV1Schema = z.discriminatedUnion('state', [
  z.strictObject({
    deliverable_id: CareerDeliverableIdSchema,
    state: z.literal('active'),
    successor_id: z.null(),
    allowed_for_new_runs: z.literal(true),
    migration: z.strictObject({mode: z.literal('none')}),
  }),
  z.strictObject({
    deliverable_id: CareerDeliverableIdSchema,
    state: z.literal('compatibility-only'),
    successor_id: CareerDeliverableIdSchema,
    allowed_for_new_runs: z.literal(false),
    migration: CareerCompatibilityMigrationV1Schema,
  }),
]);

export const CareerTemplateAuthorityV1Schema = z.strictObject({
  template_ref: PortableRefSchema,
  template_sha256: Sha256Schema,
});

export const CareerMigrationAuthorityV1Schema = z.strictObject({
  deliverable_id: CareerDeliverableIdSchema,
  mode: z.enum(['migrator-only', 'rebuild-only']),
  ref: PortableRefSchema,
  ref_sha256: Sha256Schema,
});

export const CareerDeliverableRegistryV1Schema = z
  .strictObject({
    schema_version: z.literal('career-deliverable-registry-v1'),
    definitions: z.array(CareerDeliverableDefinitionV1Schema).min(10),
    versioned_contract_lifecycle: z.array(CareerDeliverableLifecycleV1Schema).min(10),
    template_authorities: z.array(CareerTemplateAuthorityV1Schema).min(10),
    migration_authorities: z.array(CareerMigrationAuthorityV1Schema).min(1),
  })
  .superRefine((registry, context) => {
    for (const issue of careerRegistryPolicyIssues(registry)) {
      context.addIssue({code: 'custom', ...issue});
    }
  });
