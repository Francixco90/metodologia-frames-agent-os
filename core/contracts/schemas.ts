import {z} from 'zod';

import {
  ActorIdSchema,
  JsonObjectSchema,
  PortableIdSchema,
  PortableRefSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from './primitives.ts';

export const GlobalWorkStateSchema = z.enum([
  'INGESTED',
  'CLASSIFIED',
  'SOURCE_LOCKED',
  'DISCOVERED',
  'DEFINED',
  'IDEATED',
  'DIRECTION_APPROVED',
  'SPECIFIED',
  'BUILT',
  'VALIDATED',
  'GUARDIAN_PASS',
  'HUMAN_APPROVED',
  'READY',
  'RELEASE_PROPOSED',
  'RELEASE_AUTHORIZED',
  'PUBLISHED',
]);

export const AudiovisualWorkStateSchema = z.enum([
  'SOURCE_LOCKED',
  'SPEC_APPROVED',
  'BEATS_APPROVED',
  'VISUAL_SYSTEM_APPROVED',
  'REGISTRY_APPROVED',
  'BUILD_VALIDATED',
  'REVIEW_SHOTS_APPROVED',
  'RENDER_VALIDATED',
  'POSTPRODUCTION_VALIDATED',
  'GUARDIAN_PASS',
  'HUMAN_APPROVED',
  'READY',
]);

export const AnyWorkStateSchema = z.union([GlobalWorkStateSchema, AudiovisualWorkStateSchema]);

export const SourceLicenseSchema = z.strictObject({
  status: z.enum(['unknown', 'verified', 'restricted', 'not-applicable']),
  spdxId: z.string().min(1).optional(),
  evidenceRef: PortableRefSchema.optional(),
});

export const SourceRightsSchema = z.strictObject({
  status: z.enum(['unknown', 'cleared', 'restricted', 'expired']),
  allowedUses: z.array(z.string().min(1)).max(32),
  evidenceRef: PortableRefSchema.optional(),
  expiresAt: TimestampSchema.optional(),
});

export const PrivateLocatorRefSchema = z.strictObject({
  schemaVersion: z.literal('private-locator-ref-v1'),
  privateReceiptId: PortableIdSchema,
  locatorDigest: Sha256Schema,
  storageClass: z.literal('work-private-ignored'),
});

export const VersionedSourceSchema = z
  .strictObject({
    schemaVersion: z.literal('versioned-source-v1'),
    sourceId: PortableIdSchema,
    logicalSourceId: PortableIdSchema,
    version: z.string().min(1).max(80),
    sourceClass: z.enum([
      'methodology_reference',
      'technical_authority',
      'promotional_unverified',
      'first_party',
      'source_evidence_only',
    ]),
    mediaType: z.string().min(1).max(160),
    status: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
    authority: z.enum(['primary', 'secondary', 'promotional_unverified', 'unknown']),
    publicUrl: z.url().optional(),
    privateLocatorRef: PrivateLocatorRefSchema.optional(),
    rawSha256: Sha256Schema,
    normalizedSha256: Sha256Schema,
    license: SourceLicenseSchema,
    rights: SourceRightsSchema,
    owner: z.string().min(1).max(160),
    observedAt: TimestampSchema,
    importReceiptIds: z.array(PortableIdSchema).min(1),
    metadata: JsonObjectSchema.optional(),
  })
  .superRefine((source, context) => {
    if (source.publicUrl === undefined && source.privateLocatorRef === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A public URL or a private locator reference is required',
        path: ['privateLocatorRef'],
      });
    }

    if (source.status !== 'active') {
      return;
    }

    if (source.license.status === 'unknown') {
      context.addIssue({
        code: 'custom',
        message: 'An active source cannot have an unknown license',
        path: ['license', 'status'],
      });
    }
    if (source.rights.status !== 'cleared') {
      context.addIssue({
        code: 'custom',
        message: 'An active source requires cleared rights',
        path: ['rights', 'status'],
      });
    }
    if (source.authority === 'unknown' || source.authority === 'promotional_unverified') {
      context.addIssue({
        code: 'custom',
        message: 'An active source requires a verified authority classification',
        path: ['authority'],
      });
    }
  });

const GroundedNotebookPolicySchema = z.strictObject({
  mode: z.literal('grounded'),
  sourceIds: z.array(PortableIdSchema).min(1),
  coverage: z.enum(['full', 'partial']),
  coverageGaps: z.array(z.string().min(1)).max(128),
});

const NoNotebookPolicySchema = z.strictObject({
  mode: z.literal('none'),
  reason: z.string().min(1).max(500),
});

export const NotebookBindingSchema = z.strictObject({
  schemaVersion: z.literal('notebook-binding-v1'),
  bindingId: PortableIdSchema,
  provider: z.string().min(1).max(80),
  notebookRef: PortableRefSchema,
  accessMode: z.literal('read-only'),
  purpose: z.string().min(1).max(500),
  questionPolicy: z.string().min(1).max(1000),
  sourcePolicy: z.discriminatedUnion('mode', [
    GroundedNotebookPolicySchema,
    NoNotebookPolicySchema,
  ]),
  observedAt: TimestampSchema,
});

export const WorkProductSchema = z.strictObject({
  schemaVersion: z.literal('work-product-v1'),
  artifactId: PortableIdSchema,
  artifactType: z.string().min(1).max(120),
  version: z.string().min(1).max(80),
  contentHash: Sha256Schema,
  producerActorId: ActorIdSchema,
  state: GlobalWorkStateSchema,
  sourceIds: z.array(PortableIdSchema),
  claimIds: z.array(PortableIdSchema),
  notebookBindingIds: z.array(PortableIdSchema),
  metadata: JsonObjectSchema,
});

export const ApprovalDecisionSchema = z.enum(['approved', 'rejected', 'changes_requested']);

export const CANONICAL_GUARDIAN_ACTOR_ID = 'RT-11' as const;
export const CANONICAL_HUMAN_APPROVER_ACTOR_ID = 'H01' as const;

export const ApprovalSchema = z
  .strictObject({
    schemaVersion: z.literal('approval-v1'),
    approvalId: PortableIdSchema,
    artifactId: PortableIdSchema,
    artifactVersion: z.string().min(1).max(80),
    artifactHash: Sha256Schema,
    fromState: AnyWorkStateSchema,
    toState: AnyWorkStateSchema,
    decision: ApprovalDecisionSchema,
    producerActorId: ActorIdSchema,
    approverActorId: ActorIdSchema,
    approverRole: z.enum(['committee', 'guardian', 'human', 'release-owner']),
    conditions: z.array(z.string().min(1)).max(64),
    risksAccepted: z.array(z.string().min(1)).max(64),
    evidenceHashes: z.array(Sha256Schema).min(1),
    decidedAt: TimestampSchema,
  })
  .superRefine((approval, context) => {
    if (approval.producerActorId === approval.approverActorId) {
      context.addIssue({
        code: 'custom',
        message: 'Producer and approver must be different actors',
        path: ['approverActorId'],
      });
    }
    if (
      approval.producerActorId === CANONICAL_GUARDIAN_ACTOR_ID ||
      approval.producerActorId === CANONICAL_HUMAN_APPROVER_ACTOR_ID
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Producer cannot be the canonical Guardian or human approver.',
        path: ['producerActorId'],
      });
    }
    if (
      approval.approverRole === 'human' &&
      approval.approverActorId !== CANONICAL_HUMAN_APPROVER_ACTOR_ID
    ) {
      context.addIssue({
        code: 'custom',
        message: `Human approvals must be issued by ${CANONICAL_HUMAN_APPROVER_ACTOR_ID}.`,
        path: ['approverActorId'],
      });
    }
    if (
      approval.approverRole === 'guardian' &&
      approval.approverActorId !== CANONICAL_GUARDIAN_ACTOR_ID
    ) {
      context.addIssue({
        code: 'custom',
        message: `Guardian approvals must be issued by ${CANONICAL_GUARDIAN_ACTOR_ID}.`,
        path: ['approverActorId'],
      });
    }
    if (
      approval.approverActorId === CANONICAL_HUMAN_APPROVER_ACTOR_ID &&
      approval.approverRole !== 'human'
    ) {
      context.addIssue({
        code: 'custom',
        message: `${CANONICAL_HUMAN_APPROVER_ACTOR_ID} cannot act outside the human approver role.`,
        path: ['approverRole'],
      });
    }
    if (
      approval.approverActorId === CANONICAL_GUARDIAN_ACTOR_ID &&
      approval.approverRole !== 'guardian'
    ) {
      context.addIssue({
        code: 'custom',
        message: `${CANONICAL_GUARDIAN_ACTOR_ID} cannot act outside the Guardian role.`,
        path: ['approverRole'],
      });
    }
  });

export const ToolchainSchema = z.strictObject({
  node: z.string().min(1),
  packageManager: z.string().min(1),
  remotion: z.string().min(1),
  chromium: z.string().min(1),
  ffmpeg: z.string().min(1),
  locale: z.string().min(1),
  timezone: z.string().min(1),
});

export const ReceiptStatusSchema = z.enum(['succeeded', 'failed']);

const RenderReceiptFields = {
  receiptId: PortableIdSchema,
  idempotencyKey: z.string().min(16).max(256),
  artifactId: PortableIdSchema,
  artifactHash: Sha256Schema,
  compositionId: PortableIdSchema,
  inputPropsRef: RelativePathSchema,
  inputPropsHash: Sha256Schema,
  assetManifestRef: RelativePathSchema,
  assetManifestHash: Sha256Schema,
  toolchain: ToolchainSchema,
  output: z.strictObject({
    ref: RelativePathSchema,
    sha256: Sha256Schema,
    normalizedPixelDigest: Sha256Schema,
    normalizedPcmDigest: Sha256Schema.optional(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    durationFrames: z.number().int().positive(),
    codec: z.string().min(1),
    streams: z.array(z.enum(['audio', 'video'])).min(1),
  }),
  mode: z.enum(['smoke', 'review', 'final']),
  status: ReceiptStatusSchema,
  logRefs: z.array(RelativePathSchema),
  createdAt: TimestampSchema,
} as const;

export const LegacyRenderReceiptSchema = z.strictObject({
  schemaVersion: z.literal('render-receipt-v1'),
  ...RenderReceiptFields,
});

export const SupersedingRenderReceiptSchema = z.strictObject({
  schemaVersion: z.literal('render-receipt-v2'),
  ...RenderReceiptFields,
  supersedes: z.strictObject({
    eventType: z.literal('SUPERSEDES'),
    priorReceiptId: PortableIdSchema,
    priorReceiptRef: RelativePathSchema,
    priorReceiptSha256: Sha256Schema,
    migrationEventRef: RelativePathSchema,
    historyWasImmutable: z.literal(false),
    reason: z.literal('PORTABLE_EVIDENCE_V2_REQUIRES_NEW_APPEND_ONLY_RECEIPT'),
  }),
});

export const RenderReceiptSchema = z.discriminatedUnion('schemaVersion', [
  LegacyRenderReceiptSchema,
  SupersedingRenderReceiptSchema,
]);

export const ReleaseReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal('release-receipt-v1'),
    receiptId: PortableIdSchema,
    idempotencyKey: z.string().min(16).max(256),
    artifactId: PortableIdSchema,
    artifactHash: Sha256Schema,
    approvalReceiptId: PortableIdSchema,
    approvalReceiptHash: Sha256Schema,
    destinationRef: PortableRefSchema,
    dryRun: z.boolean(),
    status: z.enum(['proposed', 'authorized', 'published', 'failed']),
    callbackPolicyRef: PortableRefSchema,
    retryPolicyRef: PortableRefSchema,
    rollbackRef: PortableRefSchema.optional(),
    outputHash: Sha256Schema.optional(),
    logRefs: z.array(RelativePathSchema),
    createdAt: TimestampSchema,
  })
  .superRefine((receipt, context) => {
    if (receipt.status !== 'published') {
      return;
    }
    if (receipt.dryRun) {
      context.addIssue({
        code: 'custom',
        message: 'A published receipt cannot be a dry run',
        path: ['dryRun'],
      });
    }
    if (receipt.rollbackRef === undefined || receipt.outputHash === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Published releases require rollback and output hash evidence',
        path: ['status'],
      });
    }
  });

export const HandoffOutputSchema = z.strictObject({
  path: RelativePathSchema,
  sha256: Sha256Schema,
});

export const HandoffTestSchema = z.strictObject({
  command: z.string().min(1).max(1000),
  status: z.enum(['passed', 'failed', 'not-run']),
  exitCode: z.number().int().nullable(),
  evidenceRef: RelativePathSchema.optional(),
});

export const HandoffSchema = z.strictObject({
  schemaVersion: z.literal('handoff-v1'),
  handoffId: PortableIdSchema,
  packageId: PortableIdSchema,
  producerActorId: ActorIdSchema,
  consumerActorId: ActorIdSchema,
  baseCommit: Sha256Schema,
  sourceSnapshotId: PortableIdSchema,
  inputRefs: z.array(PortableRefSchema),
  outputs: z.array(HandoffOutputSchema).min(1),
  claims: z.array(z.string().min(1)),
  mutations: z.array(RelativePathSchema),
  tests: z.array(HandoffTestSchema),
  decision: z.enum(['accepted', 'revise', 'blocked']),
  risks: z.array(z.string().min(1)),
  coverageGaps: z.array(z.string().min(1)),
  nextGate: PortableIdSchema,
  timestamp: TimestampSchema,
});

export type Approval = z.infer<typeof ApprovalSchema>;
export type AudiovisualWorkState = z.infer<typeof AudiovisualWorkStateSchema>;
export type GlobalWorkState = z.infer<typeof GlobalWorkStateSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type NotebookBinding = z.infer<typeof NotebookBindingSchema>;
export type PrivateLocatorRef = z.infer<typeof PrivateLocatorRefSchema>;
export type ReleaseReceipt = z.infer<typeof ReleaseReceiptSchema>;
export type RenderReceipt = z.infer<typeof RenderReceiptSchema>;
export type VersionedSource = z.infer<typeof VersionedSourceSchema>;
export type WorkProduct = z.infer<typeof WorkProductSchema>;
