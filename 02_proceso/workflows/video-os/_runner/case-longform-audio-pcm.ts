import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute, resolve} from 'node:path';

type Ref = {ref: string; sha256: string; bytes: number};
const sha = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
export type CaseLongformAudioToolAuthority = {
  ffmpeg_path: string;
  ffmpeg_sha256: string;
  ffprobe_path: string;
  ffprobe_sha256: string;
};
const assertTool = (path: string, expected: string) => {
  if (!isAbsolute(path) || realpathSync(path) !== path)
    throw new Error('VIDEO-OS-CASE-AUDIO-TOOL-UNTRUSTED');
  const stat = lstatSync(path);
  const digest = sha(readFileSync(path));
  if (stat.isSymbolicLink() || !stat.isFile() || digest !== expected)
    throw new Error('VIDEO-OS-CASE-AUDIO-TOOL-UNTRUSTED');
  return {dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, digest};
};
export const assertCaseLongformAudioStartAlignment = (
  bytes: Buffer,
  tool: CaseLongformAudioToolAuthority,
): void => {
  const before = assertTool(tool.ffprobe_path, tool.ffprobe_sha256);
  const root = mkdtempSync(resolve(tmpdir(), 'video-os-case-audio-probe-'));
  const snapshot = resolve(root, 'source.mp4');
  writeFileSync(snapshot, bytes, {flag: 'wx', mode: 0o600});
  try {
    // prettier-ignore
    const result = spawnSync(tool.ffprobe_path,
      ['-v', 'error', '-show_entries', 'stream=index,codec_type,start_time', '-of', 'json', snapshot],
      {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
    const after = assertTool(tool.ffprobe_path, tool.ffprobe_sha256);
    const parsed = JSON.parse(result.stdout || '{}') as {
      streams?: Array<{index?: number; codec_type?: string; start_time?: string}>;
    };
    const streams = parsed.streams;
    const video = streams?.filter(({codec_type}) => codec_type === 'video')[0];
    const audio = streams?.filter(({codec_type}) => codec_type === 'audio')[0];
    const videoStart = Number(video?.start_time);
    const audioStart = Number(audio?.start_time);
    const tolerance = 1 / 48_000;
    if (
      result.status !== 0 ||
      JSON.stringify(before) !== JSON.stringify(after) ||
      !Number.isInteger(video?.index) ||
      !Number.isInteger(audio?.index) ||
      !Number.isFinite(videoStart) ||
      !Number.isFinite(audioStart) ||
      Math.abs(videoStart) > tolerance ||
      Math.abs(audioStart) > tolerance ||
      Math.abs(videoStart - audioStart) > tolerance
    )
      throw new Error('VIDEO-OS-CASE-AUDIO-START-PTS-DRIFT');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
};

export const deriveCaseLongformPcmDonorEvidence = (
  bytes: Buffer,
  media: Ref,
  sourceSha256: string,
  startFrame: number,
  endFrame: number,
  tool: CaseLongformAudioToolAuthority,
) => {
  assertCaseLongformAudioStartAlignment(bytes, tool);
  const beforeTool = assertTool(tool.ffmpeg_path, tool.ffmpeg_sha256);
  const root = mkdtempSync(resolve(tmpdir(), 'video-os-case-pcm-'));
  const snapshot = resolve(root, 'source.mp4');
  writeFileSync(snapshot, bytes, {flag: 'wx', mode: 0o600});
  const startSample = startFrame * 2000;
  const durationSamples = (endFrame - startFrame + 1) * 2000;
  try {
    const result = spawnSync(
      tool.ffmpeg_path,
      [
        '-v',
        'error',
        '-i',
        snapshot,
        '-map',
        '0:a:0',
        '-af',
        `aresample=48000,atrim=start_sample=${startSample}:end_sample=${startSample + durationSamples},asetpts=PTS-STARTPTS`,
        '-ac',
        '1',
        '-ar',
        '48000',
        '-f',
        's16le',
        '-',
      ],
      {maxBuffer: 16 * 1024 * 1024},
    );
    const afterTool = assertTool(tool.ffmpeg_path, tool.ffmpeg_sha256);
    const pcm = result.stdout;
    if (
      JSON.stringify(beforeTool) !== JSON.stringify(afterTool) ||
      result.status !== 0 ||
      !Buffer.isBuffer(pcm) ||
      pcm.byteLength !== durationSamples * 2
    )
      throw new Error('VIDEO-OS-CASE-AUDIO-DONOR-DECODE-FAILED');
    let squares = 0;
    let peak = 0;
    for (let offset = 0; offset < pcm.byteLength; offset += 2) {
      const sample = Math.abs(pcm.readInt16LE(offset)) / 32768;
      squares += sample * sample;
      peak = Math.max(peak, sample);
    }
    const db = (value: number): number =>
      Number((value === 0 ? -120 : 20 * Math.log10(value)).toFixed(6));
    return {
      source_sha256: sourceSha256,
      media,
      source_start_frame: startFrame,
      source_end_frame: endFrame,
      audio_stream_index: 0 as const,
      sample_rate: 48_000 as const,
      channels: 1 as const,
      sample_format: 's16le' as const,
      pcm_sha256: sha(pcm),
      pcm_bytes: pcm.byteLength,
      duration_samples: durationSamples,
      rms_dbfs: db(Math.sqrt(squares / durationSamples)),
      peak_dbfs: db(peak),
      speech_free_review: 'PENDING_EXTERNAL_REVIEW' as const,
    };
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
};
