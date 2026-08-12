import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const load = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const edit = (path, fn) => save(path, fn(load(path)));
const run = (cli, command, root) => spawnSync(process.execPath, [cli, command, '--project', root], {encoding: 'utf8'});

function caseDir(base, cleanup, name) { const root = mkdtempSync(resolve(tmpdir(), `gv-${name}-`)); cleanup.push(root); cpSync(base, root, {recursive: true}); return root; }
function bindAnalysis(root) {
  const analysis = sha(resolve(root, 'source-analysis.json'));
  edit(resolve(root, 'composition-fit.json'), (value) => ({...value, sourceAnalysisSha256: analysis}));
  const fit = sha(resolve(root, 'composition-fit.json'));
  edit(resolve(root, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) { piece.sourceAnalysis = {ref: 'source-analysis.json', sha256: analysis}; piece.compositionFit = {ref: 'composition-fit.json', sha256: fit}; } return value; });
  edit(resolve(root, 'workflow-state.json'), (value) => { const scripts = sha(resolve(root, 'piece-scripts.json')); return {...value, sourceAnalysisSha256: analysis, compositionFitSha256: fit, scriptSha256: scripts, pieceScriptsSha256: scripts}; });
}
function videoAnalysis(root, {audio = false, movingMark = false} = {}) {
  edit(resolve(root, 'source-analysis.json'), (value) => { const source = value.sources[0]; Object.assign(source, {
    probe: {status: 'passed', mediaType: 'video', width: 108, height: 192, durationMs: 1250, hasAudio: audio, fps: 24, orientation: 'portrait'},
    audioClassification: audio ? 'speech' : 'silent',
    asrAttempt: audio ? {status: 'candidate', candidateRef: 'captions.json', candidateSha256: sha(resolve(root, 'captions.json'))} : {status: 'not-applicable', reason: 'no audio stream'},
    transcriptIntelligence: audio ? {status: 'deterministic-passed', verificationRef: 'correction-ledger.json', verificationSha256: sha(resolve(root, 'correction-ledger.json'))} : {status: 'not-applicable', reason: 'no audio stream'},
    sampleTimesMs: [0, 500], watermarkObservations: [{sampleTimeMs: 0, present: false, points: []}, {sampleTimeMs: 500, present: movingMark, points: movingMark ? [{x: 100, y: 170}] : []}],
    cropSafety: {safe: !movingMark, strategy: 'contain', coveredSampleTimesMs: [0, 500], evidence: []}, editorialDecision: 'use', state: 'ready',
  }); return value; });
}
function cropFit(root, crop, covered = [0, 500]) {
  const analysis = load(resolve(root, 'source-analysis.json')).sources[0];
  const frames = [[0, 'composition-frame-0.ppm'], [500, 'composition-frame-500.ppm']];
  for (const [, ref] of frames) copyFileSync(resolve(root, 'frame.ppm'), resolve(root, ref));
  edit(resolve(root, 'composition-fit.json'), (value) => { for (const fit of value.fits) {
    const evidenceRef = `composition-evidence-${fit.pieceId}.json`;
    save(resolve(root, evidenceRef), {schemaVersion: 'composition-fit-evidence-v1', pieceId: fit.pieceId, sourceId: fit.sourceId, sourceSha256: fit.sourceSha256, crop, samples: frames.map(([sampleTimeMs, frameRef]) => ({sampleTimeMs, frameRef, frameSha256: sha(resolve(root, frameRef)), watermarkPointsExcluded: analysis.watermarkObservations.find((item) => item.sampleTimeMs === sampleTimeMs)?.points.length || 0, verdict: 'safe'})), verdict: 'safe'});
    Object.assign(fit, {strategy: 'crop', crop, safe: true, evidenceRef, evidenceSha256: sha(resolve(root, evidenceRef)), watermarkPolicy: 'excluded-by-crop', coveredSampleTimesMs: covered});
  } return value; });
}
function bindEvidence(root) { edit(resolve(root, 'composition-fit.json'), (value) => { for (const fit of value.fits) fit.evidenceSha256 = sha(resolve(root, fit.evidenceRef)); return value; }); }
function expectBlocked(errors, prefix, result, token) { if (result.status === 0 || !result.stderr.includes(token)) errors.push(`${prefix}${token} ${(result.stderr || '').trim()}`); }

export function runSystemicAdversarial({base, cli, cleanup, errors}) {
  const prefix = 'COSR-GV_';
  const drift = caseDir(base, cleanup, 'analysis-drift'); edit(resolve(drift, 'source-analysis.json'), (value) => ({...value, projectId: 'drifted'}));
  expectBlocked(errors, prefix, run(cli, 'script', drift), 'HASH_DRIFT_SOURCE_ANALYSIS');

  const safeCrop = caseDir(base, cleanup, 'crop-safe'); videoAnalysis(safeCrop, {movingMark: true}); cropFit(safeCrop, {x: 0, y: 0, width: 90, height: 192}); bindAnalysis(safeCrop);
  const safeCropResult = run(cli, 'script', safeCrop); if (safeCropResult.status !== 0) errors.push(`${prefix}COMPOSITION_CROP_SAFE_POSITIVE ${(safeCropResult.stderr || '').trim()}`);

  const unsafe = caseDir(base, cleanup, 'crop-unsafe'); videoAnalysis(unsafe); cropFit(unsafe, {x: 100, y: 0, width: 20, height: 192}); bindAnalysis(unsafe);
  expectBlocked(errors, prefix, run(cli, 'script', unsafe), 'COMPOSITION_CROP_UNSAFE');

  const temporal = caseDir(base, cleanup, 'watermark-temporal'); videoAnalysis(temporal, {movingMark: true}); cropFit(temporal, {x: 0, y: 0, width: 90, height: 192}, [0, 700]); bindAnalysis(temporal);
  expectBlocked(errors, prefix, run(cli, 'script', temporal), 'COMPOSITION_TEMPORAL_COVERAGE');

  const emptyEvidence = caseDir(base, cleanup, 'crop-empty-evidence'); videoAnalysis(emptyEvidence); cropFit(emptyEvidence, {x: 0, y: 0, width: 90, height: 192});
  edit(resolve(emptyEvidence, 'composition-evidence-mini-a.json'), (value) => ({...value, samples: []})); bindEvidence(emptyEvidence); bindAnalysis(emptyEvidence);
  expectBlocked(errors, prefix, run(cli, 'script', emptyEvidence), 'SCHEMA_COMPOSITION_EVIDENCE');

  const missingEvidence = caseDir(base, cleanup, 'crop-missing-evidence'); videoAnalysis(missingEvidence); cropFit(missingEvidence, {x: 0, y: 0, width: 90, height: 192}); bindAnalysis(missingEvidence); unlinkSync(resolve(missingEvidence, 'composition-evidence-mini-a.json'));
  expectBlocked(errors, prefix, run(cli, 'script', missingEvidence), 'HASH_DRIFT_COMPOSITION_EVIDENCE');

  const driftEvidence = caseDir(base, cleanup, 'crop-evidence-drift'); videoAnalysis(driftEvidence); cropFit(driftEvidence, {x: 0, y: 0, width: 90, height: 192}); bindAnalysis(driftEvidence);
  edit(resolve(driftEvidence, 'composition-evidence-mini-a.json'), (value) => ({...value, verdict: 'tampered'}));
  expectBlocked(errors, prefix, run(cli, 'script', driftEvidence), 'HASH_DRIFT_COMPOSITION_EVIDENCE');

  const linkEvidence = caseDir(base, cleanup, 'crop-evidence-link'); videoAnalysis(linkEvidence); cropFit(linkEvidence, {x: 0, y: 0, width: 90, height: 192}); bindAnalysis(linkEvidence);
  const outside = resolve(mkdtempSync(resolve(tmpdir(), 'gv-composition-outside-')), 'evidence.json'); cleanup.push(resolve(outside, '..')); copyFileSync(resolve(linkEvidence, 'composition-evidence-mini-a.json'), outside); unlinkSync(resolve(linkEvidence, 'composition-evidence-mini-a.json')); symlinkSync(outside, resolve(linkEvidence, 'composition-evidence-mini-a.json'));
  expectBlocked(errors, prefix, run(cli, 'script', linkEvidence), 'SYMLINK_COMPOSITION_EVIDENCE');

  const frameDrift = caseDir(base, cleanup, 'crop-frame-drift'); videoAnalysis(frameDrift); cropFit(frameDrift, {x: 0, y: 0, width: 90, height: 192}); bindAnalysis(frameDrift); writeFileSync(resolve(frameDrift, 'composition-frame-500.ppm'), 'tamper');
  expectBlocked(errors, prefix, run(cli, 'script', frameDrift), 'HASH_DRIFT_COMPOSITION_FRAME');

  const replaced = caseDir(base, cleanup, 'audio-replace'); videoAnalysis(replaced, {audio: true}); bindAnalysis(replaced);
  expectBlocked(errors, prefix, run(cli, 'script', replaced), 'AUDIO_PRESERVE_REQUIRED');

  const normalized = caseDir(base, cleanup, 'audio-normalize'); videoAnalysis(normalized, {audio: true}); bindAnalysis(normalized);
  edit(resolve(normalized, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) piece.audioPolicy = {mode: 'preserve', sourceId: 'synthetic-source', sourceSha256: value.pieces[0].sourceSpans[0].sourceSha256, processingAllowed: false}; return value; });
  edit(resolve(normalized, 'workflow-state.json'), (value) => { const scripts = sha(resolve(normalized, 'piece-scripts.json')); return {...value, scriptSha256: scripts, pieceScriptsSha256: scripts}; });
  expectBlocked(errors, prefix, run(cli, 'script', normalized), 'AUDIO_PROCESSING_FORBIDDEN');

  const board = caseDir(base, cleanup, 'storyboard');
  edit(resolve(board, 'workflow-state.json'), (value) => ({...value, storyboard: 'yes', storyboardRef: 'storyboard-multiframe.json', storyboardSha256: sha(resolve(board, 'storyboard-multiframe.json'))}));
  const boardPass = run(cli, 'script', board); if (boardPass.status !== 0) errors.push(`${prefix}STORYBOARD_POSITIVE ${(boardPass.stderr || '').trim()}`);
  edit(resolve(board, 'storyboard-multiframe.json'), (value) => { value.frames[1].order = 0; return value; });
  edit(resolve(board, 'workflow-state.json'), (value) => ({...value, storyboardSha256: sha(resolve(board, 'storyboard-multiframe.json'))}));
  expectBlocked(errors, prefix, run(cli, 'script', board), 'STORYBOARD_FRAME_ORDER');

  const impurity = caseDir(base, cleanup, 'ab-impurity');
  edit(resolve(impurity, 'piece-scripts.json'), (value) => { value.pieces[1].audioPolicy = {mode: 'silent', processingAllowed: false}; return value; });
  edit(resolve(impurity, 'workflow-state.json'), (value) => { const scripts = sha(resolve(impurity, 'piece-scripts.json')); return {...value, scriptSha256: scripts, pieceScriptsSha256: scripts}; });
  run(cli, 'plan', impurity); run(cli, 'render', impurity); expectBlocked(errors, prefix, run(cli, 'verify', impurity), 'ab-audioPolicySha256');
}
