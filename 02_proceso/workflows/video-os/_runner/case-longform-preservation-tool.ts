import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute, resolve} from 'node:path';

import {CaseLongformHash} from './case-longform-media.ts';

export type CaseLongformPreservationToolAuthority = {
  ffmpeg_path: string;
  ffmpeg_sha256: string;
  ffprobe_path: string;
  ffprobe_sha256: string;
};
type ToolKind = 'ffmpeg' | 'ffprobe';
type Hooks = {afterOpen?: (kind: ToolKind, path: string) => void};
const sha = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const snapshot = (
  kind: ToolKind,
  path: string,
  expected: string,
  destination: string,
  hooks: Hooks,
): string => {
  CaseLongformHash.parse(expected);
  if (!isAbsolute(path) || realpathSync(path) !== path)
    throw new Error('VIDEO-OS-CASE-PRESERVATION-TOOL-UNTRUSTED');
  const beforePath = lstatSync(path);
  if (beforePath.isSymbolicLink() || !beforePath.isFile())
    throw new Error('VIDEO-OS-CASE-PRESERVATION-TOOL-UNTRUSTED');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    if (before.dev !== beforePath.dev || before.ino !== beforePath.ino)
      throw new Error('VIDEO-OS-CASE-PRESERVATION-TOOL-IDENTITY-DRIFT');
    hooks.afterOpen?.(kind, path);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    const afterPath = lstatSync(path);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      afterPath.dev !== before.dev ||
      afterPath.ino !== before.ino ||
      sha(bytes) !== expected
    )
      throw new Error('VIDEO-OS-CASE-PRESERVATION-TOOL-IDENTITY-DRIFT');
    writeFileSync(destination, bytes, {flag: 'wx', mode: 0o700});
    return destination;
  } finally {
    closeSync(fd);
  }
};
export const withCaseLongformPreservationTools = <T>(
  authority: CaseLongformPreservationToolAuthority,
  operation: (tools: {ffmpeg: string; ffprobe: string}) => T,
  hooks: Hooks = {},
): T => {
  const root = mkdtempSync(resolve(tmpdir(), 'video-os-case-preservation-tools-'));
  try {
    const tools = {
      ffmpeg: snapshot(
        'ffmpeg',
        authority.ffmpeg_path,
        authority.ffmpeg_sha256,
        resolve(root, 'ffmpeg'),
        hooks,
      ),
      ffprobe: snapshot(
        'ffprobe',
        authority.ffprobe_path,
        authority.ffprobe_sha256,
        resolve(root, 'ffprobe'),
        hooks,
      ),
    };
    for (const kind of ['ffmpeg', 'ffprobe'] as const) {
      const result = spawnSync(tools[kind], ['-version'], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      });
      if (result.status !== 0 || !result.stdout.startsWith(`${kind} version `))
        throw new Error('VIDEO-OS-CASE-PRESERVATION-TOOL-KIND-DRIFT');
    }
    return operation(tools);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
};
