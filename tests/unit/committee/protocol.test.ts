import {CommitteeSessionSchema, adjudicateCommittee} from '../../../committees/src/index.ts';
import {makeMaterialUncertaintySession, makeValidSession} from './fixtures.ts';

describe('creative committee protocol', () => {
  it('adjudicates exactly five independent proposals and twenty peer assessments', () => {
    const decision = adjudicateCommittee(makeValidSession());

    expect(decision.status).toBe('DECIDED');
    expect(decision.ranking).toHaveLength(5);
    expect(decision.ranking[0]?.proposalId).toBe('proposal-01');
    expect(decision.ranking.every(({assessmentCount}) => assessmentCount === 4)).toBe(true);
    expect(decision.trace).toEqual({
      proposalCount: 5,
      peerAssessmentCount: 20,
      privateReasoningPersisted: false,
    });
    expect(decision.secondPrototype.required).toBe(false);
  });

  it('requires one scoped second prototype for material uncertainty not resolvable by analysis', () => {
    const decision = adjudicateCommittee(makeMaterialUncertaintySession());

    expect(decision.uncertainty.material).toBe(true);
    expect(decision.uncertainty.unresolvedByAnalysis).toBe(true);
    expect(decision.secondPrototype.required).toBe(true);
  });

  it('rejects a committee with fewer than five proposals', () => {
    const session = makeValidSession();
    session.proposals.pop();

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects proposals that are not independent by actor and role', () => {
    const session = makeValidSession();
    session.proposals[1]!.proposer = structuredClone(session.proposals[0]!.proposer);

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects incomplete cross-review coverage', () => {
    const session = makeValidSession();
    session.peerAssessments.pop();

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects self-assessment', () => {
    const session = makeValidSession();
    const assessment = session.peerAssessments[0]!;
    assessment.reviewerActorId = session.proposals.find(
      ({proposalId}) => proposalId === assessment.proposalId,
    )!.proposer.actorId;

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects scorecards that omit a rubric dimension', () => {
    const session = makeValidSession();
    session.peerAssessments[0]!.dimensionScores.pop();

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects unknown evidence refs in proposal assumptions and risks', () => {
    const assumptionSession = makeValidSession();
    assumptionSession.proposals[0]!.assumptions[0]!.evidenceRefs = ['evidence-unknown'];
    const riskSession = makeValidSession();
    riskSession.proposals[0]!.risks[0]!.evidenceRefs = ['evidence-unknown'];

    expect(CommitteeSessionSchema.safeParse(assumptionSession).success).toBe(false);
    expect(CommitteeSessionSchema.safeParse(riskSession).success).toBe(false);
  });

  it('rejects unknown evidence refs in scores and synthesis', () => {
    const scoreSession = makeValidSession();
    scoreSession.peerAssessments[0]!.dimensionScores[0]!.evidenceRefs = ['evidence-unknown'];
    const synthesisSession = makeValidSession();
    synthesisSession.synthesis.evidenceRefs = ['evidence-unknown'];

    expect(CommitteeSessionSchema.safeParse(scoreSession).success).toBe(false);
    expect(CommitteeSessionSchema.safeParse(synthesisSession).success).toBe(false);
  });

  it('rejects unknown evidence refs in dissent and uncertainty', () => {
    const dissentSession = makeValidSession();
    if (dissentSession.dissent.status === 'PRESENT') {
      dissentSession.dissent.entries[0]!.evidenceRefs = ['evidence-unknown'];
    }
    const uncertaintySession = makeValidSession();
    uncertaintySession.uncertainty.drivers[0]!.evidenceRefs = ['evidence-unknown'];

    expect(CommitteeSessionSchema.safeParse(dissentSession).success).toBe(false);
    expect(CommitteeSessionSchema.safeParse(uncertaintySession).success).toBe(false);
  });

  it('rejects duplicate evidence IDs that would make refs ambiguous', () => {
    const session = makeValidSession();
    session.proposals[1]!.evidence[0]!.evidenceId = session.proposals[0]!.evidence[0]!.evidenceId;

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects duplicate assessment IDs even when reviewer/proposal pairs are distinct', () => {
    const session = makeValidSession();
    session.peerAssessments[1]!.assessmentId = session.peerAssessments[0]!.assessmentId;

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects RT-11 as a proposal producer', () => {
    const session = makeValidSession();
    Object.assign(session.proposals[0]!.proposer, {
      actorId: 'RT-11',
      roleId: 'RT-11',
    });

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects a second prototype when uncertainty is not material', () => {
    const session = makeValidSession();
    session.secondPrototype = {
      required: true,
      trigger: 'MATERIAL_UNRESOLVED_BY_ANALYSIS',
      comparisonProposalIds: ['proposal-01', 'proposal-02'],
      scope: 'Prototipo especulativo.',
      falsificationCriteria: ['Criterio especulativo.'],
    };

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects omitting the second prototype when material uncertainty cannot be analyzed away', () => {
    const session = makeMaterialUncertaintySession();
    session.secondPrototype = {
      required: false,
      trigger: 'NOT_JUSTIFIED',
      rationale: 'Omisión no permitida.',
    };

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('rejects selecting a proposal below the maximum rubric score', () => {
    const session = makeValidSession();
    session.synthesis.selectedProposalId = 'proposal-02';
    session.synthesis.incorporatedElements[0]!.sourceProposalId = 'proposal-03';
    session.synthesis.alternativeDispositions = [
      {
        proposalId: 'proposal-01',
        disposition: 'NOT_COMPATIBLE',
        summary: 'Disposition adjusted only for the negative fixture.',
      },
      ...session.synthesis.alternativeDispositions.filter(
        ({proposalId}) => proposalId !== 'proposal-02',
      ),
    ];

    expect(() => adjudicateCommittee(session)).toThrow(/must have the highest rubric score/);
  });

  it('rejects private chain-of-thought fields through strict schemas', () => {
    const session = makeValidSession();
    Object.assign(session.proposals[0]!, {
      chainOfThought: 'This field must never be persisted.',
    });

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it.each([
    'chain-of-thought',
    'private reasoning',
    'cadena de pensamiento',
    'razonamiento privado',
  ])('rejects prohibited reasoning text in proposal fields: %s', (label) => {
    const session = makeValidSession();
    session.proposals[0]!.concept = `Concepto con ${label}.`;

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it.each([
    'chain-of-thought',
    'private reasoning',
    'cadena de pensamiento',
    'razonamiento privado',
  ])('rejects prohibited reasoning text in peer review fields: %s', (label) => {
    const session = makeValidSession();
    session.peerAssessments[0]!.dimensionScores[0]!.decisionNote = `Nota con ${label}.`;

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it.each([
    {
      field: 'synthesis.decisionSummary',
      phrase: 'chain-of-thought',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.synthesis.decisionSummary = 'Contains chain-of-thought.';
      },
    },
    {
      field: 'dissent.entries[].statement',
      phrase: 'private reasoning',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        if (session.dissent.status === 'PRESENT') {
          session.dissent.entries[0]!.statement = 'Contains private reasoning.';
        }
      },
    },
    {
      field: 'uncertainty.drivers[].statement',
      phrase: 'cadena de pensamiento',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.uncertainty.drivers[0]!.statement = 'Contiene cadena de pensamiento.';
      },
    },
    {
      field: 'secondPrototype.rationale',
      phrase: 'razonamiento privado',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        if (!session.secondPrototype.required) {
          session.secondPrototype.rationale = 'Contiene razonamiento privado.';
        }
      },
    },
  ])('rejects $phrase in governed narrative $field', ({mutate}) => {
    const session = makeValidSession();
    mutate(session);

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it('does not scan technical committee identifiers as narrative text', () => {
    const session = makeValidSession();
    session.committeeId = 'committee-chain-of-thought';
    session.sourceSnapshotId = 'snapshot-private-reasoning';

    expect(CommitteeSessionSchema.safeParse(session).success).toBe(true);
  });
});
