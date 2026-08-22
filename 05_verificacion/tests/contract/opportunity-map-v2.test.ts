import {createHash} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {
  assertOpportunityMapV2,
  assertOpportunitySelectionV2,
  buildOpportunityMapV2,
  type OpportunityMapV2,
} from 'core/contracts/opportunity-map-v2.ts';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const fixture = () => {
  const {funnel, selection} = materializeDecisionFunnelFixture(sha('9'));
  const momentTypes: OpportunityMapV2['candidateDetails'][number]['momentType'][] = [
    'DEMONSTRATION',
    'MICROTUTORIAL',
    'PROCESS',
    'CAPABILITY_PROOF',
    'PORTFOLIO',
  ];
  const map = buildOpportunityMapV2({
    sourceInventorySha256: sha('8'),
    decisionFunnel: funnel,
    candidateDetails: funnel.candidates.map((candidate, index) => ({
      candidateId: candidate.candidateId,
      momentType: momentTypes[index]!,
      sourceSpans: [
        {
          startMs: index * 1000,
          endMs: index * 1000 + 900,
          startFrame: index * 30,
          endFrame: index * 30 + 27,
        },
      ],
      evidenceRefs: candidate.evidenceRefs,
      privacyAssessment: {
        state: 'VERIFIED_FEASIBLE' as const,
        evidenceRefs: [sha(String(index + 1))],
      },
      valueZoneRefs: [sha(String.fromCharCode(102 + index))],
    })),
  });
  return {map, selection};
};

describe('opportunity-map-v2', () => {
  it('binds five candidates, two visible directions and a human selection', () => {
    const {map, selection} = fixture();
    expect(assertOpportunityMapV2(map)).toEqual(map);
    expect(assertOpportunitySelectionV2(map, selection).selection.selectionKind).toBe('HUMAN');
    expect(map.candidateDetails).toHaveLength(5);
    expect(map.visibleOptionIds).toHaveLength(2);
    expect(map.productionAuthority).toBe(false);
  });

  it('supports the seven format-agnostic moment classes', () => {
    const {map} = fixture();
    for (const momentType of ['BEFORE_AFTER', 'TESTIMONIAL'] as const) {
      expect(
        buildOpportunityMapV2({
          sourceInventorySha256: map.sourceInventorySha256,
          decisionFunnel: map.decisionFunnel,
          candidateDetails: map.candidateDetails.map((detail, index) =>
            index === 4 ? {...detail, momentType} : detail,
          ),
        }).candidateDetails[4]?.momentType,
      ).toBe(momentType);
    }
  });

  it('rejects incomplete evidence, blocked visible candidates and option drift', () => {
    const {map} = fixture();
    expect(() =>
      buildOpportunityMapV2({...map, candidateDetails: map.candidateDetails.slice(0, 4)}),
    ).toThrow();
    expect(() =>
      assertOpportunityMapV2({
        ...map,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0
            ? {...detail, privacyAssessment: {...detail.privacyAssessment, state: 'BLOCKED'}}
            : detail,
        ),
      }),
    ).toThrow(/blocked candidate/u);
    expect(() =>
      assertOpportunityMapV2({...map, visibleOptionIds: [...map.visibleOptionIds].reverse()}),
    ).toThrow();
  });

  it('fails closed before selection and on hash drift', () => {
    const {map} = fixture();
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
