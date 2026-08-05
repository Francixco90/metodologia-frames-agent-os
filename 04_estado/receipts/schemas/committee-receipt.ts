import {z} from 'zod';

import {PortableIdSchema, Sha256Schema, TimestampSchema} from 'core/contracts/index.ts';

export const CommitteeReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    receiptId: PortableIdSchema,
    committeeId: PortableIdSchema,
    workProductId: PortableIdSchema,
    gate: z.literal('G10'),
    committeeSha256: Sha256Schema,
    decisionSha256: Sha256Schema,
    proposalSha256s: z.array(Sha256Schema).length(5),
    approvalSha256: Sha256Schema,
    status: z.enum(['PASS', 'REVISE', 'BLOCKED']),
    testEvidence: z
      .array(
        z
          .object({
            testId: PortableIdSchema,
            status: z.enum(['PASS', 'FAIL']),
            evidenceSha256: Sha256Schema,
          })
          .strict(),
      )
      .min(1),
    coverageGaps: z.array(z.string().trim().min(1)),
    createdAt: TimestampSchema,
    nextGate: z.string().trim().min(1),
    humanApprovalGranted: z.literal(false),
    releaseEffect: z.literal('NONE'),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (new Set(receipt.proposalSha256s).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Receipt must bind five distinct proposal hashes.',
        path: ['proposalSha256s'],
      });
    }
    if (receipt.status === 'PASS' && receipt.testEvidence.some(({status}) => status !== 'PASS')) {
      context.addIssue({
        code: 'custom',
        message: 'A passing receipt cannot contain failing test evidence.',
        path: ['testEvidence'],
      });
    }
  });

export type CommitteeReceipt = z.infer<typeof CommitteeReceiptSchema>;
