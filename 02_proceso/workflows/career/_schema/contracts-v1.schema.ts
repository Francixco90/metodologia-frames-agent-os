import {z} from 'zod';

import {
  CareerIdSchema,
  EvidenceConfidenceSchema,
  PortableRefSchema,
  Sha256Schema,
} from './primitives-v1.schema.ts';

export const CandidateProfileV1Schema = z.strictObject({
  schema_version: z.literal('candidate-profile-v1'),
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
  display_name: z.string().min(1).max(160),
  headline: z.string().min(1).max(240),
  role_families: z.array(z.string().min(1).max(120)).min(1).max(12),
  languages: z.array(z.enum(['es', 'en', 'pt'])).min(1),
  private_profile_ref: PortableRefSchema,
  source_hashes: z.array(Sha256Schema).min(1).max(40),
});

export const EvidenceItemV1Schema = z
  .strictObject({
    evidence_id: z.string().regex(/^EVD-[A-Z0-9-]{3,79}$/u),
    claim: z.string().min(1).max(600),
    context: z.string().min(1).max(1_000),
    action_method: z.string().min(1).max(1_000),
    result: z.string().min(1).max(1_000),
    metric: z.string().min(1).max(300).nullable(),
    source_ref: PortableRefSchema.nullable(),
    source_sha256: Sha256Schema.nullable(),
    confidence: EvidenceConfidenceSchema,
    allowed_channels: z.array(z.string().min(1).max(80)).max(20),
    constraints: z.array(z.string().min(1).max(300)).max(20),
    cv_content: z
      .array(
        z
          .strictObject({
            language: z.enum(['es', 'en', 'pt']),
            section: z.enum(['summary', 'experience', 'skills', 'education']),
            text: z.string().min(1).max(1_000),
            organization: z.string().min(1).max(200).nullable(),
            role: z.string().min(1).max(200).nullable(),
            period: z.string().min(1).max(100).nullable(),
            location: z.string().min(1).max(160).nullable(),
          })
          .superRefine((content, cvContext) => {
            const required = [content.organization, content.role, content.period];
            if (content.section === 'experience' && required.some((value) => value === null)) {
              cvContext.addIssue({
                code: 'custom',
                message: 'Experience CV content needs provenance',
              });
            }
            if (content.section !== 'experience' && required.some((value) => value !== null)) {
              cvContext.addIssue({code: 'custom', message: 'Only experience accepts provenance'});
            }
          }),
      )
      .max(12)
      .optional(),
  })
  .superRefine((item, context) => {
    if (item.confidence === 'verified' && (!item.source_ref || !item.source_sha256)) {
      context.addIssue({code: 'custom', message: 'Verified evidence requires source ref and hash'});
    }
    if (item.confidence === 'missing' && item.source_sha256 !== null) {
      context.addIssue({code: 'custom', message: 'Missing evidence cannot carry a source hash'});
    }
  });

export const EvidenceBankV1Schema = z.strictObject({
  schema_version: z.literal('evidence-bank-v1'),
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
  evidence: z.array(EvidenceItemV1Schema).min(1).max(200),
  bank_sha256: Sha256Schema,
});

export const JobRequirementV1Schema = z.strictObject({
  requirement_id: CareerIdSchema,
  text: z.string().min(1).max(1_000),
  mandatory: z.boolean(),
  category: z.enum(['experience', 'skill', 'education', 'language', 'location', 'legal', 'other']),
});

export const JobRecordV1Schema = z.strictObject({
  schema_version: z.literal('job-record-v1'),
  job_id: z.string().regex(/^JOB-[A-Z0-9-]{3,79}$/u),
  title: z.string().min(1).max(240),
  company: z.string().min(1).max(200),
  canonical_url: z.url(),
  captured_description_ref: PortableRefSchema,
  captured_sha256: Sha256Schema,
  status: z.enum(['open', 'closed', 'unknown', 'changed']),
  location: z.string().min(1).max(200).nullable(),
  modality: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  language: z.enum(['es', 'en', 'pt', 'unknown']),
  requirements: z.array(JobRequirementV1Schema).min(1).max(80),
});

export const RequirementEvidenceMapV1Schema = z.strictObject({
  schema_version: z.literal('requirement-evidence-map-v1'),
  job_id: z.string().regex(/^JOB-[A-Z0-9-]{3,79}$/u),
  mappings: z.array(
    z.strictObject({
      requirement_id: CareerIdSchema,
      evidence_ids: z.array(z.string().regex(/^EVD-[A-Z0-9-]{3,79}$/u)).max(12),
      fit: z.enum(['direct', 'transferable', 'gap', 'blocked']),
      treatment: z.enum(['use', 'qualify', 'omit', 'block']),
      rationale: z.string().min(1).max(600),
    }),
  ),
});

export type EvidenceItemV1 = z.infer<typeof EvidenceItemV1Schema>;
export type EvidenceBankV1 = z.infer<typeof EvidenceBankV1Schema>;
