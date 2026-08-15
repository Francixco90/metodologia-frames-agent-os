import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

import {z} from 'zod';

export const CaseLongformHash = z.string().regex(/^[a-f0-9]{64}$/u);
export const CaseLongformMaterialRef = z.strictObject({
  ref: z.string().min(1).max(500),
  sha256: CaseLongformHash,
  bytes: z.number().int().positive(),
});
export const CaseLongformMediaMeasurements = z.strictObject({
  width: z.literal(1920),
  height: z.literal(1080),
  fps: z.literal(24),
  frame_count: z.number().int().positive(),
  duration_ms: z.number().int().positive(),
  video_streams: z.literal(1),
  audio_streams: z.number().int().min(1),
});

type MaterialRef = z.infer<typeof CaseLongformMaterialRef>;
export type MediaMeasurements = z.infer<typeof CaseLongformMediaMeasurements>;

export const readCaseLongformMaterial = (
  rootRef: string,
  ref: MaterialRef,
): {path: string; bytes: Buffer} => {
  const root = realpathSync(rootRef);
  if (isAbsolute(ref.ref) || /(?:^|[/\\])\.\.(?:[/\\]|$)|^[a-z]+:/iu.test(ref.ref))
    throw new Error('VIDEO-OS-CASE-UNSAFE-REF');
  const path = resolve(root, ref.ref);
  const rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('VIDEO-OS-CASE-REF-ESCAPE');
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('VIDEO-OS-CASE-REF-NOT-REGULAR');
  const real = realpathSync(path);
  if (real !== root && !real.startsWith(`${root}${sep}`))
    throw new Error('VIDEO-OS-CASE-REF-ESCAPE');
  const bytes = readFileSync(real);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (stat.size !== ref.bytes || bytes.byteLength !== ref.bytes || digest !== ref.sha256)
    throw new Error('VIDEO-OS-CASE-MATERIAL-DRIFT');
  return {path: real, bytes};
};

export const probeCaseLongformMedia = (path: string): MediaMeasurements => {
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-count_frames',
      '-show_entries',
      'stream=codec_type,width,height,r_frame_rate,avg_frame_rate,nb_read_frames:format=duration',
      '-of',
      'json',
      path,
    ],
    {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024},
  );
  if (probe.status !== 0) throw new Error('VIDEO-OS-CASE-MEDIA-PROBE-FAILED');
  const raw = JSON.parse(probe.stdout) as {
    streams?: Array<Record<string, string | number>>;
    format?: {duration?: string};
  };
  const videos = raw.streams?.filter(({codec_type}) => codec_type === 'video') ?? [];
  const audios = raw.streams?.filter(({codec_type}) => codec_type === 'audio') ?? [];
  const video = videos[0];
  const duration = Number(raw.format?.duration);
  const measurements = CaseLongformMediaMeasurements.parse({
    width: video?.width,
    height: video?.height,
    fps: video?.r_frame_rate === '24/1' && video?.avg_frame_rate === '24/1' ? 24 : 0,
    frame_count: Number(video?.nb_read_frames),
    duration_ms: Math.round(duration * 1000),
    video_streams: videos.length,
    audio_streams: audios.length,
  });
  if (Math.abs(measurements.frame_count - (measurements.duration_ms / 1000) * 24) > 1)
    throw new Error('VIDEO-OS-CASE-MEDIA-FRAME-DURATION-MISMATCH');
  const decode = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  if (decode.status !== 0) throw new Error('VIDEO-OS-CASE-MEDIA-DECODE-FAILED');
  return measurements;
};
