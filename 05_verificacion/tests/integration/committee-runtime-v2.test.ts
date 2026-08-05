import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  CommitteeSessionV2Schema,
  adjudicateCommitteeV2,
  type CommitteeSessionV2,
} from '../../../committees/src/committee-runtime-v2.ts';
import {
  computeDeclaredContractSha256,
  parseHashBoundCandidatePackageV2,
  parseHashBoundContentWorkOrderV2,
} from '../../../core/orchestration/hash-bound.ts';
import {OrchestrationErrorV2} from '../../../core/orchestration/errors.ts';
import {orchestrateAndPersistContentV2} from '../../../workflows/core/orchestrate-content-v2.ts';

const HASH_A = 'a'.repeat(64);
const NOW = '2026-07-20T11:00:00-05:00';
const roles = ['RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-08'] as const;
const dimensions = [
  'strategic_fit',
  'editorial_clarity',
  'evidence_integrity',
  'feasibility',
  'accessibility',
] as const;

const binding = (ref: string) => ({
  schemaVersion: 'hash-bound-ref-v1' as const,
  ref,
  sha256: HASH_A,
});

const withDigest = <T extends object, K extends string>(
  value: T,
  field: K,
): T & Record<K, string> =>
  ({
    ...value,
    [field]: computeDeclaredContractSha256(value, field),
  }) as T & Record<K, string>;

const makeSession = (
  workOrderId = 'work-order:v2:1',
  workOrderSha256 = HASH_A,
): CommitteeSessionV2 => {
  const members = roles.map((roleId, index) => ({
    actorInstanceId: `actor:${roleId.toLowerCase()}:committee`,
    roleId,
    lane:
      index < 2
        ? ('strategy' as const)
        : index < 4
          ? ('creative' as const)
          : ('integration' as const),
    agentContract: binding(`registries/agents/${roleId.toLowerCase()}.json`),
  }));
  const proposals = members.map((member, index) => {
    const ordinal = index + 1;
    return withDigest(
      {
        schemaVersion: 'committee-proposal-v2' as const,
        proposalId: `proposal:v2:${String(ordinal)}`,
        actorInstanceId: member.actorInstanceId,
        roleId: member.roleId,
        title: `Independent proposal ${String(ordinal)}`,
        concept: `Evidence-led direction ${String(ordinal)}.`,
        assumptions: [
          {
            statement: `Explicit assumption ${String(ordinal)}.`,
            evidenceRefs: [binding(`evidence/assumption-${String(ordinal)}.json`)],
          },
        ],
        risks: [
          {
            statement: `Material risk ${String(ordinal)}.`,
            evidenceRefs: [binding(`evidence/risk-${String(ordinal)}.json`)],
          },
        ],
        criteria: [`Observable acceptance criterion ${String(ordinal)}.`],
        compatibleElements: [`Compatible element ${String(ordinal)}.`],
      },
      'proposalSha256',
    );
  });
  const crossEvaluations = members.flatMap((reviewer) =>
    proposals
      .filter(({actorInstanceId}) => actorInstanceId !== reviewer.actorInstanceId)
      .map((proposal) => {
        const proposalIndex = proposals.findIndex(
          ({proposalId}) => proposalId === proposal.proposalId,
        );
        const score = 5 - proposalIndex;
        return withDigest(
          {
            schemaVersion: 'cross-evaluation-v2' as const,
            evaluationId: `evaluation:${reviewer.actorInstanceId}:${proposal.proposalId}`,
            reviewerActorInstanceId: reviewer.actorInstanceId,
            subjectActorInstanceId: proposal.actorInstanceId,
            proposalId: proposal.proposalId,
            scores: dimensions.map((dimensionId) => ({
              dimensionId,
              score,
              evidenceRefs: [binding(`evidence/${dimensionId}.json`)],
              decisionNote: `Observable score ${String(score)}.`,
            })),
            objections: ['Concrete, reviewable objection.'],
            socraticQuestions: ['What evidence would falsify this direction?'],
            compatibleElements: ['One compatible element for synthesis.'],
          },
          'evaluationSha256',
        );
      }),
  );
  const unsigned = {
    schemaVersion: 'committee-session-v2' as const,
    committeeId: 'committee:v2:1',
    workOrderId,
    workOrderSha256,
    compositionPattern: 'two-plus-two-plus-one' as const,
    members,
    rubric: dimensions.map((dimensionId) => ({
      dimensionId,
      weight: 0.2,
      acceptanceSignal: `Observable ${dimensionId}.`,
    })),
    proposals,
    crossEvaluations,
    createdAt: NOW,
  };
  return CommitteeSessionV2Schema.parse(withDigest(unsigned, 'sessionSha256'));
};

const expectOrchestrationCode = (action: () => unknown, code: string): void => {
  try {
    action();
    throw new Error('Expected orchestration failure.');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(OrchestrationErrorV2);
    expect((error as OrchestrationErrorV2).code).toBe(code);
  }
};

describe('committee runtime V2', () => {
  it('adjudicates a real 2+2+1 committee with five actors and 20 cross-evaluations', () => {
    const session = makeSession();
    const decision = adjudicateCommitteeV2(session);

    expect(session.members.map(({lane}) => lane)).toEqual([
      'strategy',
      'strategy',
      'creative',
      'creative',
      'integration',
    ]);
    expect(new Set(session.members.map(({actorInstanceId}) => actorInstanceId)).size).toBe(5);
    expect(session.crossEvaluations).toHaveLength(20);
    expect(decision).toMatchObject({
      selectedProposalId: 'proposal:v2:1',
      trace: {
        uniqueActorInstanceCount: 5,
        proposalCount: 5,
        crossEvaluationCount: 20,
        privateReasoningPersisted: false,
      },
    });
    expect(decision.ranking.every(({evaluationCount}) => evaluationCount === 4)).toBe(true);
  });

  it('fails with a stable code when actor instances are duplicated', () => {
    const session = structuredClone(makeSession());
    session.members[1]!.actorInstanceId = session.members[0]!.actorInstanceId;
    expectOrchestrationCode(
      () => adjudicateCommitteeV2(session),
      'ORCH_V2_COMMITTEE_ACTOR_UNIQUENESS',
    );
  });

  it('fails with a stable code unless all 20 non-self evaluations exist', () => {
    const session = structuredClone(makeSession());
    session.crossEvaluations.pop();
    expectOrchestrationCode(() => adjudicateCommitteeV2(session), 'ORCH_V2_CROSS_REVIEW_COVERAGE');
  });

  it('rejects private reasoning before adjudication', () => {
    const session = structuredClone(makeSession());
    session.proposals[0]!.concept = 'Persist the private reasoning for the reviewer.';
    expectOrchestrationCode(() => adjudicateCommitteeV2(session), 'ORCH_V2_PRIVATE_REASONING');
  });

  it('rejects a proposal changed after its SHA-256 binding', () => {
    const session = structuredClone(makeSession());
    session.proposals[0]!.concept = 'A tampered but otherwise valid concept.';
    expectOrchestrationCode(() => adjudicateCommitteeV2(session), 'ORCH_V2_HASH_MISMATCH');
  });

  it('executes and persists the pilot with real 5/20 evidence and RT-09 before RT-11', async () => {
    const unsignedWorkOrder = {
      schemaVersion: 'content-work-order-v2' as const,
      workOrderId: 'work-order:v2:persisted-pilot',
      projectId: 'project:v2:persisted-pilot',
      contentTypeId: 'carousel:educational:v1',
      requestedByActorId: 'H01',
      producerActorInstanceId: 'actor:rt-07:committee',
      sourceSnapshotId: 'snapshot:v2:persisted-pilot',
      sourceSnapshotSha256: HASH_A,
      brandProfile: binding('registries/brand/profile.yml'),
      voiceProfile: binding('registries/brand/voice.yml'),
      channelProfile: binding('registries/channels/instagram.yml'),
      objective: 'Prove the persisted governed pilot path.',
      audience: 'Operators.',
      editorialPattern: 'educational' as const,
      locale: 'es-CO',
      claimBindings: [
        {
          claimId: 'claim:persisted-pilot:1',
          sourceId: 'source:persisted-pilot:1',
          evidenceRef: binding('evidence/persisted-pilot.json'),
        },
      ],
      requestedVariants: [
        {
          variantId: 'variant:persisted-pilot:1',
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
    const workOrder = parseHashBoundContentWorkOrderV2(
      withDigest(unsignedWorkOrder, 'canonicalSha256'),
    );
    const session = makeSession(workOrder.workOrderId, workOrder.canonicalSha256);
    const unsignedCandidate = {
      schemaVersion: 'candidate-package-v2' as const,
      candidatePackageId: 'candidate:v2:persisted-pilot',
      workOrderId: workOrder.workOrderId,
      workOrderSha256: workOrder.canonicalSha256,
      editorialUnitId: 'editorial-unit:v2:persisted-pilot',
      editorialUnitSha256: HASH_A,
      proposalActorInstanceId: session.proposals[0]!.actorInstanceId,
      producerActorInstanceId: workOrder.producerActorInstanceId,
      artifacts: [
        {
          artifactId: 'artifact:persisted-pilot:1',
          artifactType: 'carousel-html',
          binding: binding('artifacts/persisted-pilot.html'),
        },
      ],
      variants: [binding('variants/persisted-pilot.json')],
      evidence: [binding('evidence/persisted-pilot.json')],
      assumptions: [],
      risks: [],
      coverageGaps: [],
      state: 'RENDERED_DRAFT' as const,
      specRef: binding('specs/persisted-pilot.yml'),
      assetManifestRef: binding('manifests/persisted-pilot-assets.yml'),
      renderManifestRef: binding('manifests/persisted-pilot-render.json'),
      receiptRefs: [binding('receipts/persisted-pilot.json')],
      qaRefs: [binding('qa/persisted-pilot.json')],
      publicationPolicy: 'forbidden' as const,
      createdAt: NOW,
    };
    const candidate = parseHashBoundCandidatePackageV2(
      withDigest(unsignedCandidate, 'packageSha256'),
    );
    const root = await mkdtemp(join(tmpdir(), 'orchestration-v2-integration-'));
    try {
      const result = await orchestrateAndPersistContentV2(
        {
          initialization: {
            runId: 'run:v2:persisted-pilot',
            workOrder,
            orchestratorActorInstanceId: 'actor:rt01:persisted-pilot',
            guardianActorInstanceId: 'actor:rt11:persisted-pilot',
            specialistInstances: [
              ...session.members.map(({actorInstanceId, roleId}) => ({
                actorInstanceId,
                roleId,
              })),
              {
                actorInstanceId: 'actor:rt-09:committee',
                roleId: 'RT-09' as const,
              },
            ],
            createdAt: NOW,
          },
          specialistOutputs: session.members.map(({roleId}) => ({
            roleId,
            outputSha256: HASH_A,
            startedAt: NOW,
            completedAt: NOW,
          })),
          committeeSession: session,
          candidatePackage: candidate,
          candidateAcceptedAt: NOW,
          verifierOutputSha256: HASH_A,
          verifierStartedAt: NOW,
          verifierCompletedAt: NOW,
          guardianReviews: [
            {
              producerActorInstanceId: workOrder.producerActorInstanceId,
              verifierActorInstanceId: 'actor:rt-09:committee',
              guardianActorInstanceId: 'actor:rt11:persisted-pilot',
              candidatePackageId: candidate.candidatePackageId,
              candidatePackageSha256: candidate.packageSha256,
              decision: 'pass',
              evidenceHashes: [HASH_A],
              reviewedAt: NOW,
            },
          ],
        },
        {
          root,
          snapshotRef: 'runs/persisted-pilot.json',
          persistedAt: NOW,
        },
      );

      const verifierIndex = result.run.events.findIndex(
        ({eventType}) => eventType === 'VERIFIER_COMPLETED',
      );
      const guardianIndex = result.run.events.findIndex(
        ({eventType}) => eventType === 'GUARDIAN_REVIEWED',
      );
      expect(result.run.committeeTrace).toMatchObject({
        executionWaves: [2, 2, 1],
        uniqueActorInstanceCount: 5,
        proposalCount: 5,
        crossEvaluationCount: 20,
      });
      expect(verifierIndex).toBeGreaterThanOrEqual(0);
      expect(guardianIndex).toBeGreaterThan(verifierIndex);
      expect(result.persistenceReceipt).toMatchObject({
        committeeProposalCount: 5,
        crossEvaluationCount: 20,
        executionWaves: [2, 2, 1],
        verifierBeforeGuardian: true,
        publicationPolicy: 'forbidden',
      });
    } finally {
      await rm(root, {recursive: true, force: true});
    }
  });
});
