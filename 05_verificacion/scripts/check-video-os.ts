import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {
  METHOD_EXPLAINER_OUTPUT_REFS,
  VIDEO_OS_CHAIN,
  VIDEO_OS_CONTEXT_BUDGETS,
  VIDEO_OS_DEFAULT_DOCUMENTS,
  VIDEO_OS_USER_PROMPT_CHAIN,
  assertMethodExplainerMaterialBundle,
  assertVideoOsState,
  canonicalSha256,
  planVideoOs,
  UnattendedStageSchema,
  validateVideoOsJob,
} from '../../02_proceso/workflows/video-os/index.ts';
import {
  HASH_B,
  createVideoOsCheckIo,
  makeVideoOsCheckState,
  makeVideoOsVerificationReceipt,
  mustRejectVideoOsState,
} from './lib/video-os-checks.ts';

const ROOT = process.cwd();
const errors: string[] = [];
const {check, read, readJson} = createVideoOsCheckIo(ROOT, errors);

const request = {
  request: 'Crear un reel de evidencia con fuentes autorizadas',
  sourceRefs: ['fixtures/video-os/synthetic-source.mp4'],
  sourceAuthority: 'verified' as const,
  rights: 'cleared' as const,
};
const plan = planVideoOs(request);
check(JSON.stringify(plan) === JSON.stringify(planVideoOs(request)), 'VIDEO-OS-DET-001 plan drift');
check(VIDEO_OS_CHAIN.length === 5, 'VIDEO-OS-CHAIN-001 expected V00-V04');
check(
  VIDEO_OS_USER_PROMPT_CHAIN.length >= 3 && VIDEO_OS_USER_PROMPT_CHAIN.length <= 5,
  'VIDEO-OS-PROMPT-001 human chain must use 3-5 prompts',
);
check(
  VIDEO_OS_USER_PROMPT_CHAIN.length === plan.prompt_budget.target,
  'VIDEO-OS-PROMPT-002 prompt chain must equal target',
);
check(
  VIDEO_OS_CONTEXT_BUDGETS.maxTokensPerStage <= 1_800,
  'VIDEO-OS-CONTEXT-001 context capsule exceeds budget',
);
check(plan.blocking_questions.length <= 3, 'VIDEO-OS-INTAKE-001 too many blocking questions');
check(
  JSON.stringify(plan.standard_artifacts) === JSON.stringify(VIDEO_OS_DEFAULT_DOCUMENTS),
  'VIDEO-OS-DOCS-001 plan/default document drift',
);
check(
  plan.defaults.privacy_mode === 'light' &&
    plan.defaults.privacy_strategy === 'field-level' &&
    plan.defaults.persistent_privacy_plate === false,
  'VIDEO-OS-PRIVACY-001 expected light field-level privacy',
);
check(
  plan.defaults.human_intro_motion_required && !plan.defaults.freeze_frame_allowed,
  'VIDEO-OS-MOTION-001 speaker intro must preserve motion',
);
check(
  plan.defaults.automatic_terminal_state === 'RENDERED_DRAFT',
  'VIDEO-OS-STATE-001 automatic promotion forbidden',
);

const methodPlanInput = {
  request: 'Explicar PASA en un reel vertical',
  sourceRefs: ['sources/pasa-authority.md'],
  sourceAuthority: 'verified' as const,
  rights: 'cleared' as const,
};
const methodPlan = planVideoOs(methodPlanInput);
const expectedMethodArtifacts = [
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
];
check(
  JSON.stringify(methodPlan) === JSON.stringify(planVideoOs(methodPlanInput)),
  'VIDEO-OS-METHOD-DET-001 method plan drift',
);
check(
  methodPlan.archetype === 'method-explainer' &&
    methodPlan.primary_format === '9:16' &&
    methodPlan.next_gate === 'VO_DIRECTION_APPROVED',
  'VIDEO-OS-METHOD-ROUTE-001 PASA must route to the vertical method explainer',
);
check(
  methodPlan.defaults.source_audio === 'none' &&
    methodPlan.defaults.automatic_terminal_state === 'RENDERED_DRAFT',
  'VIDEO-OS-METHOD-DEFAULTS-001 method defaults drift',
);
check(
  JSON.stringify(methodPlan.standard_artifacts) === JSON.stringify(expectedMethodArtifacts),
  'VIDEO-OS-METHOD-ARTIFACTS-001 method artifact set drift',
);
check(
  JSON.stringify(methodPlan.standard_artifacts) ===
    JSON.stringify(Object.values(METHOD_EXPLAINER_OUTPUT_REFS)),
  'VIDEO-OS-METHOD-ARTIFACTS-002 method plan/output registry drift',
);
check(
  planVideoOs({request: 'Explicar PASA', archetype: 'reel-evidence'}).archetype === 'reel-evidence',
  'VIDEO-OS-METHOD-OVERRIDE-001 explicit override must win',
);
check(
  planVideoOs({request: 'Crear un video de Marco Antonio'}).archetype === 'case-longform',
  'VIDEO-OS-METHOD-CLASSIFIER-001 person name must not trigger method explainer',
);
check(
  planVideoOs({request: 'PASA'}).archetype === 'case-longform' &&
    planVideoOs({request: 'Crear PASA para explicar el modelo'}).archetype === 'method-explainer',
  'VIDEO-OS-METHOD-CLASSIFIER-002 PASA requires explanatory or creation intent',
);
check(
  planVideoOs({request: 'Explica cómo pasa la información'}).archetype === 'case-longform',
  'VIDEO-OS-METHOD-CLASSIFIER-003 ordinary use of pasa must not route as a method',
);
const incompatibleMethodPlan = planVideoOs({
  ...methodPlanInput,
  primaryFormat: '16:9' as const,
});
check(
  incompatibleMethodPlan.decision === 'BLOCKED' &&
    incompatibleMethodPlan.primary_format === '9:16' &&
    incompatibleMethodPlan.next_gate === 'VO_INTAKE_COMPLETE',
  'VIDEO-OS-METHOD-FORMAT-001 incompatible format must block at intake',
);

const bytesBinding = (ref: string, bytes: string) => ({
  ref,
  sha256: createHash('sha256').update(bytes, 'utf8').digest('hex'),
  size_bytes: Buffer.byteLength(bytes, 'utf8'),
});
const materialRoot = mkdtempSync(resolve(tmpdir(), 'video-os-method-smoke-'));
try {
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
    request_sha256: createHash('sha256').update(requestText, 'utf8').digest('hex'),
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
    stage: {width: 1080, height: 1920, safe_zone: {x: 0.06, y: 0.08, width: 0.88, height: 0.76}},
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
  const canonicalOutputs = new Map<string, string>([
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
      .map(([key, ref]) => [key, bytesBinding(ref, canonicalOutputs.get(ref) ?? `smoke:${ref}`)]),
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
  const bundle = {
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
  };
  const write = (ref: string, bytes: string): void => {
    const path = resolve(materialRoot, ref);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, bytes);
  };
  write(authority.ref, 'synthetic-authority');
  write(build.assets[0]!.ref, 'synthetic-host');
  write(build.components[0]!.ref, 'synthetic-component');
  for (const output of Object.values(build.required_outputs))
    write(output.ref, canonicalOutputs.get(output.ref) ?? `smoke:${output.ref}`);
  write(bundle.unattended_run_material.ref, unattendedRunBytes);
  for (const stage of stages) write(stage.checkpoint.ref, stage.stage);
  await assertMethodExplainerMaterialBundle(bundle, materialRoot);
  check(true, 'VIDEO-OS-METHOD-MATERIAL-001 material smoke');
} catch (error) {
  errors.push(`VIDEO-OS-METHOD-MATERIAL-001 ${String(error)}`);
} finally {
  rmSync(materialRoot, {recursive: true, force: true});
}

const state = makeVideoOsCheckState();
const verificationReceipt = makeVideoOsVerificationReceipt(state);

try {
  validateVideoOsJob({schema_version: 'video-os-job-v1', plan, state});
} catch (error) {
  errors.push(`VIDEO-OS-JOB-001 ${String(error)}`);
}

const mustReject = (candidate: typeof state, code: string, expected: RegExp): void =>
  mustRejectVideoOsState(candidate, code, expected, errors, assertVideoOsState);
mustReject({...state, manifest_spec_sha256: HASH_B}, 'VIDEO-OS-MANIFEST-001', /STALE-MANIFEST/u);
mustReject(
  {...state, secondary_exports_requested: ['16:9']},
  'VIDEO-OS-EXPORT-001',
  /PRIMARY-PASS-REQUIRED/u,
);
mustReject(
  {
    ...state,
    status: 'HUMAN_APPROVED',
    active_stage: 'V04',
    primary_verification: 'PASS',
    primary_verification_receipt: verificationReceipt,
  },
  'VIDEO-OS-HUMAN-001',
  /HUMAN-APPROVAL-RECEIPT-REQUIRED/u,
);
mustReject(
  {...state, verifier_actor_id: state.producer_actor_id},
  'VIDEO-OS-ACTOR-001',
  /ACTORS-MUST-BE-DISTINCT/u,
);
mustReject({...state, visual_evidence: null}, 'VIDEO-OS-VISUAL-001', /VISUAL-EVIDENCE-REQUIRED/u);

const archetypes = readJson<{
  defaults: {
    privacy: {mode: string; mask_strategy: string; persistent_plate: boolean};
    human_intro: {motion_required: boolean; freeze_frame_allowed: boolean};
    brand: string;
    automatic_terminal_state: string;
  };
  archetypes: Record<
    string,
    {
      aspect_ratio: string;
      storyboard: boolean;
      source_audio: string;
      automatic_terminal_state?: string;
    }
  >;
}>('02_proceso/workflows/video-os/_assets/archetypes.json');
check(archetypes.defaults.brand === 'MetodologIA', 'VIDEO-OS-BRAND-001 identity drift');
check(
  archetypes.defaults.privacy.mode === 'light' &&
    archetypes.defaults.privacy.mask_strategy === 'field-level' &&
    !archetypes.defaults.privacy.persistent_plate,
  'VIDEO-OS-PRIVACY-002 archetype privacy drift',
);
check(
  archetypes.defaults.human_intro.motion_required &&
    !archetypes.defaults.human_intro.freeze_frame_allowed,
  'VIDEO-OS-MOTION-002 archetype motion drift',
);
check(
  JSON.stringify(archetypes.archetypes['method-explainer']) ===
    JSON.stringify({
      aspect_ratio: '9:16',
      storyboard: true,
      source_audio: 'none',
      automatic_terminal_state: 'RENDERED_DRAFT',
    }),
  'VIDEO-OS-METHOD-REGISTRY-001 method archetype registry drift',
);

const regressions = readJson<{
  cases: Array<{id: string; expected: string}>;
}>('02_proceso/workflows/video-os/_assets/regressions.json');
const documentSections = readJson<{
  documents: Record<string, string[]>;
}>('02_proceso/workflows/video-os/_assets/document-sections.json');
check(
  Object.keys(documentSections.documents).length === VIDEO_OS_DEFAULT_DOCUMENTS.length &&
    VIDEO_OS_DEFAULT_DOCUMENTS.every((document) =>
      Object.prototype.hasOwnProperty.call(documentSections.documents, document),
    ),
  'VIDEO-OS-DOCS-002 section registry must cover every standard document',
);
const requiredRegressions = [
  'REG-MOTION-001',
  'REG-PRIVACY-001',
  'REG-PRIVACY-002',
  'REG-SPEAKER-001',
  'REG-SOURCE-001',
  'REG-MANIFEST-001',
  'REG-EXPORT-001',
];
const regressionIds = new Set(regressions.cases.map(({id}) => id));
check(
  requiredRegressions.every((id) => regressionIds.has(id)),
  'VIDEO-OS-REGRESSION-001 missing regression',
);
check(
  regressions.cases.every(({expected}) => expected === 'BLOCKED'),
  'VIDEO-OS-REGRESSION-002 regressions must fail closed',
);

for (const file of ['INSTRUCTIONS.md', 'STATE.md', 'VERIFICATION.md', 'SCOPE.md', 'LIFECYCLE.md']) {
  const body = read(`02_proceso/workflows/video-os/${file}`);
  check(
    body.includes('Este sistema convierte intención en resultados por procesos auto orquestado.'),
    `VIDEO-OS-HARNESS-001 ${file} missing self-orchestration preamble`,
  );
}
const runner = read('02_proceso/workflows/video-os/_runner/video-os.ts');
check(
  !/\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval)\s*\(/u.test(runner),
  'VIDEO-OS-DET-002 nondeterministic or network primitive in runner',
);
const methodExecutionFiles = [
  '02_proceso/workflows/video-os/_runner/video-os.ts',
  '02_proceso/workflows/video-os/_schema/method-explainer-planning-v1.schema.ts',
  '02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts',
];
for (const file of methodExecutionFiles) {
  const source = read(file);
  check(
    !/\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval|requestAnimationFrame)\s*\(/u.test(
      source,
    ),
    `VIDEO-OS-METHOD-DET-002 nondeterministic or network primitive in ${file}`,
  );
}
check(
  runner.includes("command === 'check-method-explainer'") &&
    runner.includes('assertMethodExplainerMaterialBundle(input, bundleBase)'),
  'VIDEO-OS-METHOD-CLI-001 governed contract command missing',
);
const schemaIndex = read('02_proceso/workflows/video-os/_schema/index.ts');
check(
  schemaIndex.includes("export * from './method-explainer-planning-v1.schema.ts'") &&
    schemaIndex.includes("export * from './method-explainer-execution-v1.schema.ts'"),
  'VIDEO-OS-METHOD-EXPORTS-001 method schemas are not exported',
);
const architecture = read('01_intencion/video-os/ARCHITECTURE.md');
check(
  /Spec[^\n]*Compile[^\n]*Verify[^\n]*Review[^\n]*Promote/iu.test(architecture),
  'VIDEO-OS-SPEC-001 canonical sequence missing',
);
check(
  !/publication_authority\s*[:=]\s*true/iu.test(architecture),
  'VIDEO-OS-PUBLISH-001 publication authority forbidden',
);

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`[FAIL] ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `[PASS] Video OS: ${VIDEO_OS_CHAIN.length} stages, ${VIDEO_OS_USER_PROMPT_CHAIN.length} prompts, ${VIDEO_OS_DEFAULT_DOCUMENTS.length} standard artifacts, ${regressions.cases.length} fail-closed regressions.\n`,
  );
}
