import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runPrecomposedAdversarial} from './check-precomposed.mjs';
import {runWrapperAdversarial} from './check-wrapper.mjs';
import {runSystemicAdversarial} from './check-systemic.mjs';
import {runConsumerGateAdversarial} from './check-consumer-gates.mjs';

export function runAdversarial({SKILL_DIR, errors, mediaChecks = true}) {
const PREFIX = 'COSR-GV_';
const cli = resolve(SKILL_DIR, 'scripts/video-cli.mjs');
const fixture = resolve(SKILL_DIR, 'fixtures/v2-positive');
const temp = mkdtempSync(resolve(tmpdir(), 'general-video-v2-'));
const cleanup = [temp];
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const updateJson = (path, transform) => {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(path, `${JSON.stringify(transform(value), null, 2)}\n`);
};
const bindMask = (caseDir) => {
  const hash = sha(resolve(caseDir, 'source-cleanup-mask.json'));
  updateJson(resolve(caseDir, 'asset-manifest.json'), (value) => { const asset = value.assets.find((item) => item.id === 'source-cleanup'); asset.sha256 = hash; asset.generator.configSha256 = hash; return value; });
  updateJson(resolve(caseDir, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) { piece.sourceCleanup.sha256 = hash; piece.sourceCleanup.configSha256 = hash; piece.dependencies.find((dep) => dep.kind === 'cleanup-mask').sha256 = hash; } return value; });
  updateJson(resolve(caseDir, 'workflow-state.json'), (value) => { const scriptHash = sha(resolve(caseDir, 'piece-scripts.json')); value.scriptSha256 = scriptHash; value.pieceScriptsSha256 = scriptHash; value.assetManifestSha256 = sha(resolve(caseDir, 'asset-manifest.json')); return value; });
};
try {
  cpSync(fixture, temp, {recursive: true});
  const repoRoot = process.cwd();
  if (mediaChecks) {
    const generated = spawnSync(process.execPath, [resolve(SKILL_DIR, 'scripts/generate-synthetic-media.mjs'), '--out', temp], {encoding: 'utf8'});
    if (generated.status !== 0) {
      const cause = generated.error ? `${generated.error.code ?? generated.error.message}` : (generated.stderr || generated.stdout || '').trim();
      errors.push(`${PREFIX}SYNTHETIC_MEDIA ${cause}`.trim());
      return;
    }
  } else {
    writeFileSync(resolve(temp, 'frame.ppm'), 'P3\n1 1\n255\n0 0 0\n');
    writeFileSync(resolve(temp, 'tone.wav'), 'RIFF0000WAVEfmt ');
    const frameHash = sha(resolve(temp, 'frame.ppm'));
    const toneHash = sha(resolve(temp, 'tone.wav'));
    updateJson(resolve(temp, 'asset-manifest.json'), (value) => {
      for (const asset of value.assets) {
        if (asset.id === 'frame') asset.sha256 = asset.generator.configSha256 = frameHash;
        if (asset.id === 'tone') asset.sha256 = asset.generator.configSha256 = toneHash;
      }
      return value;
    });
    updateJson(resolve(temp, 'piece-scripts.json'), (value) => {
      for (const piece of value.pieces) {
        piece.dependencies.find((dependency) => dependency.id === 'tone').sha256 = toneHash;
        piece.layers.audio = toneHash;
      }
      return value;
    });
    updateJson(resolve(temp, 'workflow-state.json'), (value) => {
      value.assetManifestSha256 = sha(resolve(temp, 'asset-manifest.json'));
      const scriptHash = sha(resolve(temp, 'piece-scripts.json'));
      value.scriptSha256 = scriptHash;
      value.pieceScriptsSha256 = scriptHash;
      return value;
    });
  }
  copyFileSync(resolve(repoRoot, '03_artefactos/brand/fonts/vendor/poppins/Poppins-Regular.ttf'), resolve(temp, 'Poppins-Regular.ttf'));
  copyFileSync(resolve(repoRoot, '03_artefactos/brand/fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf'), resolve(temp, 'Montserrat-VariableFont_wght.ttf'));
  const baselineCommands = mediaChecks
    ? ['ingest', 'index', 'script', 'plan', 'render', 'verify', 'package']
    : ['ingest', 'index', 'script', 'plan'];
  for (const command of baselineCommands) {
    const result = spawnSync(process.execPath, [cli, command, '--project', temp], {encoding: 'utf8'});
    if (result.status !== 0) {
      const cause = result.error ? `${result.error.code ?? result.error.message}` : (result.stderr || result.stdout || '').trim();
      errors.push(`${PREFIX}CLI_${command.toUpperCase()} ${cause}`.trim());
      return;
    }
  }
  if (mediaChecks) {
    const receiptPath = resolve(temp, '.frames-video/render-receipt.json');
    if (!existsSync(receiptPath)) {
      errors.push(`${PREFIX}MISSING_RENDER_RECEIPT_AFTER_RENDER`);
      return;
    }
    const receipt = JSON.parse(readFileSync(receiptPath));
    if (receipt.outputs.length !== 2 || receipt.outputs.some((output) => !output.measurements?.outputSha256 || !output.measurements?.pcmSha256)) errors.push(`${PREFIX}REAL_RENDER_MEASUREMENTS`);
  }
  if (mediaChecks) {
    const receipt = JSON.parse(readFileSync(resolve(temp, '.frames-video/render-receipt.json')));
    if (receipt.outputs.some((output) => output.layerArtifacts?.bodyArtifact?.cleanupVerification?.pass !== true || output.layerArtifacts.bodyArtifact.cleanupVerification.cleanedBodySha256 !== output.layerArtifacts.bodyArtifact.sha256 || output.layerArtifacts.bodyArtifact.cleanupVerification.filterOrder !== 'cleanup-before-treatment')) errors.push(`${PREFIX}CLEAN_BODY_RECEIPT`);
  }

  const hookCase = mkdtempSync(resolve(tmpdir(), 'gv-hook-')); cleanup.push(hookCase); cpSync(temp, hookCase, {recursive: true});
  updateJson(resolve(hookCase, 'piece-scripts.json'), (value) => { value.pieces[0].hook = 'Hook changed after planning'; return value; });
  updateJson(resolve(hookCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(hookCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  const stale = spawnSync(process.execPath, [cli, 'render', '--project', hookCase], {encoding: 'utf8'});
  if (stale.status === 0 || !/STALE_RENDER_PLAN_(?:script|pieceScripts)Sha256/u.test(stale.stderr)) errors.push(`${PREFIX}STALE_HOOK_PLAN ${(stale.stderr || '').trim()}`);

  const networkCase = mkdtempSync(resolve(tmpdir(), 'gv-network-')); cleanup.push(networkCase); cpSync(temp, networkCase, {recursive: true});
  updateJson(resolve(networkCase, 'piece-scripts.json'), (value) => { value.pieces[0].render.args[4] = 'tcp://example.invalid/media'; return value; });
  updateJson(resolve(networkCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(networkCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  spawnSync(process.execPath, [cli, 'plan', '--project', networkCase], {encoding: 'utf8'});
  const network = spawnSync(process.execPath, [cli, 'render', '--project', networkCase], {encoding: 'utf8'});
  if (network.status === 0 || !network.stderr.includes('UNSAFE_FFMPEG_ARG')) errors.push(`${PREFIX}NETWORK_PROTOCOL`);

  if (mediaChecks) {
    const abCase = mkdtempSync(resolve(tmpdir(), 'gv-ab-')); cleanup.push(abCase); cpSync(temp, abCase, {recursive: true});
    updateJson(resolve(abCase, 'ab-groups.json'), (value) => { value.groups[0].pieceIds = ['mini-a', 'missing']; value.groups[0].variants = [{pieceId: 'mini-a'}, {pieceId: 'mini-a'}]; return value; });
    updateJson(resolve(abCase, 'workflow-state.json'), (value) => { value.abTestSha256 = sha(resolve(abCase, 'ab-groups.json')); return value; });
    spawnSync(process.execPath, [cli, 'plan', '--project', abCase], {encoding: 'utf8'});
    spawnSync(process.execPath, [cli, 'render', '--project', abCase], {encoding: 'utf8'});
    const abNegative = spawnSync(process.execPath, [cli, 'verify', '--project', abCase], {encoding: 'utf8'});
    if (abNegative.status === 0 || !/shape|piece-binding/u.test(abNegative.stderr)) errors.push(`${PREFIX}AB_DISTINCT_EXISTING ${(abNegative.stderr || '').trim()}`);

    const measureCase = mkdtempSync(resolve(tmpdir(), 'gv-measure-')); cleanup.push(measureCase); cpSync(temp, measureCase, {recursive: true});
    updateJson(resolve(measureCase, '.frames-video/render-receipt.json'), (value) => { value.outputs[0].measurements.durationMs += 500; return value; });
    const measured = spawnSync(process.execPath, [cli, 'verify', '--project', measureCase], {encoding: 'utf8'});
    if (measured.status === 0 || !measured.stderr.includes('measurement-drift')) errors.push(`${PREFIX}MEASUREMENT_RECOMPUTE`);
  }

  const captionCase = mkdtempSync(resolve(tmpdir(), 'gv-caption-')); cleanup.push(captionCase); cpSync(temp, captionCase, {recursive: true});
  updateJson(resolve(captionCase, 'captions.json'), (value) => ({...value, tampered: true}));
  const caption = spawnSync(process.execPath, [cli, 'script', '--project', captionCase], {encoding: 'utf8'});
  if (caption.status === 0 || !caption.stderr.includes('HASH_DRIFT_CAPTION')) errors.push(`${PREFIX}CAPTION_HASH`);

  const missingMaskCase = mkdtempSync(resolve(tmpdir(), 'gv-mask-missing-')); cleanup.push(missingMaskCase); cpSync(temp, missingMaskCase, {recursive: true}); rmSync(resolve(missingMaskCase, 'source-cleanup-mask.json'));
  const missingMask = spawnSync(process.execPath, [cli, 'script', '--project', missingMaskCase], {encoding: 'utf8'});
  if (missingMask.status === 0 || !missingMask.stderr.includes('ASSET_DRIFT source-cleanup')) errors.push(`${PREFIX}CLEANUP_MASK_MISSING`);

  const mutatedMaskCase = mkdtempSync(resolve(tmpdir(), 'gv-mask-mutated-')); cleanup.push(mutatedMaskCase); cpSync(temp, mutatedMaskCase, {recursive: true}); updateJson(resolve(mutatedMaskCase, 'source-cleanup-mask.json'), (value) => ({...value, maxChannelSpan: 16}));
  const mutatedMask = spawnSync(process.execPath, [cli, 'script', '--project', mutatedMaskCase], {encoding: 'utf8'});
  if (mutatedMask.status === 0 || !mutatedMask.stderr.includes('ASSET_DRIFT source-cleanup')) errors.push(`${PREFIX}CLEANUP_MASK_MUTATED`);

  const omittedMaskCase = mkdtempSync(resolve(tmpdir(), 'gv-mask-omitted-')); cleanup.push(omittedMaskCase); cpSync(temp, omittedMaskCase, {recursive: true});
  updateJson(resolve(omittedMaskCase, 'piece-scripts.json'), (value) => { delete value.pieces[0].sourceCleanup; return value; });
  updateJson(resolve(omittedMaskCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(omittedMaskCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  const omittedMask = spawnSync(process.execPath, [cli, 'script', '--project', omittedMaskCase], {encoding: 'utf8'});
  if (omittedMask.status === 0 || !omittedMask.stderr.includes('SCHEMA_PIECE_SCRIPTS')) errors.push(`${PREFIX}CLEANUP_OMISSION_BYPASS`);

  const mismatchMaskCase = mkdtempSync(resolve(tmpdir(), 'gv-mask-ab-')); cleanup.push(mismatchMaskCase); cpSync(temp, mismatchMaskCase, {recursive: true}); copyFileSync(resolve(mismatchMaskCase, 'source-cleanup-mask.json'), resolve(mismatchMaskCase, 'source-cleanup-mask-b.json'));
  updateJson(resolve(mismatchMaskCase, 'asset-manifest.json'), (value) => { const asset = structuredClone(value.assets.find((item) => item.id === 'source-cleanup')); asset.id = 'source-cleanup-b'; asset.ref = 'source-cleanup-mask-b.json'; value.assets.push(asset); return value; });
  updateJson(resolve(mismatchMaskCase, 'piece-scripts.json'), (value) => { const piece = value.pieces[1]; piece.sourceCleanup.assetId = 'source-cleanup-b'; piece.sourceCleanup.ref = 'source-cleanup-mask-b.json'; piece.dependencies.find((dep) => dep.kind === 'cleanup-mask').id = 'source-cleanup-b'; return value; });
  updateJson(resolve(mismatchMaskCase, 'workflow-state.json'), (value) => { const scriptHash = sha(resolve(mismatchMaskCase, 'piece-scripts.json')); value.scriptSha256 = scriptHash; value.pieceScriptsSha256 = scriptHash; value.assetManifestSha256 = sha(resolve(mismatchMaskCase, 'asset-manifest.json')); return value; });
  const mismatchMask = spawnSync(process.execPath, [cli, 'plan', '--project', mismatchMaskCase], {encoding: 'utf8'});
  if (mismatchMask.status === 0 || !mismatchMask.stderr.includes('AB_CLEANUP_MISMATCH')) errors.push(`${PREFIX}AB_CLEANUP_MISMATCH`);

  const cropBoundsCase = mkdtempSync(resolve(tmpdir(), 'gv-crop-bounds-')); cleanup.push(cropBoundsCase); cpSync(temp, cropBoundsCase, {recursive: true});
  updateJson(resolve(cropBoundsCase, 'source-cleanup-mask.json'), (value) => { value.regions[0].x = 10; value.regions[0].width = 8; return value; }); bindMask(cropBoundsCase);
  spawnSync(process.execPath, [cli, 'plan', '--project', cropBoundsCase], {encoding: 'utf8'}); const cropBounds = spawnSync(process.execPath, [cli, 'render', '--project', cropBoundsCase], {encoding: 'utf8'});
  if (cropBounds.status === 0 || !cropBounds.stderr.includes('CLEANUP_REGION_BOUNDS')) errors.push(`${PREFIX}CROP_BOUNDS`);

  const cropTargetCase = mkdtempSync(resolve(tmpdir(), 'gv-crop-target-')); cleanup.push(cropTargetCase); cpSync(temp, cropTargetCase, {recursive: true});
  updateJson(resolve(cropTargetCase, 'source-cleanup-mask.json'), (value) => { value.regions[0].width = 16; return value; }); bindMask(cropTargetCase);
  spawnSync(process.execPath, [cli, 'plan', '--project', cropTargetCase], {encoding: 'utf8'}); const cropTarget = spawnSync(process.execPath, [cli, 'render', '--project', cropTargetCase], {encoding: 'utf8'});
  if (cropTarget.status === 0 || !cropTarget.stderr.includes('CLEANUP_CROP_TARGET_INCLUDED')) errors.push(`${PREFIX}CROP_TARGET_NOT_EXCLUDED`);

  const decisionCase = mkdtempSync(resolve(tmpdir(), 'gv-decision-')); cleanup.push(decisionCase); cpSync(temp, decisionCase, {recursive: true});
  updateJson(resolve(decisionCase, 'piece-scripts.json'), (value) => { value.pieces[0].decision = 'extend'; return value; });
  updateJson(resolve(decisionCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(decisionCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  const decision = spawnSync(process.execPath, [cli, 'plan', '--project', decisionCase], {encoding: 'utf8'});
  if (decision.status === 0 || !decision.stderr.includes('EDITORIAL_DECISION_BLOCKS_RENDER')) errors.push(`${PREFIX}DECISION_USE_ONLY`);

  const schemaCase = mkdtempSync(resolve(tmpdir(), 'gv-schema-')); cleanup.push(schemaCase); cpSync(temp, schemaCase, {recursive: true});
  updateJson(resolve(schemaCase, 'workflow-state.json'), (value) => ({...value, __unexpected: true}));
  const schema = spawnSync(process.execPath, [cli, 'ingest', '--project', schemaCase], {encoding: 'utf8'});
  if (schema.status === 0 || !schema.stderr.includes('SCHEMA_STATE')) errors.push(`${PREFIX}SCHEMA_FAIL_CLOSED`);

  const linkCase = mkdtempSync(resolve(tmpdir(), 'gv-link-')); cleanup.push(linkCase); cpSync(temp, linkCase, {recursive: true});
  const outside = resolve(tmpdir(), `gv-outside-${process.pid}.json`); cleanup.push(outside); copyFileSync(resolve(linkCase, 'video-spec.json'), outside); symlinkSync(outside, resolve(linkCase, 'escape.json'));
  updateJson(resolve(linkCase, 'workflow-state.json'), (value) => { value.specRef = 'escape.json'; return value; });
  const linked = spawnSync(process.execPath, [cli, 'ingest', '--project', linkCase], {encoding: 'utf8'});
  if (linked.status === 0 || !linked.stderr.includes('SYMLINK_SPEC')) errors.push(`${PREFIX}SYMLINK_ESCAPE`);

  const outsideState = resolve(temp, 'outside-state.json'); copyFileSync(resolve(temp, 'workflow-state.json'), outsideState);
  const stateLinkCase = mkdtempSync(resolve(tmpdir(), 'gv-state-link-')); cleanup.push(stateLinkCase); cpSync(temp, stateLinkCase, {recursive: true}); symlinkSync(outsideState, resolve(stateLinkCase, 'state-link.json'));
  const stateLink = spawnSync(process.execPath, [cli, 'ingest', '--project', stateLinkCase, '--state', 'state-link.json'], {encoding: 'utf8'});
  if (stateLink.status === 0 || !stateLink.stderr.includes('SYMLINK_STATE_REF')) errors.push(`${PREFIX}STATE_SYMLINK_ESCAPE`);
  for (const [id, ref] of [['absolute', outsideState], ['traversal', '../outside-state.json']]) {
    const unsafeState = spawnSync(process.execPath, [cli, 'ingest', '--project', stateLinkCase, '--state', ref], {encoding: 'utf8'});
    if (unsafeState.status === 0 || !unsafeState.stderr.includes('UNSAFE_STATE_REF')) errors.push(`${PREFIX}STATE_${id.toUpperCase()}`);
  }
  const runtimeCase = mkdtempSync(resolve(tmpdir(), 'gv-runtime-link-')); cleanup.push(runtimeCase); cpSync(temp, runtimeCase, {recursive: true}); rmSync(resolve(runtimeCase, '.frames-video'), {recursive: true, force: true});
  const outsideRuntime = mkdtempSync(resolve(tmpdir(), 'gv-runtime-outside-')); cleanup.push(outsideRuntime); symlinkSync(outsideRuntime, resolve(runtimeCase, '.frames-video'), 'dir');
  const runtimeLink = spawnSync(process.execPath, [cli, 'ingest', '--project', runtimeCase], {encoding: 'utf8'});
  if (runtimeLink.status === 0 || !runtimeLink.stderr.includes('SYMLINK_RUNTIME') || readdirSync(outsideRuntime).length !== 0) errors.push(`${PREFIX}RUNTIME_SYMLINK_ESCAPE`);

  if (!mediaChecks) return;

  const tamperCase = mkdtempSync(resolve(tmpdir(), 'gv-tamper-')); cleanup.push(tamperCase); cpSync(temp, tamperCase, {recursive: true});
  const expectedOutput = sha(resolve(tamperCase, 'renders/mini-a.mp4')); copyFileSync(resolve(tamperCase, 'renders/mini-b.mp4'), resolve(tamperCase, 'renders/mini-a.mp4'));
  const driftPlan = spawnSync(process.execPath, [cli, 'plan', '--project', tamperCase], {encoding: 'utf8'});
  const drift = JSON.parse(readFileSync(resolve(tamperCase, '.frames-video/render-plan.json'))).pieces.find((piece) => piece.id === 'mini-a');
  if (driftPlan.status !== 0 || drift.cacheStatus !== 'miss' || !drift.invalidatedBy.includes('output-drift')) errors.push(`${PREFIX}CACHE_OUTPUT_DRIFT`);
  const repaired = spawnSync(process.execPath, [cli, 'render', '--project', tamperCase], {encoding: 'utf8'});
  if (repaired.status !== 0 || sha(resolve(tamperCase, 'renders/mini-a.mp4')) !== expectedOutput) errors.push(`${PREFIX}CACHE_RECOMPUTE`);

  const curtainCase = mkdtempSync(resolve(tmpdir(), 'gv-curtain-')); cleanup.push(curtainCase); cpSync(temp, curtainCase, {recursive: true});
  const priorPlan = JSON.parse(readFileSync(resolve(curtainCase, '.frames-video/render-plan.json'))); updateJson(resolve(curtainCase, 'curtain.json'), (value) => ({...value, animation: 'changed'}));
  const priorOutput = sha(resolve(curtainCase, 'renders/mini-a.mp4')); const priorReceipt = JSON.parse(readFileSync(resolve(curtainCase, '.frames-video/render-receipt.json'))).outputs[0];
  const priorBodyPath = resolve(curtainCase, priorReceipt.layerArtifacts.bodyArtifact.ref); const priorBody = {sha256: sha(priorBodyPath), stream: priorReceipt.layerArtifacts.bodyArtifact.videoStreamSha256, mtimeMs: statSync(priorBodyPath).mtimeMs};
  const curtainHash = sha(resolve(curtainCase, 'curtain.json'));
  updateJson(resolve(curtainCase, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) { piece.miniclip.curtainSha256 = curtainHash; piece.dependencies.find((dep) => dep.kind === 'curtain').sha256 = curtainHash; } return value; });
  updateJson(resolve(curtainCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(curtainCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  const curtainPlanRun = spawnSync(process.execPath, [cli, 'plan', '--project', curtainCase], {encoding: 'utf8'});
  const curtainPlan = JSON.parse(readFileSync(resolve(curtainCase, '.frames-video/render-plan.json')));
  if (curtainPlanRun.status !== 0 || curtainPlan.pieces.some((piece, i) => !piece.reusedLayers.includes('body') || piece.layerKeys.body !== priorPlan.pieces[i].layerKeys.body || !piece.invalidatedBy.includes('curtain'))) errors.push(`${PREFIX}CURTAIN_GRANULAR_CACHE`);
  const curtainRender = spawnSync(process.execPath, [cli, 'render', '--project', curtainCase], {encoding: 'utf8'}); const nextReceipt = JSON.parse(readFileSync(resolve(curtainCase, '.frames-video/render-receipt.json'))).outputs[0];
  const nextBody = nextReceipt.layerArtifacts.bodyArtifact;
  if (curtainRender.status !== 0 || nextBody.sha256 !== priorBody.sha256 || nextBody.videoStreamSha256 !== priorBody.stream || statSync(priorBodyPath).mtimeMs !== priorBody.mtimeMs || nextReceipt.layerArtifacts.curtainArtifact.sha256 === priorReceipt.layerArtifacts.curtainArtifact.sha256 || sha(resolve(curtainCase, 'renders/mini-a.mp4')) === priorOutput) errors.push(`${PREFIX}CURTAIN_REAL_BODY_REUSE`);

  const visualCase = mkdtempSync(resolve(tmpdir(), 'gv-visual-')); cleanup.push(visualCase); cpSync(temp, visualCase, {recursive: true});
  const prohibited = sha(resolve(visualCase, '.frames-video/visual/mini-a/frame-0.png'));
  updateJson(resolve(visualCase, 'visual-detector.json'), (value) => ({...value, forbiddenFrameSha256: [prohibited]}));
  const detectorHash = sha(resolve(visualCase, 'visual-detector.json'));
  updateJson(resolve(visualCase, 'asset-manifest.json'), (value) => { const asset = value.assets.find((item) => item.id === 'visual-detector'); asset.sha256 = detectorHash; asset.generator.configSha256 = detectorHash; return value; });
  updateJson(resolve(visualCase, 'workflow-state.json'), (value) => { value.assetManifestSha256 = sha(resolve(visualCase, 'asset-manifest.json')); return value; });
  spawnSync(process.execPath, [cli, 'plan', '--project', visualCase], {encoding: 'utf8'}); spawnSync(process.execPath, [cli, 'render', '--project', visualCase], {encoding: 'utf8'});
  const visual = spawnSync(process.execPath, [cli, 'verify', '--project', visualCase], {encoding: 'utf8'});
  if (visual.status === 0 || !visual.stderr.includes('visual-privacy')) errors.push(`${PREFIX}VISUAL_FRAME_INSPECTION`);

  const timingCase = mkdtempSync(resolve(tmpdir(), 'gv-layer-timing-')); cleanup.push(timingCase); cpSync(temp, timingCase, {recursive: true});
  updateJson(resolve(timingCase, 'curtain.json'), (value) => ({...value, durationMs: 110})); const timingCurtain = sha(resolve(timingCase, 'curtain.json'));
  updateJson(resolve(timingCase, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) piece.dependencies.find((dep) => dep.kind === 'curtain').sha256 = timingCurtain; return value; });
  updateJson(resolve(timingCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(timingCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  spawnSync(process.execPath, [cli, 'plan', '--project', timingCase], {encoding: 'utf8'}); const timingRender = spawnSync(process.execPath, [cli, 'render', '--project', timingCase], {encoding: 'utf8'});
  if (timingRender.status === 0 || !timingRender.stderr.includes('CURTAIN_TIMING')) errors.push(`${PREFIX}LAYER_TIMING_FAIL_CLOSED`);
  runPrecomposedAdversarial({base: temp, cli, cleanup, errors});
  runWrapperAdversarial({base: temp, cli, cleanup, errors});
  runSystemicAdversarial({base: temp, cli, cleanup, errors});
  runConsumerGateAdversarial({base: temp, cli, cleanup, errors});
} finally {
  for (const path of cleanup) rmSync(path, {recursive: true, force: true});
}
}
