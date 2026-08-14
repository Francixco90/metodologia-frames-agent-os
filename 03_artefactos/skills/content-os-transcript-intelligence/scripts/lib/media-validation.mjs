import {readFileSync} from 'node:fs';
import {extname} from 'node:path';
import {spawnSync} from 'node:child_process';

const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg']);

export function validateAudio(path, label, fail) {
  const ext = extname(path).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) fail('INVALID_AUDIO_MEDIA', `${label}:extension`);
  const bytes = readFileSync(path).subarray(0, 16);
  const ascii = bytes.toString('ascii');
  const valid =
    (ext === '.wav' && ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') ||
    (ext === '.flac' && ascii.startsWith('fLaC')) ||
    (ext === '.ogg' && ascii.startsWith('OggS')) ||
    (ext === '.m4a' && ascii.slice(4, 8) === 'ftyp') ||
    (ext === '.mp3' && (ascii.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) ||
    (ext === '.aac' && bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0);
  if (!valid) fail('INVALID_AUDIO_MEDIA', `${label}:magic`);
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file', '-show_entries',
    'format=duration:stream=codec_type,duration', '-of', 'json', path,
  ], {encoding: 'utf8', timeout: 15000});
  if (probe.error?.code === 'ENOENT') fail('AUDIO_TOOLCHAIN_UNAVAILABLE', `${label}:ffprobe-not-found`);
  if (probe.error) fail('AUDIO_PROBE_FAILED', `${label}:${probe.error.code ?? 'spawn-error'}`);
  if (probe.status !== 0) fail('AUDIO_DECODE_FAILED', label);
  let decoded;
  try { decoded = JSON.parse(probe.stdout); } catch { fail('AUDIO_DECODE_FAILED', `${label}:probe-json`); }
  const durations = [Number(decoded.format?.duration), ...(decoded.streams ?? []).filter((stream) => stream.codec_type === 'audio').map((stream) => Number(stream.duration))].filter(Number.isFinite);
  if (!(durations.length && Math.max(...durations) > 0)) fail('AUDIO_DURATION_INVALID', label);
}
