#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateSchema} from './schema-validation.mjs';

const COMMANDS = new Set(['ingest', 'index', 'script', 'plan', 'render', 'verify', 'package']);
const HASH = /^[a-f0-9]{64}$/;
const PRIVATE = [/\/Users\//, /\/Documents\//i, /\/Downloads\//i, /[A-Z]:\\Users\\/i];
const NETWORK = /(?:https?|tcp|udp|rtmps?|rtsp|ftp|sftp|srt|rist|smb|ssh|tls|gopher|ws|wss):(?:\/\/)?/iu;
const COPY_DENY = [/\$\s?\d+/u, /únete a la ruta/iu, /software útil con ia/iu, /gemini/iu];
const LAYERS = ['body', 'caption', 'overlay', 'curtain', 'audio'];

function fail(message, code = 1) { console.error(`COSR-GV_${message}`); process.exit(code); }
function arg(name, fallback = null) { const at = process.argv.indexOf(`--${name}`); return at >= 0 ? process.argv[at + 1] : fallback; }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function json(value) { return `${JSON.stringify(canonical(value), null, 2)}\n`; }
function shaBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function shaFile(path) { return shaBytes(readFileSync(path)); }
function load(path, label) {
  if (!existsSync(path)) fail(`MISSING_${label} ${path}`);
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch (error) { fail(`INVALID_JSON_${label} ${error.message}`); }
}
function write(path, value) { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, json(value)); }
function assertHash(value, label) { if (!HASH.test(value || '')) fail(`INVALID_HASH_${label}`); }
function run(binary, args, cwd, label) {
  const result = spawnSync(binary, args, {cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  if (result.status !== 0) fail(`${label} ${(result.stderr || result.stdout || '').split('\n').slice(-5).join(' ')}`);
  return result;
}

const command = process.argv[2];
if (!COMMANDS.has(command)) fail(`USAGE video-cli.mjs <${[...COMMANDS].join('|')}> --project <dir>`, 2);
const project = resolve(arg('project', '.'));
const projectReal = realpathSync(project);
const statePath = resolve(project, arg('state', 'workflow-state.json'));
const runtimeDir = resolve(project, '.frames-video');

function projectPath(ref, label = 'REF') {
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || ref.includes('\0') || NETWORK.test(ref)) fail(`UNSAFE_${label} ${ref}`);
  if (PRIVATE.some((pattern) => pattern.test(ref))) fail(`PRIVATE_${label} ${ref}`);
  const path = resolve(project, ref);
  const rel = relative(project, path);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`OUTSIDE_PROJECT_${label} ${ref}`);
  let cursor = project;
  for (const part of rel.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail(`SYMLINK_${label} ${ref}`);
  }
  let anchor = path;
  while (!existsSync(anchor)) anchor = dirname(anchor);
  const physical = realpathSync(anchor);
  const physicalRel = relative(projectReal, physical);
  if (physicalRel === '..' || physicalRel.startsWith(`..${sep}`) || isAbsolute(physicalRel)) fail(`OUTSIDE_PROJECT_${label} ${ref}`);
  return path;
}

function loadState({allowV1 = true} = {}) {
  const state = load(statePath, 'STATE');
  if (!['general-video-v1', 'general-video-v2'].includes(state.schemaVersion)) fail(`STATE_VERSION ${state.schemaVersion}`);
  if (state.schemaVersion === 'general-video-v2') validateSchema('general-video-v2.schema.json', state, 'STATE', fail);
  if (!allowV1 && (state.schemaVersion !== 'general-video-v2' || state.contractRevision !== 2)) fail('MIGRATION_REQUIRED general-video-v2 revision 2 required');
  if (state.route !== 'content-os-general-video' || state.offline !== true) fail('STATE_ROUTE_OR_OFFLINE');
  const blob = JSON.stringify(state);
  if (PRIVATE.some((pattern) => pattern.test(blob)) || NETWORK.test(blob)) fail('PRIVATE_OR_NETWORK_REF state');
  return state;
}

function refWithHash(ref, declared, label, {required = true} = {}) {
  if (!ref || !declared) {
    if (required) fail(`MISSING_BINDING_${label}`);
    return null;
  }
  const path = projectPath(ref, `${label}_REF`);
  assertHash(declared, label);
  if (!existsSync(path) || shaFile(path) !== declared) fail(`HASH_DRIFT_${label}`);
  return path;
}

function artifacts(state) {
  if (state.schemaVersion !== 'general-video-v2') return {state};
  const sourcePath = refWithHash(state.sourcePackRef, state.sourcePackSha256, 'SOURCE_PACK');
  const specPath = refWithHash(state.specRef, state.specSha256, 'SPEC');
  const scriptPath = refWithHash(state.scriptRef, state.scriptSha256, 'SCRIPT');
  const scriptsPath = refWithHash(state.pieceScriptsRef, state.pieceScriptsSha256, 'PIECE_SCRIPTS');
  const assetsPath = refWithHash(state.assetManifestRef, state.assetManifestSha256, 'ASSET_MANIFEST');
  const abPath = state.abTestRef ? refWithHash(state.abTestRef, state.abTestSha256, 'AB_TEST') : null;
  const result = {
    state, sourcePath, specPath, scriptPath, scriptsPath, assetsPath, abPath,
    sourcePack: load(sourcePath, 'SOURCE_PACK'), spec: load(specPath, 'SPEC'),
    scripts: load(scriptsPath, 'PIECE_SCRIPTS'), assets: load(assetsPath, 'ASSET_MANIFEST'),
    ...(abPath ? {ab: load(abPath, 'AB_TEST')} : {}),
  };
  validateSchema('source-pack-v1.schema.json', result.sourcePack, 'SOURCE_PACK', fail);
  validateSchema('video-spec-v1.schema.json', result.spec, 'SPEC', fail);
  validateSchema('piece-scripts-v2.schema.json', result.scripts, 'PIECE_SCRIPTS', fail);
  validateSchema(`${result.assets.schemaVersion}.schema.json`, result.assets, 'ASSET_MANIFEST', fail);
  if (result.ab) validateSchema('ab-test-v1.schema.json', result.ab, 'AB_TEST', fail);
  return result;
}

function currentHashes(a) {
  return {
    sourcePackSha256: shaFile(a.sourcePath), specSha256: shaFile(a.specPath), scriptSha256: shaFile(a.scriptPath),
    pieceScriptsSha256: shaFile(a.scriptsPath), assetManifestSha256: shaFile(a.assetsPath),
    ...(a.abPath ? {abTestSha256: shaFile(a.abPath)} : {}),
  };
}

function verifyBinding(a) {
  const {state, spec, scripts} = a;
  if (state.specId !== spec.specId || state.specId !== scripts.specId) fail('SPEC_ID_BINDING');
  if (scripts.specSha256 !== state.specSha256 || a.assets.specSha256 !== state.specSha256) fail('SPEC_HASH_BINDING');
  if (a.ab && (a.ab.specId !== state.specId || a.ab.specSha256 !== state.specSha256 || a.ab.state !== 'candidate')) fail('AB_SPEC_STATE_BINDING');
  return currentHashes(a);
}

function verifySources(a) {
  if (a.sourcePack.schemaVersion !== 'source-pack-v1' || a.sourcePack.state !== 'FROZEN') fail('SOURCE_PACK_NOT_FROZEN');
  const ids = new Set();
  for (const source of a.sourcePack.sources || []) {
    if (ids.has(source.id)) fail(`DUPLICATE_SOURCE ${source.id}`);
    ids.add(source.id); assertHash(source.sha256, `SOURCE_${source.id}`);
    const path = projectPath(source.ref, `SOURCE_${source.id}`);
    if (!existsSync(path) || shaFile(path) !== source.sha256) fail(`SOURCE_DRIFT ${source.id}`);
    if (!source.provenance || !source.rights || !source.authority) fail(`SOURCE_AUTHORITY ${source.id}`);
  }
  return ids;
}

function verifyAssets(a) {
  if (!['video-asset-manifest-v1', 'video-asset-manifest-v2'].includes(a.assets.schemaVersion)) fail('ASSET_MANIFEST_VERSION');
  for (const asset of a.assets.assets || []) {
    assertHash(asset.sha256, `ASSET_${asset.id}`);
    const path = projectPath(asset.ref ?? asset.path, `ASSET_${asset.id}`);
    if (!existsSync(path) || shaFile(path) !== asset.sha256) fail(`ASSET_DRIFT ${asset.id}`);
    if (!asset.provenance || !asset.rights) fail(`ASSET_RIGHTS ${asset.id}`);
    if (a.assets.schemaVersion === 'video-asset-manifest-v2' && (!asset.generator?.id || !HASH.test(asset.generator?.configSha256 || ''))) fail(`ASSET_GENERATOR ${asset.id}`);
  }
}

function verifyPieceRef(piece, refKey, hashKey, label) {
  const ref = piece[refKey]; const declared = piece[hashKey];
  if (!ref && !declared) return null;
  return refWithHash(ref, declared, label);
}

function verifyFont(font, expectedFamily, pieceId, role) {
  if (font?.family !== expectedFamily) fail(`FONT_ROLE_${pieceId}_${role}`);
  const path = refWithHash(font?.ref, font?.sha256, `FONT_${pieceId}_${role}`);
  if (!/\.(?:ttf|otf|woff2?)$/iu.test(font.ref)) fail(`FONT_FORMAT_${pieceId}_${role}`);
  return {family: font.family, ref: font.ref, sha256: shaFile(path)};
}

function verifyScripts(a, sourceIds) {
  if (a.scripts.schemaVersion !== 'piece-scripts-v2') fail(`MIGRATION_REQUIRED ${a.scripts.schemaVersion || 'unknown'} cannot compile`);
  const sourceMap = new Map(a.sourcePack.sources.map((source) => [source.id, source]));
  for (const piece of a.scripts.pieces || []) {
    if (!['use', 'extend', 'reframe', 'discard'].includes(piece.decision)) fail(`PIECE_DECISION ${piece.id}`);
    if (piece.decision !== 'discard' && (!piece.sourceSpans?.length || !piece.dependencies?.length)) fail(`PIECE_EVIDENCE ${piece.id}`);
    for (const span of piece.sourceSpans || []) {
      if (!sourceIds.has(span.sourceId) || span.endMs <= span.startMs || sourceMap.get(span.sourceId).sha256 !== span.sourceSha256) fail(`SOURCE_SPAN_${piece.id}`);
    }
    for (const span of piece.visualSpans || []) if (!sourceIds.has(span.sourceId) || span.endMs <= span.startMs) fail(`VISUAL_SPAN_${piece.id}`);
    if (piece.scriptMode === 'transcript_derived') {
      verifyPieceRef(piece, 'captionTrackRef', 'captionTrackSha256', `CAPTION_${piece.id}`);
      verifyPieceRef(piece, 'correctionLedgerRef', 'correctionLedgerSha256', `LEDGER_${piece.id}`);
    }
    if ((piece.claims || []).some((claim) => claim.material && claim.status === 'ambiguous')) fail(`MATERIAL_CLAIM_AMBIGUOUS_${piece.id}`);
    if (Math.abs(piece.format.frameCount - Math.round(piece.format.durationMs * piece.format.fps / 1000)) > 1) fail(`FRAME_TIMING_${piece.id}`);
    if (piece.miniclip) {
      verifyFont(piece.miniclip.fonts?.title, 'Montserrat', piece.id, 'title');
      verifyFont(piece.miniclip.fonts?.caption, 'Poppins', piece.id, 'caption');
      verifyFont(piece.miniclip.fonts?.disclosure, 'Montserrat', piece.id, 'disclosure');
      for (const [refKey, hashKey, label] of [['copyRef', 'copySha256', 'COPY'], ['timingRef', 'timingSha256', 'TIMING']]) verifyPieceRef(piece.miniclip, refKey, hashKey, `${label}_${piece.id}`);
      const curtain = piece.dependencies.find((dep) => dep.kind === 'curtain');
      if (!curtain || shaFile(projectPath(piece.miniclip.curtainRef, `CURTAIN_${piece.id}`)) !== curtain.sha256) fail(`HASH_DRIFT_CURTAIN_${piece.id}`);
    }
  }
}

export {
  COPY_DENY, HASH, LAYERS, NETWORK, PRIVATE, arg, artifacts, command, dirname,
  existsSync, fail, isAbsolute, json, load, loadState, mkdirSync, project,
  projectPath, readFileSync, refWithHash, relative, resolve, run, runtimeDir,
  shaBytes, shaFile, statePath, statSync, verifyAssets, verifyBinding, verifyFont,
  verifyPieceRef, verifyScripts, verifySources, write,
};
