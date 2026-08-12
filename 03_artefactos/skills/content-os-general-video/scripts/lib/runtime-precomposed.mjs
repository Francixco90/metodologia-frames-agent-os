import {existsSync} from 'node:fs';
import {
  fail, json, load, projectPath, refWithHash, shaBytes, shaFile,
} from './runtime-core.mjs';
import {validateFfmpeg} from './runtime-media.mjs';
import {validateSchema} from './schema-validation.mjs';

function assetFor(a, kind, ref, hash, label) {
  const asset = a.assets.assets.find((item) => item.kind === kind && item.ref === ref && item.sha256 === hash);
  if (!asset) fail(`PRECOMPOSED_ASSET_${label}`);
  return asset;
}

function frameRef(pattern, index) {
  const match = pattern.match(/%0([1-9])d/u);
  if (!match) fail('PRECOMPOSED_FRAME_PATTERN');
  return pattern.replace(match[0], String(index).padStart(Number(match[1]), '0'));
}

export function verifyPrecomposed(a, piece) {
  const declared = piece.precomposedAdapter;
  if (!declared) return null;
  if (declared.id !== 'precomposed-frames-v1') fail(`PRECOMPOSED_ADAPTER_ID_${piece.id}`);
  const adapterPath = refWithHash(declared.ref, declared.sha256, `PRECOMPOSED_ADAPTER_${piece.id}`);
  const adapter = load(adapterPath, `PRECOMPOSED_ADAPTER_${piece.id}`);
  validateSchema('precomposed-adapter-v1.schema.json', adapter, `PRECOMPOSED_ADAPTER_${piece.id}`, fail);
  if (adapter.id !== declared.id) fail(`PRECOMPOSED_ADAPTER_BINDING_${piece.id}`);
  assetFor(a, 'precomposed-adapter', declared.ref, declared.sha256, piece.id);

  const manifestPath = refWithHash(declared.manifestRef, declared.manifestSha256, `FRAME_MANIFEST_${piece.id}`);
  const manifest = load(manifestPath, `FRAME_MANIFEST_${piece.id}`);
  validateSchema('precomposed-frame-manifest-v1.schema.json', manifest, `FRAME_MANIFEST_${piece.id}`, fail);
  assetFor(a, 'precomposed-frame-manifest', declared.manifestRef, declared.manifestSha256, piece.id);
  if (manifest.adapterId !== declared.id || manifest.frameCount !== piece.format.frameCount || manifest.frames.length !== manifest.frameCount) fail(`FRAME_MANIFEST_BINDING_${piece.id}`);

  const cleanup = piece.sourceCleanup;
  if (manifest.cleanup.ref !== cleanup.ref || manifest.cleanup.sha256 !== cleanup.sha256 || manifest.cleanup.order !== 'cleanup-before-treatment') fail(`PRECOMPOSED_CLEANUP_BINDING_${piece.id}`);
  if (shaFile(projectPath(manifest.cleanup.ref, `PRECOMPOSED_CLEANUP_${piece.id}`)) !== manifest.cleanup.sha256) fail(`PRECOMPOSED_CLEANUP_DRIFT_${piece.id}`);

  const configPath = refWithHash(manifest.generator.configRef, manifest.generator.configSha256, `GENERATOR_CONFIG_${piece.id}`);
  assetFor(a, 'generator-config', manifest.generator.configRef, manifest.generator.configSha256, piece.id);
  if (!manifest.generator.deterministic || !configPath) fail(`PRECOMPOSED_GENERATOR_${piece.id}`);
  const audioPath = refWithHash(manifest.audio.ref, manifest.audio.sha256, `PRECOMPOSED_AUDIO_${piece.id}`);
  if (!audioPath) fail(`PRECOMPOSED_AUDIO_${piece.id}`);

  for (let index = 0; index < manifest.frames.length; index += 1) {
    const frame = manifest.frames[index];
    if (frame.index !== index || frame.ref !== frameRef(manifest.framePattern, index)) fail(`PRECOMPOSED_FRAME_ORDER_${piece.id}`);
    const path = projectPath(frame.ref, `PRECOMPOSED_FRAME_${piece.id}_${index}`);
    if (!existsSync(path) || shaFile(path) !== frame.sha256) fail(`PRECOMPOSED_FRAME_DRIFT_${piece.id}_${index}`);
  }
  const framesSha256 = shaBytes(json(manifest.frames));
  if (framesSha256 !== manifest.framesSha256) fail(`PRECOMPOSED_FRAMES_HASH_${piece.id}`);
  const derivation = {...manifest}; delete derivation.derivationSha256;
  if (shaBytes(json(derivation)) !== manifest.derivationSha256) fail(`PRECOMPOSED_DERIVATION_${piece.id}`);
  validateFfmpeg(piece, new Set([manifest.framePattern]));
  const inputs = piece.render.args.flatMap((token, index, all) => token === '-i' ? [all[index + 1]] : []);
  if (inputs.length !== 2 || inputs[0] !== manifest.framePattern || inputs[1] !== manifest.audio.ref) fail(`PRECOMPOSED_INPUT_BINDING_${piece.id}`);
  return {
    adapterId: declared.id, adapterRef: declared.ref, adapterSha256: declared.sha256,
    manifestRef: declared.manifestRef, manifestSha256: declared.manifestSha256,
    frameCount: manifest.frameCount, framesSha256, cleanedBodySha256: framesSha256,
    cleanupRef: manifest.cleanup.ref, cleanupSha256: manifest.cleanup.sha256,
    filterOrder: manifest.cleanup.order, generatorConfigRef: manifest.generator.configRef,
    generatorConfigSha256: manifest.generator.configSha256, derivationSha256: manifest.derivationSha256,
  };
}
