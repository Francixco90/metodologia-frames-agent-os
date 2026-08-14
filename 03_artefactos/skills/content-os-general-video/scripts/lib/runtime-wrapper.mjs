import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  dirname, fail, json, load, mkdirSync, project, projectPath, refWithHash, run, runtimeDir, shaBytes,
} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';

function manifestAsset(a, kind, ref, hash, label) {
  const asset = a.assets.assets.find((item) => item.kind === kind && item.ref === ref && item.sha256 === hash);
  if (!asset || !asset.rights || !asset.provenance) fail(`WRAPPER_ASSET_${label}`);
  return asset;
}

function probe(ref) {
  const result = run('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,time_base,sample_rate,channels,channel_layout:format=duration', '-of', 'json', ref], project, 'WRAPPER_PROBE');
  const value = JSON.parse(result.stdout); return {streams: value.streams, durationMs: Math.round(Number(value.format.duration) * 1000)};
}

function normalizedProfile(ref) {
  const value = probe(ref); const video = value.streams.find((item) => item.codec_type === 'video'); const audio = value.streams.find((item) => item.codec_type === 'audio');
  if (!video || !audio) fail(`WRAPPER_STREAMS_${ref}`);
  return {
    durationMs: value.durationMs,
    video: Object.fromEntries(['codec_name', 'profile', 'width', 'height', 'pix_fmt', 'r_frame_rate', 'time_base'].map((key) => [key, video[key]])),
    audio: Object.fromEntries(['codec_name', 'profile', 'sample_rate', 'channels', 'channel_layout', 'time_base'].map((key) => [key, audio[key]])),
  };
}

function packetHashes(ref, selector) {
  const result = run('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-select_streams', `${selector}:0`, '-show_packets', '-show_entries', 'packet=data_hash', '-show_data_hash', 'sha256', '-of', 'json', ref], project, `WRAPPER_PACKETS_${selector}`);
  return JSON.parse(result.stdout).packets.map((item) => item.data_hash);
}

function subsequence(haystack, needle) {
  for (let index = 0; index <= haystack.length - needle.length; index += 1) if (needle.every((value, offset) => haystack[index + offset] === value)) return index;
  return -1;
}

export function verifyWrapperContract(a, piece) {
  const declared = piece.brandedWrapper; if (!declared) return null;
  const manifestPath = refWithHash(declared.brandKitRef, declared.brandKitSha256, `BRAND_KIT_${piece.id}`);
  const manifest = load(manifestPath, `BRAND_KIT_${piece.id}`); validateSchema('branded-wrapper-manifest-v1.schema.json', manifest, `BRAND_KIT_${piece.id}`, fail);
  manifestAsset(a, 'brand-kit-manifest', declared.brandKitRef, declared.brandKitSha256, piece.id);
  if (manifest.profile === 'metodologia' && manifest.generator.id !== 'metodologia-brand-kit-generator') fail(`WRAPPER_BRAND_GENERATOR_${piece.id}`);
  const intro = manifestAsset(a, 'wrapper-intro', manifest.intro.ref, manifest.intro.sha256, `${piece.id}_INTRO`);
  const outro = manifestAsset(a, 'wrapper-outro', manifest.outro.ref, manifest.outro.sha256, `${piece.id}_OUTRO`);
  if (intro.id !== manifest.intro.assetId || outro.id !== manifest.outro.assetId || intro.rights !== manifest.intro.rights || outro.rights !== manifest.outro.rights) fail(`WRAPPER_MANIFEST_ASSET_BINDING_${piece.id}`);
  refWithHash(manifest.intro.ref, manifest.intro.sha256, `WRAPPER_INTRO_${piece.id}`); refWithHash(manifest.outro.ref, manifest.outro.sha256, `WRAPPER_OUTRO_${piece.id}`);
  const body = a.sourcePack.sources.find((source) => source.id === declared.bodySourceId && source.ref === declared.bodyRef && source.sha256 === declared.bodySha256);
  if (!body || !body.rights || !body.provenance) fail(`WRAPPER_BODY_SOURCE_${piece.id}`); refWithHash(declared.bodyRef, declared.bodySha256, `WRAPPER_BODY_${piece.id}`);
  const profiles = {intro: normalizedProfile(manifest.intro.ref), body: normalizedProfile(declared.bodyRef), outro: normalizedProfile(manifest.outro.ref)};
  if (json(profiles.intro.video) !== json(profiles.body.video) || json(profiles.intro.video) !== json(profiles.outro.video) || json(profiles.intro.audio) !== json(profiles.body.audio) || json(profiles.intro.audio) !== json(profiles.outro.audio)) fail(`WRAPPER_PROFILE_INCOMPATIBLE_${piece.id}`);
  if (Math.abs(profiles.intro.durationMs - manifest.intro.durationMs) > 25 || Math.abs(profiles.outro.durationMs - manifest.outro.durationMs) > 25) fail(`WRAPPER_DURATION_BINDING_${piece.id}`);
  return {manifest, profiles};
}

export function wrapperEvidence(a, piece, outputRef) {
  const contract = verifyWrapperContract(a, piece); if (!contract) return null;
  const bodyVideo = packetHashes(piece.brandedWrapper.bodyRef, 'v'); const bodyAudio = packetHashes(piece.brandedWrapper.bodyRef, 'a');
  const outputVideo = packetHashes(outputRef, 'v'); const outputAudio = packetHashes(outputRef, 'a');
  const fullVideoAt = subsequence(outputVideo, bodyVideo); const videoTailAt = fullVideoAt >= 0 ? fullVideoAt + 1 : subsequence(outputVideo, bodyVideo.slice(1)); const audioAt = subsequence(outputAudio, bodyAudio);
  if (videoTailAt < 0 || audioAt < 0) fail(`WRAPPER_BODY_STREAM_NOT_PRESERVED_${piece.id}`);
  return {
    mode: 'branded-wrapper-v1', brandKitRef: piece.brandedWrapper.brandKitRef, brandKitSha256: piece.brandedWrapper.brandKitSha256,
    introSha256: contract.manifest.intro.sha256, bodySha256: piece.brandedWrapper.bodySha256, outroSha256: contract.manifest.outro.sha256,
    introDurationMs: contract.profiles.intro.durationMs, bodyDurationMs: contract.profiles.body.durationMs, outroDurationMs: contract.profiles.outro.durationMs,
    bodyVideoPacketSha256: shaBytes(json(bodyVideo)), bodyAudioPacketSha256: shaBytes(json(bodyAudio)),
    bodyVideoPackets: bodyVideo.length, bodyVideoPacketsPreserved: fullVideoAt >= 0 ? bodyVideo.length : bodyVideo.length - 1,
    bodyAudioPackets: bodyAudio.length, bodyAudioPacketsPreserved: bodyAudio.length,
    videoFirstPacketPolicy: fullVideoAt >= 0 ? 'identical' : 'container-parameter-set-normalization-only',
    videoStartPacket: fullVideoAt >= 0 ? fullVideoAt : videoTailAt - 1, audioStartPacket: audioAt,
    videoCodecMode: 'copy', audioCodecMode: 'copy', musicUnderBody: false, overlaysOnBody: false,
  };
}

export function renderWrapper(a, piece) {
  const contract = verifyWrapperContract(a, piece); if (!contract) return null;
  const refs = [contract.manifest.intro.ref, piece.brandedWrapper.bodyRef, contract.manifest.outro.ref];
  const list = resolve(runtimeDir, `wrapper-${piece.id}.txt`); writeFileSync(list, refs.map((ref) => `file '${projectPath(ref, `WRAPPER_PART_${piece.id}`).replaceAll("'", "'\\''")}'`).join('\n') + '\n');
  const output = projectPath(piece.output, `WRAPPER_OUTPUT_${piece.id}`);
  mkdirSync(dirname(output), {recursive: true});
  run('ffmpeg', ['-protocol_whitelist', 'file', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', output], project, `WRAPPER_RENDER_${piece.id}`);
  return wrapperEvidence(a, piece, piece.output);
}
