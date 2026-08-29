import {z} from 'zod';

import {RelativePathSchema} from '../../../../02_proceso/core/contracts/primitives.ts';
import {
  SourceRegistryEntryCheckSchema,
  type SourceRegistryCheckEntry,
} from './registry-entry-schema.ts';

export const SourceRegistryCheckSchema = z.strictObject({
  schema_version: z.literal(2),
  registry_id: z.literal('source-registry-v2'),
  supersedes_registry: z.literal('source-registry-v1'),
  mutation_policy: z.literal('append-only-events-with-versioned-current-view'),
  lifecycle_contract: RelativePathSchema,
  semantic_migrations: z.array(
    z.strictObject({
      migration_id: z.string().trim().min(1),
      source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
      receipt: RelativePathSchema,
      applied_to_current_view: z.literal(true),
    }),
  ),
  entries: z.array(SourceRegistryEntryCheckSchema).min(1),
});

export type SourceRegistryCheck = z.infer<typeof SourceRegistryCheckSchema>;
export type {SourceRegistryCheckEntry};
