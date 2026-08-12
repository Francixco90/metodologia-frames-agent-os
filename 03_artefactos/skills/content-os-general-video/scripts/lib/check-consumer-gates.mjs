import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha = (path) => bytes(readFileSync(path));
const load = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const edit = (path, fn) => save(path, fn(load(path)));
const run = (cli, root) => spawnSync(process.execPath, [cli, 'script', '--project', root], {encoding: 'utf8'});
const clone = (base, cleanup, id) => { const root = mkdtempSync(resolve(tmpdir(), `gv-${id}-`)); cleanup.push(root); cpSync(base, root, {recursive: true}); return root; };
const blocked = (errors, id, result, token) => { if (result.status === 0 || !result.stderr.includes(token)) errors.push(`COSR-GV_${id} ${(result.stderr || '').trim()}`); };

function bindAnalysis(root) {
  const analysis = sha(resolve(root, 'source-analysis.json'));
  edit(resolve(root, 'composition-fit.json'), (value) => ({...value, sourceAnalysisSha256: analysis})); const fit = sha(resolve(root, 'composition-fit.json'));
  edit(resolve(root, 'piece-scripts.json'), (value) => { for (const piece of value.pieces) { piece.sourceAnalysis.sha256 = analysis; piece.compositionFit.sha256 = fit; } return value; });
  edit(resolve(root, 'workflow-state.json'), (value) => { const scripts = sha(resolve(root, 'piece-scripts.json')); return {...value, sourceAnalysisSha256: analysis, compositionFitSha256: fit, scriptSha256: scripts, pieceScriptsSha256: scripts}; });
}
function audible(root) {
  edit(resolve(root, 'source-analysis.json'), (value) => { const source = value.sources[0]; Object.assign(source, {probe: {status: 'passed', mediaType: 'video', durationMs: 1250, hasAudio: true, width: 108, height: 192, fps: 24, orientation: 'portrait'}, audioClassification: 'speech', asrAttempt: {status: 'candidate', candidateRef: 'captions.json', candidateSha256: sha(resolve(root, 'captions.json'))}, transcriptIntelligence: {status: 'deterministic-passed', jobRef: 'captions.json', jobSha256: sha(resolve(root, 'captions.json')), verificationRef: 'correction-ledger.json', verificationSha256: sha(resolve(root, 'correction-ledger.json'))}}); return value; });
}
function attackSource(base, cli, cleanup, errors, field, attack) {
  const root = clone(base, cleanup, `${field}-${attack}`); audible(root); const key = field === 'asr' ? 'asrAttempt' : 'transcriptIntelligence'; const refKey = field === 'asr' ? 'candidateRef' : 'verificationRef'; const hashKey = field === 'asr' ? 'candidateSha256' : 'verificationSha256';
  if (attack === 'symlink') { const link = `${field}-link.json`; symlinkSync(resolve(root, field === 'asr' ? 'captions.json' : 'correction-ledger.json'), resolve(root, link)); edit(resolve(root, 'source-analysis.json'), (value) => { value.sources[0][key][refKey] = link; return value; }); }
  else edit(resolve(root, 'source-analysis.json'), (value) => { const target = value.sources[0][key]; if (attack === 'drift') target[hashKey] = '0'.repeat(64); else target[refKey] = attack === 'missing' ? `${field}-missing.json` : attack === 'traversal' ? '../outside.json' : '/synthetic/outside.json'; return value; });
  bindAnalysis(root); blocked(errors, `CONSUMER_${field.toUpperCase()}_${attack.toUpperCase()}`, run(cli, root), 'SOURCE_ANALYSIS_GATE');
}

function manifestHash(kit) { const value = structuredClone(kit); delete value.manifestSha256; return bytes(JSON.stringify(value)); }
function baseKit(root) {
  save(resolve(root, 'brand-provenance.json'), {authority: 'user', source: 'synthetic fixture'}); save(resolve(root, 'brand-palette.json'), {primary: '#001833'});
  const kit = {schemaVersion: 'brand-kit-v1', kind: 'user-provided', manifestSha256: '', rights: 'user-authorized', provenance: {source: 'brand-provenance.json', sourceSha256: sha(resolve(root, 'brand-provenance.json')), authority: 'user'}, assets: [{role: 'palette', ref: 'brand-palette.json', sha256: sha(resolve(root, 'brand-palette.json')), rights: 'user-authorized'}]}; kit.manifestSha256 = manifestHash(kit); save(resolve(root, 'user-brand-kit.json'), kit); return kit;
}
function bindBrand(root, ref = 'user-brand-kit.json', hash = null) {
  const declared = hash || sha(resolve(root, ref)); edit(resolve(root, 'video-spec.json'), (value) => { Object.assign(value.visual, {brandKitRef: ref, brandKitSha256: declared}); return value; }); const spec = sha(resolve(root, 'video-spec.json'));
  edit(resolve(root, 'piece-scripts.json'), (value) => { value.specSha256 = spec; for (const piece of value.pieces) piece.creativeBrandKit = {ref, sha256: declared}; return value; });
  edit(resolve(root, 'asset-manifest.json'), (value) => ({...value, specSha256: spec})); edit(resolve(root, 'ab-groups.json'), (value) => ({...value, specSha256: spec}));
  edit(resolve(root, 'workflow-state.json'), (value) => { const scripts = sha(resolve(root, 'piece-scripts.json')); return {...value, specSha256: spec, scriptSha256: scripts, pieceScriptsSha256: scripts, assetManifestSha256: sha(resolve(root, 'asset-manifest.json')), abTestSha256: sha(resolve(root, 'ab-groups.json'))}; });
}
function attackManifest(base, cli, cleanup, errors, attack) {
  const root = clone(base, cleanup, `brand-manifest-${attack}`); baseKit(root); bindBrand(root);
  if (attack === 'missing') bindBrand(root, 'missing-brand-kit.json', '0'.repeat(64));
  else if (attack === 'drift') edit(resolve(root, 'user-brand-kit.json'), (value) => ({...value, rights: 'owned'}));
  else if (attack === 'symlink') { copyFileSync(resolve(root, 'user-brand-kit.json'), resolve(root, 'brand-target.json')); unlinkSync(resolve(root, 'user-brand-kit.json')); symlinkSync(resolve(root, 'brand-target.json'), resolve(root, 'user-brand-kit.json')); }
  else bindBrand(root, attack === 'traversal' ? '../outside.json' : '/synthetic/outside.json', '0'.repeat(64));
  blocked(errors, `CONSUMER_BRAND_MANIFEST_${attack.toUpperCase()}`, run(cli, root), attack === 'symlink' ? 'SYMLINK_CREATIVE_BRAND_KIT' : attack === 'drift' || attack === 'missing' ? 'HASH_DRIFT_CREATIVE_BRAND_KIT' : 'UNSAFE_CREATIVE_BRAND_KIT');
}
function attackAsset(base, cli, cleanup, errors, attack) {
  const root = clone(base, cleanup, `brand-asset-${attack}`); const kit = baseKit(root);
  if (attack === 'symlink') { copyFileSync(resolve(root, 'brand-palette.json'), resolve(root, 'palette-target.json')); unlinkSync(resolve(root, 'brand-palette.json')); symlinkSync(resolve(root, 'palette-target.json'), resolve(root, 'brand-palette.json')); }
  else if (attack === 'drift') kit.assets[0].sha256 = '0'.repeat(64);
  else kit.assets[0].ref = attack === 'missing' ? 'missing-palette.json' : attack === 'traversal' ? '../outside.json' : '/synthetic/outside.json';
  kit.manifestSha256 = manifestHash(kit); save(resolve(root, 'user-brand-kit.json'), kit); bindBrand(root);
  blocked(errors, `CONSUMER_BRAND_ASSET_${attack.toUpperCase()}`, run(cli, root), 'BRAND_KIT_GATE');
}

export function runConsumerGateAdversarial({base, cli, cleanup, errors}) {
  for (const field of ['asr', 'ti']) for (const attack of ['missing', 'drift', 'symlink', 'traversal', 'absolute']) attackSource(base, cli, cleanup, errors, field, attack);
  const positive = clone(base, cleanup, 'brand-positive'); baseKit(positive); bindBrand(positive); const pass = run(cli, positive); if (pass.status !== 0) errors.push(`COSR-GV_CONSUMER_BRAND_POSITIVE ${(pass.stderr || '').trim()}`);
  for (const attack of ['missing', 'drift', 'symlink', 'traversal', 'absolute']) { attackManifest(base, cli, cleanup, errors, attack); attackAsset(base, cli, cleanup, errors, attack); }
}
