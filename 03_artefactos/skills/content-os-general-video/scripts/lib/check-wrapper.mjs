import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const load = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const edit = (path, fn) => save(path, fn(load(path)));
const run = (cli, command, root) => spawnSync(process.execPath, [cli, command, '--project', root], {encoding: 'utf8'});
const media = (path) => { const value = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'format=duration:stream=codec_type,width,height,avg_frame_rate,nb_read_frames', '-of', 'json', path], {encoding: 'utf8'}).stdout); const video = value.streams.find((item) => item.codec_type === 'video'); const [n, d] = video.avg_frame_rate.split('/').map(Number); return {durationMs: Math.round(Number(value.format.duration) * 1000), frameCount: Number(video.nb_read_frames), width: Number(video.width), height: Number(video.height), fps: n / d}; };

function bind(root) {
  const intro = resolve(root, 'wrapper-intro.mp4'); const outro = resolve(root, 'wrapper-outro.mp4'); const bodyA = resolve(root, 'wrapper-body-a.mp4'); const bodyB = resolve(root, 'wrapper-body-b.mp4');
  copyFileSync(resolve(root, 'renders/mini-a.mp4'), intro); copyFileSync(resolve(root, 'renders/mini-a.mp4'), outro); copyFileSync(resolve(root, 'renders/mini-a.mp4'), bodyA); copyFileSync(resolve(root, 'renders/mini-b.mp4'), bodyB);
  const configSha = sha(resolve(root, 'curtain.json'));
  const introMedia = media(intro); const outroMedia = media(outro); const bodyMedia = media(bodyA);
  const kit = {schemaVersion: 'branded-wrapper-manifest-v1', id: 'synthetic-kit', profile: 'metodologia', generator: {id: 'metodologia-brand-kit-generator', version: '1', configSha256: configSha}, intro: {assetId: 'wrapper-intro', ref: 'wrapper-intro.mp4', sha256: sha(intro), rights: 'owned', provenance: 'synthetic fixture', durationMs: introMedia.durationMs}, outro: {assetId: 'wrapper-outro', ref: 'wrapper-outro.mp4', sha256: sha(outro), rights: 'owned', provenance: 'synthetic fixture', durationMs: outroMedia.durationMs}, bodyPolicy: {video: 'stream-copy', audio: 'stream-copy', musicUnderBody: 'forbidden', overlaysOnBody: 'forbidden'}, offline: true, publicationAuthority: false};
  save(resolve(root, 'brand-kit.json'), kit); const kitSha = sha(resolve(root, 'brand-kit.json'));
  edit(resolve(root, 'source-pack.json'), (value) => { value.sources.push(
    {id: 'wrapper-body-a', ref: 'wrapper-body-a.mp4', sha256: sha(bodyA), provenance: 'synthetic fixture', rights: 'owned', authority: 'first-party', limitations: [], claimIds: []},
    {id: 'wrapper-body-b', ref: 'wrapper-body-b.mp4', sha256: sha(bodyB), provenance: 'synthetic fixture', rights: 'owned', authority: 'first-party', limitations: [], claimIds: []},
  ); return value; });
  edit(resolve(root, 'source-analysis.json'), (value) => { value.sources.push(
    {sourceId: 'wrapper-body-a', sourceSha256: sha(bodyA), rights: 'synthetic', authority: 'primary', probe: {status: 'passed', mediaType: 'video', durationMs: bodyMedia.durationMs, hasAudio: true, width: bodyMedia.width, height: bodyMedia.height, fps: bodyMedia.fps, orientation: 'portrait'}, audioClassification: 'speech', asrAttempt: {status: 'candidate', candidateRef: 'captions.json', candidateSha256: sha(resolve(root, 'captions.json'))}, transcriptIntelligence: {status: 'deterministic-passed', verificationRef: 'correction-ledger.json', verificationSha256: sha(resolve(root, 'correction-ledger.json'))}, sampleTimesMs: [0], watermarkObservations: [{sampleTimeMs: 0, present: false, points: []}], cropSafety: {safe: true, strategy: 'contain', coveredSampleTimesMs: [0], evidence: []}, editorialDecision: 'use', state: 'ready'},
    {sourceId: 'wrapper-body-b', sourceSha256: sha(bodyB), rights: 'synthetic', authority: 'primary', probe: {status: 'passed', mediaType: 'video', durationMs: bodyMedia.durationMs, hasAudio: true, width: bodyMedia.width, height: bodyMedia.height, fps: bodyMedia.fps, orientation: 'portrait'}, audioClassification: 'speech', asrAttempt: {status: 'candidate', candidateRef: 'captions.json', candidateSha256: sha(resolve(root, 'captions.json'))}, transcriptIntelligence: {status: 'deterministic-passed', verificationRef: 'correction-ledger.json', verificationSha256: sha(resolve(root, 'correction-ledger.json'))}, sampleTimesMs: [0], watermarkObservations: [{sampleTimeMs: 0, present: false, points: []}], cropSafety: {safe: true, strategy: 'contain', coveredSampleTimesMs: [0], evidence: []}, editorialDecision: 'use', state: 'ready'},
  ); return value; });
  const analysisSha = sha(resolve(root, 'source-analysis.json'));
  edit(resolve(root, 'composition-fit.json'), (value) => { value.sourceAnalysisSha256 = analysisSha; value.fits = ['a', 'b'].map((variant) => ({pieceId: `mini-${variant}`, sourceId: `wrapper-body-${variant}`, sourceSha256: sha(resolve(root, `wrapper-body-${variant}.mp4`)), targetWidth: bodyMedia.width, targetHeight: bodyMedia.height, strategy: 'contain', watermarkPolicy: 'not-present', fitState: 'deterministic-passed'})); return value; });
  const fitSha = sha(resolve(root, 'composition-fit.json'));
  edit(resolve(root, 'asset-manifest.json'), (value) => { value.assets.push(
    {id: 'brand-kit', kind: 'brand-kit-manifest', ref: 'brand-kit.json', sha256: kitSha, provenance: 'synthetic fixture', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}},
    {id: 'wrapper-intro', kind: 'wrapper-intro', ref: 'wrapper-intro.mp4', sha256: kit.intro.sha256, provenance: 'synthetic fixture', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}},
    {id: 'wrapper-outro', kind: 'wrapper-outro', ref: 'wrapper-outro.mp4', sha256: kit.outro.sha256, provenance: 'synthetic fixture', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}},
  ); return value; });
  edit(resolve(root, 'piece-scripts.json'), (value) => { value.pieces.forEach((piece, index) => {
    const variant = index ? 'b' : 'a'; const bodyRef = `wrapper-body-${variant}.mp4`; const bodySha = sha(resolve(root, bodyRef));
    piece.output = `renders/wrapped-${variant}.mp4`; piece.sourceSpans = [{sourceId: `wrapper-body-${variant}`, startMs: 0, endMs: 1250, sourceSha256: bodySha}]; piece.visualSpans = [{sourceId: `wrapper-body-${variant}`, startMs: 0, endMs: 1250, purpose: 'preserve synthetic body'}];
    piece.dependencies = piece.dependencies.filter((dep) => dep.kind !== 'cleanup-mask' && dep.kind !== 'source'); piece.dependencies.push({id: `wrapper-body-${variant}`, kind: 'source', sha256: bodySha});
    delete piece.sourceCleanup; delete piece.render; delete piece.precomposedAdapter; delete piece.miniclip; piece.dependencies = piece.dependencies.filter((dep) => dep.kind !== 'curtain'); piece.brandedWrapper = {mode: 'branded-wrapper-v1', brandKitRef: 'brand-kit.json', brandKitSha256: kitSha, bodySourceId: `wrapper-body-${variant}`, bodyRef, bodySha256: bodySha};
    piece.sourceAnalysis = {ref: 'source-analysis.json', sha256: analysisSha}; piece.compositionFit = {ref: 'composition-fit.json', sha256: fitSha}; piece.audioPolicy = {mode: 'preserve', sourceId: `wrapper-body-${variant}`, sourceSha256: bodySha, processingAllowed: false};
    const frameCount = introMedia.frameCount + bodyMedia.frameCount + outroMedia.frameCount; piece.format = {width: bodyMedia.width, height: bodyMedia.height, fps: bodyMedia.fps, durationMs: Math.round(frameCount / bodyMedia.fps * 1000), frameCount};
  }); return value; });
  edit(resolve(root, 'workflow-state.json'), (value) => { value.sourcePackSha256 = sha(resolve(root, 'source-pack.json')); value.sourceAnalysisSha256 = analysisSha; value.compositionFitSha256 = fitSha; value.assetManifestSha256 = sha(resolve(root, 'asset-manifest.json')); const scripts = sha(resolve(root, 'piece-scripts.json')); value.scriptSha256 = scripts; value.pieceScriptsSha256 = scripts; return value; });
}

export function runWrapperAdversarial({base, cli, cleanup, errors}) {
  const prefix = 'COSR-GV_'; const root = mkdtempSync(resolve(tmpdir(), 'gv-wrapper-')); cleanup.push(root); cpSync(base, root, {recursive: true}); bind(root);
  for (const command of ['ingest', 'script', 'plan', 'render', 'verify']) { const result = run(cli, command, root); if (result.status !== 0) errors.push(`${prefix}WRAPPER_${command.toUpperCase()} ${(result.stderr || '').trim()}`); }
  const receipt = load(resolve(root, '.frames-video/render-receipt.json'));
  if (receipt.outputs.some((output) => output.wrapperEvidence?.videoCodecMode !== 'copy' || output.wrapperEvidence?.audioCodecMode !== 'copy' || output.wrapperEvidence?.bodyAudioPackets !== output.wrapperEvidence?.bodyAudioPacketsPreserved || output.wrapperEvidence?.musicUnderBody || output.wrapperEvidence?.overlaysOnBody)) errors.push(`${prefix}WRAPPER_PRESERVATION_EVIDENCE`);

  const policy = mkdtempSync(resolve(tmpdir(), 'gv-wrapper-policy-')); cleanup.push(policy); cpSync(root, policy, {recursive: true});
  edit(resolve(policy, 'brand-kit.json'), (value) => ({...value, bodyPolicy: {...value.bodyPolicy, musicUnderBody: 'allowed'}})); const kitSha = sha(resolve(policy, 'brand-kit.json'));
  edit(resolve(policy, 'asset-manifest.json'), (value) => { value.assets.find((asset) => asset.id === 'brand-kit').sha256 = kitSha; return value; });
  edit(resolve(policy, 'piece-scripts.json'), (value) => { value.pieces.forEach((piece) => { piece.brandedWrapper.brandKitSha256 = kitSha; }); return value; });
  edit(resolve(policy, 'workflow-state.json'), (value) => { const scripts = sha(resolve(policy, 'piece-scripts.json')); value.scriptSha256 = scripts; value.pieceScriptsSha256 = scripts; value.assetManifestSha256 = sha(resolve(policy, 'asset-manifest.json')); return value; });
  run(cli, 'plan', policy); const blocked = run(cli, 'render', policy); if (blocked.status === 0 || !blocked.stderr.includes('SCHEMA_BRAND_KIT')) errors.push(`${prefix}WRAPPER_BODY_POLICY`);

  const mismatch = mkdtempSync(resolve(tmpdir(), 'gv-wrapper-ab-')); cleanup.push(mismatch); cpSync(root, mismatch, {recursive: true}); copyFileSync(resolve(mismatch, 'brand-kit.json'), resolve(mismatch, 'brand-kit-b.json'));
  edit(resolve(mismatch, 'piece-scripts.json'), (value) => { value.pieces[1].brandedWrapper.brandKitRef = 'brand-kit-b.json'; return value; });
  edit(resolve(mismatch, 'workflow-state.json'), (value) => { const scripts = sha(resolve(mismatch, 'piece-scripts.json')); value.scriptSha256 = scripts; value.pieceScriptsSha256 = scripts; return value; });
  const ab = run(cli, 'plan', mismatch); if (ab.status === 0 || !ab.stderr.includes('AB_WRAPPER_MISMATCH')) errors.push(`${prefix}AB_WRAPPER_MISMATCH`);
}
