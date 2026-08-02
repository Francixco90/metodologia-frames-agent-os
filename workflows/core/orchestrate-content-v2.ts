import {z} from 'zod';

import {
  CandidatePackageV2Schema,
  WorkflowPilotApprovalV1Schema,
  type OrchestrationRunV2,
} from '../../core/contracts/index.ts';
import {Sha256Schema, TimestampSchema} from '../../core/contracts/primitives.ts';
import {
  CreativeOrchestrationRuntimeV2,
  InitializeOrchestrationRunV2Schema,
} from '../../core/orchestration/runtime-v2.ts';
import {
  persistPilotOrchestrationRunV2,
  type OrchestrationRunPersistenceReceiptV2,
} from '../../core/orchestration/run-store-v2.ts';
import {
  CommitteeSessionV2Schema,
  adjudicateCommitteeV2,
} from '../../committees/src/committee-runtime-v2.ts';
import {failOrchestration} from '../../core/orchestration/errors.ts';

const ProducerRoleIdV2Schema = z.enum([
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-10',
]);

const SpecialistOutputV2Schema = z.strictObject({
  roleId: ProducerRoleIdV2Schema,
  outputSha256: Sha256Schema,
  startedAt: TimestampSchema,
  completedAt: TimestampSchema,
});

export const OrchestrateContentV2InputSchema = z
  .strictObject({
    initialization: InitializeOrchestrationRunV2Schema,
    specialistOutputs: z.array(SpecialistOutputV2Schema).min(1).max(8),
    committeeSession: CommitteeSessionV2Schema,
    candidatePackage: CandidatePackageV2Schema,
    candidateAcceptedAt: TimestampSchema,
    verifierOutputSha256: Sha256Schema,
    verifierStartedAt: TimestampSchema,
    verifierCompletedAt: TimestampSchema,
    guardianReviews: z
      .array(
        z.strictObject({
          producerActorInstanceId: z.string().min(3),
          verifierActorInstanceId: z.string().min(3),
          guardianActorInstanceId: z.string().min(3),
          candidatePackageId: z.string().min(3),
          candidatePackageSha256: Sha256Schema,
          decision: z.enum(['pass', 'fail', 'changes_requested']),
          evidenceHashes: z.array(Sha256Schema).min(1).max(64),
          reviewedAt: TimestampSchema,
        }),
      )
      .min(1)
      .max(2),
    workflowPilotApproval: WorkflowPilotApprovalV1Schema.optional(),
    authorizeMemoryAt: TimestampSchema.optional(),
  })
  .superRefine((input, context) => {
    const instantiatedProducerRoles = input.initialization.specialistInstances
      .map(({roleId}) => roleId)
      .filter((roleId) => roleId !== 'RT-09');
    const outputRoles = input.specialistOutputs.map(({roleId}) => roleId);
    if (
      new Set(outputRoles).size !== outputRoles.length ||
      instantiatedProducerRoles.length !== outputRoles.length ||
      instantiatedProducerRoles.some((roleId) => !outputRoles.includes(roleId))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Every instantiated producer specialist requires exactly one output.',
        path: ['specialistOutputs'],
      });
    }
    if (input.authorizeMemoryAt !== undefined && input.workflowPilotApproval === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Memory authorization requires an H01 workflow-pilot approval.',
        path: ['authorizeMemoryAt'],
      });
    }
  });

export type OrchestrateContentV2Input = z.infer<typeof OrchestrateContentV2InputSchema>;

export const orchestrateContentV2 = (input: OrchestrateContentV2Input): OrchestrationRunV2 => {
  const plan = OrchestrateContentV2InputSchema.parse(input);
  const runtime = new CreativeOrchestrationRuntimeV2(plan.initialization);

  for (let index = 0; index < plan.specialistOutputs.length; index += 2) {
    const batch = plan.specialistOutputs.slice(index, index + 2);
    const first = batch[0];
    if (first === undefined) {
      continue;
    }
    runtime.startSpecialists(
      batch.map(({roleId}) => roleId),
      first.startedAt,
    );
    for (const output of batch) {
      runtime.completeSpecialist(output.roleId, output.outputSha256, output.completedAt);
    }
  }

  if (
    plan.committeeSession.workOrderId !== plan.initialization.workOrder.workOrderId ||
    plan.committeeSession.workOrderSha256 !== plan.initialization.workOrder.canonicalSha256
  ) {
    failOrchestration(
      'ORCH_V2_HASH_MISMATCH',
      'Committee session is not bound to the active work order.',
    );
  }
  const actorByRole = new Map(
    plan.initialization.specialistInstances.map(({roleId, actorInstanceId}) => [
      roleId,
      actorInstanceId,
    ]),
  );
  for (const member of plan.committeeSession.members) {
    if (actorByRole.get(member.roleId) !== member.actorInstanceId) {
      failOrchestration(
        'ORCH_V2_COMMITTEE_ACTOR_UNIQUENESS',
        'Committee member is not an instantiated specialist for this run.',
      );
    }
  }

  const decision = adjudicateCommitteeV2(plan.committeeSession);
  runtime.recordCommitteeDecision({
    proposalBindings: decision.proposalBindings,
    selectedProposalId: decision.selectedProposalId,
    decisionSha256: decision.decisionSha256,
    trace: decision.trace,
    decidedAt: decision.decidedAt,
  });
  runtime.acceptCandidatePackage(plan.candidatePackage, plan.candidateAcceptedAt);

  runtime.startSpecialists(['RT-09'], plan.verifierStartedAt);
  runtime.completeSpecialist('RT-09', plan.verifierOutputSha256, plan.verifierCompletedAt);

  for (const review of plan.guardianReviews) {
    runtime.recordGuardianReview(review);
  }
  if (plan.workflowPilotApproval !== undefined) {
    runtime.recordHumanApproval(plan.workflowPilotApproval);
  }
  if (plan.authorizeMemoryAt !== undefined) {
    runtime.authorizeMemoryWrite(plan.authorizeMemoryAt);
  }

  return runtime.snapshot();
};

export const orchestrateAndPersistContentV2 = async (
  input: OrchestrateContentV2Input,
  persistence: {
    root: string;
    snapshotRef: string;
    persistedAt: string;
  },
): Promise<{
  run: OrchestrationRunV2;
  persistenceReceipt: OrchestrationRunPersistenceReceiptV2;
}> => {
  const run = orchestrateContentV2(input);
  const persistenceReceipt = await persistPilotOrchestrationRunV2(
    persistence.root,
    persistence.snapshotRef,
    run,
    persistence.persistedAt,
  );
  return {run, persistenceReceipt};
};
