import {createHash} from 'node:crypto';

import {stringify} from 'yaml';
import {describe, expect, it} from 'vitest';

import {
  buildOpportunityMapV2,
  createOpportunitySelectionV2,
  createOpportunitySourceReceiptV1,
  type OpportunityMapEvidenceV2,
  type OpportunityMapV2,
} from 'core/contracts/index.ts';
import {materializeDecisionFunnelFixture} from '../../fixtures/experience/decision-funnel-fixture.ts';
import {OpportunityMaterialAuthorityV1Schema} from 'workflows/multimedia/_runner/material-input-schema.ts';
import {enforceOpportunityMaterialAuthority} from 'workflows/multimedia/_runner/opportunity-material-authority.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const issuedAt = '2026-08-21T11:00:00.000Z';
const selectedAt = '2026-08-21T12:00:00.000Z';
const verifiedAt = '2026-08-22T12:00:00.000Z';

const fixture = () => {
  const {funnel} = materializeDecisionFunnelFixture(sha('runtime'));
  const details: OpportunityMapV2['candidateDetails'] = funnel.candidates.map(
    (candidate, index) => ({
      candidateId: candidate.candidateId,
      momentType: 'DEMONSTRATION' as const,
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
  const materialBytes = Buffer.from('material source', 'utf8');
  const projection = '# opportunity-map-v1\n\nProyección exacta.\n';
  const sourceReceipt = createOpportunitySourceReceiptV1({
    receiptId: 'receipt-runtime-001',
    materialBytes,
    inventorySha256: sha('inventory'),
    durationMs: 5000,
    frameCount: 150,
    fpsNumerator: 30,
    fpsDenominator: 1,
    evidenceRefs: details.flatMap((detail) => [
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
    compatibilityProjectionBytes: Buffer.from(projection, 'utf8'),
  };
  const map = buildOpportunityMapV2({
    issuedAt,
    expiresAt: '2026-08-27T11:00:00.000Z',
    ...evidence,
    decisionFunnel: funnel,
    candidateDetails: details,
  });
  const selection = createOpportunitySelectionV2(map, evidence, {
    selectedOptionId: map.visibleOptionIds[0]!,
    actorId: 'H01',
    selectedAt,
  });
  const authority = OpportunityMaterialAuthorityV1Schema.parse({
    source_receipt_path: 'authority/source-receipt.yml',
    source_material_path: 'authority/source.bin',
    opportunity_map_path: 'authority/map.yml',
    opportunity_selection_path: 'authority/selection.yml',
  });
  const files = new Map<string, Buffer>([
    [authority.source_receipt_path, Buffer.from(stringify(sourceReceipt), 'utf8')],
    [authority.source_material_path, materialBytes],
    [authority.opportunity_map_path, Buffer.from(stringify(map), 'utf8')],
    [authority.opportunity_selection_path, Buffer.from(stringify(selection), 'utf8')],
  ]);
  const run = (
    overrides: {
      workflowId?: string;
      projection?: string;
      verifiedAt?: string;
      authority?: typeof authority;
    } = {},
  ) =>
    enforceOpportunityMaterialAuthority({
      workflowId: overrides.workflowId ?? 'P02',
      requestHash: funnel.requestHash,
      authority: overrides.authority ?? authority,
      materials: new Map([['opportunity-map-v1', {markdown: overrides.projection ?? projection}]]),
      readLocal: (path) => ({bytes: files.get(path) ?? Buffer.alloc(0), canonicalPath: path}),
      verifiedAt: overrides.verifiedAt ?? verifiedAt,
    });
  return {authority, evidence, files, map, projection, run};
};

describe('P02 opportunity material authority', () => {
  it('consumes source, map, projection and human selection before materialization', () => {
    const inputs = fixture().run();
    expect(inputs.map(({artifact}) => artifact)).toEqual([
      'opportunity-source-receipt-v1',
      'opportunity-source-material-v1',
      'opportunity-map-v2',
      'opportunity-selection-v2',
    ]);
    expect(inputs.every(({sha256}) => /^[a-f0-9]{64}$/u.test(sha256))).toBe(true);
  });

  it('rejects missing authority and forbids it outside P02', () => {
    const {authority, run} = fixture();
    expect(() =>
      enforceOpportunityMaterialAuthority({
        workflowId: 'P02',
        requestHash: 'a'.repeat(64),
        authority: undefined,
        materials: new Map(),
        readLocal: (path) => ({bytes: Buffer.alloc(0), canonicalPath: path}),
        verifiedAt,
      }),
    ).toThrow(/AUTHORITY002/u);
    expect(() => run({workflowId: 'P03', authority})).toThrow(/AUTHORITY001/u);
  });

  it('rejects divergent projection and stale evidence', () => {
    const {run} = fixture();
    expect(() => run({projection: 'divergent projection'})).toThrow(/AUTHORITY004/u);
    expect(() => run({verifiedAt: '2026-08-29T12:00:00.000Z'})).toThrow(/AUTHORITY004/u);
  });

  it('rejects tampered selection and aliased authority paths', () => {
    const {authority, files, run} = fixture();
    files.set(authority.opportunity_selection_path, Buffer.from('schemaVersion: invalid\n'));
    expect(() => run()).toThrow(/AUTHORITY004/u);
    expect(() =>
      OpportunityMaterialAuthorityV1Schema.parse({
        ...authority,
        source_material_path: authority.source_receipt_path,
      }),
    ).toThrow(/paths must be unique/u);
    for (const alias of [
      'authority/./source.yml',
      'authority//source.yml',
      'authority\\source.yml',
      'C:\\outside.bin',
      '.',
    ]) {
      expect(() =>
        OpportunityMaterialAuthorityV1Schema.parse({...authority, source_material_path: alias}),
      ).toThrow(/canonical local path/u);
    }
  });

  it('binds the map to the active request and the canonical human selector', () => {
    const original = fixture();
    expect(() =>
      enforceOpportunityMaterialAuthority({
        workflowId: 'P02',
        requestHash: 'f'.repeat(64),
        authority: original.authority,
        materials: new Map([['opportunity-map-v1', {markdown: original.projection}]]),
        readLocal: (path) => ({
          bytes: original.files.get(path) ?? Buffer.alloc(0),
          canonicalPath: path,
        }),
        verifiedAt,
      }),
    ).toThrow(/AUTHORITY004/u);
    const nonCanonicalSelection = createOpportunitySelectionV2(original.map, original.evidence, {
      selectedOptionId: original.map.visibleOptionIds[0]!,
      actorId: 'H01-JAVIER',
      selectedAt,
    });
    original.files.set(
      original.authority.opportunity_selection_path,
      Buffer.from(stringify(nonCanonicalSelection), 'utf8'),
    );
    expect(() => original.run()).toThrow(/AUTHORITY004/u);
  });

  it('rejects different declared paths that resolve to one canonical file', () => {
    const {authority, files} = fixture();
    expect(() =>
      enforceOpportunityMaterialAuthority({
        workflowId: 'P02',
        requestHash: materializeDecisionFunnelFixture(sha('runtime')).funnel.requestHash,
        authority,
        materials: new Map([
          ['opportunity-map-v1', {markdown: '# opportunity-map-v1\n\nProyección exacta.\n'}],
        ]),
        readLocal: (path) => ({
          bytes: files.get(path) ?? Buffer.alloc(0),
          canonicalPath: 'one-real-file',
        }),
        verifiedAt,
      }),
    ).toThrow(/AUTHORITY005/u);
  });
});
