import {
  COPY_DENY, HASH, LAYERS, NETWORK, PRIVATE, arg, artifacts, command, dirname,
  existsSync, fail, isAbsolute, json, load, loadState, mkdirSync, project,
  projectPath, readFileSync, refWithHash, relative, resolve, run, runtimeDir,
  shaBytes, shaFile, statePath, statSync, verifyAssets, verifyBinding, verifyFont,
  verifyPieceRef, verifyScripts, verifySources, write,
} from './runtime-core.mjs';
import {measureOutput, streamHash, validateFfmpeg} from './runtime-media.mjs';
import {assertRenderable, runPlan} from './runtime-planning.mjs';
import {validateSchema} from './schema-validation.mjs';
import {inspectVisual} from './runtime-visual.mjs';
import {renderLayered} from './runtime-layers.mjs';
import {cleanupFilter, verifyCleanBody} from './runtime-cleanup.mjs';
import {verifyPrecomposed} from './runtime-precomposed.mjs';
import {renderWrapper, verifyWrapperContract, wrapperEvidence} from './runtime-wrapper.mjs';
import {verifyAnalysisContracts} from './runtime-analysis.mjs';

function runIngest() {
  const state = loadState({allowV1: true});
  if (state.schemaVersion === 'general-video-v1' || state.contractRevision !== 2) {
    write(resolve(runtimeDir, 'migration-report.json'), {schemaVersion: 'general-video-migration-v1', from: state.schemaVersion, to: 'general-video-v2-revision-2', renderBlocked: true});
    console.log('PASS ingest: legacy read-compatible; migration required before render'); return;
  }
  const a = artifacts(state); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids); verifyAnalysisContracts(a);
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
  const a = artifacts(loadState({allowV1: false})); verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids); const analysis = verifyAnalysisContracts(a);
  write(resolve(runtimeDir, 'script-receipt.json'), {schemaVersion: 'piece-script-verification-v2', specId: a.state.specId, specSha256: a.state.specSha256, scriptSha256: shaFile(a.scriptPath), pieceScriptsSha256: shaFile(a.scriptsPath), ...(analysis || {}), pieceCount: a.scripts.pieces.length, pass: true});
  console.log(`PASS script: ${a.scripts.pieces.length} evidence-bound piece(s)`);
}

function assertGeneratedFrom(plan, hashes) {
  for (const [key, value] of Object.entries(hashes)) if (plan.generatedFrom?.[key] !== value) fail(`STALE_RENDER_PLAN_${key}`);
}

function runRender() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids); verifyAnalysisContracts(a); assertRenderable(a);
  const planPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const plan = load(planPath, 'RENDER_PLAN');
  validateSchema('video-plan-v2.schema.json', plan, 'PLAN', fail);
  if (plan.specId !== a.state.specId || plan.specSha256 !== a.state.specSha256) fail('STALE_RENDER_PLAN_SPEC'); assertGeneratedFrom(plan, hashes);
  const outputs = [];
  for (const planned of plan.pieces) {
    const piece = a.scripts.pieces.find((candidate) => candidate.id === planned.id);
    if (!piece || planned.pieceDefinitionSha256 !== shaBytes(json(piece))) fail(`STALE_RENDER_PLAN_PIECE_${planned.id}`);
    if (piece.gateStatus !== 'deterministic-passed') fail(`PIECE_GATE_${piece.id}`);
    let remuxSourceVideoSha256 = null;
    let layerArtifacts = null;
    const adapterEvidence = verifyPrecomposed(a, piece);
    const wrapperContract = verifyWrapperContract(a, piece);
    if (adapterEvidence && wrapperContract) fail(`MULTIPLE_RENDER_ADAPTERS_${piece.id}`);
    const cachedPath = projectPath(piece.output, `OUTPUT_${piece.id}`);
    const cacheValid = planned.cacheStatus === 'hit' && planned.outputSha256 && existsSync(cachedPath) && shaFile(cachedPath) === planned.outputSha256;
    if (!cacheValid) {
      if (!adapterEvidence && !wrapperContract) validateFfmpeg(piece);
      if (wrapperContract) {
        renderWrapper(a, piece);
      } else if (adapterEvidence) {
        run('ffmpeg', ['-protocol_whitelist', 'file', ...piece.render.args], project, `FFMPEG_ADAPTER_${piece.id}`);
      } else if (piece.miniclip && piece.render.mode === 'encode') layerArtifacts = renderLayered(piece, planned);
      else {
        if (piece.render.mode === 'audio-remux') remuxSourceVideoSha256 = streamHash(piece.render.args[piece.render.args.indexOf('-i') + 1], 'v', true);
        mkdirSync(dirname(projectPath(piece.output, `OUTPUT_${piece.id}`)), {recursive: true});
        run('ffmpeg', ['-protocol_whitelist', 'file', ...piece.render.args], project, `FFMPEG_${piece.id}`);
      }
    }
    const output = projectPath(piece.output, `OUTPUT_${piece.id}`); if (!existsSync(output) || statSync(output).size === 0) fail(`MISSING_RENDER_${piece.id}`);
    const measurements = measureOutput(piece.output);
    const renderedWrapperEvidence = wrapperContract ? wrapperEvidence(a, piece, piece.output) : null;
    if (remuxSourceVideoSha256 && measurements.videoStreamSha256 !== remuxSourceVideoSha256) fail(`REMUX_VIDEO_CHANGED_${piece.id}`);
    outputs.push({id: piece.id, path: piece.output, bytes: statSync(output).size, cacheKey: planned.cacheKey, measurements, ...(remuxSourceVideoSha256 ? {remuxSourceVideoSha256} : {}), ...(layerArtifacts ? {layerArtifacts} : {}), ...(adapterEvidence ? {adapterEvidence} : {}), ...(renderedWrapperEvidence ? {wrapperEvidence: renderedWrapperEvidence} : {})});
  }
  const outputMap = new Map(outputs.map((output) => [output.id, output.measurements.outputSha256]));
  const boundPlan = {...plan, pieces: plan.pieces.map((piece) => ({...piece, cacheStatus: 'hit', invalidatedBy: [], outputSha256: outputMap.get(piece.id)}))};
  validateSchema('video-plan-v2.schema.json', boundPlan, 'BOUND_PLAN', fail);
  write(planPath, boundPlan); const buildManifestSha256 = shaFile(planPath);
  write(statePath, {...a.state, buildManifestSha256, workProductState: 'COMPILADO'});
  const receiptPath = resolve(runtimeDir, 'render-receipt.json');
  const receipt = {schemaVersion: 'video-render-receipt-v3', specId: a.state.specId, specSha256: a.state.specSha256, buildManifestSha256, generatedFrom: hashes, outputs, state: 'RENDERED_DRAFT', publicationAuthority: false};
  validateSchema('video-render-receipt-v3.schema.json', receipt, 'RENDER_RECEIPT', fail); write(receiptPath, receipt);
  console.log(`PASS render: ${outputs.length} measured draft(s), publicationAuthority=false`);
}

function miniclipEvidence(piece, measured, errors) {
  const m = piece.miniclip; if (!m) return null;
  const fontEvidence = {
    title: verifyFont(m.fonts?.title, 'Montserrat', piece.id, 'title'), caption: verifyFont(m.fonts?.caption, 'Poppins', piece.id, 'caption'), disclosure: verifyFont(m.fonts?.disclosure, 'Montserrat', piece.id, 'disclosure'),
  };
  const copyPath = verifyPieceRef(m, 'copyRef', 'copySha256', `COPY_${piece.id}`); const copy = load(copyPath, `COPY_${piece.id}`);
  const timingPath = verifyPieceRef(m, 'timingRef', 'timingSha256', `TIMING_${piece.id}`); const curtainPath = projectPath(m.curtainRef, `CURTAIN_${piece.id}`);
  const curtainHash = piece.dependencies.find((dep) => dep.kind === 'curtain')?.sha256; if (!curtainHash || shaFile(curtainPath) !== curtainHash) errors.push(`${piece.id}:curtain-hash`);
  const visibleCopy = copy.visibleCopy || [];
  if (copy.cta !== piece.cta || visibleCopy.some((text) => COPY_DENY.some((rule) => rule.test(text)))) errors.push(`${piece.id}:forbidden-or-unbound-copy`);
  if (m.textLayerCount > 2 || m.safeZonesPass !== true) errors.push(`${piece.id}:legibility`);
  if (measured.width !== piece.format.width || measured.height !== piece.format.height || Math.abs(measured.fps - piece.format.fps) > 0.01 || Math.abs(measured.durationMs - piece.format.durationMs) > 80 || Math.abs(measured.frameCount - piece.format.frameCount) > 1) errors.push(`${piece.id}:output-format`);
  if (measured.integratedLufs == null || measured.integratedLufs < -16.3 || measured.integratedLufs > -15.7 || measured.truePeakDbtp > -1.5) errors.push(`${piece.id}:audio-target`);
  return {copySha256: shaFile(copyPath), ctaSha256: shaBytes(copy.cta), timingSha256: shaFile(timingPath), curtainsSha256: shaFile(curtainPath), cleanupRef: piece.sourceCleanup?.ref ?? null, cleanupSha256: piece.sourceCleanup?.sha256 ?? null, cleanupConfigSha256: piece.sourceCleanup?.configSha256 ?? null, audioPolicySha256: shaBytes(json(piece.audioPolicy)), fontsSha256: shaBytes(json(fontEvidence)), ...measured};
}

function verifyAb(a, evidence, errors) {
  if (!a.ab) return 0;
  const pieceIds = new Set(a.scripts.pieces.map((piece) => piece.id));
  for (const group of a.ab.groups || []) {
    if (group.variantAxis !== 'visual' || group.variants?.length !== 2 || new Set(group.pieceIds || []).size !== 2) { errors.push(`${group.id}:shape`); continue; }
    const variants = group.variants.map((variant) => variant.pieceId);
    if (new Set(variants).size !== 2 || variants.some((id) => !pieceIds.has(id) || !group.pieceIds.includes(id) || !evidence.has(id))) { errors.push(`${group.id}:piece-binding`); continue; }
    const [left, right] = variants.map((id) => evidence.get(id));
    const wrapperPair = left.wrapperIntroSha256 && right.wrapperIntroSha256;
    const keys = ['durationMs', 'frameCount', 'width', 'height', 'fps', 'copySha256', 'ctaSha256', 'timingSha256', 'curtainsSha256', 'cleanupRef', 'cleanupSha256', 'cleanupConfigSha256', 'audioPolicySha256', 'fontsSha256', ...(wrapperPair ? ['wrapperIntroSha256', 'wrapperOutroSha256'] : ['pcmSha256'])];
    for (const key of keys) if (left[key] !== right[key]) errors.push(`${group.id}:ab-${key}`);
    if (left.outputSha256 === right.outputSha256 || left.videoStreamSha256 === right.videoStreamSha256) errors.push(`${group.id}:visual-not-distinct`);
  }
  return a.ab.groups?.length || 0;
}

function runVerify() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids); verifyAnalysisContracts(a);
  const planPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const plan = load(planPath, 'BUILD_MANIFEST'); assertGeneratedFrom(plan, hashes);
  const receiptPath = resolve(runtimeDir, 'render-receipt.json'); const receipt = load(receiptPath, 'RENDER_RECEIPT');
  validateSchema('video-render-receipt-v3.schema.json', receipt, 'RENDER_RECEIPT', fail);
  if (receipt.specId !== a.state.specId || receipt.specSha256 !== a.state.specSha256 || receipt.buildManifestSha256 !== shaFile(planPath) || receipt.publicationAuthority !== false) fail('RENDER_RECEIPT_BINDING');
  assertGeneratedFrom(receipt, hashes);
  const errors = []; const evidence = new Map();
  for (const output of receipt.outputs || []) {
    const piece = a.scripts.pieces.find((candidate) => candidate.id === output.id); if (!piece || output.path !== piece.output) { errors.push(`${output.id}:output-ref`); continue; }
    const measured = measureOutput(output.path); if (json(measured) !== json(output.measurements)) errors.push(`${output.id}:measurement-drift`);
    const adapterEvidence = verifyPrecomposed(a, piece);
    const currentWrapperEvidence = piece.brandedWrapper ? wrapperEvidence(a, piece, piece.output) : null;
    if (currentWrapperEvidence) {
      if (json(currentWrapperEvidence) !== json(output.wrapperEvidence)) errors.push(`${piece.id}:wrapper-evidence-drift`);
    } else if (adapterEvidence) {
      if (json(adapterEvidence) !== json(output.adapterEvidence)) errors.push(`${piece.id}:precomposed-adapter-evidence-drift`);
    } else {
      const body = output.layerArtifacts?.bodyArtifact; if (!body?.ref || shaFile(projectPath(body.ref, `CLEAN_BODY_${piece.id}`)) !== body.sha256) errors.push(`${piece.id}:clean-body-binding`);
      else if (json(verifyCleanBody(piece, body.ref, cleanupFilter(piece))) !== json(body.cleanupVerification)) errors.push(`${piece.id}:clean-body-verification-drift`);
    }
    const mini = miniclipEvidence(piece, measured, errors);
    const visual = mini ? inspectVisual(a, piece) : null;
    if (visual && !visual.pass) errors.push(`${piece.id}:visual-privacy:${visual.violations.join('|')}`);
    const wrapperInvariant = currentWrapperEvidence ? {wrapperIntroSha256: currentWrapperEvidence.introSha256, wrapperOutroSha256: currentWrapperEvidence.outroSha256, bodyAudioPacketSha256: currentWrapperEvidence.bodyAudioPacketSha256} : {};
    evidence.set(piece.id, mini ? {...mini, ...wrapperInvariant, visual} : {...measured, ...wrapperInvariant});
  }
  const expected = a.scripts.pieces.filter((piece) => piece.decision !== 'discard').map((piece) => piece.id).sort(); const found = [...evidence.keys()].sort();
  if (json(expected) !== json(found)) errors.push('render-piece-coverage');
  const abCount = verifyAb(a, evidence, errors);
  const verdict = {schemaVersion: 'general-video-verification-v2', specId: a.state.specId, specSha256: a.state.specSha256, generatedFrom: hashes, buildManifestSha256: shaFile(planPath), checks: {sources: true, assets: true, scripts: true, measuredOutputs: found.length, visualInspections: [...evidence.values()].filter((item) => item.visual).length, abGroups: abCount}, errors, pass: errors.length === 0, maximumState: 'RENDERED_DRAFT'};
  const reviewPath = projectPath(a.state.reviewReceiptRef, 'REVIEW_RECEIPT_REF'); write(reviewPath, verdict); write(statePath, {...a.state, reviewReceiptSha256: shaFile(reviewPath), workProductState: errors.length ? 'BLOCKED' : 'EVALUADO'});
  if (errors.length) fail(`VERIFY ${errors.join(',')}`); console.log(`PASS verify: ${found.length} measured piece(s), ${abCount} A/B group(s)`);
}

function runPackage() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a);
  const buildPath = refWithHash(a.state.buildManifestRef, a.state.buildManifestSha256, 'BUILD_MANIFEST'); const reviewPath = refWithHash(a.state.reviewReceiptRef, a.state.reviewReceiptSha256, 'REVIEW_RECEIPT');
  const verdict = load(reviewPath, 'REVIEW_RECEIPT'); if (!verdict.pass || verdict.maximumState !== 'RENDERED_DRAFT') fail('PACKAGE_UNVERIFIED'); assertGeneratedFrom(verdict, hashes);
  const refs = [statePath, a.sourcePath, a.specPath, a.scriptPath, a.scriptsPath, a.assetsPath, ...(a.abPath ? [a.abPath] : []), ...(a.state.sourceAnalysisRef ? [projectPath(a.state.sourceAnalysisRef, 'SOURCE_ANALYSIS_PACKAGE')] : []), ...(a.state.compositionFitRef ? [projectPath(a.state.compositionFitRef, 'COMPOSITION_FIT_PACKAGE')] : []), ...(a.state.storyboardRef ? [projectPath(a.state.storyboardRef, 'STORYBOARD_PACKAGE')] : []), buildPath, reviewPath, resolve(runtimeDir, 'render-receipt.json')];
  for (const path of refs) { const text = readFileSync(path, 'utf8'); if (PRIVATE.some((pattern) => pattern.test(text)) || NETWORK.test(text)) fail(`PACKAGE_PRIVATE_OR_NETWORK_REF_${relative(project, path)}`); }
  const files = [...new Set(refs)].map((path) => ({path: relative(project, path), sha256: shaFile(path), bytes: statSync(path).size}));
  write(resolve(runtimeDir, 'package-manifest.json'), {schemaVersion: 'general-video-package-v2', specId: a.state.specId, specSha256: a.state.specSha256, files, state: 'local-evaluation', publicationAuthority: false});
  console.log(`PASS package: ${files.length} hash-bound artifact(s), local-evaluation`);
}

({ingest: runIngest, index: runIndex, script: runScript, plan: runPlan, render: runRender, verify: runVerify, package: runPackage})[command]();
