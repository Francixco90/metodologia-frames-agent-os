import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

// [CONFIG] Pure synthetic media helper; this module registers no tests.
// ffmpeg synthesis is deterministic per lavfi graph, so one render per variant is reused across
// the dozens of fixtures materialized in a run; each call still gets its own temporary copy.
const previewCache = new Map<string, Buffer>();
export const synthesizePreview = (visual: string): Buffer => {
  const cached = previewCache.get(visual);
  if (cached) return cached;
  const scratch = mkdtempSync(resolve(tmpdir(), 'case-coverage-render-'));
  const output = resolve(scratch, 'preview.mp4');
  // prettier-ignore
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-f', 'lavfi', '-i', visual,
    '-f', 'lavfi', '-i', 'sine=frequency=600:sample_rate=48000:duration=1',
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'mpeg4', '-q:v', '5',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', output,
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
  const bytes = readFileSync(output);
  rmSync(scratch, {recursive: true, force: true});
  previewCache.set(visual, bytes);
  return bytes;
};
