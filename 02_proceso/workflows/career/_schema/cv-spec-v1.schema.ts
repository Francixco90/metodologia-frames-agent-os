import {z} from 'zod';

import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

const CareerLanguageSchema = z.enum(['es', 'en', 'pt']);
const EvidenceIdSchema = z.string().regex(/^EVD-[A-Z0-9-]{3,79}$/u);

export const CvOutputKindV1Schema = z.enum(['ats-html', 'ats-docx', 'ats-pdf', 'executive-html']);

export const CvSpecApprovalV1Schema = z.strictObject({
  status: z.literal('HUMAN_APPROVED'),
  approved_spec_sha256: Sha256Schema,
  approver_ref: z.string().regex(/^H[0-9]{2}$/u),
  approved_at: z.iso.datetime({offset: true}),
});

const CvEvidenceSelectionV1Schema = z
  .strictObject({
    section_id: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/u),
    evidence_ids: z.array(EvidenceIdSchema).min(1).max(40),
    evidence_hashes: z.array(Sha256Schema).min(1).max(40),
    rationale: z.string().min(1).max(600),
  })
  .superRefine((selection, context) => {
    if (selection.evidence_ids.length !== selection.evidence_hashes.length) {
      context.addIssue({code: 'custom', message: 'Evidence IDs and hashes must be paired'});
    }
    if (new Set(selection.evidence_ids).size !== selection.evidence_ids.length) {
      context.addIssue({code: 'custom', message: 'Evidence IDs must be unique per section'});
    }
  });

const CvVariantV1Schema = z.strictObject({
  variant_id: z.string().regex(/^CVVAR-[A-Z0-9-]{3,79}$/u),
  language: CareerLanguageSchema,
  audience: z.enum(['recruiter', 'hiring_manager', 'ats']),
  output_kinds: z.array(CvOutputKindV1Schema).min(1).max(4),
  page_budget: z.number().int().min(1).max(4),
  design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
});

const CvAcceptanceV1Schema = z.strictObject({
  ats: z.array(z.string().min(1).max(240)).min(1).max(20),
  recruiter: z.array(z.string().min(1).max(240)).min(1).max(20),
  hiring_manager: z.array(z.string().min(1).max(240)).min(1).max(20),
  accessibility: z.array(z.string().min(1).max(240)).min(1).max(20),
  parity: z.array(z.string().min(1).max(240)).min(1).max(20),
});

const CvTargetedWorkflowV1Schema = z.strictObject({
  scoring_workflow: z.literal('C04'),
  application_design_workflow: z.literal('C05'),
  fit_scorecard_ref: PortableRefSchema,
  fit_scorecard_sha256: Sha256Schema,
  application_decision_ref: PortableRefSchema,
  application_decision_sha256: Sha256Schema,
});

/** [CÓDIGO] Autoridad precompilación; aprobación ligada al contenido por hash. */
export const CvSpecV1Schema = z
  .strictObject({
    schema_version: z.literal('cv-spec-v1'),
    spec_id: z.string().regex(/^CVSPEC-[A-Z0-9-]{3,79}$/u),
    intent: z.enum(['general', 'targeted']),
    candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
    candidate_profile_ref: PortableRefSchema,
    candidate_profile_sha256: Sha256Schema,
    evidence_bank_ref: PortableRefSchema,
    evidence_bank_sha256: Sha256Schema,
    positioning_ref: PortableRefSchema,
    positioning_sha256: Sha256Schema,
    application_brief_ref: PortableRefSchema.nullable(),
    application_brief_sha256: Sha256Schema.nullable(),
    requirement_evidence_map_ref: PortableRefSchema.nullable(),
    requirement_evidence_map_sha256: Sha256Schema.nullable(),
    job_id: z
      .string()
      .regex(/^JOB-[A-Z0-9-]{3,79}$/u)
      .nullable(),
    job_snapshot_ref: PortableRefSchema.nullable(),
    job_snapshot_sha256: Sha256Schema.nullable(),
    targeted_workflow: CvTargetedWorkflowV1Schema.nullable(),
    target_role: z.string().min(1).max(240),
    role_family: z.string().min(1).max(160),
    positioning: z.string().min(1).max(1_200),
    section_order: z.array(z.enum(['summary', 'experience', 'skills', 'education'])).length(4),
    evidence_selection: z.array(CvEvidenceSelectionV1Schema).min(1).max(40),
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
    contact_binding: z.strictObject({
      binding_id: z.string().regex(/^CONTACT-[A-Z0-9-]{3,79}$/u),
      required: z.literal(true),
      storage: z.literal('private-runtime'),
    }),
    authorized_brand: z
      .strictObject({
        label: z.string().min(1).max(120),
        profile_ref: PortableRefSchema,
        rights_ref: PortableRefSchema,
      })
      .nullable(),
    variants: z.array(CvVariantV1Schema).min(1).max(12),
    acceptance: CvAcceptanceV1Schema,
    state: z.enum(['DRAFT', 'HUMAN_APPROVED', 'BLOCKED']),
    next_gate: z.literal('CR_CV_SPEC_APPROVED'),
    approval: CvSpecApprovalV1Schema.nullable(),
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
      context.addIssue({
        code: 'custom',
        message: 'Targeted CV requires brief, requirement map and job snapshot bindings',
      });
    }
    if (!targeted && targetedFields.some((value) => value !== null)) {
      context.addIssue({code: 'custom', message: 'General CV cannot carry targeted job bindings'});
    }
    if (new Set(spec.section_order).size !== spec.section_order.length) {
      context.addIssue({code: 'custom', message: 'Section order must contain each section once'});
    }
    const variantIds = spec.variants.map(({variant_id}) => variant_id);
    if (new Set(variantIds).size !== variantIds.length) {
      context.addIssue({code: 'custom', message: 'Variant IDs must be unique'});
    }
    for (const [index, variant] of spec.variants.entries()) {
      if (new Set(variant.output_kinds).size !== variant.output_kinds.length) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'output_kinds'],
          message: 'Output kinds must be unique',
        });
      }
      if (
        variant.design_profile === 'candidate-neutral-ats' &&
        variant.output_kinds.includes('executive-html')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index],
          message: 'Executive HTML requires a non-ATS design profile',
        });
      }
      if (
        variant.design_profile !== 'candidate-neutral-ats' &&
        variant.output_kinds.some((kind) => kind.startsWith('ats-'))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index],
          message: 'ATS outputs require candidate-neutral-ats design profile',
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
        message: 'Authorized brand profile and rights are required exactly when requested',
      });
    }
    if ((spec.state === 'HUMAN_APPROVED') !== (spec.approval !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['approval'],
        message: 'HUMAN_APPROVED state requires exactly one hash-bound approval',
      });
    }
  });

export type CvSpecV1 = z.infer<typeof CvSpecV1Schema>;
export type CvOutputKindV1 = z.infer<typeof CvOutputKindV1Schema>;
