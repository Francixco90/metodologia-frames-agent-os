import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {
  withCaseLongformMediaSnapshot,
  type CaseLongformMediaSnapshotHooks,
} from './case-longform-media-snapshot.ts';
import {
  withCaseLongformMediaTools,
  type CaseLongformMediaToolAuthority,
} from './case-longform-tool-snapshot.ts';

type Ref = {ref: string; sha256: string; bytes: number};
const sha = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
export type CaseLongformAudioToolAuthority = {
  ffmpeg_path: string;
  ffmpeg_sha256: string;
  ffmpeg_bytes?: number;
  ffprobe_path: string;
  ffprobe_sha256: string;
  ffprobe_bytes?: number;
};
type ToolPaths = {ffmpeg: string; ffprobe: string};
const commonAuthority = (tool: CaseLongformAudioToolAuthority): CaseLongformMediaToolAuthority => ({
  ...tool,
  ffmpeg_bytes: tool.ffmpeg_bytes ?? lstatSync(tool.ffmpeg_path).size,
  ffprobe_bytes: tool.ffprobe_bytes ?? lstatSync(tool.ffprobe_path).size,
});
const assertStartPath = (snapshot: string, tools: ToolPaths): void => {
  // prettier-ignore
  const result = spawnSync(tools.ffprobe,
      ['-v', 'error', '-show_entries', 'stream=index,codec_type,start_time', '-of', 'json', snapshot],
      {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
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
    !Number.isInteger(video?.index) ||
    !Number.isInteger(audio?.index) ||
    !Number.isFinite(videoStart) ||
    !Number.isFinite(audioStart) ||
    Math.abs(videoStart) > tolerance ||
    Math.abs(audioStart) > tolerance ||
    Math.abs(videoStart - audioStart) > tolerance
  )
    throw new Error('VIDEO-OS-CASE-AUDIO-START-PTS-DRIFT');
};
const withInputPath = <T>(input: Buffer | string, operation: (path: string) => T): T => {
  if (typeof input === 'string') return operation(input);
  const root = mkdtempSync(resolve(tmpdir(), 'video-os-case-audio-input-'));
  const snapshot = resolve(root, 'source.mp4');
  try {
    writeFileSync(snapshot, input, {flag: 'wx', mode: 0o600});
    return operation(snapshot);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
};
export const assertCaseLongformAudioStartAlignment = (
  media: Buffer | string,
  tool: CaseLongformAudioToolAuthority,
): void =>
  withCaseLongformMediaTools(commonAuthority(tool), (tools) =>
    withInputPath(media, (path) => assertStartPath(path, tools)),
  );

const derivePath = (
  snapshot: string,
  media: Ref,
  sourceSha256: string,
  startFrame: number,
  endFrame: number,
  tools: ToolPaths,
) => {
  assertStartPath(snapshot, tools);
  const startSample = startFrame * 2000;
  const durationSamples = (endFrame - startFrame + 1) * 2000;
  const result = spawnSync(
    tools.ffmpeg,
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
  const pcm = result.stdout;
  if (result.status !== 0 || !Buffer.isBuffer(pcm) || pcm.byteLength !== durationSamples * 2)
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
};
export const deriveCaseLongformPcmDonorEvidence = (
  input: Buffer | string,
  media: Ref,
  sourceSha256: string,
  startFrame: number,
  endFrame: number,
  tool: CaseLongformAudioToolAuthority,
) =>
  withCaseLongformMediaTools(commonAuthority(tool), (tools) =>
    withInputPath(input, (path) =>
      derivePath(path, media, sourceSha256, startFrame, endFrame, tools),
    ),
  );

export const deriveCaseLongformPcmDonorEvidenceFromMaterial = (
  root: string,
  media: Ref,
  startFrame: number,
  endFrame: number,
  tool: CaseLongformMediaToolAuthority,
  hooks?: CaseLongformMediaSnapshotHooks,
) =>
  withCaseLongformMediaTools(
    tool,
    (tools) =>
      withCaseLongformMediaSnapshot(
        root,
        media,
        (path) => derivePath(path, media, media.sha256, startFrame, endFrame, tools),
        hooks,
      ),
    hooks,
  );
export const assertCaseLongformAudioMaterialStartAlignment = (
  root: string,
  media: Ref,
  tool: CaseLongformMediaToolAuthority,
  hooks?: CaseLongformMediaSnapshotHooks,
): void =>
  withCaseLongformMediaTools(
    tool,
    (tools) =>
      withCaseLongformMediaSnapshot(root, media, (path) => assertStartPath(path, tools), hooks),
    hooks,
  );
