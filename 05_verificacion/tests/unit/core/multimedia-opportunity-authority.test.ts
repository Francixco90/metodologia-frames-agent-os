import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {parse, stringify} from 'yaml';
import {afterAll, describe, expect, it, vi} from 'vitest';

import {
  buildOpportunityMapV2,
  createOpportunitySelectionV2,
  createOpportunitySourceReceiptV1,
  type OpportunityMapEvidenceV2,
  type OpportunityMapV2,
} from 'core/contracts/index.ts';
import {materializeDecisionFunnelFixture} from '../../fixtures/experience/decision-funnel-fixture.ts';
import {MultimediaWorkflowReceiptSchema} from '../../../scripts/lib/multimedia-workflow-receipt-schema.ts';
import {FRAMES_DELIVERABLE_SECTIONS} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {loadDeliverableDefinitions} from 'workflows/multimedia/_runner/deliverable-material.ts';
import {createFramesDeliverableMarkdown} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {calculateMaterialManifestHash} from 'workflows/multimedia/_runner/material-input.ts';
import {OpportunityMaterialAuthorityV1Schema} from 'workflows/multimedia/_runner/material-input-schema.ts';
import {enforceOpportunityMaterialAuthority} from 'workflows/multimedia/_runner/opportunity-material-authority.ts';
import {calculateMultimediaWorkOrderHash} from 'workflows/multimedia/_runner/output-selection.ts';
import {runWorkflow} from 'workflows/multimedia/_runner/run.ts';
import {isoWithOffset} from 'workflows/multimedia/_runner/workflow-loader.ts';
import {hashContentRequestV1} from '../../../../03_artefactos/skills/content-os-router/scripts/content-intent-request.mjs';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const issuedAt = '2026-08-21T11:00:00.000Z';
const selectedAt = '2026-08-21T12:00:00.000Z';
const verifiedAt = '2026-08-22T12:00:00.000Z';
const root = process.cwd();
const testRoot = fs.mkdtempSync(resolve(tmpdir(), 'frames-opportunity-run-'));
const originalArgv = process.argv;
const originalExitCode = process.exitCode;

afterAll(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  fs.rmSync(testRoot, {recursive: true, force: true});
});

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

const prepareP02Run = (name: string) => {
  const lane = resolve(testRoot, name);
  const authorityDir = resolve(lane, 'authority');
  const materialsDir = resolve(lane, 'materials');
  fs.mkdirSync(authorityDir, {recursive: true});
  fs.mkdirSync(materialsDir, {recursive: true});
  const request = 'Seleccionar una oportunidad verificable antes de crear un brief.';
  const requestHash = hashContentRequestV1(request);
  const intentPath = resolve(lane, 'intent.yml');
  const intent = {
    schema_version: 'content-intent-v2',
    request,
    request_hash: requestHash,
    content_class: 'research',
    audience: 'Equipo editorial',
    outcome: 'Oportunidad seleccionada',
    sources: ['authority/source.bin'],
    source_authority: 'verified',
    channels: ['internal'],
    restrictions: ['No publicar'],
    effect_class: 'local_reversible',
    brief_sufficiency: 'complete',
    blocking_questions: [],
    route_candidates: [{route_id: 'P02', score: 1, reason_codes: ['SOURCE_VERIFIED']}],
    selected_stage_path: ['P02'],
    brief_ref: null,
    next_gate: 'G14',
    decision: 'ROUTED',
  };
  fs.writeFileSync(intentPath, stringify(intent), 'utf8');
  const intentSha = sha(fs.readFileSync(intentPath, 'utf8'));
  const workOrderPath = resolve(lane, 'work-order.yml');
  const outputIds = ['claim-register-v1', 'opportunity-map-v1', 'question-bank-v1'];
  const unsignedWorkOrder = {
    schema_version: 'multimedia-work-order-v1' as const,
    work_order_id: `WO-P02-${name.toUpperCase()}`,
    workflow_id: 'P02' as const,
    intent_hash: intentSha,
    producer_actor_id: 'content-producer-local',
    allowed_outputs: outputIds,
    effect_class: 'local_reversible' as const,
    publication_policy: 'forbidden' as const,
  };
  fs.writeFileSync(
    workOrderPath,
    stringify({
      ...unsignedWorkOrder,
      canonical_sha256: calculateMultimediaWorkOrderHash(unsignedWorkOrder),
    }),
    'utf8',
  );
  const workOrderSha = sha(fs.readFileSync(workOrderPath, 'utf8'));
  const workflowDir = resolve(root, '02_proceso/workflows/multimedia/p02-investigar');
  const workflow = MultimediaWorkflowSchema.parse(
    parse(fs.readFileSync(resolve(workflowDir, 'workflow.yml'), 'utf8')),
  );
  const definitions = loadDeliverableDefinitions(root);
  const materialBytes = Buffer.from('video source bytes', 'utf8');
  const materialSha = sha(materialBytes.toString('utf8'));
  const materialPath = resolve(authorityDir, 'source.bin');
  fs.writeFileSync(materialPath, materialBytes);
  const makeDeliverable = (id: string, index: number): string => {
    const definition = definitions.get(id)!;
    const output = workflow.outputs.find(({deliverable_id}) => deliverable_id === id)!;
    return createFramesDeliverableMarkdown(
      {
        schema_version: 'frames-deliverable-v1',
        instance_id: `DELIV-P02-${name.toUpperCase()}-${String(index + 1)}`,
        deliverable_id: id,
        display_name: output.artifact,
        workflow_id: 'P02',
        deliverable_class: definition.deliverable_class,
        touchpoint: definition.touchpoint,
        identity: {brand: 'MetodologIA', owner: 'content-producer-local'},
        audience: definition.audience,
        purpose: definition.purpose,
        sources: [
          {
            source_id: 'opportunity-source-material-v1',
            ref: 'authority/source.bin',
            sha256: materialSha,
            authority: 'verified',
            rights: 'cleared',
          },
        ],
        formats: definition.formats,
        piece_families: definition.piece_families,
        companion_for: null,
        skills: workflow.capability_map.skills,
        fields: definition.required_fields.map((field) => ({
          field_id: field,
          label: field,
          value_type: 'text' as const,
          status: 'observed' as const,
          value: `Contenido verificable para ${field}.`,
          source_refs: ['opportunity-source-material-v1'],
        })),
        state: 'RENDERED_DRAFT',
        next_gate: definition.acceptance_gate,
      },
      FRAMES_DELIVERABLE_SECTIONS.map((section) => ({
        id: section,
        markdown: `${section}: contenido verificable.`,
      })),
    );
  };
  const markdowns = new Map(outputIds.map((id, index) => [id, makeDeliverable(id, index)]));
  const {funnel} = materializeDecisionFunnelFixture(requestHash);
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
        evidenceRefs: [sha(`run-privacy-${String(index)}`)],
      },
      valueZoneRefs: [sha(`run-value-${String(index)}`)],
    }),
  );
  const receipt = createOpportunitySourceReceiptV1({
    receiptId: `receipt-${name}`,
    materialBytes,
    inventorySha256: sha(`inventory-${name}`),
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
  const projection = markdowns.get('opportunity-map-v1')!;
  const evidence: OpportunityMapEvidenceV2 = {
    sourceReceipt: receipt,
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
  fs.writeFileSync(resolve(authorityDir, 'source-receipt.yml'), stringify(receipt), 'utf8');
  fs.writeFileSync(resolve(authorityDir, 'map.yml'), stringify(map), 'utf8');
  fs.writeFileSync(resolve(authorityDir, 'selection.yml'), stringify(selection), 'utf8');
  const outputs = outputIds.map((id) => {
    const markdown = markdowns.get(id)!;
    fs.writeFileSync(resolve(materialsDir, `${id}.md`), markdown, 'utf8');
    return {deliverable_id: id, markdown_path: `materials/${id}.md`, sha256: sha(markdown)};
  });
  const unsignedManifest = {
    schema_version: 'multimedia-material-input-v1' as const,
    workflow_id: 'P02' as const,
    intent_sha256: intentSha,
    work_order_sha256: workOrderSha,
    producer_actor_id: 'content-producer-local',
    outputs,
    opportunity_authority: {
      source_receipt_path: 'authority/source-receipt.yml',
      source_material_path: 'authority/source.bin',
      opportunity_map_path: 'authority/map.yml',
      opportunity_selection_path: 'authority/selection.yml',
    },
  };
  const manifestPath = resolve(lane, 'material-manifest.yml');
  fs.writeFileSync(
    manifestPath,
    stringify({
      ...unsignedManifest,
      canonical_sha256: calculateMaterialManifestHash(unsignedManifest),
    }),
    'utf8',
  );
  return {lane, intentPath, workOrderPath, manifestPath};
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

  it('blocks the P02 public dry-run when the governed authority bundle is absent', () => {
    process.exitCode = undefined;
    process.argv = ['node', 'run.ts', '--workflow=P02', '--dry-run'];
    const errors: string[] = [];
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation((value) => errors.push(String(value)));
    try {
      runWorkflow('P02');
    } finally {
      error.mockRestore();
    }
    expect(process.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('MW-MATERIAL-AUTHORITY001');
  });

  it('carries the four verified opportunity inputs through the public runner receipt', () => {
    const authority = prepareP02Run('receipt');
    const artifactRoot = resolve(authority.lane, 'artifacts');
    const receiptsRoot = resolve(authority.lane, 'receipts');
    const runAt = new Date(verifiedAt);
    fs.mkdirSync(resolve(receiptsRoot, 'WF-P02', isoWithOffset(runAt).replace(/[:+]/gu, '-')), {
      recursive: true,
    });
    process.exitCode = undefined;
    process.argv = [
      'node',
      'run.ts',
      '--workflow=P02',
      `--intent=${authority.intentPath}`,
      `--work-order=${authority.workOrderPath}`,
      `--material-manifest=${authority.manifestPath}`,
    ];
    const errors: string[] = [];
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation((value) => errors.push(String(value)));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      runWorkflow('P02', {artifactRoot, receiptsRoot, now: runAt});
    } finally {
      error.mockRestore();
      info.mockRestore();
    }
    expect(errors).toEqual([]);
    expect(process.exitCode).toBeUndefined();
    const receiptLane = resolve(receiptsRoot, 'WF-P02');
    const runReceipt = MultimediaWorkflowReceiptSchema.parse(
      parse(
        fs.readFileSync(
          resolve(receiptLane, fs.readdirSync(receiptLane)[0]!, 'receipt.yml'),
          'utf8',
        ),
      ),
    );
    expect(runReceipt.inputs.map(({artifact}) => artifact)).toEqual(
      expect.arrayContaining([
        'opportunity-source-receipt-v1',
        'opportunity-source-material-v1',
        'opportunity-map-v2',
        'opportunity-selection-v2',
      ]),
    );
    expect(runReceipt.work_product_state_to).toBe('RENDERED_DRAFT');
  });

  it('rejects canonical path aliasing through the public P02 runner', () => {
    const authority = prepareP02Run('symlink-alias');
    fs.symlinkSync('source-receipt.yml', resolve(authority.lane, 'authority/receipt-alias.yml'));
    const manifest = parse(fs.readFileSync(authority.manifestPath, 'utf8')) as {
      canonical_sha256?: string;
      opportunity_authority: {source_material_path: string};
      [key: string]: unknown;
    };
    manifest.opportunity_authority.source_material_path = 'authority/receipt-alias.yml';
    delete manifest.canonical_sha256;
    fs.writeFileSync(
      authority.manifestPath,
      stringify({...manifest, canonical_sha256: calculateMaterialManifestHash(manifest as never)}),
      'utf8',
    );
    process.exitCode = undefined;
    process.argv = [
      'node',
      'run.ts',
      '--workflow=P02',
      '--dry-run',
      `--intent=${authority.intentPath}`,
      `--work-order=${authority.workOrderPath}`,
      `--material-manifest=${authority.manifestPath}`,
    ];
    const errors: string[] = [];
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation((value) => errors.push(String(value)));
    try {
      runWorkflow('P02', {now: new Date(verifiedAt)});
    } finally {
      error.mockRestore();
    }
    expect(process.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('MW-OPPORTUNITY-AUTHORITY005');
  });
});
