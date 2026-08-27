import {z} from 'zod';

import {Sha256Schema} from './model.ts';

const sourceId = z.string().regex(/^NLS-[A-Z0-9-]+$/u);
const layer = z.enum([
  '00 Control',
  '10 Canon',
  '20 Evidence',
  '30 Templates',
  '40 Golden References',
  '50 Assets',
  '60 Operations',
  '70 Pedagogy',
  '90 Archive',
]);
const authority = z.enum([
  'CONTROL',
  'CANON',
  'EVIDENCE',
  'TEMPLATE',
  'REFERENCE',
  'ASSET',
  'OPERATIONAL',
  'PEDAGOGY',
]);

export const CanonSourceManifestV3Schema = z.strictObject({
  schema_version: z.literal('notebook-source-pack-v3'),
  profile_id: z.literal('metodologia-brand-content-canon-v3'),
  display_name: z.string().trim().min(1),
  state: z.enum(['PLANNED_LOCAL', 'VERIFIED_LOCAL', 'IMPORTED_PRIVATE_VERIFIED']),
  generated_by: z.string().trim().min(1),
  locator_policy: z.strictObject({
    private_locators_persisted: z.literal(false),
    runtime_resolution: z.literal('repository-relative-path-plus-content-sha256'),
  }),
  authority_policy: z.strictObject({
    markdown_governs: z.literal(true),
    pdf_and_images_inspire: z.literal(true),
    asset_authority_has_veto: z.literal(true),
    all_sources_blocked: z.literal(true),
  }),
  excluded_packs: z.array(
    z.strictObject({pack_id: z.string().trim().min(1), reason: z.string().trim().min(1)}),
  ),
  summary: z.strictObject({
    markdown: z.number().int().nonnegative(),
    historical_pdfs: z.number().int().nonnegative(),
    current_pdfs: z.number().int().nonnegative(),
    images: z.number().int().nonnegative(),
    total: z.number().int().positive().max(150),
  }),
  sources: z
    .array(
      z
        .strictObject({
          source_id: sourceId,
          name: z.string().trim().min(1),
          title: z.string().trim().min(1),
          layer,
          authority,
          source_type: z.enum(['markdown', 'pdf', 'image']),
          tags: z.array(z.string().trim().min(1)).min(1),
          audiences: z.array(z.string().trim().min(1)).min(1),
          language: z.string().trim().min(2),
          response_locales: z.array(z.string().trim().min(2)).min(1),
          rights: z.literal('APPROVED'),
          status: z.literal('ACTIVE'),
          valid_from: z.string().date(),
          valid_until: z.string().date().nullable(),
          content_sha256: Sha256Schema,
          portable_identity_digest: Sha256Schema,
          source_ref: z.string().trim().min(1).max(512),
          source_refs: z.array(z.string().trim().min(1)),
          notebook_role: z.string().trim().min(1),
        })
        .passthrough(),
    )
    .min(1)
    .max(150),
});

export type CanonSourceManifestV3 = z.infer<typeof CanonSourceManifestV3Schema>;

export const GroundingSuiteV1Schema = z.strictObject({
  schema_version: z.literal('notebook-grounding-suite-v1'),
  suite_id: z.string().trim().min(1),
  profile_id: z.literal('metodologia-brand-content-canon-v3'),
  execution_state: z.literal('BLOCKED_PENDING_NLM_PLAN_APPROVED'),
  selection_policy: z.strictObject({
    min_sources: z.literal(3),
    max_sources: z.literal(8),
    all_sources_blocked: z.literal(true),
  }),
  tests: z
    .array(
      z.strictObject({
        test_id: z.string().trim().min(1),
        locale: z.enum(['en', 'es-419']),
        query: z.string().trim().min(1),
        source_ids: z.array(sourceId).min(3).max(8),
        expects: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .length(7),
});
