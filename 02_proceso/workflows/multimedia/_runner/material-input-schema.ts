import {isAbsolute} from 'node:path';

import {z} from 'zod';

import {sha256Text, stableStringify} from './brief-model.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const LocalPathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine((value) => !isAbsolute(value) && !value.split(/[\\/]/u).includes('..'), 'local path');

export const OpportunityMaterialAuthorityV1Schema = z
  .strictObject({
    source_receipt_path: LocalPathSchema,
    source_material_path: LocalPathSchema,
    opportunity_map_path: LocalPathSchema,
    opportunity_selection_path: LocalPathSchema,
  })
  .refine((value) => new Set(Object.values(value)).size === 4, 'authority paths must be unique');
export type OpportunityMaterialAuthorityV1 = z.infer<typeof OpportunityMaterialAuthorityV1Schema>;

export const MaterialInputManifestV1Schema = z.strictObject({
  schema_version: z.literal('multimedia-material-input-v1'),
  workflow_id: z.enum(['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']),
  intent_sha256: Sha256Schema,
  work_order_sha256: Sha256Schema,
  producer_actor_id: z.string().regex(/^[a-z][a-z0-9-]{2,79}$/u),
  outputs: z
    .array(
      z.strictObject({
        deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
        markdown_path: LocalPathSchema,
        sha256: Sha256Schema,
      }),
    )
    .min(1)
    .max(20),
  opportunity_authority: OpportunityMaterialAuthorityV1Schema.optional(),
  canonical_sha256: Sha256Schema,
});
type Manifest = z.infer<typeof MaterialInputManifestV1Schema>;

export const calculateMaterialManifestHash = (value: Omit<Manifest, 'canonical_sha256'>): string =>
  sha256Text(stableStringify(value));
