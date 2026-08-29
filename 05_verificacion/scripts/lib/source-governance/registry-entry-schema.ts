import {z} from 'zod';

import {
  RelativePathSchema,
  Sha256Schema,
} from '../../../../02_proceso/core/contracts/primitives.ts';

const text = z.string().trim().min(1);

const SourceHashesCheckSchema = z
  .strictObject({
    raw_sha256: Sha256Schema.nullable(),
    normalized_sha256: Sha256Schema.nullable(),
    source_normalized_sha256: Sha256Schema.nullable(),
    raw_bytes: z.number().int().nonnegative().optional(),
    normalized_bytes: z.number().int().nonnegative().optional(),
    normalization_contract: text.optional(),
    status: z.literal('not_ingested').optional(),
  })
  .superRefine((hashes, context) => {
    if (hashes.normalized_sha256 !== hashes.source_normalized_sha256) {
      context.addIssue({
        code: 'custom',
        message: 'normalized_sha256 must equal source_normalized_sha256',
        path: ['normalized_sha256'],
      });
    }
  });

const SourceProjectionCheckSchema = z.strictObject({
  projection_id: text,
  projection_locator: RelativePathSchema,
  projection_sha256: Sha256Schema,
  projection_bytes: z.number().int().positive(),
  projection_contract: text,
  derived_from_source_normalized_sha256: Sha256Schema,
  immutable: z.literal(true),
});

const SourceRightsCheckSchema = z.strictObject({
  rights_holder: text.optional(),
  rights_basis: text.optional(),
  allowed_use_scope: text.optional(),
  rights_verdict: text,
});

const SourceAuthorityCheckSchema = z.strictObject({
  authority_class: text,
  authority_verdict: text,
  provenance_evidence: text,
  claim_authority: z.literal('denied').optional(),
});

export const SourceRegistryEntryCheckSchema = z
  .strictObject({
    source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
    snapshot_id: text.optional(),
    current_state: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
    source_kind: text,
    title: text,
    portable_locator: RelativePathSchema.optional(),
    portable_locator_role: z.enum(['source_material', 'derived_projection']).optional(),
    canonical_uri: z.url().optional(),
    canonical_uri_sha256: Sha256Schema.optional(),
    observed_author: text.optional(),
    observed_at: text,
    hashes: SourceHashesCheckSchema,
    projection: SourceProjectionCheckSchema.optional(),
    repository_lock: z.unknown().optional(),
    deduplication: z.strictObject({
      verdict: text,
      checked_against_registry: text.optional(),
    }),
    rights: SourceRightsCheckSchema,
    authority: SourceAuthorityCheckSchema,
    relations: z.array(z.strictObject({type: text, source_id: text, verdict: text})).optional(),
    receipts: z.array(RelativePathSchema).min(1),
    receipt_bindings: z.array(z.unknown()).min(1).optional(),
    restrictions: z.array(text).optional(),
    coverage_gaps: z.array(text).optional(),
  })
  .superRefine((entry, context) => {
    if ((entry.portable_locator === undefined) !== (entry.portable_locator_role === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'portable locator and role must be declared together',
        path: ['portable_locator'],
      });
    }
    if (entry.portable_locator_role === 'derived_projection') {
      if (entry.projection === undefined) {
        context.addIssue({code: 'custom', message: 'derived projection metadata required'});
      } else if (entry.projection.projection_locator !== entry.portable_locator) {
        context.addIssue({code: 'custom', message: 'projection locator mismatch'});
      }
    }
    if (entry.current_state !== 'active') return;
    for (const field of ['rights_holder', 'rights_basis', 'allowed_use_scope'] as const) {
      if (entry.rights[field] === undefined) {
        context.addIssue({
          code: 'custom',
          message: `active source requires ${field}`,
          path: ['rights', field],
        });
      }
    }
    if (entry.authority.provenance_evidence.length === 0) {
      context.addIssue({code: 'custom', message: 'active source requires provenance evidence'});
    }
  });

export type SourceRegistryCheckEntry = z.infer<typeof SourceRegistryEntryCheckSchema>;
