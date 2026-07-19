import {
  CommitteeSessionSchema,
  type CommitteeSession,
  type RoleId,
} from '../../../committees/src/contracts.ts';

const committeeRoles = [
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
] as const satisfies readonly RoleId[];

const evidence = (index: number) => ({
  evidenceId: `evidence-${String(index).padStart(2, '0')}`,
  sourceId: 'source-first-party',
  tag: '[DOC]' as const,
  claim: `Evidencia verificable ${String(index)}.`,
  sha256: String(index).padStart(64, '0'),
});

export const makeValidSession = (): CommitteeSession => {
  const proposals = committeeRoles.map((roleId, index) => {
    const ordinal = index + 1;
    const proposalId = `proposal-${String(ordinal).padStart(2, '0')}`;
    const evidenceItem = evidence(ordinal);
    return {
      proposalId,
      proposer: {
        actorId: `actor-${roleId.toLowerCase()}`,
        roleId,
        specialty: `Especialidad ${roleId}`,
      },
      title: `Dirección conceptual ${String(ordinal)}`,
      concept: `Concepto independiente ${String(ordinal)} para el work product.`,
      assumptions: [
        {
          statement: `Supuesto explícito ${String(ordinal)}.`,
          evidenceRefs: [evidenceItem.evidenceId],
        },
      ],
      evidence: [evidenceItem],
      risks: [
        {
          riskId: `risk-${String(ordinal).padStart(2, '0')}`,
          statement: `Riesgo material ${String(ordinal)}.`,
          severity: 'MEDIUM' as const,
          mitigation: `Mitigación verificable ${String(ordinal)}.`,
          evidenceRefs: [evidenceItem.evidenceId],
        },
      ],
      criteria: [
        {
          criterionId: `criterion-${String(ordinal).padStart(2, '0')}`,
          statement: `Criterio ${String(ordinal)}.`,
          acceptanceSignal: `Señal observable ${String(ordinal)}.`,
        },
      ],
      tradeoffs: [`Trade-off ${String(ordinal)}.`],
    };
  });

  const dimensions = [
    {
      dimensionId: 'strategic-fit',
      label: 'Alineación estratégica',
      weight: 0.4,
      guidance: 'Evalúa ajuste con audiencia y objetivo.',
      riskCritical: false,
    },
    {
      dimensionId: 'evidence-integrity',
      label: 'Integridad de evidencia',
      weight: 0.35,
      guidance: 'Evalúa trazabilidad y límites.',
      riskCritical: true,
    },
    {
      dimensionId: 'feasibility',
      label: 'Factibilidad',
      weight: 0.25,
      guidance: 'Evalúa ejecución bajo restricciones.',
      riskCritical: false,
    },
  ];

  const peerAssessments = proposals.flatMap((proposal, proposalIndex) =>
    proposals
      .filter(({proposer}) => proposer.actorId !== proposal.proposer.actorId)
      .map(({proposer: reviewer}) => {
        const score = 5 - proposalIndex;
        return {
          assessmentId: `assessment-${reviewer.actorId}-${proposal.proposalId}`,
          reviewerActorId: reviewer.actorId,
          proposalId: proposal.proposalId,
          dimensionScores: dimensions.map(({dimensionId}) => ({
            dimensionId,
            score,
            evidenceRefs: [proposal.evidence[0]!.evidenceId],
            decisionNote: `Score resumido ${String(score)}.`,
          })),
          strengths: ['Fortaleza observable.'],
          objections: ['Objeción concreta y revisable.'],
          socraticQuestions: ['¿Qué evidencia falsaría esta dirección?'],
          compatibleElements: ['Elemento compatible con la síntesis.'],
        };
      }),
  );

  return CommitteeSessionSchema.parse({
    schemaVersion: 1,
    committeeId: 'committee-vs-001',
    workProductId: 'work-product-vs-001',
    sourceSnapshotId: 'snapshot-synthetic-v1',
    format: 'VIDEO',
    riskTier: 'MEDIUM',
    createdAt: '2026-07-19T12:00:00-05:00',
    proposals,
    rubric: {
      rubricId: 'rubric-creative-v1',
      dimensions,
      scale: {
        minimum: 0,
        maximum: 5,
      },
    },
    peerAssessments,
    dissent: {
      status: 'PRESENT',
      entries: [
        {
          dissentId: 'dissent-01',
          actorId: 'actor-rt-08',
          proposalId: 'proposal-05',
          statement: 'La semántica de datos requiere un límite visible.',
          evidenceRefs: ['evidence-05'],
          disposition: 'INCORPORATED',
          dispositionSummary: 'El límite se incorpora como criterio del candidate.',
        },
      ],
    },
    synthesis: {
      synthesisId: 'synthesis-vs-001',
      selectedProposalId: 'proposal-01',
      decisionSummary: 'Se selecciona la dirección mejor puntuada.',
      incorporatedElements: [
        {
          sourceProposalId: 'proposal-02',
          element: 'Jerarquía editorial alternativa.',
          compatibilityNote: 'Refuerza claridad sin cambiar el claim.',
        },
      ],
      alternativeDispositions: [
        {
          proposalId: 'proposal-02',
          disposition: 'PARTIALLY_INCORPORATED',
          summary: 'Se incorpora la jerarquía editorial.',
        },
        {
          proposalId: 'proposal-03',
          disposition: 'NO_MATERIAL_VALUE',
          summary: 'No añade valor material al candidate.',
        },
        {
          proposalId: 'proposal-04',
          disposition: 'NOT_COMPATIBLE',
          summary: 'Contradice la restricción de ritmo.',
        },
        {
          proposalId: 'proposal-05',
          disposition: 'PARTIALLY_INCORPORATED',
          summary: 'Se incorpora el límite semántico.',
        },
      ],
      requestedChanges: ['Hacer visible el límite semántico.'],
      evidenceRefs: ['evidence-01', 'evidence-02', 'evidence-05'],
    },
    uncertainty: {
      overallScore: 0.2,
      materialThreshold: 0.6,
      drivers: [
        {
          driverId: 'uncertainty-readability',
          statement: 'La lectura en pantalla pequeña debe verificarse.',
          impact: 'LOW',
          analysisStatus: 'RESOLVED',
          evidenceRefs: ['evidence-01'],
        },
      ],
    },
    secondPrototype: {
      required: false,
      trigger: 'NOT_JUSTIFIED',
      rationale: 'No existe incertidumbre material sin resolver por análisis.',
    },
  });
};

export const makeMaterialUncertaintySession = (): CommitteeSession => {
  const session = makeValidSession();
  session.uncertainty = {
    overallScore: 0.8,
    materialThreshold: 0.6,
    drivers: [
      {
        driverId: 'uncertainty-motion-density',
        statement: 'El patrón de movimiento puede afectar comprensión.',
        impact: 'MATERIAL',
        analysisStatus: 'NOT_RESOLVABLE',
        evidenceRefs: ['evidence-01'],
      },
    ],
  };
  session.secondPrototype = {
    required: true,
    trigger: 'MATERIAL_UNRESOLVED_BY_ANALYSIS',
    comparisonProposalIds: ['proposal-01', 'proposal-02'],
    scope: 'Probar únicamente densidad de movimiento en el beat crítico.',
    falsificationCriteria: ['La alternativa no mejora comprensión en la revisión definida.'],
  };

  return CommitteeSessionSchema.parse(session);
};
