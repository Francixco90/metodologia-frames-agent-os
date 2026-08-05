import {z} from 'zod';

import {CommitteeSessionSchema, type CommitteeSession} from './contracts.ts';

const RankingEntrySchema = z
  .object({
    rank: z.number().int().positive().max(5),
    proposalId: z.string().min(1),
    weightedScore: z.number().finite().min(0).max(5),
    assessmentCount: z.literal(4),
  })
  .strict();

export const CommitteeDecisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    committeeId: z.string().min(1),
    workProductId: z.string().min(1),
    status: z.literal('DECIDED'),
    ranking: z.array(RankingEntrySchema).length(5),
    synthesis: CommitteeSessionSchema.shape.synthesis,
    dissent: CommitteeSessionSchema.shape.dissent,
    uncertainty: z
      .object({
        assessment: CommitteeSessionSchema.shape.uncertainty,
        material: z.boolean(),
        unresolvedByAnalysis: z.boolean(),
      })
      .strict(),
    secondPrototype: CommitteeSessionSchema.shape.secondPrototype,
    trace: z
      .object({
        proposalCount: z.literal(5),
        peerAssessmentCount: z.literal(20),
        privateReasoningPersisted: z.literal(false),
      })
      .strict(),
  })
  .strict();

export type CommitteeDecision = z.infer<typeof CommitteeDecisionSchema>;

const roundScore = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

const scoreProposal = (session: CommitteeSession, proposalId: string): number => {
  const weights = new Map(
    session.rubric.dimensions.map(({dimensionId, weight}) => [dimensionId, weight]),
  );
  const assessments = session.peerAssessments.filter(
    (assessment) => assessment.proposalId === proposalId,
  );
  const total = assessments.reduce((assessmentSum, assessment) => {
    const weightedScore = assessment.dimensionScores.reduce(
      (dimensionSum, dimensionScore) =>
        dimensionSum + dimensionScore.score * (weights.get(dimensionScore.dimensionId) ?? 0),
      0,
    );
    return assessmentSum + weightedScore;
  }, 0);

  return roundScore(total / assessments.length);
};

export const adjudicateCommittee = (input: unknown): CommitteeDecision => {
  const session = CommitteeSessionSchema.parse(input);
  const rankedScores = session.proposals
    .map(({proposalId}) => ({
      proposalId,
      weightedScore: scoreProposal(session, proposalId),
    }))
    .sort(
      (first, second) =>
        second.weightedScore - first.weightedScore ||
        first.proposalId.localeCompare(second.proposalId),
    );

  const topScore = rankedScores[0]?.weightedScore;
  const selectedScore = rankedScores.find(
    ({proposalId}) => proposalId === session.synthesis.selectedProposalId,
  )?.weightedScore;
  if (
    topScore === undefined ||
    selectedScore === undefined ||
    Math.abs(topScore - selectedScore) > 1e-9
  ) {
    throw new Error(
      'The selected proposal must have the highest rubric score; revise scores or synthesis.',
    );
  }

  const material =
    session.uncertainty.overallScore >= session.uncertainty.materialThreshold ||
    session.uncertainty.drivers.some(({impact}) => impact === 'MATERIAL');
  const unresolvedByAnalysis = session.uncertainty.drivers.some(
    ({analysisStatus}) => analysisStatus === 'NOT_RESOLVABLE',
  );

  return CommitteeDecisionSchema.parse({
    schemaVersion: 1,
    committeeId: session.committeeId,
    workProductId: session.workProductId,
    status: 'DECIDED',
    ranking: rankedScores.map((score, index) => ({
      rank: index + 1,
      ...score,
      assessmentCount: 4,
    })),
    synthesis: session.synthesis,
    dissent: session.dissent,
    uncertainty: {
      assessment: session.uncertainty,
      material,
      unresolvedByAnalysis,
    },
    secondPrototype: session.secondPrototype,
    trace: {
      proposalCount: 5,
      peerAssessmentCount: 20,
      privateReasoningPersisted: false,
    },
  });
};
