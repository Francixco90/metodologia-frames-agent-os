import {z} from 'zod';

import {
  ActorIdSchema,
  containsProhibitedReasoningText,
  PortableIdSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../core/contracts/index.ts';

export const EvidenceTagSchema = z.enum([
  '[CÓDIGO]',
  '[CONFIG]',
  '[DOC]',
  '[INFERENCIA]',
  '[SUPUESTO]',
]);

export const RoleIdSchema = z.enum([
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
]);

export const CommitteeProducerRoleIdSchema = z.enum([
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
]);

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);

export const EvidenceReferenceSchema = z
  .object({
    evidenceId: PortableIdSchema,
    sourceId: PortableIdSchema,
    tag: EvidenceTagSchema,
    claim: NonEmptyTextSchema,
    sha256: Sha256Schema.optional(),
  })
  .strict();

export const ActorReferenceSchema = z
  .object({
    actorId: ActorIdSchema,
    roleId: CommitteeProducerRoleIdSchema,
    specialty: NonEmptyTextSchema,
  })
  .strict();

const TraceStatementSchema = z
  .object({
    statement: NonEmptyTextSchema,
    evidenceRefs: z.array(PortableIdSchema).min(1).max(20),
  })
  .strict();

const RiskStatementSchema = z
  .object({
    riskId: PortableIdSchema,
    statement: NonEmptyTextSchema,
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    mitigation: NonEmptyTextSchema,
    evidenceRefs: z.array(PortableIdSchema).min(1).max(20),
  })
  .strict();

const DecisionCriterionSchema = z
  .object({
    criterionId: PortableIdSchema,
    statement: NonEmptyTextSchema,
    acceptanceSignal: NonEmptyTextSchema,
  })
  .strict();

export const ProposalSchema = z
  .object({
    proposalId: PortableIdSchema,
    proposer: ActorReferenceSchema,
    title: z.string().trim().min(1).max(160),
    concept: NonEmptyTextSchema,
    assumptions: z.array(TraceStatementSchema).min(1).max(20),
    evidence: z.array(EvidenceReferenceSchema).min(1).max(30),
    risks: z.array(RiskStatementSchema).min(1).max(20),
    criteria: z.array(DecisionCriterionSchema).min(1).max(20),
    tradeoffs: z.array(NonEmptyTextSchema).min(1).max(20),
  })
  .strict()
  .superRefine((proposal, context) => {
    const governedNarratives = [
      proposal.title,
      proposal.concept,
      ...proposal.assumptions.map(({statement}) => statement),
      ...proposal.evidence.map(({claim}) => claim),
      ...proposal.risks.flatMap(({statement, mitigation}) => [statement, mitigation]),
      ...proposal.criteria.flatMap(({statement, acceptanceSignal}) => [
        statement,
        acceptanceSignal,
      ]),
      ...proposal.tradeoffs,
    ];
    if (containsProhibitedReasoningText(governedNarratives)) {
      context.addIssue({
        code: 'custom',
        message: 'Proposal text cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

const RubricDimensionSchema = z
  .object({
    dimensionId: PortableIdSchema,
    label: z.string().trim().min(1).max(120),
    weight: z.number().finite().positive().max(1),
    guidance: NonEmptyTextSchema,
    riskCritical: z.boolean(),
  })
  .strict();

export const RubricSchema = z
  .object({
    rubricId: PortableIdSchema,
    dimensions: z.array(RubricDimensionSchema).min(3).max(10),
    scale: z
      .object({
        minimum: z.literal(0),
        maximum: z.literal(5),
      })
      .strict(),
  })
  .strict()
  .superRefine((rubric, context) => {
    const dimensionIds = rubric.dimensions.map(({dimensionId}) => dimensionId);
    if (new Set(dimensionIds).size !== dimensionIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Rubric dimension IDs must be unique.',
        path: ['dimensions'],
      });
    }

    const totalWeight = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    if (Math.abs(totalWeight - 1) > 1e-9) {
      context.addIssue({
        code: 'custom',
        message: 'Rubric weights must sum to exactly 1.',
        path: ['dimensions'],
      });
    }
  });

const DimensionScoreSchema = z
  .object({
    dimensionId: PortableIdSchema,
    score: z.number().int().min(0).max(5),
    evidenceRefs: z.array(PortableIdSchema).min(1).max(20),
    decisionNote: z.string().trim().min(1).max(600),
  })
  .strict();

export const PeerAssessmentSchema = z
  .object({
    assessmentId: PortableIdSchema,
    reviewerActorId: PortableIdSchema,
    proposalId: PortableIdSchema,
    dimensionScores: z.array(DimensionScoreSchema).min(3).max(10),
    strengths: z.array(NonEmptyTextSchema).min(1).max(10),
    objections: z.array(NonEmptyTextSchema).max(10),
    socraticQuestions: z.array(NonEmptyTextSchema).min(1).max(10),
    compatibleElements: z.array(NonEmptyTextSchema).max(10),
  })
  .strict()
  .superRefine((assessment, context) => {
    const governedNarratives = [
      ...assessment.dimensionScores.map(({decisionNote}) => decisionNote),
      ...assessment.strengths,
      ...assessment.objections,
      ...assessment.socraticQuestions,
      ...assessment.compatibleElements,
    ];
    if (containsProhibitedReasoningText(governedNarratives)) {
      context.addIssue({
        code: 'custom',
        message: 'Peer assessment text cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

const DissentEntrySchema = z
  .object({
    dissentId: PortableIdSchema,
    actorId: PortableIdSchema,
    proposalId: PortableIdSchema.optional(),
    statement: NonEmptyTextSchema,
    evidenceRefs: z.array(PortableIdSchema).min(1).max(20),
    disposition: z.enum([
      'INCORPORATED',
      'PARTIALLY_INCORPORATED',
      'NOT_INCORPORATED',
      'ESCALATED',
    ]),
    dispositionSummary: NonEmptyTextSchema,
  })
  .strict();

export const DissentRecordSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('PRESENT'),
      entries: z.array(DissentEntrySchema).min(1).max(20),
    })
    .strict(),
  z
    .object({
      status: z.literal('NONE_RECORDED'),
      entries: z.array(DissentEntrySchema).length(0),
      invitationAttestation: NonEmptyTextSchema,
    })
    .strict(),
]);

const IncorporatedElementSchema = z
  .object({
    sourceProposalId: PortableIdSchema,
    element: NonEmptyTextSchema,
    compatibilityNote: NonEmptyTextSchema,
  })
  .strict();

const AlternativeDispositionSchema = z
  .object({
    proposalId: PortableIdSchema,
    disposition: z.enum([
      'INCORPORATED',
      'PARTIALLY_INCORPORATED',
      'NOT_COMPATIBLE',
      'NO_MATERIAL_VALUE',
    ]),
    summary: NonEmptyTextSchema,
  })
  .strict();

export const SynthesisSchema = z
  .object({
    synthesisId: PortableIdSchema,
    selectedProposalId: PortableIdSchema,
    decisionSummary: NonEmptyTextSchema,
    incorporatedElements: z.array(IncorporatedElementSchema).min(1).max(20),
    alternativeDispositions: z.array(AlternativeDispositionSchema).length(4),
    requestedChanges: z.array(NonEmptyTextSchema).max(20),
    evidenceRefs: z.array(PortableIdSchema).min(1).max(30),
  })
  .strict();

const UncertaintyDriverSchema = z
  .object({
    driverId: PortableIdSchema,
    statement: NonEmptyTextSchema,
    impact: z.enum(['LOW', 'MEDIUM', 'MATERIAL']),
    analysisStatus: z.enum(['RESOLVED', 'RESOLVABLE', 'NOT_RESOLVABLE']),
    evidenceRefs: z.array(PortableIdSchema).min(1).max(20),
  })
  .strict();

export const UncertaintyAssessmentSchema = z
  .object({
    overallScore: z.number().finite().min(0).max(1),
    materialThreshold: z.number().finite().positive().max(1),
    drivers: z.array(UncertaintyDriverSchema).min(1).max(20),
  })
  .strict();

export const SecondPrototypePlanSchema = z.discriminatedUnion('required', [
  z
    .object({
      required: z.literal(true),
      trigger: z.literal('MATERIAL_UNRESOLVED_BY_ANALYSIS'),
      comparisonProposalIds: z
        .tuple([PortableIdSchema, PortableIdSchema])
        .refine(([first, second]) => first !== second, {
          message: 'The two comparison proposals must be different.',
        }),
      scope: NonEmptyTextSchema,
      falsificationCriteria: z.array(NonEmptyTextSchema).min(1).max(10),
    })
    .strict(),
  z
    .object({
      required: z.literal(false),
      trigger: z.literal('NOT_JUSTIFIED'),
      rationale: NonEmptyTextSchema,
    })
    .strict(),
]);

export const CommitteeSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    committeeId: PortableIdSchema,
    workProductId: PortableIdSchema,
    sourceSnapshotId: PortableIdSchema,
    format: z.enum(['WEB', 'VIDEO', 'MOTION', 'CONTENT', 'DATA_STORY']),
    riskTier: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    createdAt: TimestampSchema,
    proposals: z.array(ProposalSchema).length(5),
    rubric: RubricSchema,
    peerAssessments: z.array(PeerAssessmentSchema).length(20),
    dissent: DissentRecordSchema,
    synthesis: SynthesisSchema,
    uncertainty: UncertaintyAssessmentSchema,
    secondPrototype: SecondPrototypePlanSchema,
  })
  .strict()
  .superRefine((session, context) => {
    const governedNarratives: Array<{
      path: (string | number)[];
      value: string;
    }> = [
      {
        path: ['synthesis', 'decisionSummary'],
        value: session.synthesis.decisionSummary,
      },
      ...session.synthesis.incorporatedElements.flatMap((element, index) => [
        {
          path: ['synthesis', 'incorporatedElements', index, 'element'],
          value: element.element,
        },
        {
          path: ['synthesis', 'incorporatedElements', index, 'compatibilityNote'],
          value: element.compatibilityNote,
        },
      ]),
      ...session.synthesis.alternativeDispositions.map((disposition, index) => ({
        path: ['synthesis', 'alternativeDispositions', index, 'summary'],
        value: disposition.summary,
      })),
      ...session.synthesis.requestedChanges.map((value, index) => ({
        path: ['synthesis', 'requestedChanges', index],
        value,
      })),
      ...session.uncertainty.drivers.map((driver, index) => ({
        path: ['uncertainty', 'drivers', index, 'statement'],
        value: driver.statement,
      })),
    ];

    if (session.dissent.status === 'PRESENT') {
      governedNarratives.push(
        ...session.dissent.entries.flatMap((dissent, index) => [
          {
            path: ['dissent', 'entries', index, 'statement'],
            value: dissent.statement,
          },
          {
            path: ['dissent', 'entries', index, 'dispositionSummary'],
            value: dissent.dispositionSummary,
          },
        ]),
      );
    } else {
      governedNarratives.push({
        path: ['dissent', 'invitationAttestation'],
        value: session.dissent.invitationAttestation,
      });
    }

    if (session.secondPrototype.required) {
      governedNarratives.push(
        {
          path: ['secondPrototype', 'scope'],
          value: session.secondPrototype.scope,
        },
        ...session.secondPrototype.falsificationCriteria.map((value, index) => ({
          path: ['secondPrototype', 'falsificationCriteria', index],
          value,
        })),
      );
    } else {
      governedNarratives.push({
        path: ['secondPrototype', 'rationale'],
        value: session.secondPrototype.rationale,
      });
    }

    for (const narrative of governedNarratives) {
      if (containsProhibitedReasoningText(narrative.value)) {
        context.addIssue({
          code: 'custom',
          message: 'Committee narrative cannot persist private reasoning or chain-of-thought.',
          path: narrative.path,
        });
      }
    }

    const proposalsById = new Map(
      session.proposals.map((proposal) => [proposal.proposalId, proposal]),
    );
    const evidenceIds = session.proposals.flatMap((proposal) =>
      proposal.evidence.map(({evidenceId}) => evidenceId),
    );
    const knownEvidenceIds = new Set(evidenceIds);
    const validateEvidenceRefs = (
      evidenceRefs: readonly string[],
      path: (string | number)[],
    ): void => {
      for (const [referenceIndex, evidenceRef] of evidenceRefs.entries()) {
        if (!knownEvidenceIds.has(evidenceRef)) {
          context.addIssue({
            code: 'custom',
            message: 'Evidence reference must resolve to known committee evidence.',
            path: [...path, referenceIndex],
          });
        }
      }
    };
    const proposerActorIds = session.proposals.map(({proposer}) => proposer.actorId);
    const proposerRoleIds = session.proposals.map(({proposer}) => proposer.roleId);

    if (new Set(proposalsById.keys()).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Exactly five unique proposals are required.',
        path: ['proposals'],
      });
    }
    if (new Set(proposerActorIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'Each proposal must come from an independent actor.',
        path: ['proposals'],
      });
    }
    if (new Set(proposerRoleIds).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'The committee must use five distinct specialist roles.',
        path: ['proposals'],
      });
    }
    if (knownEvidenceIds.size !== evidenceIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Evidence IDs must be globally unique within the committee.',
        path: ['proposals'],
      });
    }
    for (const [proposalIndex, proposal] of session.proposals.entries()) {
      for (const [assumptionIndex, assumption] of proposal.assumptions.entries()) {
        validateEvidenceRefs(assumption.evidenceRefs, [
          'proposals',
          proposalIndex,
          'assumptions',
          assumptionIndex,
          'evidenceRefs',
        ]);
      }
      for (const [riskIndex, risk] of proposal.risks.entries()) {
        validateEvidenceRefs(risk.evidenceRefs, [
          'proposals',
          proposalIndex,
          'risks',
          riskIndex,
          'evidenceRefs',
        ]);
      }
    }

    const dimensionIds = session.rubric.dimensions.map(({dimensionId}) => dimensionId);
    const expectedPairs = new Set<string>();
    for (const reviewerActorId of proposerActorIds) {
      for (const proposal of session.proposals) {
        if (proposal.proposer.actorId !== reviewerActorId) {
          expectedPairs.add(`${reviewerActorId}::${proposal.proposalId}`);
        }
      }
    }

    const actualPairs = new Set<string>();
    const assessmentIds = new Set<string>();
    for (const [assessmentIndex, assessment] of session.peerAssessments.entries()) {
      if (assessmentIds.has(assessment.assessmentId)) {
        context.addIssue({
          code: 'custom',
          message: 'Peer assessment IDs must be globally unique within the committee.',
          path: ['peerAssessments', assessmentIndex, 'assessmentId'],
        });
      }
      assessmentIds.add(assessment.assessmentId);

      const proposal = proposalsById.get(assessment.proposalId);
      if (proposal === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Assessment references an unknown proposal.',
          path: ['peerAssessments', assessmentIndex, 'proposalId'],
        });
        continue;
      }
      if (!proposerActorIds.includes(assessment.reviewerActorId)) {
        context.addIssue({
          code: 'custom',
          message: 'Assessment reviewer is not a committee member.',
          path: ['peerAssessments', assessmentIndex, 'reviewerActorId'],
        });
      }
      if (proposal.proposer.actorId === assessment.reviewerActorId) {
        context.addIssue({
          code: 'custom',
          message: 'Self-assessment is not allowed.',
          path: ['peerAssessments', assessmentIndex],
        });
      }

      const pair = `${assessment.reviewerActorId}::${assessment.proposalId}`;
      if (actualPairs.has(pair)) {
        context.addIssue({
          code: 'custom',
          message: 'Each reviewer/proposal pair must occur exactly once.',
          path: ['peerAssessments', assessmentIndex],
        });
      }
      actualPairs.add(pair);

      const scoreDimensionIds = assessment.dimensionScores.map(({dimensionId}) => dimensionId);
      if (
        scoreDimensionIds.length !== dimensionIds.length ||
        new Set(scoreDimensionIds).size !== dimensionIds.length ||
        dimensionIds.some((dimensionId) => !scoreDimensionIds.includes(dimensionId))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Every peer assessment must score every rubric dimension exactly once.',
          path: ['peerAssessments', assessmentIndex, 'dimensionScores'],
        });
      }
      for (const [scoreIndex, score] of assessment.dimensionScores.entries()) {
        validateEvidenceRefs(score.evidenceRefs, [
          'peerAssessments',
          assessmentIndex,
          'dimensionScores',
          scoreIndex,
          'evidenceRefs',
        ]);
      }
    }

    if (
      actualPairs.size !== expectedPairs.size ||
      [...expectedPairs].some((pair) => !actualPairs.has(pair))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Every member must assess each of the other four proposals exactly once.',
        path: ['peerAssessments'],
      });
    }

    const selectedProposal = proposalsById.get(session.synthesis.selectedProposalId);
    if (selectedProposal === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Synthesis must select one of the five proposals.',
        path: ['synthesis', 'selectedProposalId'],
      });
    }

    const alternativeProposalIds = session.proposals
      .map(({proposalId}) => proposalId)
      .filter((proposalId) => proposalId !== session.synthesis.selectedProposalId);
    const dispositionIds = session.synthesis.alternativeDispositions.map(
      ({proposalId}) => proposalId,
    );
    if (
      new Set(dispositionIds).size !== 4 ||
      alternativeProposalIds.some((proposalId) => !dispositionIds.includes(proposalId))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Synthesis must explicitly disposition each of the four alternatives.',
        path: ['synthesis', 'alternativeDispositions'],
      });
    }
    if (
      !session.synthesis.incorporatedElements.some(
        ({sourceProposalId}) =>
          sourceProposalId !== session.synthesis.selectedProposalId &&
          proposalsById.has(sourceProposalId),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Synthesis must incorporate at least one compatible element from an alternative.',
        path: ['synthesis', 'incorporatedElements'],
      });
    }
    for (const [elementIndex, element] of session.synthesis.incorporatedElements.entries()) {
      if (!proposalsById.has(element.sourceProposalId)) {
        context.addIssue({
          code: 'custom',
          message: 'Incorporated element references an unknown proposal.',
          path: ['synthesis', 'incorporatedElements', elementIndex, 'sourceProposalId'],
        });
      }
    }

    if (session.dissent.status === 'PRESENT') {
      for (const [dissentIndex, dissent] of session.dissent.entries.entries()) {
        if (!proposerActorIds.includes(dissent.actorId)) {
          context.addIssue({
            code: 'custom',
            message: 'Dissent actor must be a committee member.',
            path: ['dissent', 'entries', dissentIndex, 'actorId'],
          });
        }
        if (dissent.proposalId !== undefined && !proposalsById.has(dissent.proposalId)) {
          context.addIssue({
            code: 'custom',
            message: 'Dissent references an unknown proposal.',
            path: ['dissent', 'entries', dissentIndex, 'proposalId'],
          });
        }
        validateEvidenceRefs(dissent.evidenceRefs, [
          'dissent',
          'entries',
          dissentIndex,
          'evidenceRefs',
        ]);
      }
    }
    validateEvidenceRefs(session.synthesis.evidenceRefs, ['synthesis', 'evidenceRefs']);
    for (const [driverIndex, driver] of session.uncertainty.drivers.entries()) {
      validateEvidenceRefs(driver.evidenceRefs, [
        'uncertainty',
        'drivers',
        driverIndex,
        'evidenceRefs',
      ]);
    }

    const materialUncertainty =
      session.uncertainty.overallScore >= session.uncertainty.materialThreshold ||
      session.uncertainty.drivers.some(({impact}) => impact === 'MATERIAL');
    const unresolvedByAnalysis = session.uncertainty.drivers.some(
      ({analysisStatus}) => analysisStatus === 'NOT_RESOLVABLE',
    );
    const secondPrototypeRequired = materialUncertainty && unresolvedByAnalysis;

    if (session.secondPrototype.required !== secondPrototypeRequired) {
      context.addIssue({
        code: 'custom',
        message:
          'A second prototype is required only for material uncertainty that analysis cannot resolve.',
        path: ['secondPrototype', 'required'],
      });
    }

    if (session.secondPrototype.required) {
      const [firstProposalId, secondProposalId] = session.secondPrototype.comparisonProposalIds;
      if (!proposalsById.has(firstProposalId) || !proposalsById.has(secondProposalId)) {
        context.addIssue({
          code: 'custom',
          message: 'Second prototype comparison must reference known proposals.',
          path: ['secondPrototype', 'comparisonProposalIds'],
        });
      }
      if (
        firstProposalId !== session.synthesis.selectedProposalId &&
        secondProposalId !== session.synthesis.selectedProposalId
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Second prototype comparison must include the selected proposal.',
          path: ['secondPrototype', 'comparisonProposalIds'],
        });
      }
    }
  });

export type CommitteeSession = z.infer<typeof CommitteeSessionSchema>;
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
export type PeerAssessment = z.infer<typeof PeerAssessmentSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type RoleId = z.infer<typeof RoleIdSchema>;
