import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const bytes = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const sha = (path) => bytes(readFileSync(path));
const load = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const edit = (path, fn) => save(path, fn(load(path)));

function makeManifest(root, variant, frameSha, cleanupSha, configSha, audioSha) {
  const frames = Array.from({length: 30}, (_, index) => ({index, ref: `frames-${variant}/frame-${String(index).padStart(4, '0')}.ppm`, sha256: frameSha}));
  const manifest = {
    schemaVersion: 'precomposed-frame-manifest-v1', adapterId: 'precomposed-frames-v1',
    framePattern: `frames-${variant}/frame-%04d.ppm`, frameCount: 30, frames,
    framesSha256: bytes(json(frames)), cleanup: {ref: 'source-cleanup-mask.json', sha256: cleanupSha, order: 'cleanup-before-treatment'},
    generator: {id: 'synthetic-precomposer', version: '1', configRef: 'generator-config.json', configSha256: configSha, deterministic: true},
    audio: {ref: 'tone.wav', sha256: audioSha}, derivationSha256: '',
  };
  const derivation = {...manifest}; delete derivation.derivationSha256; manifest.derivationSha256 = bytes(json(derivation));
  save(resolve(root, `frames-${variant}-manifest.json`), manifest); return manifest;
}

function bind(root) {
  const adapterSha = sha(resolve(root, 'precomposed-adapter.json')); const configSha = sha(resolve(root, 'generator-config.json'));
  const manifestHashes = Object.fromEntries(['A', 'B'].map((v) => [v, sha(resolve(root, `frames-${v}-manifest.json`))]));
  edit(resolve(root, 'asset-manifest.json'), (value) => {
    value.assets.push(
      {id: 'precomposed-adapter', kind: 'precomposed-adapter', ref: 'precomposed-adapter.json', sha256: adapterSha, provenance: 'synthetic', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}},
      {id: 'generator-config', kind: 'generator-config', ref: 'generator-config.json', sha256: configSha, provenance: 'synthetic', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}},
      ...['A', 'B'].map((v) => ({id: `frame-manifest-${v}`, kind: 'precomposed-frame-manifest', ref: `frames-${v}-manifest.json`, sha256: manifestHashes[v], provenance: 'synthetic', rights: 'owned', generator: {id: 'fixture', version: '1', configSha256: configSha}})),
    ); return value;
  });
  edit(resolve(root, 'piece-scripts.json'), (value) => { value.pieces.forEach((piece, index) => {
    const variant = index ? 'B' : 'A'; piece.precomposedAdapter = {id: 'precomposed-frames-v1', ref: 'precomposed-adapter.json', sha256: adapterSha, manifestRef: `frames-${variant}-manifest.json`, manifestSha256: manifestHashes[variant]};
    piece.render.args = ['-y', '-framerate', '24', '-i', `frames-${variant}/frame-%04d.ppm`, '-i', 'tone.wav', '-frames:v', '30', '-vf', 'scale=108:192', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', piece.output];
  }); return value; });
  edit(resolve(root, 'workflow-state.json'), (value) => { const scriptHash = sha(resolve(root, 'piece-scripts.json')); value.scriptSha256 = scriptHash; value.pieceScriptsSha256 = scriptHash; value.assetManifestSha256 = sha(resolve(root, 'asset-manifest.json')); return value; });
}

function run(cli, command, root) { return spawnSync(process.execPath, [cli, command, '--project', root], {encoding: 'utf8'}); }

export function runPrecomposedAdversarial({base, cli, cleanup, errors}) {
  const prefix = 'COSR-GV_'; const root = mkdtempSync(resolve(tmpdir(), 'gv-precomposed-')); cleanup.push(root); cpSync(base, root, {recursive: true});
  rmSync(resolve(root, '.frames-video'), {recursive: true, force: true});
  save(resolve(root, 'precomposed-adapter.json'), {schemaVersion: 'precomposed-adapter-v1', id: 'precomposed-frames-v1', execution: 'runtime-ffmpeg-frame-sequence', offline: true, publicationAuthority: false});
  save(resolve(root, 'generator-config.json'), {schemaVersion: 'synthetic-generator-v1', deterministic: true, seed: 0});
  const converted = resolve(root, 'frame-b.ppm'); spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', resolve(root, 'frame.ppm'), '-vf', 'eq=saturation=0.4', converted]);
  for (const [variant, source] of [['A', resolve(root, 'frame.ppm')], ['B', converted]]) { const dir = resolve(root, `frames-${variant}`); mkdirSync(dir); for (let i = 0; i < 30; i += 1) copyFileSync(source, resolve(dir, `frame-${String(i).padStart(4, '0')}.ppm`)); }
  const cleanupSha = sha(resolve(root, 'source-cleanup-mask.json')); const configSha = sha(resolve(root, 'generator-config.json')); const audioSha = sha(resolve(root, 'tone.wav'));
  makeManifest(root, 'A', sha(resolve(root, 'frame.ppm')), cleanupSha, configSha, audioSha); makeManifest(root, 'B', sha(converted), cleanupSha, configSha, audioSha); bind(root);
  let positivePass = true;
  for (const command of ['ingest', 'script', 'plan', 'render', 'verify']) { const result = run(cli, command, root); if (result.status !== 0) { positivePass = false; errors.push(`${prefix}PRECOMPOSED_${command.toUpperCase()} ${(result.stderr || '').trim()}`); } }
  if (!positivePass) return;
  const receipt = load(resolve(root, '.frames-video/render-receipt.json'));
  if (receipt.outputs.some((output) => output.adapterEvidence?.filterOrder !== 'cleanup-before-treatment' || output.adapterEvidence?.cleanedBodySha256 !== output.adapterEvidence?.framesSha256)) errors.push(`${prefix}PRECOMPOSED_EVIDENCE`);

  const cases = [
    ['missing-adapter', (dir) => rmSync(resolve(dir, 'precomposed-adapter.json')), /MISSING_PRECOMPOSED_ADAPTER|HASH_DRIFT_PRECOMPOSED_ADAPTER|ASSET_DRIFT precomposed-adapter/u],
    ['frame-drift', (dir) => writeFileSync(resolve(dir, 'frames-A/frame-0004.ppm'), 'tamper'), /PRECOMPOSED_FRAME_DRIFT/u],
    ['manifest-drift', (dir) => edit(resolve(dir, 'frames-A-manifest.json'), (v) => ({...v, frameCount: 29})), /HASH_DRIFT_FRAME_MANIFEST|ASSET_DRIFT frame-manifest-A/u],
  ];
  for (const [name, mutate, expected] of cases) { const dir = mkdtempSync(resolve(tmpdir(), `gv-${name}-`)); cleanup.push(dir); cpSync(root, dir, {recursive: true}); mutate(dir); const result = run(cli, 'render', dir); if (result.status === 0 || !expected.test(result.stderr)) errors.push(`${prefix}PRECOMPOSED_${name.toUpperCase()} ${(result.stderr || '').trim()}`); }

  const omission = mkdtempSync(resolve(tmpdir(), 'gv-cleanup-omission-')); cleanup.push(omission); cpSync(root, omission, {recursive: true});
  edit(resolve(omission, 'frames-A-manifest.json'), (value) => { delete value.cleanup; return value; }); const manifestSha = sha(resolve(omission, 'frames-A-manifest.json'));
  edit(resolve(omission, 'asset-manifest.json'), (value) => { value.assets.find((a) => a.id === 'frame-manifest-A').sha256 = manifestSha; return value; });
  edit(resolve(omission, 'piece-scripts.json'), (value) => { value.pieces[0].precomposedAdapter.manifestSha256 = manifestSha; return value; });
  edit(resolve(omission, 'workflow-state.json'), (value) => { const scriptHash = sha(resolve(omission, 'piece-scripts.json')); value.scriptSha256 = scriptHash; value.pieceScriptsSha256 = scriptHash; value.assetManifestSha256 = sha(resolve(omission, 'asset-manifest.json')); return value; });
  run(cli, 'plan', omission); const omitted = run(cli, 'render', omission);
  if (omitted.status === 0 || !omitted.stderr.includes('SCHEMA_FRAME_MANIFEST')) errors.push(`${prefix}PRECOMPOSED_CLEANUP_OMISSION ${(omitted.stderr || '').trim()}`);
}
