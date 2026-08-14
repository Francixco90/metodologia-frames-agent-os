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

const REQUIRED_ACTIVE_CONTRACTS = ['cv-spec-v2', 'cv-source-v2', 'cv-package-v3'] as const;
const REQUIRED_COMPATIBILITY_CONTRACTS = [
  'cv-spec-v1',
  'cv-source-v1',
  'cv-html-v1',
  'cv-ats-pdf-v1',
  'cv-variant-manifest-v1',
  'cv-package-v2',
  'application-package-v1',
] as const;

export const CareerDeliverableRegistryV1Schema = z
  .strictObject({
    schema_version: z.literal('career-deliverable-registry-v1'),
    definitions: z.array(CareerDeliverableDefinitionV1Schema).min(10),
    versioned_contract_lifecycle: z.array(CareerDeliverableLifecycleV1Schema).min(10),
  })
  .superRefine(({definitions, versioned_contract_lifecycle: lifecycle}, context) => {
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

    const lifecycleById = new Map<string, (typeof lifecycle)[number]>();
    lifecycle.forEach((entry, index) => {
      if (lifecycleById.has(entry.deliverable_id)) {
        context.addIssue({
          code: 'custom',
          path: ['versioned_contract_lifecycle', index],
          message: 'Duplicate lifecycle id',
        });
      }
      lifecycleById.set(entry.deliverable_id, entry);
      if (!ids.has(entry.deliverable_id)) {
        context.addIssue({
          code: 'custom',
          path: ['versioned_contract_lifecycle', index, 'deliverable_id'],
          message: 'Lifecycle id is not defined',
        });
      }
      if (entry.state === 'compatibility-only') {
        if (!ids.has(entry.successor_id)) {
          context.addIssue({
            code: 'custom',
            path: ['versioned_contract_lifecycle', index, 'successor_id'],
            message: 'Successor is not defined',
          });
        }
        if (entry.successor_id === entry.deliverable_id) {
          context.addIssue({
            code: 'custom',
            path: ['versioned_contract_lifecycle', index, 'successor_id'],
            message: 'Successor cannot be self',
          });
        }
      }
    });

    for (const id of REQUIRED_ACTIVE_CONTRACTS) {
      if (lifecycleById.get(id)?.state !== 'active') {
        context.addIssue({
          code: 'custom',
          path: ['versioned_contract_lifecycle'],
          message: `${id} must be active`,
        });
      }
    }
    for (const id of REQUIRED_COMPATIBILITY_CONTRACTS) {
      if (lifecycleById.get(id)?.state !== 'compatibility-only') {
        context.addIssue({
          code: 'custom',
          path: ['versioned_contract_lifecycle'],
          message: `${id} must be compatibility-only`,
        });
      }
    }

    lifecycle.forEach((entry, index) => {
      if (
        entry.state === 'compatibility-only' &&
        lifecycleById.get(entry.successor_id)?.state !== 'active'
      ) {
        context.addIssue({
          code: 'custom',
          path: ['versioned_contract_lifecycle', index, 'successor_id'],
          message: 'Successor must be active',
        });
      }
    });

    const compatibilityIds = new Set(
      lifecycle
        .filter(({state}) => state === 'compatibility-only')
        .map(({deliverable_id}) => deliverable_id),
    );
    const compatibilityTemplateNames = new Set(
      definitions
        .filter(({deliverable_id}) => compatibilityIds.has(deliverable_id))
        .map(({template_ref}) => template_ref.split('/').at(-1)),
    );
    definitions.forEach((definition, index) => {
      if (
        !compatibilityIds.has(definition.deliverable_id) &&
        compatibilityTemplateNames.has(definition.template_ref.split('/').at(-1))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['definitions', index, 'template_ref'],
          message: 'Active deliverables cannot resolve a compatibility-only template name',
        });
      }
    });
  });
