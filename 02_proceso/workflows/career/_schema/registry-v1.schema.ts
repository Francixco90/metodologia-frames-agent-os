import {z} from 'zod';

import {
  CareerGateIdSchema,
  CareerWorkflowIdSchema,
  PortableRefSchema,
} from './primitives-v1.schema.ts';

export const CareerDeliverableDefinitionV1Schema = z.strictObject({
  deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
  display_name: z.string().min(1).max(160),
  workflow_id: CareerWorkflowIdSchema,
  artifact_kind: z.enum(['human_document', 'structured_data', 'receipt', 'binary_projection']),
  canonical_format: z.enum(['md', 'json', 'yaml']),
  projections: z.array(z.enum(['html', 'pdf', 'csv'])).max(3),
  template_ref: PortableRefSchema,
  acceptance_gate: CareerGateIdSchema,
  required: z.boolean(),
});

export const CareerDeliverableRegistryV1Schema = z
  .strictObject({
    schema_version: z.literal('career-deliverable-registry-v1'),
    definitions: z.array(CareerDeliverableDefinitionV1Schema).min(10),
  })
  .superRefine(({definitions}, context) => {
    const ids = new Set<string>();
    definitions.forEach((definition, index) => {
      if (ids.has(definition.deliverable_id)) {
        context.addIssue({code: 'custom', path: ['definitions', index], message: 'Duplicate id'});
      }
      ids.add(definition.deliverable_id);
      if (
        definition.artifact_kind === 'human_document' &&
        !definition.projections.includes('html')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['definitions', index, 'projections'],
          message: 'Human documents require an HTML projection',
        });
      }
    });
  });
