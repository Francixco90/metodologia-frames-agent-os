import {z} from 'zod';

import {SubmissionAuthorizationV1Schema} from '../_schema/state-v1.schema.ts';
import {PortableRefSchema, Sha256Schema} from '../_schema/primitives-v1.schema.ts';

const SubmissionPreviewSchema = z.strictObject({
  schema_version: z.literal('submission-preview-v1'),
  application_id: z.string().regex(/^APP-[A-Z0-9-]{3,79}$/u),
  job_sha256: Sha256Schema,
  package_sha256: Sha256Schema,
  channel: z.string().min(1).max(120),
  package_ref: PortableRefSchema,
  blockers: z.array(
    z.enum(['captcha', 'otp', 'legal_terms', 'sensitive_question', 'recorded_interview']),
  ),
});

export const prepareSubmission = (input: unknown, authorization?: unknown) => {
  const preview = SubmissionPreviewSchema.parse(input);
  const parsedAuthorization = authorization
    ? SubmissionAuthorizationV1Schema.parse(authorization)
    : null;
  const bound =
    parsedAuthorization?.status === 'authorized' &&
    parsedAuthorization.application_id === preview.application_id &&
    parsedAuthorization.job_sha256 === preview.job_sha256 &&
    parsedAuthorization.package_sha256 === preview.package_sha256 &&
    parsedAuthorization.channel === preview.channel;
  return {
    preview,
    authorization_valid: bound,
    decision: 'PREPARED_STOP' as const,
    blockers: preview.blockers,
    next_gate: 'CR_SUBMISSION_AUTHORIZED' as const,
    message: bound
      ? 'Authorization is valid, but this local-evaluation workflow has no submission authority.'
      : 'A single-use hash-bound H01 authorization is required.',
  };
};
