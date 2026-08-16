import {spawnSync} from 'node:child_process';
import {lstatSync} from 'node:fs';

export type CaseLongformRgbRoi = {x: number; y: number; width: number; height: number};
export type CaseLongformRgbProbe = {frame_count: number; time_base: string};

export const probeCaseLongformRgbMedia = (ffprobe: string, path: string): CaseLongformRgbProbe => {
  const result = spawnSync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-count_frames',
      '-show_entries',
      'stream=codec_type,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,start_time,time_base:format=format_name',
      '-of',
      'json',
      path,
    ],
    {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024},
  );
  if (result.status !== 0) throw new Error('VIDEO-OS-CASE-RGB-PROBE-FAILED');
  const raw = JSON.parse(result.stdout) as {
    streams?: Array<Record<string, string | number>>;
    format?: {format_name?: string};
  };
  const stream = raw.streams?.[0];
  const frames = Number(stream?.nb_read_frames);
  if (
    raw.streams?.length !== 1 ||
    stream?.codec_type !== 'video' ||
    stream.width !== 1920 ||
    stream.height !== 1080 ||
    stream.r_frame_rate !== '24/1' ||
    stream.avg_frame_rate !== '24/1' ||
    Number(stream.start_time) !== 0 ||
    !String(stream.time_base).match(/^1\/\d+$/u) ||
    !Number.isSafeInteger(frames) ||
    frames < 1 ||
    !raw.format?.format_name?.split(',').includes('mp4')
  )
    throw new Error('VIDEO-OS-CASE-RGB-MEDIA-DRIFT');
  return {frame_count: frames, time_base: String(stream.time_base)};
};

export const extractCaseLongformRgbRange = (
  ffmpeg: string,
  input: string,
  output: string,
  startFrame: number,
  endFrame: number,
  roi: CaseLongformRgbRoi,
): {path: string; frame_bytes: number; frame_count: number} => {
  const frameCount = endFrame - startFrame + 1;
  if (startFrame < 0 || frameCount < 1) throw new Error('VIDEO-OS-CASE-RGB-RANGE');
  const filter = `trim=start_frame=${startFrame}:end_frame=${endFrame + 1},crop=${roi.width}:${roi.height}:${roi.x}:${roi.y}`;
  const result = spawnSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      input,
      '-map',
      '0:v:0',
      '-vf',
      filter,
      '-fps_mode',
      'passthrough',
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      '-y',
      output,
    ],
    {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024},
  );
  if (result.status !== 0) throw new Error('VIDEO-OS-CASE-RGB-EXTRACT-FAILED');
  const frameBytes = roi.width * roi.height * 3;
  const stat = lstatSync(output);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== frameBytes * frameCount)
    throw new Error('VIDEO-OS-CASE-RGB-EXTRACT-SIZE');
  return {path: output, frame_bytes: frameBytes, frame_count: frameCount};
};
