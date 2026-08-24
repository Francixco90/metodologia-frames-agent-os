import {
  METHOD_EXPLAINER_OUTPUT_REFS,
  UnattendedStageSchema,
  canonicalSha256,
} from '../../../02_proceso/workflows/video-os/index.ts';
import {bytesBinding, textSha256} from './method-explainer-fixture-binding.ts';

export const makeMethodExplainerFixture = () => {
  const requestText = 'Explicar PASA con evidencia';
  const spec = {
    schema_version: 'explainer-video-spec-v1',
    spec_id: 'SPEC-PASA-CHECK-001',
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
  const specHash = canonicalSha256(spec);
  const intent = {
    schema_version: 'intent-envelope-v1',
    request: requestText,
    request_sha256: textSha256(requestText),
    method: {id: 'PASA', name: 'PASA'},
    audience: 'Fixture sintética',
    locale: 'es-419',
    voseo: false,
    format: '9:16',
    fps: 30,
    duration_seconds: 15,
    host: 'synthetic-host',
    known: ['Método editorial autorizado'],
    unknown: [],
    confidence: 0.95,
    rights: 'cleared',
    decision: 'AUTO_CONTINUE',
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
  const authority = bytesBinding('authority/pasa.json', 'synthetic-authority');
  const method = {
    schema_version: 'method-content-model-v1',
    intent_sha256: intentHash,
    assumptions_sha256: assumptionsHash,
    method_id: 'PASA',
    authority_refs: [{...authority, authority: 'editorial', rights: 'cleared'}],
    concepts: [
      {
        id: 'CONCEPT-PASA-01',
        label: 'PASA',
        definition: 'Método sintético de prueba.',
        authority_refs: [authority.ref],
      },
    ],
    relations: [],
    examples: [],
    claims: [{text: 'PASA es el método probado.', material: true, authority_refs: [authority.ref]}],
  };
  const methodHash = canonicalSha256(method);
  const voiceover = 'Planifica con evidencia antes de acelerar';
  const budget = {
    schema_version: 'beat-budget-v1',
    spec_sha256: specHash,
    method_content_sha256: methodHash,
    fps: 30,
    total_frames: 450,
    max_tempo_words_per_second: 3.2,
    beats: [
      {
        id: 'BEAT-PASA-01',
        start_frame: 0,
        end_frame: 450,
        voiceover,
        voice_words: voiceover.split(/\s+/u).length,
        screen: [{text: 'Método con evidencia', max_lines: 2, font_px: 32}],
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
        id: 'NODE-PASA-01',
        bounds: {x: 0.2, y: 0.2, width: 0.6, height: 0.2},
        text: 'PASA',
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
  const outputs = new Map<string, string>([
    [METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope, JSON.stringify(intent)],
    [METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger, JSON.stringify(assumptions)],
    [METHOD_EXPLAINER_OUTPUT_REFS.method_content_model, JSON.stringify(method)],
    [METHOD_EXPLAINER_OUTPUT_REFS.video_spec, JSON.stringify(spec)],
    [METHOD_EXPLAINER_OUTPUT_REFS.beat_budget, JSON.stringify(budget)],
    [METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract, JSON.stringify(diagram)],
  ]);
  const requiredOutputs = Object.fromEntries(
    Object.entries(METHOD_EXPLAINER_OUTPUT_REFS)
      .filter(([key]) => key !== 'unattended_run_state')
      .map(([key, ref]) => [key, bytesBinding(ref, outputs.get(ref) ?? `smoke:${ref}`)]),
  );
  const build = {
    schema_version: 'explainer-build-manifest-v1',
    manifest_representation: 'embedded-no-self-hash',
    spec_sha256: specHash,
    contract_set_sha256: canonicalSha256(contractHashes),
    contract_hashes: contractHashes,
    script: requiredOutputs.piece_scripts,
    audio: requiredOutputs.narration,
    assets: [bytesBinding('assets/host.bin', 'synthetic-host')],
    components: [bytesBinding('components/diagram.bin', 'synthetic-component')],
    required_outputs: requiredOutputs,
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
    checkpoint: bytesBinding(`checkpoints/${index}-${stage}.json`, stage),
  }));
  const unattendedRun = {
    schema_version: 'unattended-run-state-v1',
    run_id: 'EXPLAINER-PASA-CHECK-001',
    spec_sha256: specHash,
    build_manifest_sha256: buildHash,
    stages,
    repair_history: [],
    state: 'RENDERED_DRAFT',
    terminal_state: 'RENDERED_DRAFT',
  };
  const unattendedRunBytes = JSON.stringify(unattendedRun);
  return {
    authority,
    stages,
    outputs,
    bundle: {
      schema_version: 'method-explainer-contract-bundle-v1',
      hashes: {...contractHashes, build_manifest: buildHash},
      video_spec: spec,
      intent,
      assumptions,
      method_content: method,
      beat_budget: budget,
      diagram,
      build_manifest: build,
      run_representation: 'embedded-post-build',
      unattended_run: unattendedRun,
      unattended_run_material: bytesBinding(
        METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state,
        unattendedRunBytes,
      ),
    },
    unattendedRunBytes,
  };
};
