import {z} from 'zod';

import {CareerIdSchema, PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

export const CareerApplicationStateSchema = z.enum([
  'DISCOVERED',
  'VALIDATED',
  'SHORTLISTED',
  'PACKAGED',
  'DRAFTED',
  'SUBMITTED',
  'BLOCKED',
  'CLOSED',
  'REJECTED',
  'INTERVIEW',
  'OFFER',
]);

export const CareerEventKindSchema = z.enum([
  'job-captured',
  'job-validated',
  'fit-scored',
  'evidence-packaged',
  'documents-drafted',
  'submission-confirmed',
  'blocked',
  'closed',
  'rejected',
  'interview-confirmed',
  'offer-confirmed',
]);

export const CareerEventV1Schema = z.strictObject({
  schema_version: z.literal('career-event-v1'),
  event_id: CareerIdSchema,
  application_id: z.string().regex(/^APP-[A-Z0-9-]{3,79}$/u),
  from: CareerApplicationStateSchema.nullable(),
  to: CareerApplicationStateSchema,
  kind: CareerEventKindSchema,
  actor_id: CareerIdSchema,
  artifact_sha256: Sha256Schema,
  evidence_refs: z.array(PortableRefSchema).min(1).max(40),
});

export const SubmissionAuthorizationV1Schema = z.strictObject({
  schema_version: z.literal('submission-authorization-v1'),
  authorization_id: CareerIdSchema,
  application_id: z.string().regex(/^APP-[A-Z0-9-]{3,79}$/u),
  job_sha256: Sha256Schema,
  package_sha256: Sha256Schema,
  channel: z.string().min(1).max(120),
  approver_actor_id: z.literal('H01'),
  single_use: z.literal(true),
  status: z.enum(['pending', 'authorized', 'consumed', 'invalidated']),
});

export const BoundSubmissionAuthorizationV1Schema = SubmissionAuthorizationV1Schema.extend({
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
});

export const SubmissionConfirmationReceiptV1Schema = z.strictObject({
  schema_version: z.literal('submission-confirmation-receipt-v1'),
  receipt_id: CareerIdSchema,
  authorization_id: CareerIdSchema,
  candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
  application_id: z.string().regex(/^APP-[A-Z0-9-]{3,79}$/u),
  channel: z.string().min(1).max(120),
  job_sha256: Sha256Schema,
  package_sha256: Sha256Schema,
  confirmation_ref: PortableRefSchema,
  confirmation_sha256: Sha256Schema,
  submitted_by_actor_id: CareerIdSchema,
  status: z.literal('confirmed'),
});

export const SubmittedTransitionV1Schema = z.strictObject({
  event: CareerEventV1Schema,
  authorization: BoundSubmissionAuthorizationV1Schema,
  confirmation: SubmissionConfirmationReceiptV1Schema,
  producer_actor_id: CareerIdSchema,
  verifier_actor_id: CareerIdSchema,
  guardian_actor_id: CareerIdSchema,
});

export type CareerApplicationState = z.infer<typeof CareerApplicationStateSchema>;
export type CareerEventV1 = z.infer<typeof CareerEventV1Schema>;
export type SubmittedTransitionV1 = z.infer<typeof SubmittedTransitionV1Schema>;
