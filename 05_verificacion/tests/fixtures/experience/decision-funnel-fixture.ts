import {
  buildDecisionFunnelV1,
  createDecisionSelectionV1,
  type DecisionFunnelV1,
  type DecisionSelectionV1,
} from 'core/contracts/index.ts';

const digest = (value: string): string => value.repeat(64);

export const materializeDecisionFunnelFixture = (
  requestHash: string,
): {funnel: DecisionFunnelV1; selection: DecisionSelectionV1} => {
  const candidates: DecisionFunnelV1['candidates'] = [
    ['candidate-evidence', 1, 'Demostración visible'],
    ['candidate-tutorial', 2, 'Microtutorial'],
    ['candidate-process', 3, 'Proceso'],
    ['candidate-proof', 4, 'Prueba de capacidad'],
    ['candidate-portfolio', 5, 'Portafolio'],
  ].map(([candidateId, rank, title], index) => ({
    candidateId: String(candidateId),
    rank: Number(rank),
    title: String(title),
    summary: `Dirección sintética ${String(title)} para evaluar la experiencia.`,
    evidenceRefs: [digest(String.fromCharCode(97 + index))],
    scores: {
      evidence: 20 - index,
      publishability: 15,
      audienceValue: 15,
      visualImpact: 10,
      reuse: 8,
      effort: 8,
    },
    total: 76 - index,
  }));
  const discarded = ['candidate-process', 'candidate-proof', 'candidate-portfolio'];
  const funnel = buildDecisionFunnelV1({
    requestHash,
    riskClass: 'STANDARD',
    interactions: [
      {
        interactionId: 'interaction-current',
        source: 'CURRENT',
        summary: 'Objetivo y fuentes verificados en la conversación actual.',
        evidenceSha256: digest('f'),
        verified: true,
      },
      {
        interactionId: 'interaction-resume',
        source: 'VERIFIED_RESUME',
        summary: 'Contexto retomado y verificado sin repetir preguntas.',
        evidenceSha256: digest('0'),
        verified: true,
      },
    ],
    candidates,
    options: [
      {
        optionId: 'option-demonstration',
        label: 'Demostración visible',
        summary: 'Prioriza el resultado y conserva el proceso esencial.',
        primaryCandidateId: 'candidate-evidence',
        absorbedCandidateIds: ['candidate-evidence', ...discarded],
        rescuedContributions: discarded.map((candidateId) => ({
          candidateId,
          contribution: `Aporte verificable rescatado de ${candidateId}.`,
        })),
      },
      {
        optionId: 'option-tutorial',
        label: 'Microtutorial',
        summary: 'Prioriza enseñanza breve y conserva evidencia del resultado.',
        primaryCandidateId: 'candidate-tutorial',
        absorbedCandidateIds: ['candidate-tutorial', ...discarded],
        rescuedContributions: discarded.map((candidateId) => ({
          candidateId,
          contribution: `Aporte verificable rescatado de ${candidateId}.`,
        })),
      },
    ],
  });
  return {
    funnel,
    selection: createDecisionSelectionV1(funnel, {
      selectedOptionId: 'option-demonstration',
      actorId: 'H01-JAVIER',
      selectedAt: '2026-08-21T12:00:00.000Z',
    }),
  };
};
