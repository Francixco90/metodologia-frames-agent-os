import {
  assertMethodExplainerPlanningBindings,
  canonicalSha256,
  methodExplainerFail as fail,
} from './method-explainer-planning-v1.schema.ts';
import {
  MethodExplainerContractBundleV1Schema,
  UnattendedStageSchema,
} from './method-explainer-execution-v1.schema.ts';

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
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) fail('EDGE-ENDPOINT');
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
  if (run.state === 'RENDERED_DRAFT' && run.stages.some((item) => item.status !== 'complete'))
    fail('RUN-TERMINAL-STATE-MISMATCH');
  return bundle;
};
