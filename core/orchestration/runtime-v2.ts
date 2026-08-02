import {z} from 'zod';

import {
  ContentWorkOrderV2Schema,
  OrchestrationRunV2Schema,
  WorkflowPilotApprovalV1Schema,
  type CandidatePackageV2,
  type OrchestrationErrorCodeV2,
  type OrchestrationEventV2,
  type OrchestrationRunV2,
  type WorkflowPilotApprovalV1,
} from '../contracts/index.ts';
import {
  ActorIdSchema,
  PortableIdSchema,
  Sha256Schema,
  TimestampSchema,
} from '../contracts/primitives.ts';
import {failOrchestration, publicErrorCodeFor} from './errors.ts';
import {
  computeDeclaredContractSha256,
  parseHashBoundCandidatePackageV2,
  parseHashBoundContentWorkOrderV2,
} from './hash-bound.ts';

export const EphemeralRoleIdV2Schema = z.enum([
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-09',
  'RT-10',
]);

export type EphemeralRoleIdV2 = z.infer<typeof EphemeralRoleIdV2Schema>;

const SpecialistInstanceV2Schema = z.strictObject({
  roleId: EphemeralRoleIdV2Schema,
  actorInstanceId: ActorIdSchema,
});

export const InitializeOrchestrationRunV2Schema = z
  .strictObject({
    runId: PortableIdSchema,
    workOrder: ContentWorkOrderV2Schema,
    orchestratorActorInstanceId: ActorIdSchema,
    guardianActorInstanceId: ActorIdSchema,
    specialistInstances: z.array(SpecialistInstanceV2Schema).min(2).max(9),
    createdAt: TimestampSchema,
  })
  .superRefine((input, context) => {
    const roleIds = input.specialistInstances.map(({roleId}) => roleId);
    if (new Set(roleIds).size !== roleIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'A material run can instantiate each specialist role at most once.',
        path: ['specialistInstances'],
      });
    }
    if (!roleIds.includes('RT-09')) {
      context.addIssue({
        code: 'custom',
        message: 'A material run must instantiate the independent RT-09 verifier.',
        path: ['specialistInstances'],
      });
    }
    const permanentAndSpecialistActorIds = [
      input.orchestratorActorInstanceId,
      input.guardianActorInstanceId,
      ...input.specialistInstances.map(({actorInstanceId}) => actorInstanceId),
    ];
    if (new Set(permanentAndSpecialistActorIds).size !== permanentAndSpecialistActorIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Every permanent and ephemeral actor instance ID must be unique.',
        path: ['specialistInstances'],
      });
    }
    if (
      input.workOrder.producerActorInstanceId === input.orchestratorActorInstanceId ||
      input.workOrder.producerActorInstanceId === input.guardianActorInstanceId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Producer must be distinct from orchestrator and Guardian.',
        path: ['workOrder', 'producerActorInstanceId'],
      });
    }
  });

export type InitializeOrchestrationRunV2 = z.infer<typeof InitializeOrchestrationRunV2Schema>;

const CommitteeProposalBindingV2Schema = z.strictObject({
  proposalId: PortableIdSchema,
  actorInstanceId: ActorIdSchema,
  proposalSha256: Sha256Schema,
});

export const CommitteeDecisionInputV2Schema = z
  .strictObject({
    proposalBindings: z.array(CommitteeProposalBindingV2Schema).length(5),
    selectedProposalId: PortableIdSchema,
    decisionSha256: Sha256Schema,
    trace: z.strictObject({
      executionWaves: z.tuple([z.literal(2), z.literal(2), z.literal(1)]),
      uniqueActorInstanceCount: z.literal(5),
      proposalCount: z.literal(5),
      crossEvaluationCount: z.literal(20),
      privateReasoningPersisted: z.literal(false),
    }),
    decidedAt: TimestampSchema,
  })
  .superRefine((decision, context) => {
    const proposalIds = decision.proposalBindings.map(({proposalId}) => proposalId);
    const actorIds = decision.proposalBindings.map(({actorInstanceId}) => actorInstanceId);
    if (new Set(proposalIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Committee proposals must use five unique proposal IDs.',
        path: ['proposalBindings'],
      });
    }
    if (new Set(actorIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Committee proposals must come from five unique actor instances.',
        path: ['proposalBindings'],
      });
    }
    if (!proposalIds.includes(decision.selectedProposalId)) {
      context.addIssue({
        code: 'custom',
        message: 'Selected proposal must belong to the committee.',
        path: ['selectedProposalId'],
      });
    }
  });

export type CommitteeDecisionInputV2 = z.infer<typeof CommitteeDecisionInputV2Schema>;

const GuardianReviewInputV2Schema = z.strictObject({
  producerActorInstanceId: ActorIdSchema,
  verifierActorInstanceId: ActorIdSchema,
  guardianActorInstanceId: ActorIdSchema,
  candidatePackageId: PortableIdSchema,
  candidatePackageSha256: Sha256Schema,
  decision: z.enum(['pass', 'fail', 'changes_requested']),
  evidenceHashes: z.array(Sha256Schema).min(1).max(64),
  reviewedAt: TimestampSchema,
});

export type GuardianReviewInputV2 = z.infer<typeof GuardianReviewInputV2Schema>;

type EventDraftV2 = Omit<
  OrchestrationEventV2,
  'schemaVersion' | 'eventId' | 'sequence' | 'timestamp' | 'previousEventSha256' | 'eventSha256'
>;

const clone = <T>(value: T): T => structuredClone(value);

const addEventHash = (event: Omit<OrchestrationEventV2, 'eventSha256'>): OrchestrationEventV2 => ({
  ...event,
  eventSha256: computeDeclaredContractSha256(event, 'eventSha256'),
});

const withRunSha256 = (
  input: Omit<OrchestrationRunV2, 'runSha256'> & {runSha256?: string},
): OrchestrationRunV2 => {
  const withoutHash = {...input};
  delete withoutHash.runSha256;
  return OrchestrationRunV2Schema.parse({
    ...withoutHash,
    runSha256: computeDeclaredContractSha256(withoutHash, 'runSha256'),
  });
};

export class CreativeOrchestrationRuntimeV2 {
  private run: OrchestrationRunV2;
  private acceptedCandidate: CandidatePackageV2 | undefined;

  public constructor(input: InitializeOrchestrationRunV2) {
    const initialization = InitializeOrchestrationRunV2Schema.parse(input);
    parseHashBoundContentWorkOrderV2(initialization.workOrder);

    const firstEvent = addEventHash({
      schemaVersion: 'orchestration-event-v2',
      eventId: `${initialization.runId}:event:0`,
      sequence: 0,
      eventType: 'RUN_STARTED',
      actorInstanceId: initialization.orchestratorActorInstanceId,
      roleId: 'RT-01',
      summary: 'Run V2 iniciado con publicación bloqueada y memoria pendiente de H01.',
      inputHashes: [initialization.workOrder.canonicalSha256],
      outputHashes: [],
      toolId: 'orchestrator.runtime-v2',
      decision: {status: 'accepted', summary: 'Contrato de arranque validado.'},
      error: null,
      timestamp: initialization.createdAt,
      previousEventSha256: null,
    });

    this.run = withRunSha256({
      schemaVersion: 'orchestration-run-v2',
      runId: initialization.runId,
      workOrderId: initialization.workOrder.workOrderId,
      workOrderSha256: initialization.workOrder.canonicalSha256,
      orchestratorAgentId: 'CreativeOrchestratorV2',
      orchestratorActorInstanceId: initialization.orchestratorActorInstanceId,
      producerActorInstanceId: initialization.workOrder.producerActorInstanceId,
      guardianAgentId: 'GuardianV2',
      guardianActorInstanceId: initialization.guardianActorInstanceId,
      maxConcurrency: 2,
      maxRetries: 3,
      maxGuardianReviews: 2,
      state: 'planned',
      specialists: initialization.specialistInstances.map(({roleId, actorInstanceId}) => ({
        roleId,
        actorInstanceId,
        status: 'queued',
        retryCount: 0,
      })),
      activeActorInstanceIds: [],
      committeeProposalIds: [],
      guardianReviews: [],
      memoryWriteState: 'forbidden_pending_human',
      publicationPolicy: 'forbidden',
      events: [firstEvent],
      updatedAt: initialization.createdAt,
    });
  }

  public snapshot(): OrchestrationRunV2 {
    return clone(this.run);
  }

  public startSpecialists(
    roleIdsInput: readonly EphemeralRoleIdV2[],
    timestampInput: string,
  ): OrchestrationRunV2 {
    const roleIds = z.array(EphemeralRoleIdV2Schema).min(1).max(2).parse(roleIdsInput);
    const timestamp = TimestampSchema.parse(timestampInput);
    if (new Set(roleIds).size !== roleIds.length) {
      failOrchestration('ORCH_V2_MAX_CONCURRENCY', 'A specialist cannot start twice.');
    }
    if (this.run.activeActorInstanceIds.length + roleIds.length > this.run.maxConcurrency) {
      failOrchestration(
        'ORCH_V2_MAX_CONCURRENCY',
        'The orchestration runtime allows at most two active specialists.',
      );
    }

    const startsVerifier = roleIds.includes('RT-09');
    if (
      startsVerifier &&
      (this.run.state !== 'verification' || this.run.candidatePackageBinding === undefined)
    ) {
      failOrchestration(
        'ORCH_V2_ROLE_ORDER',
        'RT-09 can start only after committee selection and candidate production.',
      );
    }
    if (
      roleIds.some((roleId) => roleId !== 'RT-09') &&
      this.run.state !== 'planned' &&
      this.run.state !== 'specialists_running'
    ) {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        'Producer specialists cannot start after committee selection.',
      );
    }
    if (!['planned', 'specialists_running', 'verification'].includes(this.run.state)) {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        `Specialists cannot start while the run is ${this.run.state}.`,
      );
    }

    const specialists = clone(this.run.specialists);
    const activated: Array<{actorInstanceId: string; roleId: EphemeralRoleIdV2}> = [];
    for (const roleId of roleIds) {
      const specialist =
        specialists.find((item) => item.roleId === roleId) ??
        failOrchestration(
          'ORCH_V2_STATE_TRANSITION',
          `${roleId} is not instantiated for this run.`,
        );
      if (specialist.status !== 'queued') {
        failOrchestration(
          'ORCH_V2_STATE_TRANSITION',
          `${roleId} must be queued before it can start.`,
        );
      }
      specialist.status = 'active';
      activated.push({actorInstanceId: specialist.actorInstanceId, roleId});
    }

    this.run = this.commit(
      {
        specialists,
        activeActorInstanceIds: [
          ...this.run.activeActorInstanceIds,
          ...activated.map(({actorInstanceId}) => actorInstanceId),
        ],
        state: startsVerifier ? 'verification' : 'specialists_running',
      },
      activated.map(({actorInstanceId, roleId}) => ({
        eventType: 'SPECIALIST_STARTED',
        actorInstanceId,
        roleId,
        summary: `${roleId} inició una unidad efímera gobernada.`,
        inputHashes:
          roleId === 'RT-09' && this.run.candidatePackageBinding !== undefined
            ? [this.run.candidatePackageBinding.packageSha256]
            : [this.run.workOrderSha256],
        outputHashes: [],
        toolId: 'orchestrator.scheduler-v2',
        decision: {status: 'accepted', summary: 'Slot de concurrencia asignado.'},
        error: null,
      })),
      timestamp,
    );
    return this.snapshot();
  }

  public completeSpecialist(
    roleIdInput: EphemeralRoleIdV2,
    outputSha256Input: string,
    timestampInput: string,
  ): OrchestrationRunV2 {
    const roleId = EphemeralRoleIdV2Schema.parse(roleIdInput);
    const outputSha256 = Sha256Schema.parse(outputSha256Input);
    const timestamp = TimestampSchema.parse(timestampInput);
    const specialists = clone(this.run.specialists);
    const specialist =
      specialists.find((item) => item.roleId === roleId) ??
      failOrchestration('ORCH_V2_STATE_TRANSITION', `${roleId} is not instantiated for this run.`);
    if (specialist.status !== 'active') {
      failOrchestration('ORCH_V2_STATE_TRANSITION', `${roleId} must be active before completion.`);
    }
    if (roleId === 'RT-09' && this.run.candidatePackageBinding === undefined) {
      failOrchestration(
        'ORCH_V2_ROLE_ORDER',
        'RT-09 cannot complete without a hash-bound candidate.',
      );
    }
    specialist.status = 'completed';
    specialist.outputSha256 = outputSha256;

    this.run = this.commit(
      {
        specialists,
        activeActorInstanceIds: this.run.activeActorInstanceIds.filter(
          (actorId) => actorId !== specialist.actorInstanceId,
        ),
        state: roleId === 'RT-09' ? 'guardian_review' : 'specialists_running',
      },
      [
        {
          eventType: roleId === 'RT-09' ? 'VERIFIER_COMPLETED' : 'SPECIALIST_COMPLETED',
          actorInstanceId: specialist.actorInstanceId,
          roleId,
          summary:
            roleId === 'RT-09'
              ? 'Verificación independiente RT-09 completada antes de RT-11.'
              : `${roleId} completó su unidad efímera.`,
          inputHashes:
            roleId === 'RT-09' && this.run.candidatePackageBinding !== undefined
              ? [this.run.candidatePackageBinding.packageSha256]
              : [this.run.workOrderSha256],
          outputHashes: [outputSha256],
          toolId: 'orchestrator.runtime-v2',
          decision: {status: 'accepted', summary: 'Output hash-bound aceptado.'},
          error: null,
        },
      ],
      timestamp,
    );
    return this.snapshot();
  }

  public recordSpecialistRetry(
    roleIdInput: EphemeralRoleIdV2,
    errorCodeInput: OrchestrationErrorCodeV2,
    timestampInput: string,
  ): OrchestrationRunV2 {
    const roleId = EphemeralRoleIdV2Schema.parse(roleIdInput);
    const timestamp = TimestampSchema.parse(timestampInput);
    const specialists = clone(this.run.specialists);
    const specialist =
      specialists.find((item) => item.roleId === roleId) ??
      failOrchestration('ORCH_V2_STATE_TRANSITION', `${roleId} is not instantiated for this run.`);
    if (specialist.status !== 'active') {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        `${roleId} must be active before a retry is recorded.`,
      );
    }
    if (specialist.retryCount >= this.run.maxRetries) {
      failOrchestration('ORCH_V2_RETRY_LIMIT', `${roleId} exhausted three retries.`);
    }
    specialist.retryCount += 1;
    specialist.status = 'queued';

    this.run = this.commit(
      {
        specialists,
        activeActorInstanceIds: this.run.activeActorInstanceIds.filter(
          (actorId) => actorId !== specialist.actorInstanceId,
        ),
      },
      [
        {
          eventType: 'SPECIALIST_RETRY_RECORDED',
          actorInstanceId: specialist.actorInstanceId,
          roleId,
          summary: `${roleId} registró un reintento gobernado.`,
          inputHashes: [],
          outputHashes: [],
          toolId: 'orchestrator.retry-v2',
          decision: {status: 'changes_requested', summary: 'Retry dentro del límite.'},
          error: {
            publicCode: publicErrorCodeFor(errorCodeInput),
            internalCode: errorCodeInput,
            summary: 'Fallo material resumido con código estable.',
          },
        },
      ],
      timestamp,
    );
    return this.snapshot();
  }

  public recordCommitteeDecision(input: CommitteeDecisionInputV2): OrchestrationRunV2 {
    const decision = CommitteeDecisionInputV2Schema.parse(input);
    const incomplete = this.run.specialists.filter(
      ({roleId, status}) => roleId !== 'RT-09' && status !== 'completed',
    );
    if (incomplete.length > 0 || this.run.activeActorInstanceIds.length > 0) {
      failOrchestration(
        'ORCH_V2_ROLE_ORDER',
        'All instantiated producer specialists must complete before committee decision.',
      );
    }
    if (this.run.state !== 'specialists_running') {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        'Committee can decide only after producer-specialist execution.',
      );
    }

    const selected =
      decision.proposalBindings.find(
        ({proposalId}) => proposalId === decision.selectedProposalId,
      ) ??
      failOrchestration('ORCH_V2_COMMITTEE_CARDINALITY', 'Committee selected proposal is missing.');

    this.run = this.commit(
      {
        committeeProposalIds: decision.proposalBindings.map(({proposalId}) => proposalId),
        selectedCommitteeProposalId: selected.proposalId,
        selectedProposalActorInstanceId: selected.actorInstanceId,
        committeeTrace: {
          compositionPattern: 'two-plus-two-plus-one',
          ...decision.trace,
          decisionSha256: decision.decisionSha256,
        },
        state: 'verification',
      },
      [
        {
          eventType: 'COMMITTEE_DECIDED',
          actorInstanceId: this.run.orchestratorActorInstanceId,
          roleId: 'RT-01',
          summary: 'Comité 2+2+1 seleccionó una dirección; solo ella puede producirse.',
          inputHashes: decision.proposalBindings.map(({proposalSha256}) => proposalSha256),
          outputHashes: [decision.decisionSha256],
          toolId: 'committee.runtime-v2',
          decision: {status: 'accepted', summary: `Seleccionada ${selected.proposalId}.`},
          error: null,
        },
      ],
      decision.decidedAt,
    );
    return this.snapshot();
  }

  public acceptCandidatePackage(
    input: CandidatePackageV2,
    timestampInput: string,
  ): OrchestrationRunV2 {
    const timestamp = TimestampSchema.parse(timestampInput);
    const candidate = parseHashBoundCandidatePackageV2(input);
    if (
      this.run.state !== 'verification' ||
      this.run.selectedProposalActorInstanceId === undefined
    ) {
      failOrchestration(
        'ORCH_V2_ROLE_ORDER',
        'Candidate production requires a completed committee decision.',
      );
    }
    if (
      candidate.workOrderId !== this.run.workOrderId ||
      candidate.workOrderSha256 !== this.run.workOrderSha256 ||
      candidate.proposalActorInstanceId !== this.run.selectedProposalActorInstanceId
    ) {
      failOrchestration(
        'ORCH_V2_HASH_MISMATCH',
        'Candidate package is not bound to the selected proposal and work order.',
      );
    }
    if (
      candidate.producerActorInstanceId !== this.run.producerActorInstanceId ||
      candidate.producerActorInstanceId === this.run.guardianActorInstanceId
    ) {
      failOrchestration(
        'ORCH_V2_ROLE_SEPARATION',
        'Candidate producer must match the work order and remain distinct from Guardian.',
      );
    }
    if (this.acceptedCandidate !== undefined) {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        'Only the committee-selected candidate may be built once.',
      );
    }

    this.acceptedCandidate = clone(candidate);
    this.run = this.commit(
      {
        candidatePackageBinding: {
          candidatePackageId: candidate.candidatePackageId,
          packageSha256: candidate.packageSha256,
        },
      },
      [
        {
          eventType: 'CANDIDATE_PACKAGE_ACCEPTED',
          actorInstanceId: candidate.producerActorInstanceId,
          roleId: 'RT-07',
          summary: 'Candidate ganador aceptado como RENDERED_DRAFT; publicación bloqueada.',
          inputHashes: [candidate.workOrderSha256, candidate.editorialUnitSha256],
          outputHashes: [candidate.packageSha256],
          toolId: 'orchestrator.candidate-gate-v2',
          decision: {status: 'accepted', summary: 'Candidate hash-bound listo para RT-09.'},
          error: null,
        },
      ],
      timestamp,
    );
    return this.snapshot();
  }

  public recordGuardianReview(input: GuardianReviewInputV2): OrchestrationRunV2 {
    const review = GuardianReviewInputV2Schema.parse(input);
    const verifier =
      this.run.specialists.find(({roleId}) => roleId === 'RT-09') ??
      failOrchestration('ORCH_V2_ROLE_ORDER', 'RT-09 is not instantiated.');
    if (
      verifier.status !== 'completed' ||
      verifier.actorInstanceId !== review.verifierActorInstanceId ||
      verifier.outputSha256 === undefined
    ) {
      failOrchestration(
        'ORCH_V2_ROLE_ORDER',
        'RT-09 must complete independent verification before RT-11.',
      );
    }
    const verifierOutputSha256 = Sha256Schema.parse(verifier.outputSha256);
    if (
      review.guardianActorInstanceId !== this.run.guardianActorInstanceId ||
      review.producerActorInstanceId !== this.run.producerActorInstanceId ||
      review.producerActorInstanceId === review.verifierActorInstanceId ||
      review.producerActorInstanceId === review.guardianActorInstanceId ||
      review.verifierActorInstanceId === review.guardianActorInstanceId
    ) {
      failOrchestration(
        'ORCH_V2_ROLE_SEPARATION',
        'Producer, verifier and Guardian must be three distinct actor instances.',
      );
    }
    if (
      this.run.candidatePackageBinding === undefined ||
      review.candidatePackageId !== this.run.candidatePackageBinding.candidatePackageId ||
      review.candidatePackageSha256 !== this.run.candidatePackageBinding.packageSha256
    ) {
      failOrchestration(
        'ORCH_V2_HASH_MISMATCH',
        'Guardian review must target the hash-bound candidate.',
      );
    }
    if (this.run.guardianReviews.length >= this.run.maxGuardianReviews) {
      failOrchestration(
        'ORCH_V2_GUARDIAN_REVIEW_LIMIT',
        'The Guardian exhausted two governed reviews.',
      );
    }
    if (this.run.state !== 'guardian_review') {
      failOrchestration(
        'ORCH_V2_STATE_TRANSITION',
        'Guardian can review only after RT-09 verification.',
      );
    }

    const reviewNumber = this.run.guardianReviews.length + 1;
    this.run = this.commit(
      {
        guardianReviews: [
          ...this.run.guardianReviews,
          {
            reviewNumber,
            ...review,
          },
        ],
        state: review.decision === 'pass' ? 'awaiting_human_approval' : 'guardian_review',
      },
      [
        {
          eventType: 'GUARDIAN_REVIEWED',
          actorInstanceId: review.guardianActorInstanceId,
          roleId: 'RT-11',
          summary: `Guardian V2 registró revisión ${String(reviewNumber)}: ${review.decision}.`,
          inputHashes: [review.candidatePackageSha256, verifierOutputSha256],
          outputHashes: review.evidenceHashes,
          toolId: 'guardian.runtime-v2',
          decision: {
            status:
              review.decision === 'pass'
                ? 'accepted'
                : review.decision === 'changes_requested'
                  ? 'changes_requested'
                  : 'rejected',
            summary: `Guardian review ${String(reviewNumber)}.`,
          },
          error: null,
        },
      ],
      review.reviewedAt,
    );
    return this.snapshot();
  }

  public recordHumanApproval(input: WorkflowPilotApprovalV1): OrchestrationRunV2 {
    const approval = WorkflowPilotApprovalV1Schema.parse(input);
    const latestGuardianReview = this.run.guardianReviews.at(-1);
    const candidateBinding =
      this.run.candidatePackageBinding ??
      failOrchestration(
        'ORCH_V2_HUMAN_APPROVAL_REQUIRED',
        'H01 cannot decide before a candidate is bound.',
      );
    if (
      latestGuardianReview === undefined ||
      latestGuardianReview.decision !== 'pass' ||
      this.run.state !== 'awaiting_human_approval'
    ) {
      failOrchestration(
        'ORCH_V2_HUMAN_APPROVAL_REQUIRED',
        'H01 can decide only after a passing RT-11 review.',
      );
    }
    if (
      approval.runId !== this.run.runId ||
      approval.runSha256 !== this.run.runSha256 ||
      approval.workOrderId !== this.run.workOrderId ||
      approval.workOrderSha256 !== this.run.workOrderSha256 ||
      approval.candidatePackageId !== candidateBinding.candidatePackageId ||
      approval.candidatePackageSha256 !== candidateBinding.packageSha256
    ) {
      failOrchestration(
        'ORCH_V2_HASH_MISMATCH',
        'H01 approval is not bound to the current run, work order and candidate hashes.',
      );
    }

    this.run = this.commit(
      {
        workflowPilotApproval: approval,
        state: approval.decision === 'approved' ? 'human_approved' : 'blocked',
      },
      [
        {
          eventType: 'HUMAN_APPROVAL_RECORDED',
          actorInstanceId: 'H01',
          roleId: 'H01',
          summary: `H01 registró decisión de piloto: ${approval.decision}.`,
          inputHashes: [approval.runSha256, approval.candidatePackageSha256],
          outputHashes: approval.evidenceHashes,
          toolId: 'approval.workflow-pilot-v1',
          decision: {
            status:
              approval.decision === 'approved'
                ? 'accepted'
                : approval.decision === 'changes_requested'
                  ? 'changes_requested'
                  : 'rejected',
            summary: `Decisión H01: ${approval.decision}.`,
          },
          error: null,
        },
      ],
      approval.decidedAt,
    );
    return this.snapshot();
  }

  public authorizeMemoryWrite(timestampInput: string): OrchestrationRunV2 {
    const timestamp = TimestampSchema.parse(timestampInput);
    const approval =
      this.run.workflowPilotApproval ??
      failOrchestration(
        'ORCH_V2_MEMORY_BEFORE_HUMAN_APPROVAL',
        'Durable memory requires an H01 approval receipt.',
      );
    if (approval.decision !== 'approved' || !approval.memoryWriteAuthorized) {
      failOrchestration(
        'ORCH_V2_MEMORY_BEFORE_HUMAN_APPROVAL',
        'Durable memory is forbidden until H01 explicitly approves the workflow pilot.',
      );
    }

    this.run = this.commit(
      {memoryWriteState: 'authorized'},
      [
        {
          eventType: 'MEMORY_WRITE_AUTHORIZED',
          actorInstanceId: 'H01',
          roleId: 'H01',
          summary: 'H01 autorizó memoria gobernada posterior a aprobación.',
          inputHashes: approval.evidenceHashes,
          outputHashes: [],
          toolId: 'memory.authorization-v1',
          decision: {status: 'accepted', summary: 'Memoria habilitada solo para este piloto.'},
          error: null,
        },
      ],
      timestamp,
    );
    return this.snapshot();
  }

  public proposePublication(): never {
    return failOrchestration(
      'ORCH_V2_PUBLICATION_FORBIDDEN',
      'Publication is outside the V2 pilot contract and remains forbidden.',
    );
  }

  private commit(
    patch: Partial<OrchestrationRunV2>,
    drafts: readonly EventDraftV2[],
    timestamp: string,
  ): OrchestrationRunV2 {
    const events = [...this.run.events];
    for (const draft of drafts) {
      const previousEventSha256 = events.at(-1)?.eventSha256 ?? null;
      events.push(
        addEventHash({
          schemaVersion: 'orchestration-event-v2',
          eventId: `${this.run.runId}:event:${String(events.length)}`,
          sequence: events.length,
          ...draft,
          timestamp,
          previousEventSha256,
        }),
      );
    }
    return withRunSha256({
      ...this.run,
      ...patch,
      events,
      updatedAt: timestamp,
    });
  }
}
