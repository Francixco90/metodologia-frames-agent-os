import {z} from 'zod';

import {CareerCvV1BaseSchema} from './document-v1.schema.ts';
import {CvOutputKindV1Schema} from './cv-spec-v1.schema.ts';
import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

export const CareerCvV2Schema = CareerCvV1BaseSchema.omit({schema_version: true})
  .extend({
    schema_version: z.literal('career-cv-v2'),
    spec_id: z.string().regex(/^CVSPEC-[A-Z0-9-]{3,79}$/u),
    spec_sha256: Sha256Schema,
    variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
    output_intent: z.enum(['general', 'targeted']),
    audience: z.enum(['recruiter', 'hiring_manager', 'ats']),
    page_budget: z.number().int().min(1).max(4),
    section_order: z.array(z.enum(['summary', 'experience', 'skills', 'education'])).length(4),
    keyword_policy: z.strictObject({
      allowed: z.array(z.string().min(1).max(120)).max(80),
      omitted: z.array(z.string().min(1).max(120)).max(80),
      rule: z.literal('visible-and-evidence-bound'),
    }),
    deliberate_omissions: z.array(z.string().min(1).max(500)).max(40),
    gaps: z.array(
      z.strictObject({
        gap_id: z.string().regex(/^GAP-[A-Z0-9-]{3,79}$/u),
        description: z.string().min(1).max(500),
        treatment: z.enum(['qualify', 'omit', 'block']),
      }),
    ),
    attribution_limits: z.array(z.string().min(1).max(500)).min(1).max(40),
  })
  .superRefine((document, context) => {
    if ((document.design_profile === 'authorized-brand') !== (document.authorized_brand !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['authorized_brand'],
        message: 'Authorized brand profile and rights are required exactly for authorized-brand',
      });
    }
  });

const CvPackageOutputV2Schema = z.strictObject({
  variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
  kind: CvOutputKindV1Schema,
  artifact_ref: PortableRefSchema,
  artifact_sha256: Sha256Schema,
  verification: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
});

const CvPackageVariantV2Schema = z.strictObject({
  variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
  source_document_ref: PortableRefSchema,
  source_document_sha256: Sha256Schema,
  language: z.enum(['es', 'en', 'pt']),
  audience: z.enum(['recruiter', 'hiring_manager', 'ats']),
  output_kinds: z.array(CvOutputKindV1Schema).min(1).max(4),
  page_budget: z.number().int().min(1).max(4),
  design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
});

const CvPackageQaV2Schema = z.strictObject({
  claims: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
  cross_format_parity: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
  bilingual_parity: z.enum(['PASS', 'NOT_APPLICABLE', 'UNKNOWN', 'BLOCKED']),
  accessibility: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
  parseability: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
  determinism: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
});

const PublicationReceiptV2Schema = z.strictObject({
  receipt_ref: PortableRefSchema,
  receipt_sha256: Sha256Schema,
  external_event_id: z.string().min(1).max(240),
  observed_at: z.iso.datetime({offset: true}),
  ready_package_sha256: Sha256Schema,
});

export const CareerCvPackageV2Schema = z
  .strictObject({
    schema_version: z.literal('cv-package-v2'),
    package_id: z.string().regex(/^CVPKG-[A-Z0-9-]{3,79}$/u),
    candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
    application_id: z
      .string()
      .regex(/^APP-[A-Z0-9-]{3,79}$/u)
      .nullable(),
    spec_id: z.string().regex(/^CVSPEC-[A-Z0-9-]{3,79}$/u),
    spec_sha256: Sha256Schema,
    evidence_bank_sha256: Sha256Schema,
    application_brief_sha256: Sha256Schema.nullable(),
    job_snapshot_sha256: Sha256Schema.nullable(),
    source_document_ref: PortableRefSchema,
    source_document_sha256: Sha256Schema,
    contact_binding_id: z.string().regex(/^CONTACT-[A-Z0-9-]{3,79}$/u),
    variants: z.array(CvPackageVariantV2Schema).min(1).max(12),
    outputs: z.array(CvPackageOutputV2Schema).min(1).max(48),
    qa: CvPackageQaV2Schema,
    parity_status: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
    privacy_status: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
    state: z.enum(['RENDERED_DRAFT', 'HUMAN_APPROVED', 'READY', 'PUBLISHED']),
    approved_spec_sha256: Sha256Schema.nullable(),
    publication_receipt: PublicationReceiptV2Schema.nullable(),
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
    if (expected.sort().join('|') !== [...keys].sort().join('|')) {
      context.addIssue({
        code: 'custom',
        path: ['outputs'],
        message: 'Output matrix differs from variants',
      });
    }
    if (pkg.state !== 'RENDERED_DRAFT' && pkg.approved_spec_sha256 !== pkg.spec_sha256) {
      context.addIssue({
        code: 'custom',
        path: ['approved_spec_sha256'],
        message: 'Promoted package must retain approval for its exact spec hash',
      });
    }
    if (
      ['HUMAN_APPROVED', 'READY', 'PUBLISHED'].includes(pkg.state) &&
      (pkg.outputs.some(({verification}) => verification !== 'PASS') ||
        pkg.parity_status !== 'PASS' ||
        pkg.privacy_status !== 'PASS' ||
        Object.values(pkg.qa).some((status) => !['PASS', 'NOT_APPLICABLE'].includes(status)))
    ) {
      context.addIssue({code: 'custom', message: 'Only a fully verified package can be promoted'});
    }
    if ((pkg.state === 'PUBLISHED') !== (pkg.publication_receipt !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['publication_receipt'],
        message: 'PUBLISHED requires exactly one external receipt',
      });
    }
  });

export type CareerCvV2 = z.infer<typeof CareerCvV2Schema>;
export type CareerCvPackageV2 = z.infer<typeof CareerCvPackageV2Schema>;
