import {describe, expect, it} from 'vitest';

import {
  DecisionFunnelV1Schema,
  assertDecisionFunnelV1,
  assertDecisionSelectionV1,
  buildDecisionFunnelV1,
  createDecisionSelectionV1,
} from 'core/contracts/experience-decision-v1.ts';

const digest = 'a'.repeat(64);
const buildFunnel = () =>
  buildDecisionFunnelV1({
    requestHash: digest,
    riskClass: 'STANDARD',
    interactions: [1, 2].map((index) => ({
      interactionId: `interaction-${index}`,
      source: 'CURRENT' as const,
      summary: `Contexto verificado ${index}.`,
      evidenceSha256: String.fromCharCode(96 + index).repeat(64),
      verified: true as const,
    })),
    candidates: Array.from({length: 5}, (_, index) => ({
      candidateId: `candidate-${index + 1}`,
      rank: index + 1,
      title: `Candidato ${index + 1}`,
      summary: `Dirección ${index + 1}.`,
      evidenceRefs: [digest],
      scores: {
        evidence: 20,
        publishability: 18,
        audienceValue: 17,
        visualImpact: 12,
        reuse: 8,
        effort: 7,
      },
      total: 82,
    })),
    options: [1, 2].map((primary) => ({
      optionId: `option-${primary}`,
      label: `Dirección ${primary}`,
      summary: `Síntesis ${primary}.`,
      primaryCandidateId: `candidate-${primary}`,
      absorbedCandidateIds: [`candidate-${primary}`, 'candidate-3', 'candidate-4', 'candidate-5'],
      rescuedContributions: [3, 4, 5].map((index) => ({
        candidateId: `candidate-${index}`,
        contribution: `Aporte rescatado ${index}.`,
      })),
    })),
  });

describe('decision-funnel-v1 adversarial contract', () => {
  it('requires unique interactions and three contexts for elevated risk', () => {
    const valid = buildFunnel();
    for (const interactions of [
      [valid.interactions[0]!, valid.interactions[0]!],
      [
        valid.interactions[0]!,
        {
          ...valid.interactions[1]!,
          source: 'VERIFIED_RESUME' as const,
          evidenceSha256: valid.interactions[0]!.evidenceSha256,
        },
      ],
    ]) {
      expect(() => buildDecisionFunnelV1({...valid, interactions})).toThrow(/unique/u);
    }
    expect(() => buildDecisionFunnelV1({...valid, riskClass: 'PRIVACY'})).toThrow(
      /three interactions/u,
    );
  });

  it('binds exactly one contribution from each discarded candidate', () => {
    const valid = buildFunnel();
    expect(valid.options[0]?.rescuedContributions.map(({candidateId}) => candidateId)).toEqual([
      'candidate-3',
      'candidate-4',
      'candidate-5',
    ]);
    expect(() =>
      DecisionFunnelV1Schema.parse({
        ...valid,
        options: valid.options.map((option, index) =>
          index === 0
            ? {
                ...option,
                rescuedContributions: option.rescuedContributions.map((item, itemIndex) =>
                  itemIndex === 2 ? {...item, candidateId: 'candidate-1'} : item,
                ),
              }
            : option,
        ),
      }),
    ).toThrow(/discarded candidates/u);
  });

  it('rejects selection and canonical hash drift', () => {
    const funnel = buildFunnel();
    const selection = createDecisionSelectionV1(funnel, {
      selectedOptionId: 'option-1',
      actorId: 'human-javier',
      selectedAt: '2026-08-21T12:00:00.000Z',
    });
    expect(() =>
      assertDecisionSelectionV1({...funnel, canonicalSha256: 'f'.repeat(64)}, selection),
    ).toThrow(/HASH-DRIFT/u);
    expect(() =>
      assertDecisionSelectionV1(funnel, {...selection, selectedOptionId: 'option-2'}),
    ).toThrow(/DRIFT/u);
  });

  it('canonicalizes reordered nested keys before hashing', () => {
    const valid = buildFunnel();
    const reordered = buildDecisionFunnelV1({
      ...valid,
      options: valid.options.map((option) => ({
        rescuedContributions: option.rescuedContributions.map((item) => ({
          contribution: item.contribution,
          candidateId: item.candidateId,
        })),
        absorbedCandidateIds: option.absorbedCandidateIds,
        primaryCandidateId: option.primaryCandidateId,
        summary: option.summary,
        label: option.label,
        optionId: option.optionId,
      })),
    });
    expect(assertDecisionFunnelV1(reordered)).toEqual(reordered);
  });
});
