import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, expect} from 'vitest';

import {
  assertMethodExplainerContractBundle,
  canonicalSha256,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MethodExplainerContractBundleV1Schema,
  UnattendedStageSchema,
} from 'workflows/video-os/index.ts';

export const sha256 = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const normalizedRequest = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ');
const bytesSha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
export const artifact = (ref: string, bytes: string) => ({
  ref,
  sha256: bytesSha256(bytes),
  size_bytes: Buffer.byteLength(bytes, 'utf8'),
});
export const temporaryDirectories: string[] = [];

export const makeBundle = () => {
  const request = 'Explicar el método PASA con evidencia y criterio';
  const videoSpec = {
    schema_version: 'explainer-video-spec-v1',
    spec_id: 'SPEC-PASA-QA-001',
    method_id: 'PASA',
    format: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    duration_seconds: 15,
    total_frames: 450,
    locale: 'es-419',
    terminal_state: 'RENDERED_DRAFT',
  };
  const specSha256 = canonicalSha256(videoSpec);
  const intent = {
    schema_version: 'intent-envelope-v1',
    request,
    request_sha256: createHash('sha256').update(normalizedRequest(request), 'utf8').digest('hex'),
    method: {id: 'PASA', name: 'Planifica Acelera Sistematiza Amplifica'},
    audience: 'Equipos de conocimiento en América Latina',
    locale: 'es-419',
    voseo: false,
    format: '9:16',
    fps: 30,
    duration_seconds: 15,
    host: 'pristino-local-approved',
    known: ['PASA tiene cuatro movimientos conectados'],
    unknown: [],
    confidence: 0.9,
    rights: 'internal-draft-only',
    decision: 'DRAFT_WITH_ASSUMPTIONS',
    automatic_terminal_state: 'RENDERED_DRAFT',
  };
  const intentHash = sha256(intent);
  const assumptions = {
    schema_version: 'assumptions-ledger-v1',
    intent_sha256: intentHash,
    assumptions: [
      {
        id: 'ASM-AUDIENCE-01',
        statement: 'La audiencia conoce tareas operativas digitales.',
        basis: 'Brief editorial local.',
        confidence: 0.8,
        impact: 'low',
        status: 'open',
        resolution: null,
        invalidates: ['voiceover'],
      },
    ],
    decision: 'CONTINUE',
  };
  const assumptionsHash = sha256(assumptions);
  const authority = artifact('authority/pasa-editorial.json', 'pasa-editorial');
  const methodContent = {
    schema_version: 'method-content-model-v1',
    intent_sha256: intentHash,
    assumptions_sha256: assumptionsHash,
    method_id: 'PASA',
    authority_refs: [
      {
        ...authority,
        authority: 'user-provided',
        rights: 'internal-draft-only',
      },
    ],
    concepts: [
      {
        id: 'CONCEPT-PLANIFICA-01',
        label: 'Planifica',
        definition: 'Define intención, resultado y evidencia.',
        authority_refs: [authority.ref],
      },
      {
        id: 'CONCEPT-ACELERA-01',
        label: 'Acelera',
        definition: 'Delega lo repetible sin perder criterio.',
        authority_refs: [authority.ref],
      },
    ],
    relations: [
      {
        source: 'CONCEPT-PLANIFICA-01',
        target: 'CONCEPT-ACELERA-01',
        kind: 'sequence',
      },
    ],
    examples: [
      {
        concept_id: 'CONCEPT-ACELERA-01',
        text: 'Preparar un primer borrador para revisión humana.',
      },
    ],
    claims: [
      {
        text: 'PASA organiza cuatro movimientos conectados.',
        material: true,
        authority_refs: [authority.ref],
      },
    ],
  };
  const methodContentHash = sha256(methodContent);
  const firstVoiceover =
    'Primero define intención contexto evidencia resultado y límites antes de delegar trabajo operativo con inteligencia artificial';
  const secondVoiceover =
    'Después acelera lo repetible mientras conservas criterio revisión humana y trazabilidad';
  const beatBudget = {
    schema_version: 'beat-budget-v1',
    spec_sha256: specSha256,
    method_content_sha256: methodContentHash,
    fps: 30,
    total_frames: 450,
    max_tempo_words_per_second: 3.2,
    beats: [
      {
        id: 'BEAT-PLANIFICA-01',
        start_frame: 0,
        end_frame: 150,
        voiceover: firstVoiceover,
        voice_words: firstVoiceover.split(/\s+/u).length,
        screen: [{text: 'Intención · evidencia', max_lines: 2, font_px: 24}],
      },
      {
        id: 'BEAT-ACELERA-01',
        start_frame: 150,
        end_frame: 450,
        voiceover: secondVoiceover,
        voice_words: secondVoiceover.split(/\s+/u).length,
        screen: [{text: 'Operación con criterio', max_lines: 2, font_px: 32}],
      },
    ],
    audio_target: {
      integrated_lufs: -16,
      true_peak_dbtp_max: -1.5,
      sample_rate_hz: 48_000,
    },
  };
  const beatBudgetHash = sha256(beatBudget);
  const diagram = {
    schema_version: 'diagram-contract-v2',
    spec_sha256: specSha256,
    beat_budget_sha256: beatBudgetHash,
    grammar: 'flow',
    stage: {
      width: 1080,
      height: 1920,
      safe_zone: {x: 0.06, y: 0.08, width: 0.88, height: 0.76},
    },
    nodes: [
      {
        id: 'NODE-PLANIFICA-01',
        bounds: {x: 0.1, y: 0.2, width: 0.3, height: 0.12},
        text: 'Planifica',
        max_lines: 2,
        font_px: 32,
        enter_frame: 10,
        settle_frame: 40,
      },
      {
        id: 'NODE-ACELERA-01',
        bounds: {x: 0.6, y: 0.2, width: 0.3, height: 0.12},
        text: 'Acelera',
        max_lines: 2,
        font_px: 32,
        enter_frame: 50,
        settle_frame: 100,
      },
    ],
    edges: [
      {
        id: 'EDGE-PLANIFICA-ACELERA',
        source: 'NODE-PLANIFICA-01',
        target: 'NODE-ACELERA-01',
        start_frame: 106,
        end_frame: 130,
        direction: 'forward',
      },
    ],
    required_poses: {
      container_frame: 0,
      components_settled_frame: 100,
      connectors_complete_frame: 130,
      closing_frame: 449,
    },
  };
  const diagramHash = sha256(diagram);
  const contractHashes = {
    intent: intentHash,
    assumptions: assumptionsHash,
    method_content: methodContentHash,
    beat_budget: beatBudgetHash,
    diagram: diagramHash,
  };
  const requiredOutputBytes = new Map<string, string>([
    [METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope, JSON.stringify(intent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger, JSON.stringify(assumptions)],
    [METHOD_EXPLAINER_OUTPUT_REFS.method_content_model, JSON.stringify(methodContent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.video_spec, JSON.stringify(videoSpec)],
    [METHOD_EXPLAINER_OUTPUT_REFS.beat_budget, JSON.stringify(beatBudget)],
    [METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract, JSON.stringify(diagram)],
  ]);
  const requiredOutputs = Object.fromEntries(
    Object.entries(METHOD_EXPLAINER_OUTPUT_REFS)
      .filter(([key]) => key !== 'unattended_run_state')
      .map(([key, ref]) => [key, artifact(ref, requiredOutputBytes.get(ref) ?? `material:${ref}`)]),
  );
  const buildManifest = {
    schema_version: 'explainer-build-manifest-v1',
    manifest_representation: 'embedded-no-self-hash',
    spec_sha256: specSha256,
    contract_set_sha256: sha256(contractHashes),
    contract_hashes: contractHashes,
    script: requiredOutputs.piece_scripts,
    audio: requiredOutputs.narration,
    assets: [artifact('assets/host.png', 'host-v1')],
    components: [artifact('components/diagram-stage.tsx', 'component-v1')],
    required_outputs: requiredOutputs,
    toolchain: [{name: 'remotion', version: '4.0.494'}],
    deterministic: {network: false, timers: false, randomness: false, css_animation: false},
    terminal_state: 'RENDERED_DRAFT',
  };
  const buildManifestHash = sha256(buildManifest);
  const stages = UnattendedStageSchema.options.map((stage, index) => ({
    stage,
    status: 'complete',
    attempts: 1,
    input_spec_sha256: specSha256,
    checkpoint: artifact(`checkpoints/${String(index + 1).padStart(2, '0')}-${stage}.json`, stage),
  }));
  const unattendedRun = {
    schema_version: 'unattended-run-state-v1',
    run_id: 'EXPLAINER-PASA-QA-001',
    spec_sha256: specSha256,
    build_manifest_sha256: buildManifestHash,
    stages,
    repair_history: [],
    state: 'RENDERED_DRAFT',
    terminal_state: 'RENDERED_DRAFT',
  };
  const unattendedRunMaterial = artifact(
    METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state,
    JSON.stringify(unattendedRun),
  );
  return MethodExplainerContractBundleV1Schema.parse({
    schema_version: 'method-explainer-contract-bundle-v1',
    hashes: {...contractHashes, build_manifest: buildManifestHash},
    video_spec: videoSpec,
    intent,
    assumptions,
    method_content: methodContent,
    beat_budget: beatBudget,
    diagram,
    build_manifest: buildManifest,
    unattended_run: unattendedRun,
    run_representation: 'embedded-post-build',
    unattended_run_material: unattendedRunMaterial,
  });
};

const writeMaterial = (root: string, ref: string, bytes: string): void => {
  const path = resolve(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, bytes);
};

const requiredOutputBytesFor = (bundle: Bundle, ref: string): string => {
  const canonical = new Map<string, string>([
    [METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope, JSON.stringify(bundle.intent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger, JSON.stringify(bundle.assumptions)],
    [METHOD_EXPLAINER_OUTPUT_REFS.method_content_model, JSON.stringify(bundle.method_content)],
    [METHOD_EXPLAINER_OUTPUT_REFS.video_spec, JSON.stringify(bundle.video_spec)],
    [METHOD_EXPLAINER_OUTPUT_REFS.beat_budget, JSON.stringify(bundle.beat_budget)],
    [METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract, JSON.stringify(bundle.diagram)],
  ]);
  return canonical.get(ref) ?? `material:${ref}`;
};

export const materializeBundle = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'method-explainer-material-'));
  temporaryDirectories.push(root);
  const bundle = makeBundle();
  writeMaterial(root, bundle.method_content.authority_refs[0]!.ref, 'pasa-editorial');
  for (const output of Object.values(bundle.build_manifest.required_outputs)) {
    writeMaterial(root, output.ref, requiredOutputBytesFor(bundle, output.ref));
  }
  writeMaterial(root, bundle.unattended_run_material.ref, JSON.stringify(bundle.unattended_run));
  writeMaterial(root, bundle.build_manifest.assets[0]!.ref, 'host-v1');
  writeMaterial(root, bundle.build_manifest.components[0]!.ref, 'component-v1');
  for (const stage of bundle.unattended_run.stages) {
    if (stage.checkpoint) writeMaterial(root, stage.checkpoint.ref, stage.stage);
  }
  return {bundle, root};
};

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, {recursive: true, force: true});
  }
});

export type Bundle = ReturnType<typeof makeBundle>;
export type Mutation = (candidate: Bundle) => void;

export const refreshRunMaterial = (bundle: Bundle): void => {
  const bytes = JSON.stringify(bundle.unattended_run);
  bundle.unattended_run_material.sha256 = bytesSha256(bytes);
  bundle.unattended_run_material.size_bytes = Buffer.byteLength(bytes, 'utf8');
};

export const expectRejected = (mutation: Mutation): void => {
  const candidate = structuredClone(makeBundle());
  mutation(candidate);
  expect(() => assertMethodExplainerContractBundle(candidate)).toThrow();
};
