import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, expect} from 'vitest';

import {
  canonicalSha256,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MethodExplainerContractBundleV1Schema,
  type planOrVerifyGeneralVideoMethodExplainer,
  UnattendedStageSchema,
} from 'workflows/video-os/index.ts';

const hashBytes = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const binding = (ref: string, bytes: string) => ({
  ref,
  sha256: hashBytes(bytes),
  size_bytes: Buffer.byteLength(bytes),
});
export const temporary: string[] = [];

export const makeBundle = () => {
  const request = 'Explica el método PASA con evidencia';
  const videoSpec = {
    schema_version: 'explainer-video-spec-v1',
    spec_id: 'SPEC-PASA-ADAPTER-001',
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
  const specHash = canonicalSha256(videoSpec);
  const intent = {
    schema_version: 'intent-envelope-v1',
    request,
    request_sha256: hashBytes(request),
    method: {id: 'PASA', name: 'Planifica Acelera Sistematiza Amplifica'},
    audience: 'Equipos de conocimiento en América Latina',
    locale: 'es-419',
    voseo: false,
    format: '9:16',
    fps: 30,
    duration_seconds: 15,
    host: 'Pristino',
    known: ['PASA organiza cuatro movimientos'],
    unknown: [],
    confidence: 0.9,
    rights: 'internal-draft-only',
    decision: 'DRAFT_WITH_ASSUMPTIONS',
    automatic_terminal_state: 'RENDERED_DRAFT',
  };
  const intentHash = canonicalSha256(intent);
  const assumptions = {
    schema_version: 'assumptions-ledger-v1',
    intent_sha256: intentHash,
    assumptions: [],
    decision: 'CONTINUE',
  };
  const assumptionsHash = canonicalSha256(assumptions);
  const authority = binding('authority/pasa.json', 'authority-v1');
  const method = {
    schema_version: 'method-content-model-v1',
    intent_sha256: intentHash,
    assumptions_sha256: assumptionsHash,
    method_id: 'PASA',
    authority_refs: [{...authority, authority: 'user-provided', rights: 'internal-draft-only'}],
    concepts: [
      {
        id: 'CONCEPT-PLANIFICA-01',
        label: 'Planifica',
        definition: 'Define intención, resultado y evidencia.',
        authority_refs: [authority.ref],
      },
    ],
    relations: [],
    examples: [{concept_id: 'CONCEPT-PLANIFICA-01', text: 'Definir evidencia observable.'}],
    claims: [{text: 'PASA organiza el trabajo.', material: true, authority_refs: [authority.ref]}],
  };
  const methodHash = canonicalSha256(method);
  const voiceover =
    'Define intención resultado evidencia y límites antes de delegar trabajo operativo con inteligencia artificial';
  const budget = {
    schema_version: 'beat-budget-v1',
    spec_sha256: specHash,
    method_content_sha256: methodHash,
    fps: 30,
    total_frames: 450,
    max_tempo_words_per_second: 3.2,
    beats: [
      {
        id: 'BEAT-PLANIFICA-01',
        start_frame: 0,
        end_frame: 450,
        voiceover,
        voice_words: voiceover.split(/\s+/u).length,
        screen: [{text: 'Intención y evidencia', max_lines: 2, font_px: 32}],
      },
    ],
    audio_target: {integrated_lufs: -16, true_peak_dbtp_max: -1.5, sample_rate_hz: 48_000},
  };
  const budgetHash = canonicalSha256(budget);
  const diagram = {
    schema_version: 'diagram-contract-v2',
    spec_sha256: specHash,
    beat_budget_sha256: budgetHash,
    grammar: 'flow',
    stage: {
      width: 1080,
      height: 1920,
      safe_zone: {x: 0.06, y: 0.08, width: 0.88, height: 0.76},
    },
    nodes: [
      {
        id: 'NODE-PLANIFICA-01',
        bounds: {x: 0.2, y: 0.2, width: 0.6, height: 0.2},
        text: 'Planifica',
        max_lines: 1,
        font_px: 48,
        enter_frame: 0,
        settle_frame: 30,
      },
    ],
    edges: [],
    required_poses: {
      container_frame: 0,
      components_settled_frame: 30,
      connectors_complete_frame: 30,
      closing_frame: 449,
    },
  };
  const diagramHash = canonicalSha256(diagram);
  const contractHashes = {
    intent: intentHash,
    assumptions: assumptionsHash,
    method_content: methodHash,
    beat_budget: budgetHash,
    diagram: diagramHash,
  };
  const canonical = new Map<string, string>([
    [METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope, JSON.stringify(intent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger, JSON.stringify(assumptions)],
    [METHOD_EXPLAINER_OUTPUT_REFS.method_content_model, JSON.stringify(method)],
    [METHOD_EXPLAINER_OUTPUT_REFS.video_spec, JSON.stringify(videoSpec)],
    [METHOD_EXPLAINER_OUTPUT_REFS.beat_budget, JSON.stringify(budget)],
    [METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract, JSON.stringify(diagram)],
  ]);
  const outputs = Object.fromEntries(
    Object.entries(METHOD_EXPLAINER_OUTPUT_REFS)
      .filter(([key]) => key !== 'unattended_run_state')
      .map(([key, ref]) => [key, binding(ref, canonical.get(ref) ?? `material:${ref}`)]),
  );
  const build = {
    schema_version: 'explainer-build-manifest-v1',
    manifest_representation: 'embedded-no-self-hash',
    spec_sha256: specHash,
    contract_set_sha256: canonicalSha256(contractHashes),
    contract_hashes: contractHashes,
    script: outputs.piece_scripts,
    audio: outputs.narration,
    assets: [binding('assets/host.png', 'host-v1')],
    components: [binding('components/stage.tsx', 'stage-v1')],
    required_outputs: outputs,
    toolchain: [{name: 'remotion', version: '4.0.494'}],
    deterministic: {network: false, timers: false, randomness: false, css_animation: false},
    terminal_state: 'RENDERED_DRAFT',
  };
  const buildHash = canonicalSha256(build);
  const stages = UnattendedStageSchema.options.map((stage, index) => ({
    stage,
    status: 'complete',
    attempts: 1,
    input_spec_sha256: specHash,
    checkpoint: binding(`checkpoints/${index}-${stage}.json`, stage),
  }));
  const run = {
    schema_version: 'unattended-run-state-v1',
    run_id: 'EXPLAINER-PASA-ADAPTER-001',
    spec_sha256: specHash,
    build_manifest_sha256: buildHash,
    stages,
    repair_history: [],
    state: 'RENDERED_DRAFT',
    terminal_state: 'RENDERED_DRAFT',
  };
  return MethodExplainerContractBundleV1Schema.parse({
    schema_version: 'method-explainer-contract-bundle-v1',
    hashes: {...contractHashes, build_manifest: buildHash},
    video_spec: videoSpec,
    intent,
    assumptions,
    method_content: method,
    beat_budget: budget,
    diagram,
    build_manifest: build,
    unattended_run: run,
    run_representation: 'embedded-post-build',
    unattended_run_material: binding(
      METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state,
      JSON.stringify(run),
    ),
  });
};

export type Bundle = ReturnType<typeof makeBundle>;
const materialBytes = (bundle: Bundle, ref: string): string => {
  const values = new Map<string, string>([
    [METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope, JSON.stringify(bundle.intent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger, JSON.stringify(bundle.assumptions)],
    [METHOD_EXPLAINER_OUTPUT_REFS.method_content_model, JSON.stringify(bundle.method_content)],
    [METHOD_EXPLAINER_OUTPUT_REFS.video_spec, JSON.stringify(bundle.video_spec)],
    [METHOD_EXPLAINER_OUTPUT_REFS.beat_budget, JSON.stringify(bundle.beat_budget)],
    [METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract, JSON.stringify(bundle.diagram)],
  ]);
  return values.get(ref) ?? `material:${ref}`;
};
const write = (root: string, ref: string, bytes: string): void => {
  const path = resolve(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, bytes);
};
export const snapshotTree = (root: string): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  const visit = (directory: string, prefix = ''): void => {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path, relative);
      else snapshot[relative] = hashBytes(readFileSync(path, 'utf8'));
    }
  };
  visit(root);
  return snapshot;
};
export const materialize = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gv-method-adapter-'));
  temporary.push(root);
  const bundle = makeBundle();
  write(root, bundle.method_content.authority_refs[0]!.ref, 'authority-v1');
  for (const output of Object.values(bundle.build_manifest.required_outputs))
    write(root, output.ref, materialBytes(bundle, output.ref));
  write(root, bundle.build_manifest.assets[0]!.ref, 'host-v1');
  write(root, bundle.build_manifest.components[0]!.ref, 'stage-v1');
  write(root, bundle.unattended_run_material.ref, JSON.stringify(bundle.unattended_run));
  for (const stage of bundle.unattended_run.stages)
    if (stage.checkpoint) write(root, stage.checkpoint.ref, stage.stage);
  return {bundle, root};
};
export const expected = (bundle: Bundle) => ({
  bundle_sha256: canonicalSha256(bundle),
  spec_sha256: canonicalSha256(bundle.video_spec),
  contract_set_sha256: bundle.build_manifest.contract_set_sha256,
  build_manifest_sha256: bundle.hashes.build_manifest,
  unattended_run_sha256: bundle.unattended_run_material.sha256,
});
export const verifyRequest = (bundle: Bundle) => ({
  schema_version: 'general-video-method-explainer-adapter-request-v1',
  archetype: 'method-explainer',
  mode: 'PLAN_VERIFY_ONLY',
  operation: 'VERIFY_EXISTING',
  bundle,
  expected: expected(bundle),
});
export const assertCeiling = (
  value: Awaited<ReturnType<typeof planOrVerifyGeneralVideoMethodExplainer>>,
) => {
  expect(value).toMatchObject({
    effects: false,
    render_authority: false,
    publication_authority: false,
    maximum_state: 'BLOCKED',
    stop_gate: 'VO_DIRECTION_APPROVED',
    coverage_gap: 'GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED',
  });
};

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true});
});
