import {z} from 'zod';

import {ActorIdSchema, PortableIdSchema, Sha256Schema, TimestampSchema} from './primitives.ts';

export const TransactionActorRoleV1Schema = z.enum([
  'PRODUCER',
  'VERIFIER',
  'GUARDIAN',
  'H01_APPROVER',
  'RECORDER',
  'RECOVERY_OPERATOR',
]);
export type TransactionActorRoleV1 = z.infer<typeof TransactionActorRoleV1Schema>;
export const ActorSessionV1Schema = z.strictObject({
  taskId: PortableIdSchema,
  actorInstanceId: ActorIdSchema,
  authoritySha256: Sha256Schema,
  actionSha256: Sha256Schema,
  environment: z.literal('LOCAL_SIMULATION'),
});
export type ActorSessionV1 = z.infer<typeof ActorSessionV1Schema>;
export const ActorAuthorityVerdictV1Schema = z.strictObject({
  schemaVersion: z.literal('actor-authority-verdict-v1'),
  status: z.enum(['VERIFIED', 'DENIED', 'CAPABILITY_GAP']),
  expectedRole: TransactionActorRoleV1Schema,
  taskId: PortableIdSchema,
  actorInstanceId: ActorIdSchema,
  authoritySha256: Sha256Schema,
  actionSha256: Sha256Schema,
  evidenceSha256: Sha256Schema,
  environment: z.literal('LOCAL_SIMULATION'),
  verifiedAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
});
export type ActorAuthorityVerdictV1 = z.infer<typeof ActorAuthorityVerdictV1Schema>;
export interface ActorAuthorityPortV1 {
  verify(session: ActorSessionV1, expectedRole: TransactionActorRoleV1): ActorAuthorityVerdictV1;
}

const ChainFields = {
  attemptId: PortableIdSchema,
  graphSha256: Sha256Schema,
  workOrderSha256: Sha256Schema,
  authorizationSha256: Sha256Schema,
  inputsSha256: Sha256Schema,
  outputsSha256: Sha256Schema,
  candidateSha256: Sha256Schema,
};
const CausalBase = z.strictObject({
  environment: z.literal('LOCAL_SIMULATION'),
  receiptId: PortableIdSchema,
  runId: PortableIdSchema,
  nodeId: PortableIdSchema,
  ...ChainFields,
  recordedAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
});
const EffectPointerFields = {
  effectReceiptId: PortableIdSchema,
  effectReceiptPhysicalSha256: Sha256Schema,
};
const VerificationPointerFields = {
  verificationReceiptId: PortableIdSchema,
  verificationReceiptPhysicalSha256: Sha256Schema,
};
const GuardianPointerFields = {
  guardianReceiptId: PortableIdSchema,
  guardianReceiptPhysicalSha256: Sha256Schema,
};

export const TransactionVerificationReceiptV1Schema = CausalBase.extend({
  schemaVersion: z.literal('transaction-verification-receipt-v1'),
  state: z.enum(['VERIFIED_PASS', 'BLOCKED_UNCERTAIN']),
  ...EffectPointerFields,
  producerTaskId: PortableIdSchema,
  verifierTaskId: PortableIdSchema,
  producerActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  producerAuthorityVerdictSha256: Sha256Schema,
  authorityVerdictSha256: Sha256Schema,
  evidenceSha256: Sha256Schema,
});
export type TransactionVerificationReceiptV1 = z.infer<
  typeof TransactionVerificationReceiptV1Schema
>;

export const TransactionGuardianReceiptV1Schema = CausalBase.extend({
  schemaVersion: z.literal('transaction-guardian-receipt-v1'),
  state: z.enum(['GUARDIAN_PASS', 'BLOCKED_UNCERTAIN']),
  ...EffectPointerFields,
  ...VerificationPointerFields,
  producerTaskId: PortableIdSchema,
  verifierTaskId: PortableIdSchema,
  guardianTaskId: PortableIdSchema,
  producerActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  guardianActorInstanceId: ActorIdSchema,
  authorityVerdictSha256: Sha256Schema,
  evidenceSha256: Sha256Schema,
});
export type TransactionGuardianReceiptV1 = z.infer<typeof TransactionGuardianReceiptV1Schema>;

export const TransactionHumanApprovalReceiptV1Schema = CausalBase.extend({
  schemaVersion: z.literal('transaction-human-approval-receipt-v1'),
  state: z.literal('H01_APPROVED'),
  ...EffectPointerFields,
  ...VerificationPointerFields,
  ...GuardianPointerFields,
  producerTaskId: PortableIdSchema,
  verifierTaskId: PortableIdSchema,
  guardianTaskId: PortableIdSchema,
  approverTaskId: PortableIdSchema,
  producerActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  guardianActorInstanceId: ActorIdSchema,
  approverActorInstanceId: ActorIdSchema,
  authorityVerdictSha256: Sha256Schema,
});
export type TransactionHumanApprovalReceiptV1 = z.infer<
  typeof TransactionHumanApprovalReceiptV1Schema
>;

export const TransactionPromotionReceiptV1Schema = CausalBase.extend({
  schemaVersion: z.literal('transaction-promotion-receipt-v1'),
  state: z.literal('PROMOTED'),
  ...EffectPointerFields,
  ...VerificationPointerFields,
  ...GuardianPointerFields,
  humanApprovalReceiptId: PortableIdSchema,
  humanApprovalReceiptPhysicalSha256: Sha256Schema,
  producerTaskId: PortableIdSchema,
  verifierTaskId: PortableIdSchema,
  guardianTaskId: PortableIdSchema,
  approverTaskId: PortableIdSchema,
  recorderTaskId: PortableIdSchema,
  producerActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  guardianActorInstanceId: ActorIdSchema,
  approverActorInstanceId: ActorIdSchema,
  recorderActorInstanceId: ActorIdSchema,
  authorityVerdictSha256: Sha256Schema,
});
export type TransactionPromotionReceiptV1 = z.infer<typeof TransactionPromotionReceiptV1Schema>;

export const RecordVerificationInputV1Schema = z.strictObject({
  runId: PortableIdSchema,
  nodeId: PortableIdSchema,
  receiptId: PortableIdSchema,
  effectReceiptId: PortableIdSchema,
  effectReceiptPhysicalSha256: Sha256Schema,
  producerActorInstanceId: ActorIdSchema,
  verifierSession: ActorSessionV1Schema,
  decision: z.enum(['PASS', 'FAIL']),
  evidenceSha256: Sha256Schema,
  recordedAt: TimestampSchema,
});
export type RecordVerificationInputV1 = z.infer<typeof RecordVerificationInputV1Schema>;
export const RecordGuardianVerdictInputV1Schema = z.strictObject({
  runId: PortableIdSchema,
  nodeId: PortableIdSchema,
  receiptId: PortableIdSchema,
  verificationReceiptId: PortableIdSchema,
  verificationReceiptPhysicalSha256: Sha256Schema,
  guardianSession: ActorSessionV1Schema,
  decision: z.enum(['PASS', 'FAIL']),
  evidenceSha256: Sha256Schema,
  recordedAt: TimestampSchema,
});
export type RecordGuardianVerdictInputV1 = z.infer<typeof RecordGuardianVerdictInputV1Schema>;
export const RecordHumanApprovalInputV1Schema = z.strictObject({
  runId: PortableIdSchema,
  nodeId: PortableIdSchema,
  receiptId: PortableIdSchema,
  guardianReceiptId: PortableIdSchema,
  guardianReceiptPhysicalSha256: Sha256Schema,
  approverSession: ActorSessionV1Schema,
  recordedAt: TimestampSchema,
});
export type RecordHumanApprovalInputV1 = z.infer<typeof RecordHumanApprovalInputV1Schema>;
export const PromoteTransactionInputV1Schema = z.strictObject({
  runId: PortableIdSchema,
  nodeId: PortableIdSchema,
  promotionReceiptId: PortableIdSchema,
  humanApprovalReceiptId: PortableIdSchema,
  humanApprovalReceiptPhysicalSha256: Sha256Schema,
  recorderSession: ActorSessionV1Schema,
  recordedAt: TimestampSchema,
});
export type PromoteTransactionInputV1 = z.infer<typeof PromoteTransactionInputV1Schema>;

export interface CausalGateRecorderV1 {
  recordVerification(input: unknown): TransactionVerificationReceiptV1;
  recordGuardianVerdict(input: unknown): TransactionGuardianReceiptV1;
  promote(input: unknown): TransactionPromotionReceiptV1;
}
export interface HumanApprovalRecorderV1 {
  recordHumanApproval(input: unknown): TransactionHumanApprovalReceiptV1;
}
