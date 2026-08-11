import {z} from 'zod';

import {CvSpecV1Schema} from './cv-spec-v1.schema.ts';
import {CvCompositionIdV1Schema, CvThemePolicyV1Schema} from './cv-design-system-v1.schema.ts';
import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

export const CvDesignBindingV2Schema = z.strictObject({
  mode: z.enum(['ats-neutral', 'pending-design', 'approved-system']),
  design_system_id: z
    .string()
    .regex(/^CVDS-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  design_system_ref: PortableRefSchema.nullable(),
  design_system_sha256: Sha256Schema.nullable(),
  decision_id: z
    .string()
    .regex(/^CVDESIGN-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  decision_ref: PortableRefSchema.nullable(),
  decision_sha256: Sha256Schema.nullable(),
  composition_id: CvCompositionIdV1Schema.nullable(),
  theme_policy: CvThemePolicyV1Schema.nullable(),
});

export const CvVariantV2Schema = z.strictObject({
  variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
  language: z.enum(['es', 'en', 'pt']),
  audience: z.enum(['recruiter', 'hiring_manager', 'ats']),
  output_kinds: z
    .array(z.enum(['ats-html', 'ats-docx', 'ats-pdf', 'executive-html']))
    .min(1)
    .max(4),
  page_budget: z.number().int().min(1).max(4),
  design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
  design: CvDesignBindingV2Schema,
});

/** [CÓDIGO] v2 añade decisión visual sin debilitar autoridad factual de v1. */
export const CvSpecV2Schema = z
  .strictObject({
    ...CvSpecV1Schema.shape,
    schema_version: z.literal('cv-spec-v2'),
    variants: z.array(CvVariantV2Schema).min(1).max(12),
    state: z.enum(['DRAFT', 'HUMAN_APPROVED', 'BLOCKED']),
    next_gate: z.literal('CR_CV_SPEC_APPROVED'),
    approval: z
      .strictObject({
        status: z.literal('HUMAN_APPROVED'),
        approved_spec_sha256: Sha256Schema,
        approver_ref: z.string().regex(/^H[0-9]{2}$/u),
        approved_at: z.iso.datetime({offset: true}),
      })
      .nullable(),
    spec_sha256: Sha256Schema,
  })
  .superRefine((spec, context) => {
    const targeted = spec.intent === 'targeted';
    const targetedFields = [
      spec.application_brief_ref,
      spec.application_brief_sha256,
      spec.requirement_evidence_map_ref,
      spec.requirement_evidence_map_sha256,
      spec.job_id,
      spec.job_snapshot_ref,
      spec.job_snapshot_sha256,
      spec.targeted_workflow,
    ];
    if (targeted && targetedFields.some((value) => value === null)) {
      context.addIssue({code: 'custom', message: 'Targeted CV requires all C04/C05 bindings'});
    }
    if (!targeted && targetedFields.some((value) => value !== null)) {
      context.addIssue({code: 'custom', message: 'General CV cannot carry targeted bindings'});
    }
    if (new Set(spec.section_order).size !== spec.section_order.length) {
      context.addIssue({
        code: 'custom',
        path: ['section_order'],
        message: 'Section order must be unique',
      });
    }
    const variantIds = spec.variants.map(({variant_id}) => variant_id);
    if (new Set(variantIds).size !== variantIds.length) {
      context.addIssue({code: 'custom', path: ['variants'], message: 'Variant IDs must be unique'});
    }
    for (const [index, variant] of spec.variants.entries()) {
      if (new Set(variant.output_kinds).size !== variant.output_kinds.length) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index],
          message: 'Duplicate output kind',
        });
      }
      const hasExecutive = variant.output_kinds.includes('executive-html');
      const hasAts = variant.output_kinds.some((kind) => kind.startsWith('ats-'));
      const bindingValues = [
        variant.design.design_system_id,
        variant.design.design_system_ref,
        variant.design.design_system_sha256,
        variant.design.decision_id,
        variant.design.decision_ref,
        variant.design.decision_sha256,
        variant.design.composition_id,
        variant.design.theme_policy,
      ];
      if (hasExecutive && hasAts) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'output_kinds'],
          message: 'ATS and executive outputs require separate variant IDs',
        });
      }
      const pending = variant.design.mode === 'pending-design';
      const approvedDesign =
        variant.design.mode === 'approved-system' && bindingValues.every((value) => value !== null);
      if (
        hasExecutive &&
        !approvedDesign &&
        !(
          pending &&
          spec.state !== 'HUMAN_APPROVED' &&
          bindingValues.every((value) => value === null)
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'design'],
          message: 'Executive design must be pending or fully approved',
        });
      }
      if (
        !hasExecutive &&
        (variant.design.mode !== 'ats-neutral' || bindingValues.some((value) => value !== null))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'design'],
          message: 'Neutral bypass required',
        });
      }
      if (hasExecutive && variant.design_profile === 'candidate-neutral-ats') {
        context.addIssue({
          code: 'custom',
          path: ['variants', index],
          message: 'Executive HTML cannot use ATS profile',
        });
      }
      if (hasAts && variant.design_profile !== 'candidate-neutral-ats') {
        context.addIssue({
          code: 'custom',
          path: ['variants', index],
          message: 'ATS outputs require neutral profile',
        });
      }
    }
    const requiresAuthorizedBrand = spec.variants.some(
      ({design_profile}) => design_profile === 'authorized-brand',
    );
    if (requiresAuthorizedBrand !== (spec.authorized_brand !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['authorized_brand'],
        message: 'Authorized brand and rights are required exactly when requested',
      });
    }
    if ((spec.state === 'HUMAN_APPROVED') !== (spec.approval !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['approval'],
        message: 'Spec approval must be exact',
      });
    }
  });

export type CvSpecV2 = z.infer<typeof CvSpecV2Schema>;
