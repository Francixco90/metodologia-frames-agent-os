import {z} from 'zod';

import {CareerCvPackageV2Schema} from './document-v2.schema.ts';
import {CvOutputKindV1Schema} from './cv-spec-v1.schema.ts';
import {CvDesignBindingV2Schema} from './cv-spec-v2.schema.ts';
import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

const CvPackageVariantV3Schema = z.strictObject({
  variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
  source_document_ref: PortableRefSchema,
  source_document_sha256: Sha256Schema,
  language: z.enum(['es', 'en', 'pt']),
  audience: z.enum(['recruiter', 'hiring_manager', 'ats']),
  output_kinds: z.array(CvOutputKindV1Schema).min(1).max(4),
  page_budget: z.number().int().min(1).max(4),
  design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
  design: CvDesignBindingV2Schema,
});

/** [CÓDIGO] Package v3 conserva lifecycle v2 y liga outputs ejecutivos a diseño aprobado. */
export const CareerCvPackageV3Schema = z
  .strictObject({
    ...CareerCvPackageV2Schema.shape,
    schema_version: z.literal('cv-package-v3'),
    variants: z.array(CvPackageVariantV3Schema).min(1).max(12),
    package_sha256: Sha256Schema,
  })
  .superRefine((pkg, context) => {
    const variantIds = pkg.variants.map(({variant_id}) => variant_id);
    if (new Set(variantIds).size !== variantIds.length) {
      context.addIssue({code: 'custom', path: ['variants'], message: 'Duplicate variant ID'});
    }
    const keys = pkg.outputs.map(({variant_id, kind}) => `${variant_id}:${kind}`);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({code: 'custom', path: ['outputs'], message: 'Duplicate variant output'});
    }
    const expected = pkg.variants.flatMap(({variant_id, output_kinds}) =>
      output_kinds.map((kind) => `${variant_id}:${kind}`),
    );
    if ([...expected].sort().join('|') !== [...keys].sort().join('|')) {
      context.addIssue({
        code: 'custom',
        path: ['outputs'],
        message: 'Output matrix differs from variants',
      });
    }
    for (const [index, variant] of pkg.variants.entries()) {
      const executive = variant.output_kinds.includes('executive-html');
      const ats = variant.output_kinds.some((kind) => kind.startsWith('ats-'));
      if (executive && ats) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'output_kinds'],
          message: 'ATS and executive outputs require separate variant IDs',
        });
      }
      const values = Object.entries(variant.design)
        .filter(([key]) => key !== 'mode')
        .map(([, value]) => value);
      if (
        executive &&
        (variant.design.mode !== 'approved-system' || values.some((v) => v === null))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'design'],
          message: 'Approved design required',
        });
      }
      if (!executive && (variant.design.mode !== 'ats-neutral' || values.some((v) => v !== null))) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'design'],
          message: 'Neutral bypass required',
        });
      }
    }
    if (pkg.state !== 'RENDERED_DRAFT' && pkg.approved_spec_sha256 !== pkg.spec_sha256) {
      context.addIssue({
        code: 'custom',
        path: ['approved_spec_sha256'],
        message: 'Stale spec approval',
      });
    }
    const promoted = ['HUMAN_APPROVED', 'READY', 'PUBLISHED'].includes(pkg.state);
    const qaPass = Object.values(pkg.qa).every((status) =>
      ['PASS', 'NOT_APPLICABLE'].includes(status),
    );
    if (
      promoted &&
      (pkg.outputs.some(({verification}) => verification !== 'PASS') ||
        pkg.parity_status !== 'PASS' ||
        pkg.privacy_status !== 'PASS' ||
        !qaPass)
    ) {
      context.addIssue({code: 'custom', message: 'Only a fully verified package can be promoted'});
    }
    if ((pkg.state === 'PUBLISHED') !== (pkg.publication_receipt !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['publication_receipt'],
        message: 'Publication receipt mismatch',
      });
    }
  });

export type CareerCvPackageV3 = z.infer<typeof CareerCvPackageV3Schema>;
