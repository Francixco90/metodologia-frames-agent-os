import {createHash} from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  canonicalSha256,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MethodExplainerContractBundleV1Schema,
  planOrVerifyGeneralVideoMethodExplainer,
  UnattendedStageSchema,
} from 'workflows/video-os/index.ts';

const hashBytes = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const binding = (ref: string, bytes: string) => ({
  ref,
  sha256: hashBytes(bytes),
  size_bytes: Buffer.byteLength(bytes),
});
const temporary: string[] = [];

const makeBundle = () => {
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

type Bundle = ReturnType<typeof makeBundle>;
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
const snapshotTree = (root: string): Record<string, string> => {
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
const materialize = () => {
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
const expected = (bundle: Bundle) => ({
  bundle_sha256: canonicalSha256(bundle),
  spec_sha256: canonicalSha256(bundle.video_spec),
  contract_set_sha256: bundle.build_manifest.contract_set_sha256,
  build_manifest_sha256: bundle.hashes.build_manifest,
  unattended_run_sha256: bundle.unattended_run_material.sha256,
});
const verifyRequest = (bundle: Bundle) => ({
  schema_version: 'general-video-method-explainer-adapter-request-v1',
  archetype: 'method-explainer',
  mode: 'PLAN_VERIFY_ONLY',
  operation: 'VERIFY_EXISTING',
  bundle,
  expected: expected(bundle),
});
const assertCeiling = (
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

describe('General Video method-explainer PLAN adapter', () => {
  const planRequest = {
    schema_version: 'general-video-method-explainer-adapter-request-v1',
    archetype: 'method-explainer',
    mode: 'PLAN_VERIFY_ONLY',
    operation: 'PLAN',
    video_os_request: {
      request: 'Explica PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
      archetype: 'method-explainer',
      secondaryExports: [],
      constraints: [],
    },
  } as const;

  it('projects a routed plan but preserves the absolute BLOCKED ceiling', async () => {
    const result = await planOrVerifyGeneralVideoMethodExplainer(planRequest);
    expect(result).toMatchObject({
      operation: 'PLAN',
      verdict: 'VALIDATED_CANDIDATE',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: null,
      evidence: {kind: 'PLAN', decision: 'ROUTED', primary_format: '9:16'},
    });
    expect(result.evidence?.kind === 'PLAN' && result.evidence.standard_artifacts).toHaveLength(23);
    assertCeiling(result);
  });

  it('is deterministic and does not mutate its request', async () => {
    const candidate = structuredClone(planRequest);
    const before = structuredClone(candidate);
    const first = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    const second = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(first).toEqual(second);
    expect(candidate).toEqual(before);
  });

  it.each([
    ['missing sources', {sourceRefs: []}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['unknown authority', {sourceAuthority: 'unknown'}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['unknown rights', {rights: 'unknown'}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['private source', {sourceRefs: ['private/pasa.md']}, 'ADAPTER-PLAN-BLOCKED'],
    ['wrong primary format', {primaryFormat: '16:9'}, 'ADAPTER-PLAN-BLOCKED'],
  ] as const)('blocks %s without effects', async (_, mutation, reason) => {
    const candidate = structuredClone(planRequest) as Record<string, unknown>;
    Object.assign(candidate.video_os_request as object, mutation);
    const result = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(result).toMatchObject({operation: 'PLAN', verdict: 'BLOCKED', reason_code: reason});
    assertCeiling(result);
  });

  it.each([
    ['unexpected request field', {...planRequest, unexpected: true}],
    ['wrong mode', {...planRequest, mode: 'EXECUTE'}],
    ['wrong archetype', {...planRequest, archetype: 'case-longform'}],
    [
      'unexpected nested field',
      {...planRequest, video_os_request: {...planRequest.video_os_request, x: 1}},
    ],
    [
      'missing operation',
      Object.fromEntries(Object.entries(planRequest).filter(([key]) => key !== 'operation')),
    ],
  ])('fails closed for %s', async (_, candidate) => {
    const result = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
    assertCeiling(result);
  });
});

describe('General Video method-explainer VERIFY_EXISTING adapter', () => {
  it('validates canonical material without writing or mutating inputs', async () => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    const before = structuredClone(request);
    const filesBefore = snapshotTree(root);
    const result = await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root});
    expect(result).toMatchObject({
      operation: 'VERIFY_EXISTING',
      verdict: 'VALIDATED_CANDIDATE',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: null,
      evidence: {kind: 'VERIFY_EXISTING', ...expected(bundle)},
    });
    expect(request).toEqual(before);
    expect(snapshotTree(root)).toEqual(filesBefore);
    assertCeiling(result);
  });

  it('is deterministic across repeated verification', async () => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    expect(await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root})).toEqual(
      await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root}),
    );
  });

  it('requires a material root and still stops at the direction gate', async () => {
    const bundle = makeBundle();
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle));
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'ADAPTER-MATERIAL-ROOT-REQUIRED',
      next_gate: 'VO_DIRECTION_APPROVED',
    });
    assertCeiling(result);
  });

  it.each([
    'bundle_sha256',
    'spec_sha256',
    'contract_set_sha256',
    'build_manifest_sha256',
    'unattended_run_sha256',
  ] as const)('rejects expected %s drift', async (key) => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    request.expected[key] = '0'.repeat(64);
    const result = await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root});
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'ADAPTER-EXPECTED-HASH-MISMATCH',
    });
    assertCeiling(result);
  });

  it.each([
    ['spec', (bundle: Bundle) => (bundle.beat_budget.spec_sha256 = '0'.repeat(64))],
    ['beat', (bundle: Bundle) => (bundle.diagram.beat_budget_sha256 = '0'.repeat(64))],
    ['diagram', (bundle: Bundle) => (bundle.hashes.diagram = '0'.repeat(64))],
    ['build', (bundle: Bundle) => (bundle.unattended_run.build_manifest_sha256 = '0'.repeat(64))],
    ['run', (bundle: Bundle) => (bundle.unattended_run_material.sha256 = '0'.repeat(64))],
    ['script binding', (bundle: Bundle) => (bundle.build_manifest.script.sha256 = '0'.repeat(64))],
    ['audio binding', (bundle: Bundle) => (bundle.build_manifest.audio.sha256 = '0'.repeat(64))],
  ] as const)('rejects structurally valid %s drift', async (_, mutate) => {
    const {bundle, root} = materialize();
    mutate(bundle);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result.verdict).toBe('BLOCKED');
    expect(result.reason_code).toMatch(/^(?:METHOD-EXPLAINER-|ADAPTER-REQUEST-INVALID)/u);
    assertCeiling(result);
  });

  it.each([
    ['authority', (bundle: Bundle): string => bundle.method_content.authority_refs[0]!.ref],
    ['script', (bundle: Bundle): string => bundle.build_manifest.script.ref],
    ['audio', (bundle: Bundle): string => bundle.build_manifest.audio.ref],
    ['asset', (bundle: Bundle): string => bundle.build_manifest.assets[0]!.ref],
    ['component', (bundle: Bundle): string => bundle.build_manifest.components[0]!.ref],
    ['checkpoint', (bundle: Bundle): string => bundle.unattended_run.stages[0]!.checkpoint!.ref],
    ['render', (bundle: Bundle): string => bundle.build_manifest.required_outputs.primary_mp4.ref],
  ] as const)(
    'rejects %s material byte drift with a sanitized reason',
    async (_, refFor: (bundle: Bundle) => string) => {
      const {bundle, root} = materialize();
      const ref = refFor(bundle);
      writeFileSync(resolve(root, ref), `${readFileSync(resolve(root, ref), 'utf8')}x`);
      const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
        baseDir: root,
      });
      expect(result).toMatchObject({
        verdict: 'BLOCKED',
        reason_code: 'METHOD-EXPLAINER-MATERIAL-SIZE-MISMATCH',
      });
      expect(result.reason_code).not.toContain(root);
      assertCeiling(result);
    },
  );

  it('rejects missing and directory materials without leaking the root', async () => {
    const {bundle, root} = materialize();
    const target = resolve(root, bundle.build_manifest.audio.ref);
    rmSync(target);
    mkdirSync(target);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result.verdict).toBe('BLOCKED');
    expect(result.reason_code).toMatch(/^METHOD-EXPLAINER-MATERIAL-/u);
    expect(JSON.stringify(result)).not.toContain(root);
  });

  it('rejects a symlink escape and sanitizes the external locator', async () => {
    const {bundle, root} = materialize();
    const outside = resolve(tmpdir(), `gv-adapter-outside-${process.pid}.txt`);
    temporary.push(outside);
    writeFileSync(outside, 'host-v1');
    const target = resolve(root, bundle.build_manifest.assets[0]!.ref);
    rmSync(target);
    symlinkSync(outside, target);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'METHOD-EXPLAINER-MATERIAL-ESCAPES-ROOT',
    });
    expect(JSON.stringify(result)).not.toContain(outside);
  });

  it.each([
    '/tmp/authority.json',
    '../authority.json',
    'private/authority.json',
    'https://x.test/a',
  ])('rejects unsafe authority ref %s at the strict request boundary', async (ref) => {
    const bundle = structuredClone(makeBundle());
    bundle.method_content.authority_refs[0]!.ref = ref;
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: tmpdir(),
    });
    expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
    expect(JSON.stringify(result)).not.toContain(ref);
    assertCeiling(result);
  });

  it('rejects additional request and bundle fields', async () => {
    const {bundle, root} = materialize();
    const withRequestField = {...verifyRequest(bundle), unexpected: true};
    const withBundleField = verifyRequest({...bundle, unexpected: true} as Bundle);
    for (const candidate of [withRequestField, withBundleField]) {
      const result = await planOrVerifyGeneralVideoMethodExplainer(candidate, {baseDir: root});
      expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
      assertCeiling(result);
    }
  });
});
