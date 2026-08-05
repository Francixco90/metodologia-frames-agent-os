import {z} from 'zod';

import {
  ActorIdSchema,
  CANONICAL_GUARDIAN_ACTOR_ID,
  CANONICAL_HUMAN_APPROVER_ACTOR_ID,
  PortableIdSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../core/contracts/index.ts';

const reservedDecisionActors = new Set<string>([
  CANONICAL_GUARDIAN_ACTOR_ID,
  CANONICAL_HUMAN_APPROVER_ACTOR_ID,
]);

export const CommitteeApprovalSchema = z
  .object({
    schemaVersion: z.literal(1),
    approvalId: PortableIdSchema,
    committeeId: PortableIdSchema,
    decisionId: PortableIdSchema,
    gate: z.literal('G10'),
    authority: z.literal('COMMITTEE_GATE_ONLY'),
    requestedByActorId: ActorIdSchema,
    decidedByActorId: ActorIdSchema,
    decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
    targetSha256: Sha256Schema,
    evidenceRefs: z.array(PortableIdSchema).min(1),
    conditions: z.array(z.string().trim().min(1)).max(20),
    issuedAt: TimestampSchema,
    releaseEffect: z.literal('NONE'),
  })
  .strict()
  .superRefine((approval, context) => {
    if (approval.requestedByActorId === approval.decidedByActorId) {
      context.addIssue({
        code: 'custom',
        message: 'Producer/requester and verifier/decider must be distinct actors.',
        path: ['decidedByActorId'],
      });
    }
    if (reservedDecisionActors.has(approval.requestedByActorId)) {
      context.addIssue({
        code: 'custom',
        message: 'H01 and RT-11 are reserved actors and cannot request as the G10 producer.',
        path: ['requestedByActorId'],
      });
    }
    if (reservedDecisionActors.has(approval.decidedByActorId)) {
      context.addIssue({
        code: 'custom',
        message: 'H01 and RT-11 cannot act as the G10 committee verifier.',
        path: ['decidedByActorId'],
      });
    }
  });

export type CommitteeApproval = z.infer<typeof CommitteeApprovalSchema>;
