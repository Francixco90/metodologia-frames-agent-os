import {
  COPY_DENY, HASH, LAYERS, NETWORK, PRIVATE, arg, artifacts, command, dirname,
  existsSync, fail, isAbsolute, json, load, loadState, mkdirSync, project,
  projectPath, readFileSync, refWithHash, relative, resolve, run, runtimeDir,
  shaBytes, shaFile, statePath, statSync, verifyAssets, verifyBinding, verifyFont,
  verifyPieceRef, verifyScripts, verifySources, write,
} from './runtime-core.mjs';

function runIngest() {
  const state = loadState({allowV1: true});
  if (state.schemaVersion === 'general-video-v1' || state.contractRevision !== 2) {
    write(resolve(runtimeDir, 'migration-report.json'), {schemaVersion: 'general-video-migration-v1', from: state.schemaVersion, to: 'general-video-v2-revision-2', renderBlocked: true});
    console.log('PASS ingest: legacy read-compatible; migration required before render'); return;
  }
  const a = artifacts(state); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a);
  write(resolve(runtimeDir, 'ingest-receipt.json'), {schemaVersion: 'video-ingest-receipt-v2', specId: state.specId, ...hashes, sourceIds: [...ids].sort(), pass: true});
  console.log(`PASS ingest: ${ids.size} frozen source(s)`);
}

function runIndex() {
  const a = artifacts(loadState({allowV1: false})); verifyBinding(a); const sourceIds = verifySources(a);
  const candidates = load(projectPath(arg('candidates', 'semantic-candidates.json'), 'SEMANTIC_CANDIDATES'), 'SEMANTIC_CANDIDATES');
  const mode = candidates.embeddingMode || 'none';
  if (mode === 'local' && (!candidates.embeddingModel?.id || !HASH.test(candidates.embeddingModel?.sha256 || ''))) fail('EMBEDDING_MODEL_AUTHORITY');
  const segments = (candidates.segments || []).map((segment, index) => {
    if (!sourceIds.has(segment.sourceId) || segment.endMs <= segment.startMs) fail(`SEMANTIC_SPAN_${segment.id || index}`);
    return {id: segment.id || `segment-${index + 1}`, sourceId: segment.sourceId, startMs: segment.startMs, endMs: segment.endMs, text: segment.text || '', entities: segment.entities || [], topics: segment.topics || [], actions: segment.actions || [], relations: segment.relations || [], visualRefs: segment.visualRefs || []};
  });
  write(resolve(runtimeDir, 'semantic-index.json'), {schemaVersion: 'general-video-semantic-index-v1', sourcePackSha256: a.state.sourcePackSha256, embeddingMode: mode, ...(mode === 'local' ? {embeddingModel: candidates.embeddingModel} : {}), segments});
  console.log(`PASS index: ${segments.length} reproducible segment(s), embeddings=${mode}`);
}

function runScript() {
  const a = artifacts(loadState({allowV1: false})); verifyBinding(a); const ids = verifySources(a); verifyScripts(a, ids);
  write(resolve(runtimeDir, 'script-receipt.json'), {schemaVersion: 'piece-script-verification-v2', specId: a.state.specId, specSha256: a.state.specSha256, scriptSha256: shaFile(a.scriptPath), pieceScriptsSha256: shaFile(a.scriptsPath), pieceCount: a.scripts.pieces.length, pass: true});
  console.log(`PASS script: ${a.scripts.pieces.length} evidence-bound piece(s)`);
}

function layerKeys(piece, specSha256) {
  const grouped = Object.fromEntries(LAYERS.map((layer) => [layer, []]));
  for (const dep of piece.dependencies || []) {
    const layer = ['source', 'script'].includes(dep.kind) ? 'body' : dep.kind === 'caption' ? 'caption' : dep.kind === 'curtain' ? 'curtain' : dep.kind === 'audio' ? 'audio' : 'overlay';
    grouped[layer].push(`${dep.id}:${dep.sha256}`);
  }
  const editorial = shaBytes(json({scriptMode: piece.scriptMode, decision: piece.decision, purpose: piece.purpose, audience: piece.audience, hook: piece.hook, impact: piece.impact, offerBridge: piece.offerBridge, cta: piece.cta, sourceSpans: piece.sourceSpans, visualSpans: piece.visualSpans, claims: piece.claims}));
  return Object.fromEntries(LAYERS.map((layer) => [layer, shaBytes(json({specSha256, layer, editorial: layer === 'body' ? editorial : null, dependencies: grouped[layer].sort(), declared: piece.layers?.[layer] || null}))]));
}

function runPlan() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids);
  const planPath = projectPath(a.state.buildManifestRef, 'BUILD_MANIFEST_REF');
  const previous = existsSync(planPath) ? load(planPath, 'PREVIOUS_PLAN') : null;
  const prior = new Map((previous?.pieces || []).map((piece) => [piece.id, piece]));
  const pieces = a.scripts.pieces.map((piece) => {
    const keys = layerKeys(piece, a.state.specSha256); const pieceDefinitionSha256 = shaBytes(json(piece));
    const cacheKey = shaBytes(json({pieceDefinitionSha256, keys})); const old = prior.get(piece.id);
    const invalidatedBy = old ? [...LAYERS.filter((layer) => old.layerKeys?.[layer] !== keys[layer]), ...(old.pieceDefinitionSha256 !== pieceDefinitionSha256 ? ['piece-definition'] : [])] : ['new-piece'];
    const cacheStatus = old?.cacheKey === cacheKey && existsSync(projectPath(piece.output, `OUTPUT_${piece.id}`)) ? 'hit' : 'miss';
    return {id: piece.id, pieceDefinitionSha256, cacheKey, layerKeys: keys, cacheStatus, invalidatedBy: cacheStatus === 'hit' ? [] : [...new Set(invalidatedBy)], output: piece.output, ...(piece.render ? {render: piece.render} : {})};
  });
  const plan = {schemaVersion: 'video-plan-v2', specId: a.state.specId, specSha256: a.state.specSha256, generatedFrom: hashes, pieces};
  write(planPath, plan); write(statePath, {...a.state, buildManifestSha256: shaFile(planPath), workProductState: 'COMPILADO'});
  console.log(`PASS plan: ${pieces.filter((p) => p.cacheStatus === 'miss').length} miss, ${pieces.filter((p) => p.cacheStatus === 'hit').length} hit`);
}

function validateFfmpeg(piece) {
  const render = piece.render;
  if (!render || render.engine !== 'ffmpeg' || !Array.isArray(render.args)) fail(`RENDER_RECIPE_${piece.id}`);
  if (render.args.at(-1) !== piece.output) fail(`FFMPEG_OUTPUT_BINDING_${piece.id}`);
  for (const token of render.args) {
    if (typeof token !== 'string' || PRIVATE.some((pattern) => pattern.test(token)) || NETWORK.test(token) || isAbsolute(token) || token.includes('..')) fail(`UNSAFE_FFMPEG_ARG_${piece.id}`);
  }
  for (let i = 0; i < render.args.length; i += 1) if (render.args[i] === '-i') {
    const input = render.args[i + 1]; const inputPath = projectPath(input, `FFMPEG_INPUT_${piece.id}`);
    if (!existsSync(inputPath) || !statSync(inputPath).isFile()) fail(`FFMPEG_INPUT_MISSING_${piece.id}`);
  }
  if (render.mode === 'audio-remux') {
    const at = render.args.indexOf('-c:v'); if (at < 0 || render.args[at + 1] !== 'copy') fail(`REMUX_MUST_COPY_VIDEO_${piece.id}`);
  }
}

function fraction(value) { const [a, b = '1'] = String(value).split('/').map(Number); return b ? a / b : 0; }
function streamHash(ref, selector, copy = false) {
  const args = ['-v', 'error', '-protocol_whitelist', 'file', '-i', ref, '-map', `0:${selector}:0`, ...(copy ? ['-c', 'copy'] : []), '-f', 'hash', '-hash', 'sha256', '-'];
  const result = run('ffmpeg', args, project, `STREAM_HASH_${selector}`); const match = result.stdout.match(/SHA256=([a-f0-9]{64})/iu); if (!match) fail(`STREAM_HASH_PARSE_${selector}`); return match[1];
}
function measureOutput(ref) {
  const probe = run('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-count_frames', '-show_entries', 'format=duration:stream=index,codec_type,width,height,avg_frame_rate,nb_read_frames', '-of', 'json', ref], project, 'FFPROBE');
  const data = JSON.parse(probe.stdout); const video = data.streams.find((s) => s.codec_type === 'video'); const audio = data.streams.find((s) => s.codec_type === 'audio');
  if (!video) fail('OUTPUT_VIDEO_STREAM');
  let pcmSha256 = null; let integratedLufs = null; let truePeakDbtp = null;
  if (audio) {
    pcmSha256 = streamHash(ref, 'a');
    const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-protocol_whitelist', 'file', '-i', ref, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], project, 'LOUDNESS');
    const matches = loud.stderr.match(/\{\s*"input_i"[\s\S]*?\}/gu); const measured = matches ? JSON.parse(matches.at(-1)) : null;
    integratedLufs = measured ? Number(measured.input_i) : null; truePeakDbtp = measured ? Number(measured.input_tp) : null;
  }
  return {outputSha256: shaFile(projectPath(ref, 'MEASURE_OUTPUT')), durationMs: Math.round(Number(data.format.duration) * 1000), frameCount: Number(video.nb_read_frames), width: Number(video.width), height: Number(video.height), fps: fraction(video.avg_frame_rate), videoStreamSha256: streamHash(ref, 'v', true), pcmSha256, integratedLufs, truePeakDbtp};
}

function assertGeneratedFrom(plan, hashes) {
  for (const [key, value] of Object.entries(hashes)) if (plan.generatedFrom?.[key] !== value) fail(`STALE_RENDER_PLAN_${key}`);
}

function runRender() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids);
  const planPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const plan = load(planPath, 'RENDER_PLAN');
  if (plan.specId !== a.state.specId || plan.specSha256 !== a.state.specSha256) fail('STALE_RENDER_PLAN_SPEC'); assertGeneratedFrom(plan, hashes);
  const outputs = [];
  for (const planned of plan.pieces) {
    const piece = a.scripts.pieces.find((candidate) => candidate.id === planned.id);
    if (!piece || planned.pieceDefinitionSha256 !== shaBytes(json(piece))) fail(`STALE_RENDER_PLAN_PIECE_${planned.id}`);
    if (piece.decision === 'discard') continue;
    if (piece.gateStatus !== 'deterministic-passed') fail(`PIECE_GATE_${piece.id}`);
    let remuxSourceVideoSha256 = null;
    if (planned.cacheStatus === 'miss') {
      validateFfmpeg(piece);
      if (piece.render.mode === 'audio-remux') remuxSourceVideoSha256 = streamHash(piece.render.args[piece.render.args.indexOf('-i') + 1], 'v', true);
      mkdirSync(dirname(projectPath(piece.output, `OUTPUT_${piece.id}`)), {recursive: true});
      run('ffmpeg', ['-protocol_whitelist', 'file', ...piece.render.args], project, `FFMPEG_${piece.id}`);
    }
    const output = projectPath(piece.output, `OUTPUT_${piece.id}`); if (!existsSync(output) || statSync(output).size === 0) fail(`MISSING_RENDER_${piece.id}`);
    const measurements = measureOutput(piece.output);
    if (remuxSourceVideoSha256 && measurements.videoStreamSha256 !== remuxSourceVideoSha256) fail(`REMUX_VIDEO_CHANGED_${piece.id}`);
    outputs.push({id: piece.id, path: piece.output, bytes: statSync(output).size, cacheKey: planned.cacheKey, measurements, ...(remuxSourceVideoSha256 ? {remuxSourceVideoSha256} : {})});
  }
  const receiptPath = resolve(runtimeDir, 'render-receipt.json');
  write(receiptPath, {schemaVersion: 'video-render-receipt-v3', specId: a.state.specId, specSha256: a.state.specSha256, buildManifestSha256: shaFile(planPath), generatedFrom: hashes, outputs, state: 'RENDERED_DRAFT', publicationAuthority: false});
  console.log(`PASS render: ${outputs.length} measured draft(s), publicationAuthority=false`);
}

function miniclipEvidence(piece, measured, errors) {
  const m = piece.miniclip; if (!m) return null;
  const fontEvidence = {
    title: verifyFont(m.fonts?.title, 'Montserrat', piece.id, 'title'), caption: verifyFont(m.fonts?.caption, 'Poppins', piece.id, 'caption'), disclosure: verifyFont(m.fonts?.disclosure, 'Montserrat', piece.id, 'disclosure'),
  };
  const copyPath = verifyPieceRef(m, 'copyRef', 'copySha256', `COPY_${piece.id}`); const copy = load(copyPath, `COPY_${piece.id}`);
  const timingPath = verifyPieceRef(m, 'timingRef', 'timingSha256', `TIMING_${piece.id}`); const curtainPath = verifyPieceRef(m, 'curtainRef', 'curtainSha256', `CURTAIN_${piece.id}`);
  const visibleCopy = copy.visibleCopy || [];
  if (copy.cta !== piece.cta || visibleCopy.some((text) => COPY_DENY.some((rule) => rule.test(text)))) errors.push(`${piece.id}:forbidden-or-unbound-copy`);
  if (m.textLayerCount > 2 || m.safeZonesPass !== true) errors.push(`${piece.id}:legibility`);
  if (measured.width !== piece.format.width || measured.height !== piece.format.height || Math.abs(measured.fps - piece.format.fps) > 0.01 || Math.abs(measured.durationMs - piece.format.durationMs) > 80 || Math.abs(measured.frameCount - piece.format.frameCount) > 1) errors.push(`${piece.id}:output-format`);
  if (measured.integratedLufs == null || measured.integratedLufs < -16.3 || measured.integratedLufs > -15.7 || measured.truePeakDbtp > -1.5) errors.push(`${piece.id}:audio-target`);
  return {copySha256: shaFile(copyPath), ctaSha256: shaBytes(copy.cta), timingSha256: shaFile(timingPath), curtainsSha256: shaFile(curtainPath), fontsSha256: shaBytes(json(fontEvidence)), ...measured};
}

function verifyAb(a, evidence, errors) {
  if (!a.ab) return 0;
  const pieceIds = new Set(a.scripts.pieces.map((piece) => piece.id));
  for (const group of a.ab.groups || []) {
    if (group.variantAxis !== 'visual' || group.variants?.length !== 2 || new Set(group.pieceIds || []).size !== 2) { errors.push(`${group.id}:shape`); continue; }
    const variants = group.variants.map((variant) => variant.pieceId);
    if (new Set(variants).size !== 2 || variants.some((id) => !pieceIds.has(id) || !group.pieceIds.includes(id) || !evidence.has(id))) { errors.push(`${group.id}:piece-binding`); continue; }
    const [left, right] = variants.map((id) => evidence.get(id));
    for (const key of ['durationMs', 'frameCount', 'width', 'height', 'fps', 'copySha256', 'ctaSha256', 'timingSha256', 'curtainsSha256', 'fontsSha256', 'pcmSha256']) if (left[key] !== right[key]) errors.push(`${group.id}:ab-${key}`);
    if (left.outputSha256 === right.outputSha256 || left.videoStreamSha256 === right.videoStreamSha256) errors.push(`${group.id}:visual-not-distinct`);
  }
  return a.ab.groups?.length || 0;
}

function runVerify() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids);
  const planPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const plan = load(planPath, 'BUILD_MANIFEST'); assertGeneratedFrom(plan, hashes);
  const receiptPath = resolve(runtimeDir, 'render-receipt.json'); const receipt = load(receiptPath, 'RENDER_RECEIPT');
  if (receipt.specId !== a.state.specId || receipt.specSha256 !== a.state.specSha256 || receipt.buildManifestSha256 !== shaFile(planPath) || receipt.publicationAuthority !== false) fail('RENDER_RECEIPT_BINDING');
  assertGeneratedFrom(receipt, hashes);
  const errors = []; const evidence = new Map();
  for (const output of receipt.outputs || []) {
    const piece = a.scripts.pieces.find((candidate) => candidate.id === output.id); if (!piece || output.path !== piece.output) { errors.push(`${output.id}:output-ref`); continue; }
    const measured = measureOutput(output.path); if (json(measured) !== json(output.measurements)) errors.push(`${output.id}:measurement-drift`);
    const mini = miniclipEvidence(piece, measured, errors); evidence.set(piece.id, mini || measured);
  }
  const expected = a.scripts.pieces.filter((piece) => piece.decision !== 'discard').map((piece) => piece.id).sort(); const found = [...evidence.keys()].sort();
  if (json(expected) !== json(found)) errors.push('render-piece-coverage');
  const abCount = verifyAb(a, evidence, errors);
  const verdict = {schemaVersion: 'general-video-verification-v2', specId: a.state.specId, specSha256: a.state.specSha256, generatedFrom: hashes, buildManifestSha256: shaFile(planPath), checks: {sources: true, assets: true, scripts: true, measuredOutputs: found.length, abGroups: abCount}, errors, pass: errors.length === 0, maximumState: 'RENDERED_DRAFT'};
  const reviewPath = projectPath(a.state.reviewReceiptRef, 'REVIEW_RECEIPT_REF'); write(reviewPath, verdict); write(statePath, {...a.state, reviewReceiptSha256: shaFile(reviewPath), workProductState: errors.length ? 'BLOCKED' : 'EVALUADO'});
  if (errors.length) fail(`VERIFY ${errors.join(',')}`); console.log(`PASS verify: ${found.length} measured piece(s), ${abCount} A/B group(s)`);
}

function runPackage() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a);
  const buildPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const reviewPath = refWithHash(a.state.reviewReceiptRef, a.state.reviewReceiptSha256, 'REVIEW_RECEIPT');
  const verdict = load(reviewPath, 'REVIEW_RECEIPT'); if (!verdict.pass || verdict.maximumState !== 'RENDERED_DRAFT') fail('PACKAGE_UNVERIFIED'); assertGeneratedFrom(verdict, hashes);
  const refs = [statePath, a.sourcePath, a.specPath, a.scriptPath, a.scriptsPath, a.assetsPath, ...(a.abPath ? [a.abPath] : []), buildPath, reviewPath, resolve(runtimeDir, 'render-receipt.json')];
  for (const path of refs) { const text = readFileSync(path, 'utf8'); if (PRIVATE.some((pattern) => pattern.test(text)) || NETWORK.test(text)) fail(`PACKAGE_PRIVATE_OR_NETWORK_REF_${relative(project, path)}`); }
  const files = [...new Set(refs)].map((path) => ({path: relative(project, path), sha256: shaFile(path), bytes: statSync(path).size}));
  write(resolve(runtimeDir, 'package-manifest.json'), {schemaVersion: 'general-video-package-v2', specId: a.state.specId, specSha256: a.state.specSha256, files, state: 'local-evaluation', publicationAuthority: false});
  console.log(`PASS package: ${files.length} hash-bound artifact(s), local-evaluation`);
}

({ingest: runIngest, index: runIndex, script: runScript, plan: runPlan, render: runRender, verify: runVerify, package: runPackage})[command]();
