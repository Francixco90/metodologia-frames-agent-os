import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';

// [CONFIG] Pure synthetic authority fixture; this module registers no tests.
export const caseFixtureRoles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
export const caseFixtureSha = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');
export const caseFixtureHashValue = (value: number): string =>
  caseFixtureSha(Buffer.from(String(value)));
const trustedTool = (name: 'ffmpeg' | 'ffprobe') => {
  const found = spawnSync('which', [name], {encoding: 'utf8'});
  if (found.status !== 0) throw new Error(`missing ${name}`);
  const path = realpathSync(found.stdout.trim());
  return {path, sha256: caseFixtureSha(readFileSync(path)), bytes: lstatSync(path).size};
};
export const caseFixtureMediaToolAuthority = () => {
  const ffmpeg = trustedTool('ffmpeg');
  const ffprobe = trustedTool('ffprobe');
  return {
    ffmpeg_path: ffmpeg.path,
    ffmpeg_sha256: ffmpeg.sha256,
    ffmpeg_bytes: ffmpeg.bytes,
    ffprobe_path: ffprobe.path,
    ffprobe_sha256: ffprobe.sha256,
    ffprobe_bytes: ffprobe.bytes,
  };
};
export const caseFixture = {
  roles: caseFixtureRoles,
  sha: caseFixtureSha,
  hashValue: caseFixtureHashValue,
  mediaToolAuthority: caseFixtureMediaToolAuthority,
};
