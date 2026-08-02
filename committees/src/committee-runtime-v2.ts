import {z} from 'zod';

import {
  ActorIdSchema,
  containsProhibitedReasoningText,
  HashBoundReferenceV1Schema,
  PortableIdSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../core/contracts/index.ts';
import {failOrchestration} from '../../core/orchestration/errors.ts';
import {
  assertDeclaredContractSha256,
  computeDeclaredContractSha256,
} from '../../core/orchestration/hash-bound.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);
const CommitteeRoleIdV2Schema = z.enum([
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-10',
]);

export const CommitteeLaneV2Schema = z.enum(['strategy', 'creative', 'integration']);

const CommitteeMemberV2Schema = z.strictObject({
  actorInstanceId: ActorIdSchema,
  roleId: CommitteeRoleIdV2Schema,
  lane: CommitteeLaneV2Schema,
  agentContract: HashBoundReferenceV1Schema,
});

const TraceStatementV2Schema = z.strictObject({
  statement: NonEmptyTextSchema,
  evidenceRefs: z.array(HashBoundReferenceV1Schema).min(1).max(16),
});

export const CommitteeProposalV2Schema = z
  .strictObject({
    schemaVersion: z.literal('committee-proposal-v2'),
    proposalId: PortableIdSchema,
    actorInstanceId: ActorIdSchema,
    roleId: CommitteeRoleIdV2Schema,
    title: z.string().trim().min(1).max(160),
    concept: NonEmptyTextSchema,
    assumptions: z.array(TraceStatementV2Schema).min(1).max(16),
    risks: z.array(TraceStatementV2Schema).min(1).max(16),
    criteria: z.array(NonEmptyTextSchema).min(1).max(16),
    compatibleElements: z.array(NonEmptyTextSchema).max(16),
    proposalSha256: Sha256Schema,
  })
  .superRefine((proposal, context) => {
    if (containsProhibitedReasoningText(proposal)) {
      context.addIssue({
        code: 'custom',
        message: 'Committee proposal cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type CommitteeProposalV2 = z.infer<typeof CommitteeProposalV2Schema>;

const RubricDimensionIdV2Schema = z.enum([
  'strategic_fit',
  'editorial_clarity',
  'evidence_integrity',
  'feasibility',
  'accessibility',
]);

const RubricDimensionV2Schema = z.strictObject({
  dimensionId: RubricDimensionIdV2Schema,
  weight: z.number().positive().max(1),
  acceptanceSignal: NonEmptyTextSchema,
});

const DimensionScoreV2Schema = z.strictObject({
  dimensionId: RubricDimensionIdV2Schema,
  score: z.number().int().min(0).max(5),
  evidenceRefs: z.array(HashBoundReferenceV1Schema).min(1).max(16),
  decisionNote: z.string().trim().min(1).max(600),
});

export const CrossEvaluationV2Schema = z
  .strictObject({
    schemaVersion: z.literal('cross-evaluation-v2'),
    evaluationId: PortableIdSchema,
    reviewerActorInstanceId: ActorIdSchema,
    subjectActorInstanceId: ActorIdSchema,
    proposalId: PortableIdSchema,
    scores: z.array(DimensionScoreV2Schema).length(5),
    objections: z.array(NonEmptyTextSchema).max(10),
    socraticQuestions: z.array(NonEmptyTextSchema).min(1).max(10),
    compatibleElements: z.array(NonEmptyTextSchema).max(10),
    evaluationSha256: Sha256Schema,
  })
  .superRefine((evaluation, context) => {
    if (evaluation.reviewerActorInstanceId === evaluation.subjectActorInstanceId) {
      context.addIssue({
        code: 'custom',
        message: 'Self-evaluation is forbidden.',
        path: ['reviewerActorInstanceId'],
      });
    }
    const dimensionIds = evaluation.scores.map(({dimensionId}) => dimensionId);
    if (
      new Set(dimensionIds).size !== 5 ||
      RubricDimensionIdV2Schema.options.some((dimensionId) => !dimensionIds.includes(dimensionId))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Each cross-evaluation must score all five rubric dimensions exactly once.',
        path: ['scores'],
      });
    }
    if (containsProhibitedReasoningText(evaluation)) {
      context.addIssue({
        code: 'custom',
        message: 'Cross-evaluation cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type CrossEvaluationV2 = z.infer<typeof CrossEvaluationV2Schema>;

export const CommitteeSessionV2Schema = z
  .strictObject({
    schemaVersion: z.literal('committee-session-v2'),
    committeeId: PortableIdSchema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    compositionPattern: z.literal('two-plus-two-plus-one'),
    members: z.array(CommitteeMemberV2Schema).length(5),
    rubric: z.array(RubricDimensionV2Schema).length(5),
    proposals: z.array(CommitteeProposalV2Schema).length(5),
    crossEvaluations: z.array(CrossEvaluationV2Schema).length(20),
    createdAt: TimestampSchema,
    sessionSha256: Sha256Schema,
  })
  .superRefine((session, context) => {
    const laneCounts = {
      strategy: session.members.filter(({lane}) => lane === 'strategy').length,
      creative: session.members.filter(({lane}) => lane === 'creative').length,
      integration: session.members.filter(({lane}) => lane === 'integration').length,
    };
    if (laneCounts.strategy !== 2 || laneCounts.creative !== 2 || laneCounts.integration !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Committee composition must be exactly 2 strategy + 2 creative + 1 integration.',
        path: ['members'],
      });
    }

    const memberActorIds = session.members.map(({actorInstanceId}) => actorInstanceId);
    const memberRoleIds = session.members.map(({roleId}) => roleId);
    if (new Set(memberActorIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Committee requires five unique actor_instance_id values.',
        path: ['members'],
      });
    }
    if (new Set(memberRoleIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Committee requires five distinct specialist roles.',
        path: ['members'],
      });
    }

    const rubricDimensionIds = session.rubric.map(({dimensionId}) => dimensionId);
    const totalWeight = session.rubric.reduce((sum, {weight}) => sum + weight, 0);
    if (
      new Set(rubricDimensionIds).size !== 5 ||
      RubricDimensionIdV2Schema.options.some(
        (dimensionId) => !rubricDimensionIds.includes(dimensionId),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rubric must declare all five dimensions exactly once.',
        path: ['rubric'],
      });
    }
    if (Math.abs(totalWeight - 1) > 1e-9) {
      context.addIssue({
        code: 'custom',
        message: 'Rubric weights must sum to exactly 1.',
        path: ['rubric'],
      });
    }

    const proposalsById = new Map(
      session.proposals.map((proposal) => [proposal.proposalId, proposal]),
    );
    const proposalsByActor = new Map(
      session.proposals.map((proposal) => [proposal.actorInstanceId, proposal]),
    );
    if (proposalsById.size !== 5 || proposalsByActor.size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Each committee actor must submit one unique proposal.',
        path: ['proposals'],
      });
    }
    for (const [index, member] of session.members.entries()) {
      const proposal = proposalsByActor.get(member.actorInstanceId);
      if (proposal === undefined || proposal.roleId !== member.roleId) {
        context.addIssue({
          code: 'custom',
          message: 'Every proposal must bind to its declared committee actor and role.',
          path: ['proposals', index],
        });
      }
    }

    const expectedPairs = new Set<string>();
    for (const reviewerActorId of memberActorIds) {
      for (const subjectActorId of memberActorIds) {
        if (reviewerActorId !== subjectActorId) {
          expectedPairs.add(`${reviewerActorId}::${subjectActorId}`);
        }
      }
    }
    const actualPairs = new Set<string>();
    const evaluationIds = new Set<string>();
    for (const [index, evaluation] of session.crossEvaluations.entries()) {
      const pair = `${evaluation.reviewerActorInstanceId}::${evaluation.subjectActorInstanceId}`;
      const proposal = proposalsById.get(evaluation.proposalId);
      if (
        !memberActorIds.includes(evaluation.reviewerActorInstanceId) ||
        !memberActorIds.includes(evaluation.subjectActorInstanceId) ||
        proposal?.actorInstanceId !== evaluation.subjectActorInstanceId
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Cross-evaluation actors and proposal must resolve within the committee.',
          path: ['crossEvaluations', index],
        });
      }
      if (actualPairs.has(pair)) {
        context.addIssue({
          code: 'custom',
          message: 'Every ordered reviewer/subject pair must occur exactly once.',
          path: ['crossEvaluations', index],
        });
      }
      actualPairs.add(pair);
      if (evaluationIds.has(evaluation.evaluationId)) {
        context.addIssue({
          code: 'custom',
          message: 'Cross-evaluation IDs must be unique.',
          path: ['crossEvaluations', index, 'evaluationId'],
        });
      }
      evaluationIds.add(evaluation.evaluationId);
    }
    if (actualPairs.size !== 20 || [...expectedPairs].some((pair) => !actualPairs.has(pair))) {
      context.addIssue({
        code: 'custom',
        message: 'Five actors require all 20 non-self cross-evaluations.',
        path: ['crossEvaluations'],
      });
    }

    if (containsProhibitedReasoningText(session)) {
      context.addIssue({
        code: 'custom',
        message: 'Committee session cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type CommitteeSessionV2 = z.infer<typeof CommitteeSessionV2Schema>;

const CommitteeRankingV2Schema = z.strictObject({
  rank: z.number().int().min(1).max(5),
  proposalId: PortableIdSchema,
  actorInstanceId: ActorIdSchema,
  weightedScore: z.number().min(0).max(5),
  evaluationCount: z.literal(4),
});

export const CommitteeDecisionV2Schema = z.strictObject({
  schemaVersion: z.literal('committee-decision-v2'),
  committeeId: PortableIdSchema,
  workOrderId: PortableIdSchema,
  workOrderSha256: Sha256Schema,
  status: z.literal('decided'),
  compositionPattern: z.literal('two-plus-two-plus-one'),
  proposalBindings: z
    .array(
      z.strictObject({
        proposalId: PortableIdSchema,
        actorInstanceId: ActorIdSchema,
        proposalSha256: Sha256Schema,
      }),
    )
    .length(5),
  selectedProposalId: PortableIdSchema,
  ranking: z.array(CommitteeRankingV2Schema).length(5),
  trace: z.strictObject({
    executionWaves: z.tuple([z.literal(2), z.literal(2), z.literal(1)]),
    uniqueActorInstanceCount: z.literal(5),
    proposalCount: z.literal(5),
    crossEvaluationCount: z.literal(20),
    privateReasoningPersisted: z.literal(false),
  }),
  decidedAt: TimestampSchema,
  decisionSha256: Sha256Schema,
});

export type CommitteeDecisionV2 = z.infer<typeof CommitteeDecisionV2Schema>;

const mapCommitteeParseFailure = (error: z.ZodError): never => {
  const issueText = error.issues.map(({message}) => message).join(' ');
  if (containsProhibitedReasoningText(issueText) || issueText.includes('private reasoning')) {
    return failOrchestration(
      'ORCH_V2_PRIVATE_REASONING',
      'Committee input contains prohibited private reasoning.',
    );
  }
  if (
    issueText.includes('actor_instance_id') ||
    issueText.includes('unique actor') ||
    issueText.includes('distinct specialist')
  ) {
    return failOrchestration(
      'ORCH_V2_COMMITTEE_ACTOR_UNIQUENESS',
      'Committee actor uniqueness contract failed.',
    );
  }
  if (
    issueText.includes('cross-evaluation') ||
    issueText.includes('reviewer/subject') ||
    error.issues.some(({path}) => path.includes('crossEvaluations'))
  ) {
    return failOrchestration(
      'ORCH_V2_CROSS_REVIEW_COVERAGE',
      'Committee cross-evaluation coverage must be exactly 20.',
    );
  }
  return failOrchestration(
    'ORCH_V2_COMMITTEE_CARDINALITY',
    'Committee must satisfy the strict 2+2+1, five-proposal contract.',
  );
};

const roundScore = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

export const adjudicateCommitteeV2 = (input: unknown): CommitteeDecisionV2 => {
  const parsed = CommitteeSessionV2Schema.safeParse(input);
  if (!parsed.success) {
    return mapCommitteeParseFailure(parsed.error);
  }
  const session = parsed.data;
  assertDeclaredContractSha256(session, 'sessionSha256');
  for (const proposal of session.proposals) {
    assertDeclaredContractSha256(proposal, 'proposalSha256');
  }
  for (const evaluation of session.crossEvaluations) {
    assertDeclaredContractSha256(evaluation, 'evaluationSha256');
  }

  const weights = new Map(session.rubric.map(({dimensionId, weight}) => [dimensionId, weight]));
  const ranking = session.proposals
    .map((proposal) => {
      const evaluations = session.crossEvaluations.filter(
        ({proposalId}) => proposalId === proposal.proposalId,
      );
      const weightedScore =
        evaluations.reduce(
          (sum, evaluation) =>
            sum +
            evaluation.scores.reduce(
              (scoreSum, {dimensionId, score}) =>
                scoreSum + score * (weights.get(dimensionId) ?? 0),
              0,
            ),
          0,
        ) / evaluations.length;
      return {
        proposalId: proposal.proposalId,
        actorInstanceId: proposal.actorInstanceId,
        weightedScore: roundScore(weightedScore),
        evaluationCount: 4 as const,
      };
    })
    .sort(
      (left, right) =>
        right.weightedScore - left.weightedScore || left.proposalId.localeCompare(right.proposalId),
    )
    .map((entry, index) => ({rank: index + 1, ...entry}));

  const selectedProposalId =
    ranking[0]?.proposalId ??
    failOrchestration('ORCH_V2_COMMITTEE_CARDINALITY', 'Committee produced no rankable proposal.');
  const unsignedDecision = {
    schemaVersion: 'committee-decision-v2' as const,
    committeeId: session.committeeId,
    workOrderId: session.workOrderId,
    workOrderSha256: session.workOrderSha256,
    status: 'decided' as const,
    compositionPattern: 'two-plus-two-plus-one' as const,
    proposalBindings: session.proposals.map(({proposalId, actorInstanceId, proposalSha256}) => ({
      proposalId,
      actorInstanceId,
      proposalSha256,
    })),
    selectedProposalId,
    ranking,
    trace: {
      executionWaves: [2, 2, 1] as const,
      uniqueActorInstanceCount: 5 as const,
      proposalCount: 5 as const,
      crossEvaluationCount: 20 as const,
      privateReasoningPersisted: false as const,
    },
    decidedAt: session.createdAt,
  };

  return CommitteeDecisionV2Schema.parse({
    ...unsignedDecision,
    decisionSha256: computeDeclaredContractSha256(unsignedDecision, 'decisionSha256'),
  });
};
