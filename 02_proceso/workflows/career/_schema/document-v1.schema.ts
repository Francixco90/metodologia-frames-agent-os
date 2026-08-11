import {z} from 'zod';

import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

export const CareerClaimV1Schema = z
  .strictObject({
    claim_id: z.string().regex(/^CLM-[A-Z0-9-]{3,79}$/u),
    text: z.string().min(1).max(1_000),
    evidence_ids: z
      .array(z.string().regex(/^EVD-[A-Z0-9-]{3,79}$/u))
      .min(1)
      .max(12),
    evidence_hashes: z.array(Sha256Schema).min(1).max(12),
  })
  .superRefine((claim, context) => {
    if (claim.evidence_ids.length !== claim.evidence_hashes.length) {
      context.addIssue({code: 'custom', message: 'Evidence IDs and hashes must be paired'});
    }
    if (new Set(claim.evidence_ids).size !== claim.evidence_ids.length) {
      context.addIssue({code: 'custom', message: 'Evidence IDs must be unique'});
    }
  });

export const CareerSurfaceBindingV1Schema = z
  .strictObject({
    path: z
      .string()
      .regex(
        /^\/(name|headline|summary|contact_lines\/[0-9]+|skills\/[0-9]+|experience\/[0-9]+\/(organization|role|period|location)|education\/[0-9]+|addressee|subject|paragraphs\/[0-9]+)$/u,
      ),
    classification: z.enum(['evidence', 'non_claim']),
    evidence_ids: z.array(z.string().regex(/^EVD-[A-Z0-9-]{3,79}$/u)).max(12),
    evidence_hashes: z.array(Sha256Schema).max(12),
    rationale: z.string().min(1).max(300).nullable(),
  })
  .superRefine((binding, context) => {
    const paired = binding.evidence_ids.length === binding.evidence_hashes.length;
    if (!paired) context.addIssue({code: 'custom', message: 'Evidence IDs and hashes must pair'});
    if (binding.classification === 'evidence' && binding.evidence_ids.length === 0) {
      context.addIssue({code: 'custom', message: 'Evidence binding cannot be empty'});
    }
    if (
      binding.classification === 'non_claim' &&
      (binding.evidence_ids.length > 0 || !binding.rationale)
    ) {
      context.addIssue({code: 'custom', message: 'Non-claim requires rationale and no evidence'});
    }
  });

const ExperienceSchema = z.strictObject({
  organization: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  period: z.string().min(1).max(100),
  location: z.string().min(1).max(160).nullable(),
  achievements: z.array(CareerClaimV1Schema).min(1).max(12),
});

const AuthorizedBrandSchema = z.strictObject({
  label: z.string().min(1).max(120),
  profile_ref: PortableRefSchema,
  rights_ref: PortableRefSchema,
});

export const CareerCvV1BaseSchema = z.strictObject({
  schema_version: z.literal('career-cv-v1'),
  document_id: z.string().regex(/^CV-[A-Z0-9-]{3,79}$/u),
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
  application_id: z
    .string()
    .regex(/^APP-[A-Z0-9-]{3,79}$/u)
    .nullable(),
  language: z.enum(['es', 'en', 'pt']),
  design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
  authorized_brand: AuthorizedBrandSchema.nullable(),
  generated_by: z.literal('MetodologIA'),
  name: z.string().min(1).max(160),
  headline: z.string().min(1).max(240),
  contact_lines: z.array(z.string().min(1).max(240)).min(1).max(8),
  summary: z.string().min(1).max(1_200),
  experience: z.array(ExperienceSchema).min(1).max(20),
  education: z.array(z.string().min(1).max(500)).max(12),
  skills: z.array(z.string().min(1).max(120)).min(1).max(40),
  source_refs: z.array(PortableRefSchema).min(1).max(40),
  surface_bindings: z.array(CareerSurfaceBindingV1Schema).min(1).max(200),
  content_sha256: Sha256Schema,
});

export const CareerCvV1Schema = CareerCvV1BaseSchema.superRefine((document, context) => {
  if ((document.design_profile === 'authorized-brand') !== (document.authorized_brand !== null)) {
    context.addIssue({
      code: 'custom',
      path: ['authorized_brand'],
      message: 'Authorized brand profile and rights are required exactly for authorized-brand',
    });
  }
});

export const CareerLetterV1Schema = z
  .strictObject({
    schema_version: z.literal('career-letter-v1'),
    document_id: z.string().regex(/^LETTER-[A-Z0-9-]{3,79}$/u),
    candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
    application_id: z.string().regex(/^APP-[A-Z0-9-]{3,79}$/u),
    job_id: z.string().regex(/^JOB-[A-Z0-9-]{3,79}$/u),
    language: z.enum(['es', 'en', 'pt']),
    channel: z.enum(['letter', 'form', 'recruiter_message']),
    design_profile: z.enum(['candidate-neutral-ats', 'metodologia-career', 'authorized-brand']),
    authorized_brand: AuthorizedBrandSchema.nullable(),
    generated_by: z.literal('MetodologIA'),
    addressee: z.string().min(1).max(200),
    subject: z.string().min(1).max(240).nullable(),
    paragraphs: z.array(z.string().min(1).max(1_500)).min(2).max(6),
    claims: z.array(CareerClaimV1Schema).min(1).max(6),
    source_refs: z.array(PortableRefSchema).min(1).max(40),
    surface_bindings: z.array(CareerSurfaceBindingV1Schema).min(1).max(40),
    content_sha256: Sha256Schema,
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

export type CareerCvV1 = z.infer<typeof CareerCvV1Schema>;
export type CareerLetterV1 = z.infer<typeof CareerLetterV1Schema>;
