import {createHash} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {
  assertOpportunityMapV2,
  assertOpportunitySelectionV2,
  buildDecisionFunnelV1,
  buildOpportunityMapV2,
  createOpportunitySelectionV2,
  createOpportunitySourceReceiptV1,
  type OpportunityMapEvidenceV2,
  type OpportunityMapV2,
} from 'core/contracts/index.ts';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const issuedAt = '2026-08-21T11:00:00.000Z';
const selectedAt = '2026-08-21T12:00:00.000Z';
const expiresAt = '2026-08-27T11:00:00.000Z';

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
  const materialBytes = new TextEncoder().encode('bound audiovisual source');
  const compatibilityProjectionBytes = new TextEncoder().encode('bound opportunity-map-v1');
  const sourceReceipt = createOpportunitySourceReceiptV1({
    receiptId: 'receipt-source-001',
    materialBytes,
    inventorySha256: sha('inventory'),
    durationMs: 5000,
    frameCount: 150,
    fpsNumerator: 30,
    fpsDenominator: 1,
    evidenceRefs: candidateDetails.flatMap((detail) => [
      ...detail.evidenceRefs,
      ...detail.privacyAssessment.evidenceRefs,
      ...detail.valueZoneRefs,
    ]),
    issuedAt,
    expiresAt: '2026-08-28T11:00:00.000Z',
  });
  const evidence: OpportunityMapEvidenceV2 = {
    sourceReceipt,
    materialBytes,
    compatibilityProjectionBytes,
  };
  const map = buildOpportunityMapV2({
    issuedAt,
    expiresAt,
    ...evidence,
    decisionFunnel: funnel,
    candidateDetails,
  });
  const selection = createOpportunitySelectionV2(map, evidence, {
    selectedOptionId: 'option-demonstration',
    actorId: 'H01-JAVIER',
    selectedAt,
  });
  return {map, selection, evidence};
};

describe('opportunity-map-v2', () => {
  it('binds material bytes, source receipt, projection and human selection', () => {
    const {map, selection, evidence} = fixture();
    expect(assertOpportunityMapV2(map, evidence, selectedAt)).toEqual(map);
    expect(assertOpportunitySelectionV2(map, selection, evidence, selectedAt).selection).toEqual(
      selection,
    );
    expect(map.candidateDetails).toHaveLength(5);
    expect(map.visibleOptionIds).toHaveLength(2);
    expect(map.productionAuthority).toBe(false);
  });

  it('supports all moment classes and rejects any blocked contribution', () => {
    const {map, evidence} = fixture();
    for (const momentType of ['BEFORE_AFTER', 'TESTIMONIAL'] as const) {
      expect(
        buildOpportunityMapV2({
          issuedAt,
          expiresAt,
          ...evidence,
          decisionFunnel: map.decisionFunnel,
          candidateDetails: map.candidateDetails.map((detail, index) =>
            index === 4 ? {...detail, momentType} : detail,
          ),
        }).candidateDetails[4]?.momentType,
      ).toBe(momentType);
    }
    expect(() =>
      buildOpportunityMapV2({
        issuedAt,
        expiresAt,
        ...evidence,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 4
            ? {...detail, privacyAssessment: {...detail.privacyAssessment, state: 'BLOCKED'}}
            : detail,
        ),
      }),
    ).toThrow(/blocked candidate/u);
  });

  it('rejects incoherent clocks, score-rank drift and unbound evidence', () => {
    const {map, evidence} = fixture();
    expect(() =>
      createOpportunitySourceReceiptV1({
        ...evidence.sourceReceipt,
        materialBytes: evidence.materialBytes,
        durationMs: 1000,
        frameCount: 150,
        fpsNumerator: 1,
        fpsDenominator: 1,
      }),
    ).toThrow(/duration, frame count and fps disagree/u);
    expect(() =>
      buildOpportunityMapV2({
        issuedAt,
        expiresAt,
        ...evidence,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0
            ? {...detail, sourceSpans: [{...detail.sourceSpans[0]!, startFrame: 100}]}
            : detail,
        ),
      }),
    ).toThrow(/span disagrees/u);
    const candidates = map.decisionFunnel.candidates.map((candidate, index) => ({
      ...candidate,
      rank: index === 0 ? 5 : index === 4 ? 1 : candidate.rank,
    }));
    expect(() =>
      buildOpportunityMapV2({
        issuedAt,
        expiresAt,
        ...evidence,
        decisionFunnel: buildDecisionFunnelV1({...map.decisionFunnel, candidates}),
        candidateDetails: map.candidateDetails,
      }),
    ).toThrow(/ranks must follow total scores/u);
    expect(() =>
      buildOpportunityMapV2({
        issuedAt,
        expiresAt,
        ...evidence,
        decisionFunnel: map.decisionFunnel,
        candidateDetails: map.candidateDetails.map((detail, index) =>
          index === 0 ? {...detail, evidenceRefs: [sha('unbound')]} : detail,
        ),
      }),
    ).toThrow(/source-bound/u);
  });

  it('rejects stale or replayed selections and external evidence drift', () => {
    const {map, selection, evidence} = fixture();
    expect(() =>
      createOpportunitySelectionV2(map, evidence, {
        selectedOptionId: map.visibleOptionIds[0]!,
        actorId: 'H01-JAVIER',
        selectedAt: '1970-01-01T00:00:00.000Z',
      }),
    ).toThrow();
    expect(() =>
      assertOpportunitySelectionV2(map, selection, evidence, '2026-08-29T00:00:00.000Z'),
    ).toThrow();
    expect(() =>
      assertOpportunityMapV2(
        map,
        {...evidence, materialBytes: new TextEncoder().encode('other bytes')},
        selectedAt,
      ),
    ).toThrow(/SOURCE-RECEIPT-DRIFT/u);
    expect(() =>
      assertOpportunityMapV2(
        map,
        {...evidence, compatibilityProjectionBytes: new TextEncoder().encode('divergent v1')},
        selectedAt,
      ),
    ).toThrow(/HASH-DRIFT/u);
    for (const compatibilityProjectionBytes of [
      new Uint8Array(),
      'not-bytes' as unknown as Uint8Array,
    ]) {
      expect(() =>
        buildOpportunityMapV2({
          issuedAt,
          expiresAt,
          ...evidence,
          compatibilityProjectionBytes,
          decisionFunnel: map.decisionFunnel,
          candidateDetails: map.candidateDetails,
        }),
      ).toThrow(/MUST-BE-NONEMPTY-BYTES/u);
    }
    expect(() =>
      assertOpportunityMapV2({...map, renderRef: 'no.mp4'}, evidence, selectedAt),
    ).toThrow();
  });
});
