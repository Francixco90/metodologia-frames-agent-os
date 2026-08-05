import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  CandidatePackageV2Schema,
  ContentWorkOrderV2Schema,
  OrchestrationEventV2Schema,
  WorkflowPilotApprovalV1Schema,
} from '../../../core/contracts/index.ts';
import {OrchestrationErrorV2} from '../../../core/orchestration/errors.ts';
import {
  assertDeclaredContractSha256,
  computeDeclaredContractSha256,
} from '../../../core/orchestration/hash-bound.ts';
import {
  CreativeOrchestrationRuntimeV2,
  type EphemeralRoleIdV2,
  type GuardianReviewInputV2,
} from '../../../core/orchestration/runtime-v2.ts';
import {persistPilotOrchestrationRunV2} from '../../../core/orchestration/run-store-v2.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const NOW = '2026-07-20T12:00:00-05:00';
const producerRoles = ['RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-08'] as const;
const allRoles = [...producerRoles, 'RT-09'] as const satisfies readonly EphemeralRoleIdV2[];

const binding = (ref: string, sha256 = HASH_A) => ({
  schemaVersion: 'hash-bound-ref-v1' as const,
  ref,
  sha256,
});

const makeWorkOrder = () => {
  const unsigned = {
    schemaVersion: 'content-work-order-v2' as const,
    workOrderId: 'work-order:v2:runtime',
    projectId: 'project:v2:runtime',
    contentTypeId: 'carousel:educational:v1',
    requestedByActorId: 'H01',
    producerActorInstanceId: 'actor:rt-07:run1',
    sourceSnapshotId: 'snapshot:v2:runtime',
    sourceSnapshotSha256: HASH_A,
    brandProfile: binding('registries/brand/profile.yml'),
    voiceProfile: binding('registries/brand/voice.yml'),
    channelProfile: binding('registries/channels/instagram.yml'),
    objective: 'Validate the governed V2 runtime.',
    audience: 'Operators.',
    editorialPattern: 'educational' as const,
    locale: 'es-CO',
    claimBindings: [
      {
        claimId: 'claim:runtime:1',
        sourceId: 'source:runtime:1',
        evidenceRef: binding('evidence/runtime-1.json'),
      },
    ],
    requestedVariants: [
      {
        variantId: 'variant:runtime:1',
        channelId: 'instagram',
        surface: 'feed' as const,
        locale: 'es-CO',
      },
    ],
    riskTier: 'MEDIUM' as const,
    approvalState: 'unapproved' as const,
    publicationPolicy: 'forbidden' as const,
    createdAt: NOW,
  };
  return ContentWorkOrderV2Schema.parse({
    ...unsigned,
    canonicalSha256: computeDeclaredContractSha256(unsigned, 'canonicalSha256'),
  });
};

const makeRuntime = () =>
  new CreativeOrchestrationRuntimeV2({
    runId: 'run:v2:runtime',
    workOrder: makeWorkOrder(),
    orchestratorActorInstanceId: 'actor:rt01:run1',
    guardianActorInstanceId: 'actor:rt11:run1',
    specialistInstances: allRoles.map((roleId) => ({
      roleId,
      actorInstanceId: `actor:${roleId.toLowerCase()}:run1`,
    })),
    createdAt: NOW,
  });

const proposalBindings = producerRoles.map((roleId, index) => ({
  proposalId: `proposal:v2:${String(index + 1)}`,
  actorInstanceId: `actor:${roleId.toLowerCase()}:run1`,
  proposalSha256: [HASH_A, HASH_B, HASH_C, 'd'.repeat(64), 'e'.repeat(64)][index]!,
}));

const completeProducers = (runtime: CreativeOrchestrationRuntimeV2): void => {
  for (let index = 0; index < producerRoles.length; index += 2) {
    const batch = producerRoles.slice(index, index + 2);
    runtime.startSpecialists(batch, NOW);
    for (const roleId of batch) {
      runtime.completeSpecialist(roleId, HASH_A, NOW);
    }
  }
};

const makeCandidate = () => {
  const workOrder = makeWorkOrder();
  const unsigned = {
    schemaVersion: 'candidate-package-v2' as const,
    candidatePackageId: 'candidate:v2:runtime',
    workOrderId: workOrder.workOrderId,
    workOrderSha256: workOrder.canonicalSha256,
    editorialUnitId: 'editorial-unit:v2:runtime',
    editorialUnitSha256: HASH_B,
    proposalActorInstanceId: proposalBindings[0]!.actorInstanceId,
    producerActorInstanceId: workOrder.producerActorInstanceId,
    artifacts: [
      {
        artifactId: 'artifact:runtime:1',
        artifactType: 'carousel-html',
        binding: binding('artifacts/runtime.html'),
      },
    ],
    variants: [binding('variants/runtime.json')],
    evidence: [binding('evidence/runtime.json')],
    assumptions: [],
    risks: [],
    coverageGaps: [],
    state: 'RENDERED_DRAFT' as const,
    specRef: binding('specs/runtime.yml'),
    assetManifestRef: binding('manifests/assets.yml'),
    renderManifestRef: binding('manifests/render.json'),
    receiptRefs: [binding('receipts/runtime.json')],
    qaRefs: [binding('qa/runtime.json')],
    publicationPolicy: 'forbidden' as const,
    createdAt: NOW,
  };
  return CandidatePackageV2Schema.parse({
    ...unsigned,
    packageSha256: computeDeclaredContractSha256(unsigned, 'packageSha256'),
  });
};

const advanceToCandidate = (runtime: CreativeOrchestrationRuntimeV2): void => {
  completeProducers(runtime);
  runtime.recordCommitteeDecision({
    proposalBindings,
    selectedProposalId: proposalBindings[0]!.proposalId,
    decisionSha256: HASH_C,
    trace: {
      executionWaves: [2, 2, 1],
      uniqueActorInstanceCount: 5,
      proposalCount: 5,
      crossEvaluationCount: 20,
      privateReasoningPersisted: false,
    },
    decidedAt: NOW,
  });
  runtime.acceptCandidatePackage(makeCandidate(), NOW);
};

const advanceToGuardian = (runtime: CreativeOrchestrationRuntimeV2): void => {
  advanceToCandidate(runtime);
  runtime.startSpecialists(['RT-09'], NOW);
  runtime.completeSpecialist('RT-09', HASH_B, NOW);
};

const guardianReview = (
  runtime: CreativeOrchestrationRuntimeV2,
  decision: 'pass' | 'fail' | 'changes_requested',
): GuardianReviewInputV2 => {
  const candidate = runtime.snapshot().candidatePackageBinding;
  if (candidate === undefined) {
    throw new Error('Test fixture requires a candidate binding.');
  }
  return {
    producerActorInstanceId: 'actor:rt-07:run1',
    verifierActorInstanceId: 'actor:rt-09:run1',
    guardianActorInstanceId: 'actor:rt11:run1',
    candidatePackageId: candidate.candidatePackageId,
    candidatePackageSha256: candidate.packageSha256,
    decision,
    evidenceHashes: [HASH_C],
    reviewedAt: NOW,
  };
};

const expectCode = (action: () => unknown, code: string): void => {
  try {
    action();
    throw new Error('Expected orchestration failure.');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(OrchestrationErrorV2);
    expect((error as OrchestrationErrorV2).code).toBe(code);
  }
};

describe('CreativeOrchestrationRuntimeV2', () => {
  it('enforces maxConcurrency=2', () => {
    const runtime = makeRuntime();
    runtime.startSpecialists(['RT-04', 'RT-05'], NOW);
    expectCode(() => runtime.startSpecialists(['RT-06'], NOW), 'ORCH_V2_MAX_CONCURRENCY');
    expect(runtime.snapshot().activeActorInstanceIds).toHaveLength(2);
  });

  it('allows exactly three retries and rejects the fourth', () => {
    const runtime = makeRuntime();
    for (let retry = 0; retry < 3; retry += 1) {
      runtime.startSpecialists(['RT-04'], NOW);
      runtime.recordSpecialistRetry('RT-04', 'ORCH_V2_STATE_TRANSITION', NOW);
    }
    runtime.startSpecialists(['RT-04'], NOW);
    expectCode(
      () => runtime.recordSpecialistRetry('RT-04', 'ORCH_V2_STATE_TRANSITION', NOW),
      'ORCH_V2_RETRY_LIMIT',
    );
  });

  it('requires committee selection and candidate production before RT-09', () => {
    const runtime = makeRuntime();
    expectCode(() => runtime.startSpecialists(['RT-09'], NOW), 'ORCH_V2_ROLE_ORDER');
    advanceToCandidate(runtime);
    expectCode(
      () => runtime.recordGuardianReview(guardianReview(runtime, 'pass')),
      'ORCH_V2_ROLE_ORDER',
    );
  });

  it('keeps producer, RT-09 verifier and RT-11 Guardian distinct', () => {
    const runtime = makeRuntime();
    advanceToGuardian(runtime);
    expectCode(
      () =>
        runtime.recordGuardianReview({
          ...guardianReview(runtime, 'pass'),
          producerActorInstanceId: 'actor:rt-09:run1',
        }),
      'ORCH_V2_ROLE_SEPARATION',
    );
  });

  it('allows two Guardian reviews and rejects a third', () => {
    const runtime = makeRuntime();
    advanceToGuardian(runtime);
    runtime.recordGuardianReview(guardianReview(runtime, 'changes_requested'));
    runtime.recordGuardianReview(guardianReview(runtime, 'changes_requested'));
    expectCode(
      () => runtime.recordGuardianReview(guardianReview(runtime, 'changes_requested')),
      'ORCH_V2_GUARDIAN_REVIEW_LIMIT',
    );
  });

  it('authorizes memory only after an exact H01 workflow-pilot approval', () => {
    const runtime = makeRuntime();
    expectCode(() => runtime.authorizeMemoryWrite(NOW), 'ORCH_V2_MEMORY_BEFORE_HUMAN_APPROVAL');
    advanceToGuardian(runtime);
    runtime.recordGuardianReview(guardianReview(runtime, 'pass'));
    const beforeApproval = runtime.snapshot();
    const candidate = beforeApproval.candidatePackageBinding;
    if (candidate === undefined) {
      throw new Error('Test fixture requires a candidate binding.');
    }
    const approval = WorkflowPilotApprovalV1Schema.parse({
      schemaVersion: 'workflow-pilot-approval-v1',
      approvalId: 'approval:v2:runtime',
      runId: beforeApproval.runId,
      runSha256: beforeApproval.runSha256,
      workOrderId: beforeApproval.workOrderId,
      workOrderSha256: beforeApproval.workOrderSha256,
      candidatePackageId: candidate.candidatePackageId,
      candidatePackageSha256: candidate.packageSha256,
      approverActorInstanceId: 'H01',
      approverRole: 'human',
      decision: 'approved',
      approvalScope: 'workflow-pilot',
      memoryWriteAuthorized: true,
      publicationAuthorized: false,
      conditions: [],
      evidenceHashes: [HASH_C],
      decidedAt: NOW,
    });
    runtime.recordHumanApproval(approval);
    runtime.authorizeMemoryWrite(NOW);

    const finalRun = runtime.snapshot();
    expect(finalRun).toMatchObject({
      state: 'human_approved',
      memoryWriteState: 'authorized',
      publicationPolicy: 'forbidden',
    });
    expect(() => assertDeclaredContractSha256(finalRun, 'runSha256')).not.toThrow();
    for (const event of finalRun.events) {
      expect(() => OrchestrationEventV2Schema.parse(event)).not.toThrow();
      expect(() => assertDeclaredContractSha256(event, 'eventSha256')).not.toThrow();
    }
  });

  it('forbids publication in every state', () => {
    const runtime = makeRuntime();
    expectCode(() => runtime.proposePublication(), 'ORCH_V2_PUBLICATION_FORBIDDEN');
  });

  it('persists an idempotent real pilot trace with 5/20, 2+2+1 and RT-09 before RT-11', async () => {
    const runtime = makeRuntime();
    advanceToGuardian(runtime);
    runtime.recordGuardianReview(guardianReview(runtime, 'pass'));
    const run = runtime.snapshot();
    const root = await mkdtemp(join(tmpdir(), 'orchestration-v2-'));
    try {
      const first = await persistPilotOrchestrationRunV2(root, 'runs/pilot-run.json', run, NOW);
      const second = await persistPilotOrchestrationRunV2(root, 'runs/pilot-run.json', run, NOW);
      const alternateSnapshot = await persistPilotOrchestrationRunV2(
        root,
        'runs/pilot-run-second.json',
        run,
        NOW,
      );
      const persisted: unknown = JSON.parse(
        await readFile(join(root, 'runs/pilot-run.json'), 'utf8'),
      );

      expect(first).toMatchObject({
        committeeProposalCount: 5,
        crossEvaluationCount: 20,
        executionWaves: [2, 2, 1],
        verifierBeforeGuardian: true,
        publicationPolicy: 'forbidden',
        reusedExistingSnapshot: false,
      });
      expect(second.reusedExistingSnapshot).toBe(true);
      expect(second.receiptId).toBe(first.receiptId);
      expect(alternateSnapshot.receiptId).not.toBe(first.receiptId);
      expect(persisted).toMatchObject({runId: run.runId, runSha256: run.runSha256});
    } finally {
      await rm(root, {recursive: true, force: true});
    }
  });
});
