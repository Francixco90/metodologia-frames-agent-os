import {z} from 'zod';

import {
  ActorIdSchema,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from './primitives.ts';
import {containsProhibitedReasoningText} from './reasoning-safety.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);
const ShortTextSchema = z.string().trim().min(1).max(240);

export const PublicPlanErrorCodeV1Schema = z.enum([
  'SOURCE_GAP',
  'BRAND_PROFILE_MISSING',
  'BRAND_DRIFT',
  'VOICE_PROFILE_MISSING',
  'CHANNEL_PROFILE_MISSING',
  'CHANNEL_PROFILE_STALE',
  'CONTENT_TYPE_UNREGISTERED',
  'PLUGIN_UNAVAILABLE',
  'RENDERER_UNAVAILABLE',
  'RIGHTS_UNRESOLVED',
  'ACCESSIBILITY_FAILED',
  'CLAIM_MISMATCH',
  'RIGHTS_GAP',
  'OWNERSHIP_CONFLICT',
  'HASH_MISMATCH',
  'COMMITTEE_INCOMPLETE',
  'VERIFIER_REQUIRED',
  'GUARDIAN_REQUIRED',
  'HUMAN_APPROVAL_REQUIRED',
  'APPROVAL_REQUIRED',
  'PUBLICATION_FORBIDDEN',
  'MEMORY_WRITE_FORBIDDEN',
  'MAX_CONCURRENCY_EXCEEDED',
  'RETRY_LIMIT_EXCEEDED',
  'ITERATION_BUDGET_EXCEEDED',
  'UNKNOWN_FIELD',
  'INVALID_STATE_TRANSITION',
  'PRIVATE_REASONING_FORBIDDEN',
]);

export type PublicPlanErrorCodeV1 = z.infer<typeof PublicPlanErrorCodeV1Schema>;

export const ApprovalStateV1Schema = z.enum([
  'unapproved',
  'committee_approved',
  'guardian_pass',
  'human_approved',
]);

const addUniqueIssue = (
  values: readonly string[],
  context: z.core.$RefinementCtx,
  path: PropertyKey[],
  message: string,
): void => {
  if (new Set(values).size !== values.length) {
    context.addIssue({code: 'custom', message, path});
  }
};

const rejectPrivateReasoning = (
  value: unknown,
  context: z.core.$RefinementCtx,
  path: PropertyKey[] = [],
): void => {
  if (containsProhibitedReasoningText(value)) {
    context.addIssue({
      code: 'custom',
      message: 'Durable contracts cannot persist private reasoning or chain-of-thought.',
      path,
    });
  }
};

/**
 * A portable reference whose target bytes are locked by a lowercase SHA-256
 * digest. The referenced file is still verified by the runtime/check script.
 */
export const HashBoundReferenceV1Schema = z.strictObject({
  schemaVersion: z.literal('hash-bound-ref-v1'),
  ref: RelativePathSchema,
  sha256: Sha256Schema,
});

export type HashBoundReferenceV1 = z.infer<typeof HashBoundReferenceV1Schema>;

const ClaimBindingV1Schema = z.strictObject({
  claimId: PortableIdSchema,
  sourceId: PortableIdSchema,
  evidenceRef: HashBoundReferenceV1Schema,
});

const RequestedVariantV1Schema = z.strictObject({
  variantId: PortableIdSchema,
  channelId: PortableIdSchema,
  surface: z.enum(['feed', 'story', 'reel', 'short', 'article', 'email', 'web']),
  locale: z.string().trim().min(2).max(35),
});

export const ContentWorkOrderV2Schema = z
  .strictObject({
    schemaVersion: z.literal('content-work-order-v2'),
    workOrderId: PortableIdSchema,
    projectId: PortableIdSchema,
    contentTypeId: PortableIdSchema,
    requestedByActorId: ActorIdSchema,
    producerActorInstanceId: ActorIdSchema,
    sourceSnapshotId: PortableIdSchema,
    sourceSnapshotSha256: Sha256Schema,
    brandProfile: HashBoundReferenceV1Schema,
    voiceProfile: HashBoundReferenceV1Schema,
    channelProfile: HashBoundReferenceV1Schema,
    objective: NonEmptyTextSchema,
    audience: NonEmptyTextSchema,
    editorialPattern: z.enum([
      'educational',
      'how-to',
      'insight',
      'data',
      'case',
      'offer',
      'community',
      'curation',
    ]),
    locale: z.string().trim().min(2).max(35),
    claimBindings: z.array(ClaimBindingV1Schema).min(1).max(64),
    requestedVariants: z.array(RequestedVariantV1Schema).min(1).max(32),
    riskTier: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    approvalState: ApprovalStateV1Schema,
    publicationPolicy: z.literal('forbidden'),
    createdAt: TimestampSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((workOrder, context) => {
    addUniqueIssue(
      workOrder.claimBindings.map(({claimId}) => claimId),
      context,
      ['claimBindings'],
      'Claim bindings must use unique claim IDs.',
    );
    addUniqueIssue(
      workOrder.requestedVariants.map(({variantId}) => variantId),
      context,
      ['requestedVariants'],
      'Requested variants must use unique variant IDs.',
    );
    rejectPrivateReasoning(workOrder, context);
  });

export type ContentWorkOrderV2 = z.infer<typeof ContentWorkOrderV2Schema>;

const EditorialSupportV1Schema = z.strictObject({
  supportId: PortableIdSchema,
  claimId: PortableIdSchema,
  statement: NonEmptyTextSchema,
  evidenceRef: HashBoundReferenceV1Schema,
});

export const CanonicalEditorialUnitV1Schema = z
  .strictObject({
    schemaVersion: z.literal('canonical-editorial-unit-v1'),
    editorialUnitId: PortableIdSchema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    contentTypeId: PortableIdSchema,
    sourceSnapshotId: PortableIdSchema,
    sourceSnapshotSha256: Sha256Schema,
    brandProfile: HashBoundReferenceV1Schema,
    voiceProfile: HashBoundReferenceV1Schema,
    channelProfile: HashBoundReferenceV1Schema,
    locale: z.string().trim().min(2).max(35),
    thesis: NonEmptyTextSchema,
    hook: NonEmptyTextSchema,
    supports: z.array(EditorialSupportV1Schema).min(2).max(3),
    callToAction: z.strictObject({
      label: ShortTextSchema,
      intent: z.enum(['learn', 'reflect', 'save', 'share', 'reply', 'visit']),
      destinationRef: HashBoundReferenceV1Schema.optional(),
    }),
    assumptions: z.array(NonEmptyTextSchema).max(32),
    coverageGaps: z.array(NonEmptyTextSchema).max(32),
    producerActorInstanceId: ActorIdSchema,
    createdAt: TimestampSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((unit, context) => {
    addUniqueIssue(
      unit.supports.map(({supportId}) => supportId),
      context,
      ['supports'],
      'Editorial supports must use unique support IDs.',
    );
    addUniqueIssue(
      unit.supports.map(({claimId}) => claimId),
      context,
      ['supports'],
      'Editorial supports must use unique claim IDs.',
    );
    rejectPrivateReasoning(unit, context);
  });

export type CanonicalEditorialUnitV1 = z.infer<typeof CanonicalEditorialUnitV1Schema>;

const DistributionSurfaceV1Schema = z.strictObject({
  surface: z.enum(['feed', 'story', 'reel', 'short', 'article', 'email', 'web']),
  required: z.boolean(),
  aspectRatio: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*:[1-9][0-9]*$/u)
    .optional(),
  maxCharacters: z.number().int().positive().optional(),
});

const ContentTypeOutputV1Schema = z.strictObject({
  outputId: PortableIdSchema,
  mediaType: z.string().trim().min(1).max(160),
  extension: z
    .string()
    .trim()
    .regex(/^\.[a-z0-9]{1,12}$/u),
  required: z.boolean(),
});

const ContentTypeGateV1Schema = z.strictObject({
  gateId: PortableIdSchema,
  order: z.number().int().nonnegative(),
  required: z.boolean(),
  acceptanceContractRef: HashBoundReferenceV1Schema,
});

const ContentTypeFixtureV1Schema = z.strictObject({
  fixtureId: PortableIdSchema,
  purpose: ShortTextSchema,
  fixtureRef: HashBoundReferenceV1Schema,
});

export const ContentTypeDefinitionV1Schema = z
  .strictObject({
    schemaVersion: z.literal('content-type-definition-v1'),
    contentTypeId: PortableIdSchema,
    version: z.string().trim().min(1).max(80),
    title: ShortTextSchema,
    kind: z.enum(['STATIC_SINGLE', 'STATIC_SEQUENCE', 'MOTION', 'TEXT', 'LIVE']),
    canonicalInputSchema: RelativePathSchema,
    pluginRef: HashBoundReferenceV1Schema,
    rendererRef: HashBoundReferenceV1Schema,
    outputs: z.array(ContentTypeOutputV1Schema).min(1).max(32),
    gates: z.array(ContentTypeGateV1Schema).min(1).max(32),
    fixtures: z.array(ContentTypeFixtureV1Schema).min(1).max(64),
    distributionSurfaces: z.array(DistributionSurfaceV1Schema).min(1).max(32),
    requiredSpecialistRoleIds: z
      .array(
        z.enum(['RT-02', 'RT-03', 'RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-08', 'RT-09', 'RT-10']),
      )
      .min(1)
      .max(9),
    minimumVariants: z.number().int().positive().max(32),
    maximumVariants: z.number().int().positive().max(32),
    committeePattern: z.literal('two-plus-two-plus-one'),
    implementationState: z.enum(['planned', 'active_candidate']),
    publicationPolicy: z.literal('forbidden'),
    definitionSha256: Sha256Schema,
  })
  .superRefine((definition, context) => {
    if (definition.minimumVariants > definition.maximumVariants) {
      context.addIssue({
        code: 'custom',
        message: 'minimumVariants cannot exceed maximumVariants.',
        path: ['minimumVariants'],
      });
    }
    addUniqueIssue(
      definition.distributionSurfaces.map(({surface}) => surface),
      context,
      ['distributionSurfaces'],
      'Distribution surfaces must be unique.',
    );
    addUniqueIssue(
      definition.outputs.map(({outputId}) => outputId),
      context,
      ['outputs'],
      'Content type output IDs must be unique.',
    );
    addUniqueIssue(
      definition.gates.map(({gateId}) => gateId),
      context,
      ['gates'],
      'Content type gate IDs must be unique.',
    );
    addUniqueIssue(
      definition.gates.map(({order}) => String(order)),
      context,
      ['gates'],
      'Content type gate order values must be unique.',
    );
    addUniqueIssue(
      definition.fixtures.map(({fixtureId}) => fixtureId),
      context,
      ['fixtures'],
      'Content type fixture IDs must be unique.',
    );
    addUniqueIssue(
      definition.requiredSpecialistRoleIds,
      context,
      ['requiredSpecialistRoleIds'],
      'Required specialist roles must be unique.',
    );
    rejectPrivateReasoning(definition, context);
  });

export type ContentTypeDefinitionV1 = z.infer<typeof ContentTypeDefinitionV1Schema>;

const DistributionAssetV1Schema = z.strictObject({
  assetId: PortableIdSchema,
  assetRef: HashBoundReferenceV1Schema,
  mediaType: z.string().trim().min(1).max(160),
});

const AdaptationDiffEntryV1Schema = z.strictObject({
  field: PortableIdSchema,
  change: NonEmptyTextSchema,
  rationale: NonEmptyTextSchema,
});

export const DistributionVariantV1Schema = z
  .strictObject({
    schemaVersion: z.literal('distribution-variant-v1'),
    variantId: PortableIdSchema,
    editorialUnitId: PortableIdSchema,
    editorialUnitSha256: Sha256Schema,
    contentTypeId: PortableIdSchema,
    contentTypeDefinitionSha256: Sha256Schema,
    channelId: PortableIdSchema,
    channelProfile: HashBoundReferenceV1Schema,
    surface: z.enum(['feed', 'story', 'reel', 'short', 'article', 'email', 'web']),
    locale: z.string().trim().min(2).max(35),
    adaptationKind: z.enum(['direct', 'condensed', 'expanded', 'sequenced', 'motion']),
    copy: NonEmptyTextSchema,
    adaptationDiff: z.array(AdaptationDiffEntryV1Schema).min(1).max(32),
    altTextRef: HashBoundReferenceV1Schema,
    claimIds: z.array(PortableIdSchema).min(1).max(64),
    assets: z.array(DistributionAssetV1Schema).max(64),
    status: z.enum(['draft', 'validated']),
    approvalState: ApprovalStateV1Schema,
    publishAllowed: z.literal(false),
    producerActorInstanceId: ActorIdSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((variant, context) => {
    addUniqueIssue(
      variant.claimIds,
      context,
      ['claimIds'],
      'Distribution variant claim IDs must be unique.',
    );
    addUniqueIssue(
      variant.assets.map(({assetId}) => assetId),
      context,
      ['assets'],
      'Distribution variant asset IDs must be unique.',
    );
    rejectPrivateReasoning(variant, context);
  });

export type DistributionVariantV1 = z.infer<typeof DistributionVariantV1Schema>;

const CandidateArtifactV2Schema = z.strictObject({
  artifactId: PortableIdSchema,
  artifactType: z.string().trim().min(1).max(120),
  binding: HashBoundReferenceV1Schema,
});

export const CandidatePackageV2Schema = z
  .strictObject({
    schemaVersion: z.literal('candidate-package-v2'),
    candidatePackageId: PortableIdSchema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    editorialUnitId: PortableIdSchema,
    editorialUnitSha256: Sha256Schema,
    proposalActorInstanceId: ActorIdSchema,
    producerActorInstanceId: ActorIdSchema,
    artifacts: z.array(CandidateArtifactV2Schema).min(1).max(64),
    variants: z.array(HashBoundReferenceV1Schema).min(1).max(32),
    evidence: z.array(HashBoundReferenceV1Schema).min(1).max(64),
    assumptions: z.array(NonEmptyTextSchema).max(32),
    risks: z.array(NonEmptyTextSchema).max(32),
    coverageGaps: z.array(NonEmptyTextSchema).max(32),
    state: z.literal('RENDERED_DRAFT'),
    specRef: HashBoundReferenceV1Schema,
    assetManifestRef: HashBoundReferenceV1Schema,
    renderManifestRef: HashBoundReferenceV1Schema,
    receiptRefs: z.array(HashBoundReferenceV1Schema).min(1).max(32),
    qaRefs: z.array(HashBoundReferenceV1Schema).min(1).max(32),
    publicationPolicy: z.literal('forbidden'),
    createdAt: TimestampSchema,
    packageSha256: Sha256Schema,
  })
  .superRefine((candidate, context) => {
    addUniqueIssue(
      candidate.artifacts.map(({artifactId}) => artifactId),
      context,
      ['artifacts'],
      'Candidate artifact IDs must be unique.',
    );
    if (candidate.producerActorInstanceId === 'RT-11') {
      context.addIssue({
        code: 'custom',
        message: 'RT-11 cannot produce a candidate package.',
        path: ['producerActorInstanceId'],
      });
    }
    rejectPrivateReasoning(candidate, context);
  });

export type CandidatePackageV2 = z.infer<typeof CandidatePackageV2Schema>;

export const OrchestrationErrorCodeV2Schema = z.enum([
  'ORCH_V2_AGENT_CONTRACT_INVALID',
  'ORCH_V2_COMMITTEE_ACTOR_UNIQUENESS',
  'ORCH_V2_COMMITTEE_CARDINALITY',
  'ORCH_V2_CROSS_REVIEW_COVERAGE',
  'ORCH_V2_GUARDIAN_REVIEW_LIMIT',
  'ORCH_V2_HASH_MISMATCH',
  'ORCH_V2_HUMAN_APPROVAL_REQUIRED',
  'ORCH_V2_MAX_CONCURRENCY',
  'ORCH_V2_MEMORY_BEFORE_HUMAN_APPROVAL',
  'ORCH_V2_PRIVATE_REASONING',
  'ORCH_V2_PUBLICATION_FORBIDDEN',
  'ORCH_V2_RETRY_LIMIT',
  'ORCH_V2_ROLE_ORDER',
  'ORCH_V2_ROLE_SEPARATION',
  'ORCH_V2_STATE_TRANSITION',
]);

export type OrchestrationErrorCodeV2 = z.infer<typeof OrchestrationErrorCodeV2Schema>;

const OrchestrationEventDecisionV2Schema = z.strictObject({
  status: z.enum(['accepted', 'rejected', 'changes_requested', 'not_applicable']),
  summary: z.string().trim().min(1).max(1_000),
});

const OrchestrationEventErrorV2Schema = z.strictObject({
  publicCode: PublicPlanErrorCodeV1Schema,
  internalCode: OrchestrationErrorCodeV2Schema,
  summary: z.string().trim().min(1).max(1_000),
});

export const OrchestrationEventV2Schema = z
  .strictObject({
    schemaVersion: z.literal('orchestration-event-v2'),
    eventId: PortableIdSchema,
    sequence: z.number().int().nonnegative(),
    eventType: z.enum([
      'RUN_STARTED',
      'SPECIALIST_STARTED',
      'SPECIALIST_COMPLETED',
      'SPECIALIST_RETRY_RECORDED',
      'COMMITTEE_DECIDED',
      'CANDIDATE_PACKAGE_ACCEPTED',
      'VERIFIER_COMPLETED',
      'GUARDIAN_REVIEWED',
      'HUMAN_APPROVAL_RECORDED',
      'MEMORY_WRITE_AUTHORIZED',
      'RUN_BLOCKED',
    ]),
    actorInstanceId: ActorIdSchema,
    roleId: z.enum([
      'RT-01',
      'RT-02',
      'RT-03',
      'RT-04',
      'RT-05',
      'RT-06',
      'RT-07',
      'RT-08',
      'RT-09',
      'RT-10',
      'RT-11',
      'H01',
    ]),
    summary: z.string().trim().min(1).max(1_000),
    inputHashes: z.array(Sha256Schema).max(64),
    outputHashes: z.array(Sha256Schema).max(64),
    toolId: PortableIdSchema,
    decision: OrchestrationEventDecisionV2Schema.nullable(),
    error: OrchestrationEventErrorV2Schema.nullable(),
    timestamp: TimestampSchema,
    previousEventSha256: Sha256Schema.nullable(),
    eventSha256: Sha256Schema,
  })
  .superRefine((event, context) => rejectPrivateReasoning(event, context));

export type OrchestrationEventV2 = z.infer<typeof OrchestrationEventV2Schema>;

const SpecialistRunV2Schema = z.strictObject({
  roleId: z.enum(['RT-02', 'RT-03', 'RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-08', 'RT-09', 'RT-10']),
  actorInstanceId: ActorIdSchema,
  status: z.enum(['queued', 'active', 'completed', 'failed']),
  retryCount: z.number().int().min(0).max(3),
  outputSha256: Sha256Schema.optional(),
});

const GuardianReviewV2Schema = z.strictObject({
  reviewNumber: z.number().int().min(1).max(2),
  guardianActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  producerActorInstanceId: ActorIdSchema,
  candidatePackageId: PortableIdSchema,
  candidatePackageSha256: Sha256Schema,
  decision: z.enum(['pass', 'fail', 'changes_requested']),
  evidenceHashes: z.array(Sha256Schema).min(1).max(64),
  reviewedAt: TimestampSchema,
});

export const WorkflowPilotApprovalV1Schema = z
  .strictObject({
    schemaVersion: z.literal('workflow-pilot-approval-v1'),
    approvalId: PortableIdSchema,
    runId: PortableIdSchema,
    runSha256: Sha256Schema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    candidatePackageId: PortableIdSchema,
    candidatePackageSha256: Sha256Schema,
    approverActorInstanceId: z.literal('H01'),
    approverRole: z.literal('human'),
    decision: z.enum(['approved', 'rejected', 'changes_requested']),
    approvalScope: z.literal('workflow-pilot'),
    memoryWriteAuthorized: z.boolean(),
    publicationAuthorized: z.literal(false),
    conditions: z.array(NonEmptyTextSchema).max(32),
    evidenceHashes: z.array(Sha256Schema).min(1).max(64),
    decidedAt: TimestampSchema,
  })
  .superRefine((approval, context) => {
    if (approval.memoryWriteAuthorized && approval.decision !== 'approved') {
      context.addIssue({
        code: 'custom',
        message: 'Memory writes require an approved human workflow-pilot decision.',
        path: ['memoryWriteAuthorized'],
      });
    }
    rejectPrivateReasoning(approval, context);
  });

export type WorkflowPilotApprovalV1 = z.infer<typeof WorkflowPilotApprovalV1Schema>;

export const OrchestrationRunV2Schema = z
  .strictObject({
    schemaVersion: z.literal('orchestration-run-v2'),
    runId: PortableIdSchema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    orchestratorAgentId: z.literal('CreativeOrchestratorV2'),
    orchestratorActorInstanceId: ActorIdSchema,
    producerActorInstanceId: ActorIdSchema,
    guardianAgentId: z.literal('GuardianV2'),
    guardianActorInstanceId: ActorIdSchema,
    maxConcurrency: z.literal(2),
    maxRetries: z.literal(3),
    maxGuardianReviews: z.literal(2),
    state: z.enum([
      'planned',
      'specialists_running',
      'committee_review',
      'verification',
      'guardian_review',
      'awaiting_human_approval',
      'human_approved',
      'blocked',
    ]),
    specialists: z.array(SpecialistRunV2Schema).min(2).max(9),
    activeActorInstanceIds: z.array(ActorIdSchema).max(2),
    committeeProposalIds: z.array(PortableIdSchema).max(5),
    selectedCommitteeProposalId: PortableIdSchema.optional(),
    selectedProposalActorInstanceId: ActorIdSchema.optional(),
    committeeTrace: z
      .strictObject({
        compositionPattern: z.literal('two-plus-two-plus-one'),
        executionWaves: z.tuple([z.literal(2), z.literal(2), z.literal(1)]),
        uniqueActorInstanceCount: z.literal(5),
        proposalCount: z.literal(5),
        crossEvaluationCount: z.literal(20),
        privateReasoningPersisted: z.literal(false),
        decisionSha256: Sha256Schema,
      })
      .optional(),
    candidatePackageBinding: z
      .strictObject({
        candidatePackageId: PortableIdSchema,
        packageSha256: Sha256Schema,
      })
      .optional(),
    guardianReviews: z.array(GuardianReviewV2Schema).max(2),
    workflowPilotApproval: WorkflowPilotApprovalV1Schema.optional(),
    memoryWriteState: z.enum(['forbidden_pending_human', 'authorized']),
    publicationPolicy: z.literal('forbidden'),
    events: z.array(OrchestrationEventV2Schema).min(1),
    updatedAt: TimestampSchema,
    runSha256: Sha256Schema,
  })
  .superRefine((run, context) => {
    addUniqueIssue(
      run.specialists.map(({roleId}) => roleId),
      context,
      ['specialists'],
      'Orchestration run must contain each ephemeral specialist role exactly once.',
    );
    if (!run.specialists.some(({roleId}) => roleId === 'RT-09')) {
      context.addIssue({
        code: 'custom',
        message: 'Every material run requires the independent RT-09 verifier.',
        path: ['specialists'],
      });
    }
    addUniqueIssue(
      run.specialists.map(({actorInstanceId}) => actorInstanceId),
      context,
      ['specialists'],
      'Specialist actor instance IDs must be unique.',
    );
    addUniqueIssue(
      run.activeActorInstanceIds,
      context,
      ['activeActorInstanceIds'],
      'Active actor instance IDs must be unique.',
    );
    if (
      run.guardianActorInstanceId === run.orchestratorActorInstanceId ||
      run.producerActorInstanceId === run.guardianActorInstanceId ||
      run.specialists.some(
        ({actorInstanceId}) =>
          actorInstanceId === run.guardianActorInstanceId ||
          actorInstanceId === run.orchestratorActorInstanceId,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Permanent and ephemeral actor instance IDs must be distinct.',
        path: ['specialists'],
      });
    }
    const eventIds = run.events.map(({eventId}) => eventId);
    addUniqueIssue(eventIds, context, ['events'], 'Event IDs must be append-only and unique.');
    for (const [index, event] of run.events.entries()) {
      if (event.sequence !== index) {
        context.addIssue({
          code: 'custom',
          message: 'Event sequence must be contiguous and zero-based.',
          path: ['events', index, 'sequence'],
        });
      }
      const expectedPreviousDigest = index === 0 ? null : run.events[index - 1]?.eventSha256;
      if (event.previousEventSha256 !== expectedPreviousDigest) {
        context.addIssue({
          code: 'custom',
          message: 'Event hash chain must bind every event to its immediate predecessor.',
          path: ['events', index, 'previousEventSha256'],
        });
      }
    }
    if (
      run.state !== 'planned' &&
      run.state !== 'specialists_running' &&
      run.committeeProposalIds.length !== 5
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Post-specialist states require exactly five committee proposals.',
        path: ['committeeProposalIds'],
      });
    }
    if (
      run.committeeProposalIds.length === 5 &&
      (run.selectedCommitteeProposalId === undefined ||
        !run.committeeProposalIds.includes(run.selectedCommitteeProposalId) ||
        run.selectedProposalActorInstanceId === undefined ||
        run.committeeTrace === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A complete committee decision must bind its selected proposal and actor.',
        path: ['selectedCommitteeProposalId'],
      });
    }
    const verifierEventIndex = run.events.findIndex(
      ({eventType}) => eventType === 'VERIFIER_COMPLETED',
    );
    for (const [eventIndex, event] of run.events.entries()) {
      if (
        event.eventType === 'GUARDIAN_REVIEWED' &&
        (verifierEventIndex < 0 || verifierEventIndex >= eventIndex)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Every Guardian review must occur after the RT-09 verifier event.',
          path: ['events', eventIndex],
        });
      }
    }
    if (
      ['guardian_review', 'awaiting_human_approval', 'human_approved'].includes(run.state) &&
      run.candidatePackageBinding === undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Verification and approval states require one hash-bound candidate package.',
        path: ['candidatePackageBinding'],
      });
    }
    if (
      run.memoryWriteState === 'authorized' &&
      !(
        run.workflowPilotApproval?.decision === 'approved' &&
        run.workflowPilotApproval.memoryWriteAuthorized
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Memory authorization requires an approved H01 workflow-pilot approval.',
        path: ['memoryWriteState'],
      });
    }
    rejectPrivateReasoning(run, context);
  });

export type OrchestrationRunV2 = z.infer<typeof OrchestrationRunV2Schema>;

/**
 * Removes a declared digest field so callers can hash the canonical payload
 * without creating a circular self-hash. Runtime code must compare the result
 * with the removed digest before accepting a hash-bound contract.
 */
export const withoutDeclaredSha256 = (
  value: object,
  digestField: string,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key !== digestField) {
      result[key] = item;
    }
  }
  return result;
};
