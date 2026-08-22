import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  assertMethodExplainerContractBundle,
  assertMethodExplainerMaterialBundle,
  canonicalSha256,
  MAX_MATERIAL_BYTES,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MethodExplainerContractBundleV1Schema,
  planVideoOs,
  UnattendedStageSchema,
} from 'workflows/video-os/index.ts';

const sha256 = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const normalizedRequest = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ');
const bytesSha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const artifact = (ref: string, bytes: string) => ({
  ref,
  sha256: bytesSha256(bytes),
  size_bytes: Buffer.byteLength(bytes, 'utf8'),
});
const temporaryDirectories: string[] = [];

const makeBundle = () => {
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

const materializeBundle = () => {
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

type Bundle = ReturnType<typeof makeBundle>;
type Mutation = (candidate: Bundle) => void;

const refreshRunMaterial = (bundle: Bundle): void => {
  const bytes = JSON.stringify(bundle.unattended_run);
  bundle.unattended_run_material.sha256 = bytesSha256(bytes);
  bundle.unattended_run_material.size_bytes = Buffer.byteLength(bytes, 'utf8');
};

const expectRejected = (mutation: Mutation): void => {
  const candidate = structuredClone(makeBundle());
  mutation(candidate);
  expect(() => assertMethodExplainerContractBundle(candidate)).toThrow();
};

const setIncompleteRun = (bundle: Bundle, index: number, status: 'running' | 'blocked'): void => {
  bundle.unattended_run.state = status === 'running' ? 'RUNNING' : 'BLOCKED';
  for (let cursor = index; cursor < bundle.unattended_run.stages.length; cursor += 1) {
    const stage = bundle.unattended_run.stages[cursor]!;
    stage.status = cursor === index ? status : 'pending';
    stage.attempts = cursor === index ? 1 : 0;
    stage.checkpoint = null;
  }
};

describe('method-explainer routing and deterministic planning', () => {
  it.each([
    ['Explica el método PASA', 'method-explainer'],
    ['Explica PIVOTE en un reel vertical', 'method-explainer'],
    ['Presenta este framework de trabajo', 'method-explainer'],
    ['Crear PASA para explicar el modelo', 'method-explainer'],
    ['PASA', 'case-longform'],
    ['Explica cómo pasa la información', 'case-longform'],
    ['Crear un video corto vertical', 'reel-evidence'],
  ] as const)('classifies %s as %s', (request, expected) => {
    expect(planVideoOs({request}).archetype).toBe(expected);
  });

  it('lets an explicit archetype override the classifier', () => {
    expect(planVideoOs({request: 'Explica PASA', archetype: 'reel-evidence'}).archetype).toBe(
      'reel-evidence',
    );
  });

  it('does not mistake a person named Marco for a framework', () => {
    expect(planVideoOs({request: 'Crear un video de Marco Antonio'}).archetype).toBe(
      'case-longform',
    );
  });

  it('uses the exact governed method-explainer defaults and artifacts', () => {
    const plan = planVideoOs({
      request: 'Explica el método PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
    });
    expect(plan).toMatchObject({
      decision: 'ROUTED',
      archetype: 'method-explainer',
      primary_format: '9:16',
      defaults: {source_audio: 'none', automatic_terminal_state: 'RENDERED_DRAFT'},
      next_gate: 'VO_DIRECTION_APPROVED',
    });
    expect(plan.standard_artifacts).toEqual([
      'source-pack.yml',
      'intent-envelope.json',
      'assumptions-ledger.json',
      'method-content-model.json',
      'video-spec.json',
      'socratic-debate.md',
      'beat-budget.json',
      'diagram-contract.json',
      'piece-scripts.json',
      'caption-track.json',
      'storyboard.yml',
      'asset-manifest.yml',
      'render-plan.json',
      'unattended-run-state.json',
      'verification.json',
      'receipts/index.json',
      'contact-sheet.png',
      'review-report.md',
      'handoff.md',
      'audio/narration.wav',
      'renders/render-a.mp4',
      'renders/render-b.mp4',
      'renders/metodologia-method-explainer.mp4',
    ]);
  });

  it('blocks an incompatible method-explainer format without changing the primary profile', () => {
    const plan = planVideoOs({
      request: 'Explicar PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
      primaryFormat: '16:9',
    });
    expect(plan).toMatchObject({
      archetype: 'method-explainer',
      decision: 'BLOCKED',
      primary_format: '9:16',
      next_gate: 'VO_INTAKE_COMPLETE',
    });
  });

  it('normalizes request hashes and produces identical plans', () => {
    const first = planVideoOs({request: '  Explica\tPASA\ncon evidencia  '});
    const second = planVideoOs({request: 'Explica PASA con evidencia'});
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(planVideoOs({request: first.request})));
  });
});

describe('method-explainer valid bundle', () => {
  it('accepts the complete local internal-draft bundle deterministically', () => {
    const bundle = makeBundle();
    expect(MethodExplainerContractBundleV1Schema.parse(bundle)).toEqual(bundle);
    const first = assertMethodExplainerContractBundle(bundle);
    const second = assertMethodExplainerContractBundle(structuredClone(bundle));
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('accepts an edge exactly six frames after every component settles', () => {
    const bundle = makeBundle();
    expect(bundle.diagram.edges[0]?.start_frame).toBe(
      Math.max(...bundle.diagram.nodes.map(({settle_frame}) => settle_frame)) + 6,
    );
    expect(() => assertMethodExplainerContractBundle(bundle)).not.toThrow();
  });

  it('projects build then run without a manifest self-hash cycle', () => {
    const bundle = makeBundle();
    expect(bundle.build_manifest.manifest_representation).toBe('embedded-no-self-hash');
    expect(bundle.run_representation).toBe('embedded-post-build');
    expect(Object.keys(bundle.build_manifest.required_outputs)).toHaveLength(22);
    expect(bundle.build_manifest.required_outputs).not.toHaveProperty('unattended_run_state');
    expect(bundle.hashes.build_manifest).toBe(canonicalSha256(bundle.build_manifest));
    expect(bundle.unattended_run.build_manifest_sha256).toBe(bundle.hashes.build_manifest);
    expect(bundle.unattended_run_material).toEqual(
      artifact(
        METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state,
        JSON.stringify(bundle.unattended_run),
      ),
    );
  });
});

describe('strict structural loading', () => {
  it.each([
    ['bundle', (bundle) => Object.assign(bundle, {unexpected: true})],
    ['video spec', (bundle) => Object.assign(bundle.video_spec, {unexpected: true})],
    ['intent', (bundle) => Object.assign(bundle.intent, {unexpected: true})],
    [
      'authority',
      (bundle) => Object.assign(bundle.method_content.authority_refs[0]!, {unexpected: true}),
    ],
    ['beat', (bundle) => Object.assign(bundle.beat_budget.beats[0]!, {unexpected: true})],
    ['node', (bundle) => Object.assign(bundle.diagram.nodes[0]!, {unexpected: true})],
    ['run stage', (bundle) => Object.assign(bundle.unattended_run.stages[0]!, {unexpected: true})],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)(
    'rejects an extra field in %s',
    (_, mutate) => {
      expectRejected(mutate);
    },
  );
});

describe('authority, rights and local-reference gates', () => {
  it.each([
    [
      'AUTO_CONTINUE with unknown rights',
      (bundle) => {
        bundle.intent.rights = 'unknown';
        bundle.intent.decision = 'AUTO_CONTINUE';
      },
    ],
    [
      'AUTO_CONTINUE with unresolved inputs',
      (bundle) => {
        bundle.intent.unknown = ['Titularidad del host'];
        bundle.intent.decision = 'AUTO_CONTINUE';
      },
    ],
    [
      'a material claim without authority',
      (bundle) => {
        bundle.method_content.claims[0]!.authority_refs = [];
      },
    ],
    [
      'an unknown authority reference',
      (bundle) => {
        bundle.method_content.concepts[0]!.authority_refs = ['authority/missing.json'];
      },
    ],
    [
      'a blocked intent reaching rendered draft',
      (bundle) => {
        bundle.intent.decision = 'BLOCKED';
      },
    ],
    [
      'blocked assumptions reaching rendered draft',
      (bundle) => {
        bundle.assumptions.decision = 'BLOCKED';
      },
    ],
    [
      'duplicate contradictory authority',
      (bundle) => {
        const original = bundle.method_content.authority_refs[0]!;
        bundle.method_content.authority_refs.push({
          ...original,
          sha256: sha256('contradictory-authority'),
          rights: 'cleared',
        });
      },
    ],
    [
      'an HTTP artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = 'https://example.test/audio.wav';
      },
    ],
    [
      'a UNC artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '\\\\server\\share\\audio.wav';
      },
    ],
    [
      'an absolute artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '/private/audio.wav';
      },
    ],
    [
      'a traversal artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '../audio.wav';
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('method, timeline, tempo and text-budget gates', () => {
  it.each([
    [
      'a relation to an unknown concept',
      (bundle) => {
        bundle.method_content.relations[0]!.target = 'CONCEPT-MISSING-01';
      },
    ],
    [
      'duplicate concept IDs',
      (bundle) => {
        bundle.method_content.concepts[1]!.id = bundle.method_content.concepts[0]!.id;
      },
    ],
    [
      'duplicate beat IDs',
      (bundle) => {
        bundle.beat_budget.beats[1]!.id = bundle.beat_budget.beats[0]!.id;
      },
    ],
    [
      'a timeline gap',
      (bundle) => {
        bundle.beat_budget.beats[1]!.start_frame += 1;
      },
    ],
    [
      'a timeline overlap',
      (bundle) => {
        bundle.beat_budget.beats[1]!.start_frame -= 1;
      },
    ],
    [
      'a first beat after frame zero',
      (bundle) => {
        bundle.beat_budget.beats[0]!.start_frame = 1;
      },
    ],
    [
      'a total-frame mismatch',
      (bundle) => {
        bundle.beat_budget.total_frames += 1;
      },
    ],
    [
      'intent duration drift',
      (bundle) => {
        bundle.intent.duration_seconds = 16;
      },
    ],
    [
      'voice word-count drift',
      (bundle) => {
        bundle.beat_budget.beats[0]!.voice_words += 1;
      },
    ],
    [
      'voice tempo above the governed maximum',
      (bundle) => {
        bundle.beat_budget.beats[0]!.end_frame = 149;
        bundle.beat_budget.beats[1]!.start_frame = 149;
      },
    ],
    [
      'font below 24 pixels',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.font_px = 23;
      },
    ],
    [
      'more than two text lines',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.max_lines = 3;
      },
    ],
    [
      'screen text beyond its budget',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.text = 'x'.repeat(161);
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('diagram bounds, choreography and proof-pose gates', () => {
  it.each([
    [
      'a safe zone extending outside the canvas',
      (bundle) => {
        bundle.diagram.stage.safe_zone = {x: 0.8, y: 0.08, width: 0.4, height: 0.76};
        bundle.diagram.nodes[0]!.bounds = {x: 0.82, y: 0.2, width: 0.1, height: 0.12};
        bundle.diagram.nodes[1]!.bounds = {x: 0.94, y: 0.2, width: 0.1, height: 0.12};
      },
    ],
    [
      'a node outside the safe zone',
      (bundle) => {
        bundle.diagram.nodes[0]!.bounds.x = 0.01;
      },
    ],
    [
      'settle before enter',
      (bundle) => {
        bundle.diagram.nodes[0]!.settle_frame = 9;
      },
    ],
    [
      'duplicate node IDs',
      (bundle) => {
        bundle.diagram.nodes[1]!.id = bundle.diagram.nodes[0]!.id;
        bundle.diagram.edges[0]!.target = bundle.diagram.nodes[0]!.id;
      },
    ],
    [
      'duplicate edge IDs',
      (bundle) => {
        bundle.diagram.edges.push({...bundle.diagram.edges[0]!});
      },
    ],
    [
      'an unknown edge endpoint',
      (bundle) => {
        bundle.diagram.edges[0]!.target = 'NODE-MISSING-01';
      },
    ],
    [
      'an edge at settle plus five',
      (bundle) => {
        bundle.diagram.edges[0]!.start_frame = 105;
      },
    ],
    [
      'an edge before an unrelated component settles',
      (bundle) => {
        bundle.diagram.nodes.push({
          id: 'NODE-SISTEMATIZA-01',
          bounds: {x: 0.35, y: 0.5, width: 0.3, height: 0.12},
          text: 'Sistematiza',
          max_lines: 2,
          font_px: 32,
          enter_frame: 110,
          settle_frame: 140,
        });
        bundle.diagram.required_poses.components_settled_frame = 140;
      },
    ],
    [
      'a closing pose before components settle',
      (bundle) => {
        bundle.diagram.edges = [];
        bundle.diagram.required_poses.connectors_complete_frame = 0;
        bundle.diagram.required_poses.closing_frame = 1;
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('material hashes and output-drift gates', () => {
  it.each([
    [
      'spec drift in the beat budget',
      (bundle) => {
        bundle.beat_budget.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the diagram',
      (bundle) => {
        bundle.diagram.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the build manifest',
      (bundle) => {
        bundle.build_manifest.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the unattended run',
      (bundle) => {
        bundle.unattended_run.spec_sha256 = sha256('other-spec');
        refreshRunMaterial(bundle);
      },
    ],
    [
      'intent content drift after hashing',
      (bundle) => {
        bundle.intent.audience = 'Una audiencia distinta';
      },
    ],
    [
      'diagram output drift after hashing',
      (bundle) => {
        bundle.diagram.grammar = 'cycle';
      },
    ],
    [
      'video spec drift after canonical hashing',
      (bundle) => {
        bundle.video_spec.duration_seconds = 16;
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('material file authority and byte-drift gates', () => {
  it('accepts a bundle only when every bound material exists as matching bytes', async () => {
    const {bundle, root} = materializeBundle();
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).resolves.toEqual(bundle);
  });

  it('rejects a missing bound material with a sanitized stable code', async () => {
    const {bundle, root} = materializeBundle();
    rmSync(resolve(root, bundle.build_manifest.audio.ref));
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /^METHOD-EXPLAINER-MATERIAL-FS-ERROR$/u,
    );
  });

  it('rejects a directory substituted for a bound file', async () => {
    const {bundle, root} = materializeBundle();
    const path = resolve(root, bundle.build_manifest.script.ref);
    rmSync(path);
    mkdirSync(path);
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-NOT-FILE/u,
    );
  });

  it('rejects a symlink that resolves outside the material root', async () => {
    const {bundle, root} = materializeBundle();
    const outside = mkdtempSync(resolve(tmpdir(), 'method-explainer-outside-'));
    temporaryDirectories.push(outside);
    const outsideFile = resolve(outside, 'escaped-audio.wav');
    writeFileSync(outsideFile, 'audio-v1');
    const path = resolve(root, bundle.build_manifest.audio.ref);
    rmSync(path);
    symlinkSync(outsideFile, path);
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-ESCAPES-ROOT/u,
    );
  });

  it.each([
    ['authority', (bundle: Bundle): string => bundle.method_content.authority_refs[0]!.ref],
    ['script', (bundle: Bundle): string => bundle.build_manifest.script.ref],
    ['audio', (bundle: Bundle): string => bundle.build_manifest.audio.ref],
    ['asset', (bundle: Bundle): string => bundle.build_manifest.assets[0]!.ref],
    ['component', (bundle: Bundle): string => bundle.build_manifest.components[0]!.ref],
    ['render A', (bundle: Bundle): string => bundle.build_manifest.required_outputs.render_a.ref],
    ['render B', (bundle: Bundle): string => bundle.build_manifest.required_outputs.render_b.ref],
    [
      'primary MP4',
      (bundle: Bundle): string => bundle.build_manifest.required_outputs.primary_mp4.ref,
    ],
    ['unattended run', (bundle: Bundle): string => bundle.unattended_run_material.ref],
    ['checkpoint', (bundle: Bundle): string => bundle.unattended_run.stages[12]!.checkpoint!.ref],
  ] as const)(
    'rejects %s drift in material bytes',
    async (_, selectRef: (bundle: Bundle) => string) => {
      const {bundle, root} = materializeBundle();
      const path = resolve(root, selectRef(bundle));
      const mutated = readFileSync(path);
      mutated[0] = mutated[0] === 0x78 ? 0x79 : 0x78;
      writeFileSync(path, mutated);
      await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
        /METHOD-EXPLAINER-MATERIAL-HASH-MISMATCH/u,
      );
    },
  );

  it('rejects a declared size that differs from the material bytes', async () => {
    const {bundle, root} = materializeBundle();
    writeFileSync(resolve(root, bundle.build_manifest.audio.ref), 'material:audio/narration.wav!');
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-SIZE-MISMATCH/u,
    );
  });

  it('rejects an individual material above the configured limit', () => {
    const bundle = makeBundle();
    bundle.build_manifest.required_outputs.render_a.size_bytes = MAX_MATERIAL_BYTES + 1;
    expect(() => assertMethodExplainerContractBundle(bundle)).toThrow();
  });

  it('rejects aggregate material above the configured limit before hashing sparse files', async () => {
    const {bundle, root} = materializeBundle();
    const oversized = [
      bundle.build_manifest.required_outputs.source_pack,
      bundle.build_manifest.required_outputs.socratic_debate,
      bundle.build_manifest.required_outputs.caption_track,
      bundle.build_manifest.required_outputs.storyboard,
      bundle.build_manifest.required_outputs.asset_manifest,
    ];
    for (const binding of oversized) {
      binding.size_bytes = MAX_MATERIAL_BYTES;
      truncateSync(resolve(root, binding.ref), MAX_MATERIAL_BYTES);
    }
    bundle.hashes.build_manifest = canonicalSha256(bundle.build_manifest);
    bundle.unattended_run.build_manifest_sha256 = bundle.hashes.build_manifest;
    refreshRunMaterial(bundle);
    writeFileSync(
      resolve(root, bundle.unattended_run_material.ref),
      JSON.stringify(bundle.unattended_run),
    );
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-TOTAL-SIZE/u,
    );
  });

  it('keeps CLI material failures coded and free of the private absolute base path', () => {
    const {bundle, root} = materializeBundle();
    rmSync(resolve(root, bundle.build_manifest.required_outputs.primary_mp4.ref));
    const bundlePath = resolve(root, 'bundle.json');
    writeFileSync(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        bundlePath,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-MATERIAL-FS-ERROR');
    expect(result.stderr).not.toContain(root);
    expect(result.stderr).not.toContain(bundlePath);
  });

  it('validates a complete material bundle through the CLI file boundary', () => {
    const {bundle, root} = materializeBundle();
    const bundlePath = resolve(root, 'bundle.json');
    writeFileSync(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        bundlePath,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schema_version: 'method-explainer-contract-bundle-v1',
      run_representation: 'embedded-post-build',
    });
  });

  it('rejects stdin above 8 MiB with a sanitized stable code', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        '-',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        input: 'x'.repeat(8 * 1024 * 1024 + 1),
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_TOO_LARGE');
    expect(result.stderr).not.toContain('xxxxxxxxxxxxxxxx');
  });

  it('rejects invalid JSON with a sanitized stable code', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        '-',
      ],
      {cwd: process.cwd(), encoding: 'utf8', input: '{invalid-json'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_PARSE');
    expect(result.stderr).not.toContain('{invalid-json');
  });

  it('rejects an unreadable bundle locator without echoing it', () => {
    const missing = resolve(tmpdir(), 'method-explainer-bundle-does-not-exist.json');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        missing,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_READ');
    expect(result.stderr).not.toContain(missing);
  });
});

describe('unattended-run progression gates', () => {
  it.each([
    ['running', 'RUNNING'],
    ['blocked', 'BLOCKED'],
  ] as const)('accepts a single %s stage only at firstIncomplete', (status, state) => {
    const bundle = makeBundle();
    setIncompleteRun(bundle, 5, status);
    refreshRunMaterial(bundle);
    expect(bundle.unattended_run.state).toBe(state);
    expect(() => assertMethodExplainerContractBundle(bundle)).not.toThrow();
  });

  it.each([
    [
      'stage reordering',
      (bundle) => {
        const first = bundle.unattended_run.stages[0]!.stage;
        bundle.unattended_run.stages[0]!.stage = bundle.unattended_run.stages[1]!.stage;
        bundle.unattended_run.stages[1]!.stage = first;
      },
    ],
    [
      'a completed stage after a pending stage',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.checkpoint = null;
      },
    ],
    [
      'attempt four',
      (bundle) => {
        bundle.unattended_run.stages[0]!.attempts = 4;
      },
    ],
    [
      'a completed stage with zero attempts',
      (bundle) => {
        bundle.unattended_run.stages[0]!.attempts = 0;
      },
    ],
    [
      'multiple running stages',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        for (let index = 5; index < bundle.unattended_run.stages.length; index += 1) {
          bundle.unattended_run.stages[index]!.status = 'pending';
          bundle.unattended_run.stages[index]!.checkpoint = null;
        }
        bundle.unattended_run.stages[5]!.status = 'running';
        bundle.unattended_run.stages[6]!.status = 'running';
      },
    ],
    [
      'a running stage after firstIncomplete',
      (bundle) => {
        setIncompleteRun(bundle, 5, 'running');
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.attempts = 0;
        bundle.unattended_run.stages[6]!.status = 'running';
        bundle.unattended_run.stages[6]!.attempts = 1;
      },
    ],
    [
      'a blocked stage after firstIncomplete',
      (bundle) => {
        setIncompleteRun(bundle, 5, 'blocked');
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.attempts = 0;
        bundle.unattended_run.stages[6]!.status = 'blocked';
        bundle.unattended_run.stages[6]!.attempts = 1;
      },
    ],
    [
      'a pending stage with a checkpoint',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        for (let index = 5; index < bundle.unattended_run.stages.length; index += 1) {
          bundle.unattended_run.stages[index]!.status = 'pending';
          if (index !== 5) bundle.unattended_run.stages[index]!.checkpoint = null;
        }
      },
    ],
    [
      'rendered draft with an incomplete stage',
      (bundle) => {
        bundle.unattended_run.stages[12]!.status = 'pending';
        bundle.unattended_run.stages[12]!.checkpoint = null;
      },
    ],
    [
      'BLOCKED run state without a blocked stage',
      (bundle) => {
        bundle.unattended_run.state = 'BLOCKED';
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    const candidate = structuredClone(makeBundle());
    mutate(candidate);
    refreshRunMaterial(candidate);
    expect(() => assertMethodExplainerContractBundle(candidate)).toThrow();
  });
});
