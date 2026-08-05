import {z} from 'zod';

/**
 * Contribution Registry Entry — collaborative folio/certificate sharing.
 *
 * Each entry is a separate file under registries/contributions/.
 * The registry_entry_id is a UUIDv4 generated with crypto.randomUUID().
 * It is distinct from the original folio/certificate ID and contains no PII.
 */
export const ContributionEntrySchema = z.strictObject({
  schema_version: z.literal('contribution-entry-v1'),
  registry_entry_id: z
    .string()
    .regex(/^MFAO-REG-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu),
  original_folio_id: z.string().min(1).max(100),
  original_certificate_id: z.string().min(1).max(100).optional(),
  artifact_reference: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (v) => !v.includes('..') && !v.startsWith('/'),
      'must be a relative path without parent-directory traversal',
    ),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/u),
  contributor_alias: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/u, 'must be lowercase alphanumeric with dashes'),
  created_at: z.string().datetime(),
  source_pull_request: z.number().int().positive().optional(),
  source_commit: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/u)
    .optional(),
  status: z.enum(['active', 'superseded', 'revoked']),
  notes: z.string().max(500).optional(),
});

export type ContributionEntry = z.infer<typeof ContributionEntrySchema>;
