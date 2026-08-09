import {z} from 'zod';

import {PortableIdSchema, Sha256Schema} from '../../core/contracts/primitives.ts';

export const ExperienceApprovalReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('experience-approval-receipt-v1'),
    releaseId: PortableIdSchema,
    role: z.enum(['RT-09', 'RT-11', 'H01']),
    actorId: PortableIdSchema,
    decision: z.enum(['PASS', 'APPROVE']),
    candidateCommit: z.string().regex(/^[a-f0-9]{40}$/u),
    candidateSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const expected = value.role === 'H01' ? 'APPROVE' : 'PASS';
    if (value.decision !== expected) {
      context.addIssue({
        code: 'custom',
        message: `${value.role} requires ${expected}.`,
      });
    }
  });

export type ExperienceApprovalReceiptV1 = z.infer<typeof ExperienceApprovalReceiptV1Schema>;
