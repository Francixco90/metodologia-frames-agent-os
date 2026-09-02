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
  // Windows: `which` is an MSYS shell builtin whose output (/c/Users/...) is
  // meaningless to realpathSync (resolves as C:\c\Users\... → ENOENT). Use
  // where.exe — the native resolver — on win32; unchanged elsewhere.
  const found =
    process.platform === 'win32'
      ? spawnSync('where.exe', [name], {encoding: 'utf8'})
      : spawnSync('which', [name], {encoding: 'utf8'});
  if (found.status !== 0) throw new Error(`missing ${name}`);
  const firstLine = found.stdout.trim().split(/\r?\n/u)[0] ?? '';
  const path = realpathSync(firstLine);
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
