import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {parse, stringify} from 'yaml';
import {afterAll, describe, expect, it, vi} from 'vitest';

import {MultimediaWorkflowReceiptSchema} from '../../../scripts/lib/multimedia-workflow-receipt-schema.ts';
import {FRAMES_DELIVERABLE_SECTIONS} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {loadDeliverableDefinitions} from 'workflows/multimedia/_runner/deliverable-material.ts';
import {createFramesDeliverableMarkdown} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {inspectOutputIntegrity} from 'workflows/multimedia/_runner/material-integrity.ts';
import {calculateMaterialManifestHash} from 'workflows/multimedia/_runner/material-input.ts';
import * as materialize from 'workflows/multimedia/_runner/materialize.ts';
import * as outputSelection from 'workflows/multimedia/_runner/output-selection.ts';
import type {QualityGateContext} from 'workflows/multimedia/_runner/quality-gate-types.ts';
import {runWorkflow} from 'workflows/multimedia/_runner/run.ts';
import {isoWithOffset} from 'workflows/multimedia/_runner/workflow-loader.ts';
const root = process.cwd();
const directory = fs.mkdtempSync(resolve(tmpdir(), 'frames-material-run-'));
const workflowDir = resolve(root, '02_proceso/workflows/multimedia/p03-crear-brief');
const workflow = MultimediaWorkflowSchema.parse(
  parse(fs.readFileSync(resolve(workflowDir, 'workflow.yml'), 'utf8')),
);
const definitions = loadDeliverableDefinitions(root);
const effectiveIds = [
  'brief-campaign-map-v1',
  'campaign-charter-v1',
  'ab-concepts-v1',
  'definition-of-ready-v1',
];
const originalArgv = process.argv;
const originalExitCode = process.exitCode;
const digestText = (text: string): string => createHash('sha256').update(text).digest('hex');
const digestFile = (path: string): string => digestText(fs.readFileSync(path, 'utf8'));
const runAt = new Date('2026-08-08T12:00:00Z');
const sourceText = 'Fuente local verificable para la campaña.\n';
const sourceSha = digestText(sourceText);
const sourceRef = 'fixture-campaign';
const declaredSources = [
  {
    source_id: sourceRef,
    ref: 'sources/campaign.txt',
    sha256: sourceSha,
    authority: 'verified' as const,
    rights: 'cleared' as const,
  },
];
afterAll(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  fs.rmSync(directory, {recursive: true, force: true});
});
const prepareAuthority = (name: string, sentinel?: 'field' | 'section') => {
  const lane = resolve(directory, name);
  const materialsDir = resolve(lane, 'materials');
  const sourcesDir = resolve(lane, 'sources');
  fs.mkdirSync(materialsDir, {recursive: true});
  fs.mkdirSync(sourcesDir, {recursive: true});
  fs.writeFileSync(resolve(sourcesDir, 'campaign.txt'), sourceText, 'utf8');
  const requestPath = resolve(lane, 'request.json');
  const intentPath = resolve(lane, 'intent.yml');
  fs.writeFileSync(
    requestPath,
    JSON.stringify({
      request: 'Crear una campaña para familias.',
      audience: 'Familias y equipo editorial.',
      outcome: 'Campaña definida.',
      source: {type: 'document', ref: 'sources/campaign.md', authority: 'verified'},
      channels: ['web'],
      constraints: ['No publicar.'],
    }),
    'utf8',
  );
  execFileSync(
    process.execPath,
    [
      resolve(root, '03_artefactos/skills/content-os-router/scripts/route-content.mjs'),
      requestPath,
      '--out',
      intentPath,
    ],
    {cwd: root},
  );
  const intentHash = digestFile(intentPath);
  const workOrderPath = resolve(lane, 'work-order.yml');
  const unsignedWorkOrder = {
    schema_version: 'multimedia-work-order-v1' as const,
    work_order_id: `WO-P03-${name.toUpperCase()}`,
    workflow_id: 'P03' as const,
    intent_hash: intentHash,
    producer_actor_id: 'content-producer-local',
    allowed_outputs: effectiveIds,
    effect_class: 'local_reversible' as const,
    publication_policy: 'forbidden' as const,
  };
  fs.writeFileSync(
    workOrderPath,
    stringify({
      ...unsignedWorkOrder,
      canonical_sha256: outputSelection.calculateMultimediaWorkOrderHash(unsignedWorkOrder),
    }),
    'utf8',
  );
  const workOrderHash = digestFile(workOrderPath);
  const selectionPath = resolve(lane, 'selection.yml');
  const unsignedSelection = {
    schema_version: 'multimedia-output-selection-v1' as const,
    workflow_id: 'P03' as const,
    intent_hash: intentHash,
    work_order_hash: workOrderHash,
    include_outputs: ['campaign-charter-v1'],
  };
  fs.writeFileSync(
    selectionPath,
    stringify({
      ...unsignedSelection,
      canonical_sha256: outputSelection.calculateOutputSelectionHash(unsignedSelection),
    }),
    'utf8',
  );
  const manifestOutputs = effectiveIds.map((id, index) => {
    const output = workflow.outputs.find(({deliverable_id}) => deliverable_id === id)!;
    const definition = definitions.get(id)!;
    const cleanMarkdown = createFramesDeliverableMarkdown(
      {
        schema_version: 'frames-deliverable-v1',
        instance_id: `DELIV-P03-${name.toUpperCase()}-${index + 1}`,
        deliverable_id: id,
        display_name: output.artifact,
        workflow_id: 'P03',
        deliverable_class: definition.deliverable_class,
        touchpoint: definition.touchpoint,
        identity: {brand: 'MetodologIA', owner: 'content-producer-local'},
        audience: definition.audience,
        purpose: definition.purpose,
        sources: declaredSources,
        formats: definition.formats,
        piece_families: definition.piece_families,
        companion_for: null,
        skills: workflow.capability_map.skills,
        fields: definition.required_fields.map((field) => ({
          field_id: field,
          label: field,
          value_type: 'text' as const,
          status: 'observed' as const,
          value: `Contenido verificado para ${field}.`,
          source_refs: [sourceRef],
        })),
        state: 'RENDERED_DRAFT',
        next_gate: definition.acceptance_gate,
      },
      FRAMES_DELIVERABLE_SECTIONS.map((section) => ({
        id: section,
        markdown: `${section}: contenido verificado.`,
      })),
    );
    const markdown =
      sentinel === 'field' && index === 0
        ? cleanMarkdown.replace('Contenido verificado para request.', '⟦UNKNOWN:request⟧')
        : sentinel === 'section' && index === 0
          ? cleanMarkdown.replace(
              'Resultado y decisión: contenido verificado.',
              'Resultado y decisión:\n\n- TODO',
            )
          : cleanMarkdown;
    const markdownPath = resolve(materialsDir, `${id}.md`);
    fs.writeFileSync(markdownPath, markdown, 'utf8');
    return {deliverable_id: id, markdown_path: `materials/${id}.md`, sha256: digestText(markdown)};
  });
  const manifestPath = resolve(lane, 'material-manifest.yml');
  const unsignedManifest = {
    schema_version: 'multimedia-material-input-v1' as const,
    workflow_id: 'P03' as const,
    intent_sha256: intentHash,
    work_order_sha256: workOrderHash,
    producer_actor_id: 'content-producer-local',
    outputs: manifestOutputs,
  };
  fs.writeFileSync(
    manifestPath,
    stringify({
      ...unsignedManifest,
      canonical_sha256: calculateMaterialManifestHash(unsignedManifest),
    }),
    'utf8',
  );
  return {lane, intentPath, workOrderPath, selectionPath, manifestPath};
};
const invoke = (
  authority: ReturnType<typeof prepareAuthority>,
  dryRun = false,
  precreateReceiptRoot = false,
) => {
  const artifactRoot = resolve(authority.lane, 'artifacts');
  const receiptsRoot = resolve(authority.lane, 'receipts');
  if (precreateReceiptRoot) {
    fs.mkdirSync(resolve(receiptsRoot, 'WF-P03', isoWithOffset(runAt).replace(/[:+]/gu, '-')), {
      recursive: true,
    });
  }
  process.exitCode = undefined;
  process.argv = [
    'node',
    'run.ts',
    '--workflow=P03',
    `--intent=${authority.intentPath}`,
    `--work-order=${authority.workOrderPath}`,
    `--output-selection=${authority.selectionPath}`,
    `--material-manifest=${authority.manifestPath}`,
    ...(dryRun ? ['--dry-run'] : []),
  ];
  const errors: string[] = [];
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((value) => errors.push(String(value)));
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  try {
    runWorkflow('P03', {artifactRoot, receiptsRoot, now: runAt});
  } finally {
    error.mockRestore();
    info.mockRestore();
  }
  return {artifactRoot, receiptsRoot, errors};
};
const integrityContext = (
  staged: ReturnType<typeof materialize.stageWorkflowOutputs>,
  selectedIds: string[],
): QualityGateContext => ({
  workflowId: 'P03',
  workflowDir,
  workflowRawYaml: '',
  workflowParsed: workflow,
  taskTemplatePath: '',
  promptSpecPath: '',
  noRegressionChecklistPath: '',
  receiptDir: '',
  inputResolutions: [],
  autoAdvance: false,
  effectiveOutputIds: selectedIds,
  receiptPayload: {
    outputs: staged.outputs.map((output) => ({
      artifact: output.artifact,
      ref: output.ref,
      sha256: output.sha256,
      required: output.required,
      materialized: true,
      companions: output.companions.map(({format, ref, sha256}) => ({
        format,
        ref,
        sha256,
        materialized: true,
      })),
    })),
  },
  outputResolutions: staged.outputs.map((output) => ({
    ref: output.ref,
    stagedPath: output.stagedPath,
    exists: true,
    sha256: output.sha256,
    companions: output.companions.map(({format, ref, stagedPath, sha256}) => ({
      format,
      ref,
      stagedPath,
      exists: true,
      sha256,
    })),
  })),
});

describe('causal material runner', () => {
  it('ingests hash-bound produced material and writes only required plus selected outputs', () => {
    const result = invoke(prepareAuthority('success'), false, true);
    expect(result.errors).toEqual([]);
    expect(process.exitCode).toBeUndefined();
    const outputDir = resolve(
      result.artifactRoot,
      '03_artefactos/content/multimedia/p03-crear-brief',
    );
    expect(fs.readdirSync(outputDir)).toHaveLength(12);
    expect(fs.readdirSync(outputDir).some((name) => name.includes('presentacion-ejecutiva'))).toBe(
      false,
    );
    const receiptLane = resolve(result.receiptsRoot, 'WF-P03');
    const receipt = MultimediaWorkflowReceiptSchema.parse(
      parse(
        fs.readFileSync(
          resolve(receiptLane, fs.readdirSync(receiptLane)[0]!, 'receipt.yml'),
          'utf8',
        ),
      ),
    );
    expect(receipt).toMatchObject({
      work_product_state_to: 'RENDERED_DRAFT',
      actor: 'local-material-ingestor',
      producer_actor_id: 'content-producer-local',
      ingestor_actor_id: 'local-material-ingestor',
    });
    expect(receipt.inputs.map(({artifact}) => artifact)).toContain('material-input-manifest-v1');
    expect(receipt.outputs).toHaveLength(4);
  });

  it('blocks a declared source when its local content no longer matches the hash', () => {
    const authority = prepareAuthority('source-drift');
    fs.writeFileSync(resolve(authority.lane, 'sources/campaign.txt'), 'tampered\n', 'utf8');
    const result = invoke(authority);
    expect(process.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('MW-MATERIAL-SOURCE001');
    expect(fs.existsSync(result.artifactRoot)).toBe(false);
    expect(fs.existsSync(result.receiptsRoot)).toBe(false);
  });

  it.each(['field', 'section'] as const)(
    'blocks an observed %s placeholder before artifacts or receipts',
    (location) => {
      const result = invoke(prepareAuthority(`sentinel-${location}`, location));
      expect(process.exitCode).toBe(1);
      expect(result.errors.join('\n')).toMatch(/MW-PLACEHOLDER001/u);
      expect(fs.existsSync(result.artifactRoot)).toBe(false);
      expect(fs.existsSync(result.receiptsRoot)).toBe(false);
    },
  );

  it('accepts omitted conditional output but rejects an extra staged output', () => {
    const selected = new Set(['campaign-charter-v1']);
    const partial = materialize.stageWorkflowOutputs(root, workflowDir, workflow, selected);
    const extra = materialize.stageWorkflowOutputs(
      root,
      workflowDir,
      workflow,
      new Set(['campaign-charter-v1', 'executive-presentation-v1']),
    );
    try {
      expect(inspectOutputIntegrity(integrityContext(partial, effectiveIds)).passed).toBe(true);
      expect(inspectOutputIntegrity(integrityContext(extra, effectiveIds)).passed).toBe(false);
    } finally {
      materialize.discardStagedOutputs(partial.tempDir);
      materialize.discardStagedOutputs(extra.tempDir);
    }
  });

  it('validates authority in dry-run without writing artifacts or receipts', () => {
    const result = invoke(prepareAuthority('dry'), true);
    expect(process.exitCode).toBeUndefined();
    expect(fs.existsSync(result.artifactRoot)).toBe(false);
    expect(fs.existsSync(result.receiptsRoot)).toBe(false);
  });
});
