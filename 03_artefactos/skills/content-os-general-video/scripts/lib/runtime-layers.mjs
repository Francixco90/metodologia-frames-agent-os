import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fail, json, project, projectPath, run, runtimeDir, shaFile} from './runtime-core.mjs';
import {streamHash} from './runtime-media.mjs';
import {cleanupFilter, verifyCleanBody} from './runtime-cleanup.mjs';

function probe(ref) {
  const value = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate,channels', '-of', 'json', ref], project, 'LAYER_PROBE').stdout);
  return Object.fromEntries((value.streams || []).map((stream) => [stream.codec_type, stream]));
}

function compatible(body, curtain) {
  const videoKeys = ['codec_name', 'width', 'height', 'pix_fmt', 'r_frame_rate'];
  const audioKeys = ['codec_name', 'sample_rate', 'channels'];
  return videoKeys.every((key) => body.video?.[key] === curtain.video?.[key]) && audioKeys.every((key) => body.audio?.[key] === curtain.audio?.[key]);
}

function renderBody(piece, planned) {
  const ref = `.frames-video/cache/body/${planned.layerKeys.body}.mp4`; const path = projectPath(ref, `BODY_${piece.id}`);
  const cleanup = cleanupFilter(piece);
  if (!existsSync(path)) {
    mkdirSync(dirname(path), {recursive: true});
    const args = [...piece.render.args]; args[args.length - 1] = ref;
    const vf = args.indexOf('-vf'); if (vf < 0 || !args[vf + 1]) fail(`CLEANUP_FILTER_INSERT_${piece.id}`); args[vf + 1] = `${cleanup.filter},${args[vf + 1]}`;
    run('ffmpeg', ['-protocol_whitelist', 'file', ...args], project, `BODY_RENDER_${piece.id}`);
  }
  const cleanupVerification = verifyCleanBody(piece, ref, cleanup);
  return {ref, path, sha256: shaFile(path), videoStreamSha256: streamHash(ref, 'v', true), mtimeMs: statSync(path).mtimeMs, cleanupVerification};
}

function renderCurtain(piece, planned, bodyProfile) {
  const ref = `.frames-video/cache/curtain/${planned.layerKeys.curtain}.mp4`; const path = projectPath(ref, `CURTAIN_${piece.id}`);
  if (!existsSync(path)) {
    mkdirSync(dirname(path), {recursive: true});
    const curtainPath = projectPath(piece.miniclip.curtainRef, `CURTAIN_CONFIG_${piece.id}`);
    const expected = piece.dependencies.find((dep) => dep.kind === 'curtain')?.sha256;
    if (!expected || shaFile(curtainPath) !== expected) fail(`CURTAIN_HASH_${piece.id}`);
    const curtain = JSON.parse(readFileSync(curtainPath, 'utf8'));
    const duration = curtain.durationMs / 1000; if (!(duration > 0) || duration * piece.format.fps % 1 !== 0) fail(`CURTAIN_TIMING_${piece.id}`);
    const color = `0x${planned.layerKeys.curtain.slice(0, 6)}`;
    const rate = bodyProfile.audio?.sample_rate || '48000'; const layout = bodyProfile.audio?.channels === 1 ? 'mono' : 'stereo';
    run('ffmpeg', ['-protocol_whitelist', 'file', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=${piece.format.width}x${piece.format.height}:r=${piece.format.fps}:d=${duration}`, '-f', 'lavfi', '-i', `anullsrc=r=${rate}:cl=${layout}:d=${duration}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(piece.format.fps), '-c:a', 'aac', '-shortest', ref], project, `CURTAIN_RENDER_${piece.id}`);
  }
  return {ref, path, sha256: shaFile(path), videoStreamSha256: streamHash(ref, 'v', true)};
}

export function renderLayered(piece, planned) {
  const body = renderBody(piece, planned); const bodyProfile = probe(body.ref); const curtain = renderCurtain(piece, planned, bodyProfile);
  if (!compatible(bodyProfile, probe(curtain.ref))) fail(`LAYER_STREAM_COPY_INCOMPATIBLE_${piece.id}`);
  const list = resolve(runtimeDir, `concat-${piece.id}.txt`);
  writeFileSync(list, `file '${curtain.path.replaceAll("'", "'\\''")}'\nfile '${body.path.replaceAll("'", "'\\''")}'\n`);
  mkdirSync(dirname(projectPath(piece.output, `OUTPUT_${piece.id}`)), {recursive: true});
  const assembly = `.frames-video/assembly-${piece.id}.mp4`;
  run('ffmpeg', ['-protocol_whitelist', 'file', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', assembly], project, `LAYER_CONCAT_${piece.id}`);
  run('ffmpeg', ['-protocol_whitelist', 'file', '-y', '-i', assembly, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-c:a', 'aac', piece.output], project, `LAYER_AUDIO_${piece.id}`);
  return {bodyArtifact: body, curtainArtifact: curtain, assemblySha256: shaFile(projectPath(piece.output, `OUTPUT_${piece.id}`)), layerBindingSha256: shaFile(list)};
}
