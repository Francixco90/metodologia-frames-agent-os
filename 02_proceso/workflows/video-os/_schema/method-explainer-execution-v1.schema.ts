import {z} from 'zod';

import {
  AssumptionsLedgerV1Schema,
  ArtifactBindingSchema,
  assertMethodExplainerPlanningBindings,
  BeatBudgetV1Schema,
  canonicalSha256,
  ContractHashesSchema,
  IntentEnvelopeV1Schema,
  methodExplainerFail as fail,
  MethodContentModelV1Schema,
  NormalizedBoundsSchema,
} from './method-explainer-planning-v1.schema.ts';
import {Sha256Schema} from './video-os-v1.schema.ts';

// prettier-ignore
const DiagramNodeSchema = z.strictObject({id: z.string().regex(/^NODE-[A-Z0-9-]{2,60}$/u), bounds: NormalizedBoundsSchema, text: z.string().min(1).max(160), max_lines: z.number().int().min(1).max(2), font_px: z.number().int().min(24).max(160), enter_frame: z.number().int().min(0), settle_frame: z.number().int().min(0)});
// prettier-ignore
const DiagramEdgeSchema = z.strictObject({id: z.string().regex(/^EDGE-[A-Z0-9-]{2,60}$/u), source: z.string().min(1).max(80), target: z.string().min(1).max(80), start_frame: z.number().int().min(0), end_frame: z.number().int().positive(), direction: z.enum(['forward', 'bidirectional', 'cyclic'])});
// prettier-ignore
const DiagramPosesSchema = z.strictObject({container_frame: z.number().int().min(0), components_settled_frame: z.number().int().min(0), connectors_complete_frame: z.number().int().min(0), closing_frame: z.number().int().min(0)});
// prettier-ignore
const ToolchainEntrySchema = z.strictObject({name: z.string().min(1).max(80), version: z.string().min(1).max(80)});
// prettier-ignore
const DeterminismSchema = z.strictObject({network: z.literal(false), timers: z.literal(false), randomness: z.literal(false), css_animation: z.literal(false)});
// prettier-ignore
export const ExplainerVideoSpecV1Schema = z.strictObject({schema_version: z.literal('explainer-video-spec-v1'), spec_id: z.string().regex(/^SPEC-[A-Z0-9-]{3,79}$/u), method_id: z.string().min(1).max(80), format: z.literal('9:16'), width: z.literal(1080), height: z.literal(1920), fps: z.literal(30), duration_seconds: z.number().int().min(15).max(180), total_frames: z.number().int().min(450).max(5_400), locale: z.literal('es-419'), terminal_state: z.literal('RENDERED_DRAFT')});

export const METHOD_EXPLAINER_OUTPUT_REFS = {
  source_pack: 'source-pack.yml',
  intent_envelope: 'intent-envelope.json',
  assumptions_ledger: 'assumptions-ledger.json',
  method_content_model: 'method-content-model.json',
  video_spec: 'video-spec.json',
  socratic_debate: 'socratic-debate.md',
  beat_budget: 'beat-budget.json',
  diagram_contract: 'diagram-contract.json',
  piece_scripts: 'piece-scripts.json',
  caption_track: 'caption-track.json',
  storyboard: 'storyboard.yml',
  asset_manifest: 'asset-manifest.yml',
  render_plan: 'render-plan.json',
  unattended_run_state: 'unattended-run-state.json',
  verification: 'verification.json',
  receipts_index: 'receipts/index.json',
  contact_sheet: 'contact-sheet.png',
  review_report: 'review-report.md',
  handoff: 'handoff.md',
  narration: 'audio/narration.wav',
  render_a: 'renders/render-a.mp4',
  render_b: 'renders/render-b.mp4',
  primary_mp4: 'renders/metodologia-method-explainer.mp4',
} as const;
const exactBinding = <T extends string>(ref: T) =>
  ArtifactBindingSchema.extend({ref: z.literal(ref)});
export const ExplainerRequiredOutputsV1Schema = z.strictObject({
  source_pack: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.source_pack),
  intent_envelope: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.intent_envelope),
  assumptions_ledger: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.assumptions_ledger),
  method_content_model: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.method_content_model),
  video_spec: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.video_spec),
  socratic_debate: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.socratic_debate),
  beat_budget: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.beat_budget),
  diagram_contract: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.diagram_contract),
  piece_scripts: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.piece_scripts),
  caption_track: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.caption_track),
  storyboard: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.storyboard),
  asset_manifest: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.asset_manifest),
  render_plan: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.render_plan),
  verification: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.verification),
  receipts_index: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.receipts_index),
  contact_sheet: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.contact_sheet),
  review_report: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.review_report),
  handoff: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.handoff),
  narration: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.narration),
  render_a: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.render_a),
  render_b: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.render_b),
  primary_mp4: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.primary_mp4),
});

export const DiagramContractV2Schema = z.strictObject({
  schema_version: z.literal('diagram-contract-v2'),
  spec_sha256: Sha256Schema,
  beat_budget_sha256: Sha256Schema,
  grammar: z.enum(['flow', 'convergence', 'cycle', 'radial-lenses', 'traceability']),
  stage: z.strictObject({
    width: z.literal(1080),
    height: z.literal(1920),
    safe_zone: NormalizedBoundsSchema,
  }),
  nodes: z.array(DiagramNodeSchema).min(1).max(30),
  edges: z.array(DiagramEdgeSchema).max(80),
  required_poses: DiagramPosesSchema,
});

export const ExplainerBuildManifestV1Schema = z.strictObject({
  schema_version: z.literal('explainer-build-manifest-v1'),
  // The manifest is embedded in the bundle; it is never one of its own required outputs.
  manifest_representation: z.literal('embedded-no-self-hash'),
  spec_sha256: Sha256Schema,
  contract_set_sha256: Sha256Schema,
  contract_hashes: ContractHashesSchema,
  script: ArtifactBindingSchema,
  audio: ArtifactBindingSchema,
  assets: z.array(ArtifactBindingSchema).min(1).max(80),
  components: z.array(ArtifactBindingSchema).min(1).max(80),
  required_outputs: ExplainerRequiredOutputsV1Schema,
  toolchain: z.array(ToolchainEntrySchema).min(1).max(30),
  deterministic: DeterminismSchema,
  terminal_state: z.literal('RENDERED_DRAFT'),
});

// prettier-ignore
export const UnattendedStageSchema = z.enum(['intent', 'assumptions', 'method', 'budget', 'diagram', 'audio', 'build', 'stills', 'smoke', 'renderA', 'renderB', 'verify', 'review']);
const StageStateSchema = z.strictObject({
  stage: UnattendedStageSchema,
  status: z.enum(['pending', 'running', 'complete', 'blocked']),
  attempts: z.number().int().min(0).max(3),
  input_spec_sha256: Sha256Schema,
  checkpoint: ArtifactBindingSchema.nullable(),
});

export const UnattendedRunStateV1Schema = z.strictObject({
  schema_version: z.literal('unattended-run-state-v1'),
  run_id: z.string().regex(/^EXPLAINER-[A-Z0-9-]{3,79}$/u),
  spec_sha256: Sha256Schema,
  build_manifest_sha256: Sha256Schema,
  stages: z.array(StageStateSchema).length(13),
  repair_history: z
    .array(
      z.strictObject({
        stage: UnattendedStageSchema,
        repair: z.enum(['rewrite', 'reflow', 'retime', 'regenerate-audio', 'rerender']),
        reason: z.string().min(1).max(500),
      }),
    )
    .max(39),
  state: z.enum(['RUNNING', 'BLOCKED', 'RENDERED_DRAFT']),
  terminal_state: z.literal('RENDERED_DRAFT'),
});

export const MethodExplainerContractBundleV1Schema = z.strictObject({
  schema_version: z.literal('method-explainer-contract-bundle-v1'),
  hashes: ContractHashesSchema.extend({build_manifest: Sha256Schema}),
  video_spec: ExplainerVideoSpecV1Schema,
  intent: IntentEnvelopeV1Schema,
  assumptions: AssumptionsLedgerV1Schema,
  method_content: MethodContentModelV1Schema,
  beat_budget: BeatBudgetV1Schema,
  diagram: DiagramContractV2Schema,
  build_manifest: ExplainerBuildManifestV1Schema,
  unattended_run: UnattendedRunStateV1Schema,
  run_representation: z.literal('embedded-post-build'),
  unattended_run_material: exactBinding(METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state),
});

export const assertMethodExplainerContractBundle = (raw: unknown) => {
  const bundle = MethodExplainerContractBundleV1Schema.parse(raw);
  const {
    hashes,
    video_spec: spec,
    intent,
    assumptions,
    method_content: method,
    beat_budget: budget,
    diagram,
    build_manifest: build,
    unattended_run: run,
    unattended_run_material: runMaterial,
  } = bundle;
  assertMethodExplainerPlanningBindings({intent, assumptions, method, budget, hashes});
  const specHash = canonicalSha256(spec);
  // prettier-ignore
  if (budget.spec_sha256 !== specHash || diagram.spec_sha256 !== specHash || build.spec_sha256 !== specHash || run.spec_sha256 !== specHash) fail('SPEC-MATERIAL-BINDING');
  // prettier-ignore
  if (intent.method.id !== spec.method_id || method.method_id !== spec.method_id || intent.duration_seconds !== spec.duration_seconds || budget.total_frames !== spec.total_frames) fail('SPEC-CONTENT-DRIFT');
  if (diagram.beat_budget_sha256 !== hashes.beat_budget) fail('BEAT-BINDING-MISMATCH');
  // prettier-ignore
  const expectedContractHashes = {intent: hashes.intent, assumptions: hashes.assumptions, method_content: hashes.method_content, beat_budget: hashes.beat_budget, diagram: hashes.diagram};
  if (JSON.stringify(build.contract_hashes) !== JSON.stringify(expectedContractHashes))
    fail('BUILD-CONTRACT-BINDING-MISMATCH');
  if (build.contract_set_sha256 !== canonicalSha256(build.contract_hashes))
    fail('CONTRACT-SET-HASH-MISMATCH');
  const outputs = build.required_outputs;
  // prettier-ignore
  if (outputs.intent_envelope.sha256 !== hashes.intent || outputs.assumptions_ledger.sha256 !== hashes.assumptions || outputs.method_content_model.sha256 !== hashes.method_content || outputs.video_spec.sha256 !== specHash || outputs.beat_budget.sha256 !== hashes.beat_budget || outputs.diagram_contract.sha256 !== hashes.diagram) fail('REQUIRED-CONTRACT-PROJECTION-MISMATCH');
  // prettier-ignore
  if (JSON.stringify(build.script) !== JSON.stringify(outputs.piece_scripts) || JSON.stringify(build.audio) !== JSON.stringify(outputs.narration)) fail('REQUIRED-OUTPUT-BINDING-MISMATCH');
  if (
    hashes.diagram !== canonicalSha256(diagram) ||
    hashes.build_manifest !== canonicalSha256(build)
  )
    fail('MATERIAL-HASH-MISMATCH');
  if (run.build_manifest_sha256 !== hashes.build_manifest) fail('BUILD-BINDING-MISMATCH');
  const canonicalRun = JSON.stringify(run);
  if (
    runMaterial.sha256 !== canonicalSha256(run) ||
    runMaterial.size_bytes !== Buffer.byteLength(canonicalRun, 'utf8')
  )
    fail('RUN-MATERIAL-BINDING-MISMATCH');
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  if (nodes.size !== diagram.nodes.length) fail('DUPLICATE-NODE-ID');
  if (new Set(diagram.edges.map((edge) => edge.id)).size !== diagram.edges.length)
    fail('DUPLICATE-EDGE-ID');
  const safe = diagram.stage.safe_zone;
  if (safe.x + safe.width > 1 || safe.y + safe.height > 1) fail('SAFE-ZONE-BOUNDS');
  for (const node of diagram.nodes)
    if (
      node.settle_frame < node.enter_frame ||
      node.enter_frame >= budget.total_frames ||
      node.settle_frame >= budget.total_frames ||
      node.bounds.x < safe.x ||
      node.bounds.y < safe.y ||
      node.bounds.x + node.bounds.width > safe.x + safe.width ||
      node.bounds.y + node.bounds.height > safe.y + safe.height
    )
      fail('NODE-BOUNDS-OR-TIMING');
  for (const edge of diagram.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) fail('EDGE-ENDPOINT');
    if (
      edge.start_frame < Math.max(...diagram.nodes.map((node) => node.settle_frame)) + 6 ||
      edge.end_frame <= edge.start_frame ||
      edge.end_frame >= budget.total_frames
    )
      fail('PREMATURE-EDGE');
  }
  const lastSettle = Math.max(...diagram.nodes.map((node) => node.settle_frame));
  const firstEnter = Math.min(...diagram.nodes.map((node) => node.enter_frame));
  const lastEdge = Math.max(0, ...diagram.edges.map((edge) => edge.end_frame));
  const poses = diagram.required_poses;
  // prettier-ignore
  if (poses.container_frame > firstEnter || firstEnter > lastSettle || poses.components_settled_frame < lastSettle || poses.connectors_complete_frame < poses.components_settled_frame || poses.connectors_complete_frame < lastEdge || poses.closing_frame < poses.connectors_complete_frame || Object.values(poses).some((frame) => frame >= budget.total_frames)) fail('POSE-ORDER');
  const expectedStages = UnattendedStageSchema.options;
  if (
    run.stages.some(
      (item, index) =>
        item.stage !== expectedStages[index] || item.input_spec_sha256 !== run.spec_sha256,
    )
  )
    fail('RUN-STAGE-ORDER-OR-DRIFT');
  const firstIncomplete = run.stages.findIndex((item) => item.status !== 'complete');
  if (
    firstIncomplete >= 0 &&
    run.stages.slice(firstIncomplete + 1).some((item) => item.status === 'complete')
  )
    fail('RUN-STAGE-SKIP');
  for (const item of run.stages) {
    // prettier-ignore
    if (item.status === 'complete' && (item.attempts < 1 || !item.checkpoint)) fail('RUN-COMPLETE-BINDING');
    if (item.status === 'pending' && (item.attempts !== 0 || item.checkpoint))
      fail('RUN-PENDING-BINDING');
    if (item.status === 'running' && (item.attempts < 1 || item.checkpoint))
      fail('RUN-ACTIVE-BINDING');
    if (item.status === 'blocked' && (item.attempts < 1 || item.checkpoint))
      fail('RUN-BLOCKED-BINDING');
  }
  const running = run.stages.filter((item) => item.status === 'running');
  const blocked = run.stages.filter((item) => item.status === 'blocked');
  const tailPending =
    firstIncomplete >= 0 &&
    run.stages.slice(firstIncomplete + 1).every((item) => item.status === 'pending');
  if (
    (run.state === 'RUNNING' &&
      (running.length !== 1 ||
        run.stages[firstIncomplete]?.status !== 'running' ||
        !tailPending)) ||
    (run.state !== 'RUNNING' && running.length !== 0)
  )
    fail('RUN-ACTIVE-STATE-MISMATCH');
  if (
    (run.state === 'BLOCKED' &&
      (blocked.length !== 1 ||
        run.stages[firstIncomplete]?.status !== 'blocked' ||
        !tailPending)) ||
    (run.state !== 'BLOCKED' && blocked.length !== 0)
  )
    fail('RUN-BLOCKED-STATE-MISMATCH');
  // prettier-ignore
  if (run.state === 'RENDERED_DRAFT' && run.stages.some((item) => item.status !== 'complete')) fail('RUN-TERMINAL-STATE-MISMATCH');
  return bundle;
};
