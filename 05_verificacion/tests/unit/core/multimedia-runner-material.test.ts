import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {parse, stringify} from 'yaml';
import {afterAll, describe, expect, it, vi} from 'vitest';

import {FRAMES_DELIVERABLE_SECTIONS} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {loadDeliverableDefinitions} from 'workflows/multimedia/_runner/deliverable-material.ts';
import {createFramesDeliverableMarkdown} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {inspectOutputIntegrity} from 'workflows/multimedia/_runner/material-integrity.ts';
import {calculateMaterialManifestHash} from 'workflows/multimedia/_runner/material-input.ts';
import {
  discardStagedOutputs,
  stageWorkflowOutputs,
} from 'workflows/multimedia/_runner/materialize.ts';
import {
  calculateMultimediaWorkOrderHash,
  calculateOutputSelectionHash,
} from 'workflows/multimedia/_runner/output-selection.ts';
import type {QualityGateContext} from 'workflows/multimedia/_runner/quality-gate-types.ts';
import {runWorkflow} from 'workflows/multimedia/_runner/run.ts';
import {isoWithOffset} from 'workflows/multimedia/_runner/workflow-loader.ts';

const root = process.cwd();
const directory = mkdtempSync(resolve(tmpdir(), 'frames-material-run-'));
const workflowDir = resolve(root, '02_proceso/workflows/multimedia/p03-crear-brief');
const workflow = MultimediaWorkflowSchema.parse(
  parse(readFileSync(resolve(workflowDir, 'workflow.yml'), 'utf8')),
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
const digestFile = (path: string): string => digestText(readFileSync(path, 'utf8'));
const runAt = new Date('2026-08-08T12:00:00Z');

afterAll(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  rmSync(directory, {recursive: true, force: true});
});

const prepareAuthority = (name: string, unknown = false) => {
  const lane = resolve(directory, name);
  const materialsDir = resolve(lane, 'materials');
  mkdirSync(materialsDir, {recursive: true});
  const requestPath = resolve(lane, 'request.json');
  const intentPath = resolve(lane, 'intent.yml');
  writeFileSync(
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
    allowed_outputs: effectiveIds,
    effect_class: 'local_reversible' as const,
    publication_policy: 'forbidden' as const,
  };
  writeFileSync(
    workOrderPath,
    stringify({
      ...unsignedWorkOrder,
      canonical_sha256: calculateMultimediaWorkOrderHash(unsignedWorkOrder),
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
  writeFileSync(
    selectionPath,
    stringify({
      ...unsignedSelection,
      canonical_sha256: calculateOutputSelectionHash(unsignedSelection),
    }),
    'utf8',
  );
  const manifestOutputs = effectiveIds.map((id, index) => {
    const output = workflow.outputs.find(({deliverable_id}) => deliverable_id === id)!;
    const definition = definitions.get(id)!;
    const state = unknown && index === 0 ? 'DRAFT' : 'RENDERED_DRAFT';
    const markdown = createFramesDeliverableMarkdown(
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
        sources: [],
        formats: definition.formats,
        piece_families: definition.piece_families,
        companion_for: null,
        skills: workflow.capability_map.skills,
        fields: definition.required_fields.map((field) => ({
          field_id: field,
          label: field,
          value_type: 'text' as const,
          status: state === 'DRAFT' ? ('unknown' as const) : ('observed' as const),
          value: state === 'DRAFT' ? 'Pendiente.' : `Contenido verificado para ${field}.`,
          source_refs: state === 'DRAFT' ? [] : [`fixture://${id}/${field}`],
        })),
        state,
        next_gate: definition.acceptance_gate,
      },
      FRAMES_DELIVERABLE_SECTIONS.map((section) => ({
        id: section,
        markdown: `${section}: contenido verificado.`,
      })),
    );
    const markdownPath = resolve(materialsDir, `${id}.md`);
    writeFileSync(markdownPath, markdown, 'utf8');
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
  writeFileSync(
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
    mkdirSync(resolve(receiptsRoot, 'WF-P03', isoWithOffset(runAt).replace(/[:+]/gu, '-')), {
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
  staged: ReturnType<typeof stageWorkflowOutputs>,
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
    expect(readdirSync(outputDir)).toHaveLength(12);
    expect(readdirSync(outputDir).some((name) => name.includes('presentacion-ejecutiva'))).toBe(
      false,
    );
    const envelopeName = readdirSync(outputDir).find((name) => name.endsWith('.yml'))!;
    const envelope = parse(readFileSync(resolve(outputDir, envelopeName), 'utf8')) as {
      content: {evidence_status: string; producer_actor_id: string; source_sha256: string};
    };
    expect(envelope.content).toMatchObject({
      evidence_status: 'known',
      producer_actor_id: 'content-producer-local',
    });
    expect(envelope.content.source_sha256).toMatch(/^[a-f0-9]{64}$/u);
    const receiptLane = resolve(result.receiptsRoot, 'WF-P03');
    const receipt = parse(
      readFileSync(resolve(receiptLane, readdirSync(receiptLane)[0]!, 'receipt.yml'), 'utf8'),
    ) as {
      work_product_state_to: string;
      actor: string;
      inputs: Array<{artifact: string}>;
      outputs: unknown[];
    };
    expect(receipt).toMatchObject({
      work_product_state_to: 'RENDERED_DRAFT',
      actor: 'local-material-ingestor',
    });
    expect(receipt.inputs.map(({artifact}) => artifact)).toContain('material-input-manifest-v1');
    expect(receipt.outputs).toHaveLength(4);
  });

  it('blocks an unknown produced model before artifacts or receipts exist', () => {
    const result = invoke(prepareAuthority('unknown', true));
    expect(process.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('MW-MATERIAL-EVIDENCE001');
    expect(existsSync(result.artifactRoot)).toBe(false);
    expect(existsSync(result.receiptsRoot)).toBe(false);
  });

  it('accepts omitted conditional output but rejects an extra staged output', () => {
    const selected = new Set(['campaign-charter-v1']);
    const partial = stageWorkflowOutputs(root, workflowDir, workflow, selected);
    const extra = stageWorkflowOutputs(
      root,
      workflowDir,
      workflow,
      new Set(['campaign-charter-v1', 'executive-presentation-v1']),
    );
    try {
      expect(inspectOutputIntegrity(integrityContext(partial, effectiveIds)).passed).toBe(true);
      expect(inspectOutputIntegrity(integrityContext(extra, effectiveIds)).passed).toBe(false);
    } finally {
      discardStagedOutputs(partial.tempDir);
      discardStagedOutputs(extra.tempDir);
    }
  });

  it('validates authority in dry-run without writing artifacts or receipts', () => {
    const result = invoke(prepareAuthority('dry'), true);
    expect(process.exitCode).toBeUndefined();
    expect(existsSync(result.artifactRoot)).toBe(false);
    expect(existsSync(result.receiptsRoot)).toBe(false);
  });
});
