import {
  NETWORK, PRIVATE, dirname, existsSync, fail, isAbsolute, project, projectPath,
  run, shaFile, statSync,
} from './runtime-core.mjs';

export function validateFfmpeg(piece, virtualInputs = new Set()) {
  const render = piece.render;
  if (!render || render.engine !== 'ffmpeg' || !Array.isArray(render.args)) fail(`RENDER_RECIPE_${piece.id}`);
  if (render.args.at(-1) !== piece.output) fail(`FFMPEG_OUTPUT_BINDING_${piece.id}`);
  for (const token of render.args) if (typeof token !== 'string' || PRIVATE.some((pattern) => pattern.test(token)) || NETWORK.test(token) || isAbsolute(token) || token.includes('..')) fail(`UNSAFE_FFMPEG_ARG_${piece.id}`);
  for (let index = 0; index < render.args.length; index += 1) if (render.args[index] === '-i') {
    const inputRef = render.args[index + 1];
    if (virtualInputs.has(inputRef)) continue;
    const inputPath = projectPath(inputRef, `FFMPEG_INPUT_${piece.id}`);
    if (!existsSync(inputPath) || !statSync(inputPath).isFile()) fail(`FFMPEG_INPUT_MISSING_${piece.id}`);
  }
  if (render.mode === 'audio-remux') {
    const at = render.args.indexOf('-c:v'); if (at < 0 || render.args[at + 1] !== 'copy') fail(`REMUX_MUST_COPY_VIDEO_${piece.id}`);
  }
}

function fraction(value) { const [a, b = '1'] = String(value).split('/').map(Number); return b ? a / b : 0; }
export function streamHash(ref, selector, copy = false) {
  const args = ['-v', 'error', '-protocol_whitelist', 'file', '-i', ref, '-map', `0:${selector}:0`, ...(copy ? ['-c', 'copy'] : []), '-f', 'hash', '-hash', 'sha256', '-'];
  const result = run('ffmpeg', args, project, `STREAM_HASH_${selector}`); const match = result.stdout.match(/SHA256=([a-f0-9]{64})/iu); if (!match) fail(`STREAM_HASH_PARSE_${selector}`); return match[1];
}
export function measureOutput(ref) {
  const probe = run('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-count_frames', '-show_entries', 'format=duration:stream=index,codec_type,width,height,avg_frame_rate,nb_read_frames', '-of', 'json', ref], project, 'FFPROBE');
  const data = JSON.parse(probe.stdout); const video = data.streams.find((stream) => stream.codec_type === 'video'); const audio = data.streams.find((stream) => stream.codec_type === 'audio');
  if (!video) fail('OUTPUT_VIDEO_STREAM');
  let pcmSha256 = null; let integratedLufs = null; let truePeakDbtp = null;
  if (audio) {
    pcmSha256 = streamHash(ref, 'a');
    const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-protocol_whitelist', 'file', '-i', ref, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], project, 'LOUDNESS');
    const matches = loud.stderr.match(/\{\s*"input_i"[\s\S]*?\}/gu); const measured = matches ? JSON.parse(matches.at(-1)) : null;
    integratedLufs = measured ? Number(measured.input_i) : null; truePeakDbtp = measured ? Number(measured.input_tp) : null;
  }
  return {outputSha256: shaFile(projectPath(ref, 'MEASURE_OUTPUT')), durationMs: Math.round(Number(data.format.duration) * 1000), frameCount: Number(video.nb_read_frames), width: Number(video.width), height: Number(video.height), fps: fraction(video.avg_frame_rate), videoStreamSha256: streamHash(ref, 'v', true), pcmSha256, integratedLufs, truePeakDbtp};
}
