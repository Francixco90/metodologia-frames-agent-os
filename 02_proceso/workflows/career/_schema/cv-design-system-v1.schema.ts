import {z} from 'zod';

import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

export const CvCompositionIdV1Schema = z.enum(['blueprint-executive', 'neo-swiss-editorial']);

export const CvThemePolicyV1Schema = z.strictObject({
  default_theme: z.literal('navy'),
  alternate_theme: z.literal('light'),
  print_theme: z.literal('light'),
  persistence: z.literal('local-storage-progressive-enhancement'),
});

/** [CONFIG] Referencia hash-bound al sistema visual; no concede aprobación de una composición. */
export const CareerDesignSystemRefV1Schema = z
  .strictObject({
    schema_version: z.literal('metodologia-career-design-system-v1'),
    design_system_id: z.string().regex(/^CVDS-[A-Z0-9-]{3,79}$/u),
    contract_ref: PortableRefSchema,
    contract_sha256: Sha256Schema,
    tokens_ref: PortableRefSchema,
    tokens_sha256: Sha256Schema,
    component_registry_ref: PortableRefSchema,
    component_registry_sha256: Sha256Schema,
    font_manifest_ref: PortableRefSchema,
    font_manifest_sha256: Sha256Schema,
    icon_registry_ref: PortableRefSchema,
    icon_registry_sha256: Sha256Schema,
    composition_ids: z.array(CvCompositionIdV1Schema).length(2),
    theme_policy: CvThemePolicyV1Schema,
    design_system_sha256: Sha256Schema,
  })
  .superRefine((system, context) => {
    const expected = ['blueprint-executive', 'neo-swiss-editorial'];
    if ([...system.composition_ids].sort().join('|') !== expected.sort().join('|')) {
      context.addIssue({
        code: 'custom',
        path: ['composition_ids'],
        message: 'Design system must expose exactly the two governed compositions',
      });
    }
  });

export type CareerDesignSystemRefV1 = z.infer<typeof CareerDesignSystemRefV1Schema>;
