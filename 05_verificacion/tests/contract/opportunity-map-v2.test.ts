import {createHash} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {
  assertOpportunityMapV2,
  assertOpportunitySelectionV2,
  buildDecisionFunnelV1,
  buildOpportunityMapV2,
  createOpportunitySelectionV2,
  type OpportunityMapV2,
} from 'core/contracts/index.ts';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const fixture = () => {
  const {funnel} = materializeDecisionFunnelFixture(sha('9'));
  const momentTypes: OpportunityMapV2['candidateDetails'][number]['momentType'][] = [
    'DEMONSTRATION',
    'MICROTUTORIAL',
    'PROCESS',
    'CAPABILITY_PROOF',
    'PORTFOLIO',
  ];
  const candidateDetails: OpportunityMapV2['candidateDetails'] = funnel.candidates.map(
    (candidate, index) => ({
      candidateId: candidate.candidateId,
      momentType: momentTypes[index]!,
      sourceSpans: [
        {
          startMs: index * 1000,
          endMs: index * 1000 + 900,
          startFrame: index * 30,
          endFrameExclusive: index * 30 + 27,
        },
      ],
      evidenceRefs: candidate.evidenceRefs,
      privacyAssessment: {
        state: 'VERIFIED_FEASIBLE' as const,
        evidenceRefs: [sha(`privacy-${String(index)}`)],
      },
      valueZoneRefs: [sha(`value-${String(index)}`)],
    }),
  );
  const evidenceRefs = candidateDetails.flatMap((detail) => [
    ...detail.evidenceRefs,
    ...detail.privacyAssessment.evidenceRefs,
    ...detail.valueZoneRefs,
  ]);
  const map = buildOpportunityMapV2({
    source: {
      materialSha256: sha('material'),
      inventorySha256: sha('inventory'),
      durationMs: 5000,
      frameCount: 150,
      fpsNumerator: 30,
      fpsDenominator: 1,
      evidenceRefs,
    },
    decisionFunnel: funnel,
    candidateDetails,
  });
  const selection = createOpportunitySelectionV2(map, {
    selectedOptionId: 'option-demonstration',
    actorId: 'H01-JAVIER',
    selectedAt: '2026-08-21T12:00:00.000Z',
  });
  return {map, selection};
};

describe('opportunity-map-v2', () => {
  it('binds source, five candidates, two visible directions and a human selection', () => {
    const {map, selection} = fixture();
    expect(assertOpportunityMapV2(map)).toEqual(map);
    expect(assertOpportunitySelectionV2(map, selection).selection.selectionKind).toBe('HUMAN');
    expect(map.candidateDetails).toHaveLength(5);
    expect(map.visibleOptionIds).toHaveLength(2);
    expect(map.productionAuthority).toBe(false);
    expect(map.workflowProjection.authority).toBe('opportunity-map-v2');
  });

  it('supports the seven format-agnostic moment classes', () => {
    const {map} = fixture();
    for (const momentType of ['BEFORE_AFTER', 'TESTIMONIAL'] as const) {
      expect(
        buildOpportunityMapV2({
          source: map.source,
          decisionFunnel: map.decisionFunnel,
          candidateDetails: map.candidateDetails.map((detail, index) =>
            index === 4 ? {...detail, momentType} : detail,
          ),
        }).candidateDetails[4]?.momentType,
      ).toBe(momentType);
    }
  });

  it('rejects blocked contributions, score-rank drift and option drift', () => {
    const {map} = fixture();
    expect(() =>
      buildOpportunityMapV2({...map, candidateDetails: map.candidateDetails.slice(0, 4)}),
    ).toThrow();
    expect(() =>
      buildOpportunityMapV2({
        source: map.source,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 4
            ? {...detail, privacyAssessment: {...detail.privacyAssessment, state: 'BLOCKED'}}
            : detail,
        ),
      }),
    ).toThrow(/blocked candidate/u);

    const candidates = map.decisionFunnel.candidates.map((candidate, index) => ({
      ...candidate,
      rank: index === 0 ? 5 : index === 4 ? 1 : candidate.rank,
    }));
    const rankDrift = buildDecisionFunnelV1({...map.decisionFunnel, candidates});
    expect(() =>
      buildOpportunityMapV2({
        source: map.source,
        decisionFunnel: rankDrift,
        candidateDetails: map.candidateDetails,
      }),
    ).toThrow(/ranks must follow total scores/u);
    expect(() =>
      assertOpportunityMapV2({...map, visibleOptionIds: [...map.visibleOptionIds].reverse()}),
    ).toThrow();
  });

  it('rejects evidence and spans that are not bound to the source', () => {
    const {map} = fixture();
    expect(() =>
      buildOpportunityMapV2({
        source: map.source,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0 ? {...detail, evidenceRefs: [sha('unbound')]} : detail,
        ),
      }),
    ).toThrow(/source-bound/u);
    expect(() =>
      buildOpportunityMapV2({
        source: map.source,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0
            ? {
                ...detail,
                sourceSpans: [
                  {...detail.sourceSpans[0]!, endFrameExclusive: map.source.frameCount + 1},
                ],
              }
            : detail,
        ),
      }),
    ).toThrow(/span exceeds/u);
  });

  it('binds the human selection to the complete map and fails closed on drift', () => {
    const {map, selection} = fixture();
    const replayTarget = buildOpportunityMapV2({
      source: {...map.source, inventorySha256: sha('different-inventory')},
      decisionFunnel: map.decisionFunnel,
      candidateDetails: map.candidateDetails,
    });
    expect(() => assertOpportunitySelectionV2(replayTarget, selection)).toThrow(
      /OPPORTUNITY-SELECTION-DRIFT/u,
    );
    expect(() => assertOpportunitySelectionV2(map, null)).toThrow();
    expect(() => assertOpportunityMapV2({...map, renderRef: 'forbidden.mp4'})).toThrow();
    expect(() =>
      assertOpportunityMapV2({
        ...map,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0
            ? {...detail, privacyAssessment: {...detail.privacyAssessment, state: 'UNKNOWN'}}
            : detail,
        ),
      }),
    ).toThrow();
    expect(() => assertOpportunityMapV2({...map, canonicalSha256: sha('f')})).toThrow(
      /HASH-DRIFT/u,
    );
  });
});
