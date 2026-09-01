import {Buffer} from 'node:buffer';
import {z} from 'zod';
import {FramesWorkOrderV1Schema} from './experience-execution-v1.ts';
// prettier-ignore
import {ActorIdSchema, JsonObjectSchema, PortableIdSchema, Sha256Schema, TimestampSchema} from './primitives.ts';
import {ActorSessionV1Schema} from './transaction-causal-gates-v1.ts';
const SafeIntegerSchema = z.number().int().nonnegative().safe();
const ExactRefSchema = z.string().min(1).max(512);
// prettier-ignore
export const TransactionKernelErrorCodeV1Schema = z.enum(['CONTRACT_INVALID', 'HASH_MISMATCH', 'CAPABILITY_GAP', 'ROOT_AUTHORITY_INVALID', 'ROOT_IDENTITY_DRIFT', 'PATH_REJECTED', 'GRAPH_INVALID', 'AUTHORIZATION_DRIFT', 'LOCK_CONFLICT', 'FILESYSTEM_RACE', 'WRITE_FAILED', 'LEDGER_INVALID', 'RECEIPT_INVALID', 'RECOVERY_UNAUTHORIZED', 'CAUSAL_ORDER', 'ACTOR_COLLISION', 'AUTHORITY_DENIED', 'BLOCKED_UNCERTAIN']);
export type TransactionKernelErrorCodeV1 = z.infer<typeof TransactionKernelErrorCodeV1Schema>;
export class TransactionKernelErrorV1 extends Error {
  public readonly code: TransactionKernelErrorCodeV1;
  public constructor(code: TransactionKernelErrorCodeV1, message: string) {
    super(message);
    this.name = 'TransactionKernelErrorV1';
    this.code = code;
  }
}
export const failTransactionV1 = (code: TransactionKernelErrorCodeV1, message: string): never => {
  throw new TransactionKernelErrorV1(code, message);
};

// prettier-ignore
export const TransactionRootAuthorityV1Schema = z.strictObject({rootPath: z.string().min(1).max(4_096), expectedRealpath: z.string().min(1).max(4_096), expectedDev: SafeIntegerSchema, expectedIno: SafeIntegerSchema, expectedFilesystemType: SafeIntegerSchema});
export type TransactionRootAuthorityV1 = z.infer<typeof TransactionRootAuthorityV1Schema>;

export const TransactionGraphNodeV1Schema = z.strictObject({
  nodeId: PortableIdSchema,
  aliases: z.array(PortableIdSchema).max(12),
  wave: SafeIntegerSchema,
  dependsOn: z.array(PortableIdSchema).max(32),
  workOrderSha256: Sha256Schema,
  authorizationSha256: Sha256Schema,
  inputsSha256: Sha256Schema,
  outputsSha256: Sha256Schema,
});
export const TransactionGraphV1Schema = z.strictObject({
  schemaVersion: z.literal('transaction-graph-v1'),
  graphId: PortableIdSchema,
  nodes: z.array(TransactionGraphNodeV1Schema).min(1).max(256),
  canonicalSha256: Sha256Schema,
});
export type TransactionGraphV1 = z.infer<typeof TransactionGraphV1Schema>;

// prettier-ignore
export const TransactionRunBindingV1Schema = z.strictObject({schemaVersion: z.literal('transaction-run-binding-v1'), runId: PortableIdSchema, graphSha256: Sha256Schema, boundAt: TimestampSchema, canonicalSha256: Sha256Schema});
export type TransactionRunBindingV1 = z.infer<typeof TransactionRunBindingV1Schema>;

export const TransactionCreateFileIntentV1Schema = z
  .strictObject({
    effect: z.literal('CREATE_FILE'),
    ref: ExactRefSchema,
    contentBase64: z.string().max(64 * 1024 * 1024),
    contentSha256: Sha256Schema,
    sizeBytes: SafeIntegerSchema,
  })
  .superRefine((value, context) => {
    const bytes = Buffer.from(value.contentBase64, 'base64');
    if (bytes.toString('base64') !== value.contentBase64 || bytes.byteLength !== value.sizeBytes) {
      context.addIssue({code: 'custom', message: 'Non-canonical base64 or byte-size mismatch.'});
    }
  });
export type TransactionCreateFileIntentV1 = z.infer<typeof TransactionCreateFileIntentV1Schema>;

// prettier-ignore
export const TransactionDependencyPromotionV1Schema = z.strictObject({nodeId: PortableIdSchema, receiptId: PortableIdSchema, physicalSha256: Sha256Schema});
export const TransactionExecutionInputV1Schema = z.strictObject({
  schemaVersion: z.literal('transaction-execution-input-v1'),
  environment: z.literal('LOCAL_SIMULATION'),
  runId: PortableIdSchema,
  attemptId: PortableIdSchema,
  receiptId: PortableIdSchema,
  nodeId: PortableIdSchema,
  producerTaskId: PortableIdSchema,
  producerActorInstanceId: ActorIdSchema,
  producerSession: ActorSessionV1Schema,
  occurredAt: TimestampSchema,
  rootAuthority: TransactionRootAuthorityV1Schema,
  graph: TransactionGraphV1Schema,
  workOrder: FramesWorkOrderV1Schema,
  authorization: JsonObjectSchema,
  workOrderSha256: Sha256Schema,
  authorizationSha256: Sha256Schema,
  inputsSha256: Sha256Schema,
  outputsSha256: Sha256Schema,
  dependencyPromotions: z.array(TransactionDependencyPromotionV1Schema).max(32),
  intents: z.array(TransactionCreateFileIntentV1Schema).min(1).max(12),
  canonicalSha256: Sha256Schema,
});
export type TransactionExecutionInputV1 = z.infer<typeof TransactionExecutionInputV1Schema>;
export const TransactionExecutionDraftV1Schema = TransactionExecutionInputV1Schema.omit({
  intents: true,
  canonicalSha256: true,
});
export type TransactionExecutionDraftV1 = z.infer<typeof TransactionExecutionDraftV1Schema>;

// prettier-ignore
export const TransactionOutputV1Schema = z.strictObject({ref: ExactRefSchema, sha256: Sha256Schema, sizeBytes: SafeIntegerSchema});
export type TransactionOutputV1 = z.infer<typeof TransactionOutputV1Schema>;
export const TransactionEffectReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('transaction-effect-receipt-v1'),
    environment: z.literal('LOCAL_SIMULATION'),
    receiptId: PortableIdSchema,
    runId: PortableIdSchema,
    nodeId: PortableIdSchema,
    attemptId: PortableIdSchema,
    producerTaskId: PortableIdSchema,
    producerActorInstanceId: ActorIdSchema,
    producerAuthorityVerdictSha256: Sha256Schema,
    state: z.enum(['EFFECT_SUCCEEDED', 'BLOCKED_UNCERTAIN']),
    executionInputSha256: Sha256Schema,
    graphSha256: Sha256Schema,
    workOrderSha256: Sha256Schema,
    authorizationSha256: Sha256Schema,
    inputsSha256: Sha256Schema,
    outputsSha256: Sha256Schema,
    candidateSha256: Sha256Schema,
    rootAuthority: TransactionRootAuthorityV1Schema,
    outputs: z.array(TransactionOutputV1Schema).max(12),
    errorCode: TransactionKernelErrorCodeV1Schema.nullable(),
    coverageGaps: z.array(z.string().min(1).max(160)).max(8),
    assuranceLimitations: z.array(z.string().min(1).max(160)).max(8),
    occurredAt: TimestampSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const succeeded = value.state === 'EFFECT_SUCCEEDED';
    if (
      succeeded &&
      (value.outputs.length === 0 || value.errorCode !== null || value.coverageGaps.length > 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'EFFECT_SUCCEEDED requires outputs and no error or gap.',
      });
    if (
      !succeeded &&
      (value.outputs.length > 0 || value.errorCode === null || value.coverageGaps.length === 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'BLOCKED_UNCERTAIN requires no outputs plus error and gap.',
      });
  });
export type TransactionEffectReceiptV1 = z.infer<typeof TransactionEffectReceiptV1Schema>;

export const TransactionInspectionInputV1Schema = z.strictObject({runId: PortableIdSchema});
export const TransactionInspectionV1Schema = z.strictObject({
  runId: PortableIdSchema,
  status: z.enum(['EMPTY', 'CLEAN', 'BLOCKED_UNCERTAIN']),
  latestState: z
    .enum([
      'PREPARED',
      'RUNNING',
      'EFFECT_SUCCEEDED',
      'VERIFIED_PASS',
      'GUARDIAN_PASS',
      'H01_APPROVED',
      'PROMOTED',
      'BLOCKED_UNCERTAIN',
    ])
    .nullable(),
  boundGraphSha256: Sha256Schema.nullable(),
  latestReceiptId: PortableIdSchema.nullable(),
  latestReceiptPhysicalSha256: Sha256Schema.nullable(),
  latestRecordSha256: Sha256Schema.nullable(),
  receiptCount: SafeIntegerSchema,
  issues: z.array(z.string().min(1).max(500)).max(64),
});
export type TransactionInspectionV1 = z.infer<typeof TransactionInspectionV1Schema>;

// prettier-ignore
export const TransactionRecoveryInputV1Schema = z.strictObject({schemaVersion: z.literal('transaction-recovery-input-v1'), runId: PortableIdSchema, recoveryId: PortableIdSchema, actorInstanceId: ActorIdSchema, taskId: PortableIdSchema, authoritySha256: Sha256Schema, reason: z.string().trim().min(1).max(500), recordedAt: TimestampSchema, canonicalSha256: Sha256Schema});
export type TransactionRecoveryInputV1 = z.infer<typeof TransactionRecoveryInputV1Schema>;
// prettier-ignore
export const TransactionRecoveryAssessmentV1Schema = TransactionInspectionV1Schema.extend({recoveryRequired: z.boolean(), originalLockPresent: z.boolean()});
export type TransactionRecoveryAssessmentV1 = z.infer<typeof TransactionRecoveryAssessmentV1Schema>;
export const TransactionRecoveryReceiptV1Schema = z.strictObject({
  schemaVersion: z.literal('transaction-recovery-receipt-v1'),
  recoveryId: PortableIdSchema,
  runId: PortableIdSchema,
  actorInstanceId: ActorIdSchema,
  authoritySessionSha256: Sha256Schema,
  authorityVerdictSha256: Sha256Schema,
  state: z.literal('BLOCKED_UNCERTAIN'),
  assessmentSha256: Sha256Schema,
  reason: z.string().trim().min(1).max(500),
  recordedAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
});
export type TransactionRecoveryReceiptV1 = z.infer<typeof TransactionRecoveryReceiptV1Schema>;
export interface TransactionKernelV1 {
  execute(input: unknown): TransactionEffectReceiptV1;
  inspect(input: unknown): TransactionInspectionV1;
  inspectRecovery(input: unknown): TransactionRecoveryAssessmentV1;
  recover(input: unknown): TransactionRecoveryReceiptV1;
}
