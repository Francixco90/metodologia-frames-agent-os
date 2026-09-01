import {z} from 'zod';

import {Sha256Schema, TimestampSchema} from '../../../../core/contracts/index.ts';
import {NonEmptyTextSchema} from './common.ts';

export const PortableNotebookBindingSchema = z.discriminatedUnion('mode', [
  z
    .strictObject({
      mode: z.literal('digest'),
      binding_digest: Sha256Schema,
      locator_material_present: z.literal(false),
      coverage: z.strictObject({
        source_count: z.number().int().nonnegative(),
        cited_source_count: z.number().int().nonnegative(),
        coverage_digest: Sha256Schema,
        observed_at: TimestampSchema,
      }),
    })
    .superRefine(({coverage}, context) => {
      if (coverage.cited_source_count > coverage.source_count) {
        context.addIssue({
          code: 'custom',
          message: 'cited_source_count cannot exceed source_count',
          path: ['coverage', 'cited_source_count'],
        });
      }
    }),
  z.strictObject({
    mode: z.literal('none'),
    reason_code: NonEmptyTextSchema,
    locator_material_present: z.literal(false),
  }),
]);

export const NotebookRegistrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('notebook-registry-v1'),
  mutation_policy: z.literal('append-only-records'),
  entries: z.array(
    z.strictObject({
      binding_id: NonEmptyTextSchema,
      adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
      recorded_at: TimestampSchema,
      binding: PortableNotebookBindingSchema,
      state: z.enum(['grounded', 'partial', 'coverage_gap', 'blocked']),
      consequences: z.array(NonEmptyTextSchema).min(1),
    }),
  ),
});

export const NotebookAdapterContractSchema = z.strictObject({
  schema_version: z.literal(1),
  adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
  mode: z.literal('read_only'),
  network_activation: z.literal('disabled'),
  locator_persistence: z.literal('forbidden'),
  unknown_fields: z.literal('reject'),
  allowed_operations: z.array(
    z.enum([
      'resolve_binding_status',
      'read_metadata_digest',
      'read_coverage_digest',
      'query_grounding',
    ]),
  ),
  write_operations: z.array(z.never()).length(0),
  binding_union: z.record(z.string(), z.unknown()),
  request_union: z.strictObject({
    query_grounding: z.strictObject({claim_ids: z.strictObject({minimum_items: z.literal(1)})}),
    resolve_binding_status: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
    read_metadata_digest: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
    read_coverage_digest: z.strictObject({
      claim_ids: z.strictObject({maximum_items: z.literal(0)}),
    }),
  }),
  outputs: z.record(z.string(), z.unknown()),
  errors: z.array(NonEmptyTextSchema).min(1),
  stop_rules: z.array(NonEmptyTextSchema).min(1),
});
