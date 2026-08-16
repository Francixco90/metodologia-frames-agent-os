import {spawnSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {basename, dirname, isAbsolute} from 'node:path';

import {
  withCaseLongformSnapshot,
  type CaseLongformMediaSnapshotHooks,
} from './case-longform-media-snapshot.ts';

type Ref = {ref: string; sha256: string; bytes: number};
export type CaseLongformMediaToolAuthority = {
  ffmpeg_path: string;
  ffmpeg_sha256: string;
  ffmpeg_bytes: number;
  ffprobe_path: string;
  ffprobe_sha256: string;
  ffprobe_bytes: number;
};
const toolRef = (path: string, sha256: string, bytes: number): {root: string; ref: Ref} => {
  if (!isAbsolute(path) || realpathSync(path) !== path)
    throw new Error('VIDEO-OS-CASE-MEDIA-TOOL-UNTRUSTED');
  return {root: dirname(path), ref: {ref: basename(path), sha256, bytes}};
};
export const withCaseLongformMediaTools = <T>(
  authority: CaseLongformMediaToolAuthority,
  operation: (tools: {ffmpeg: string; ffprobe: string}) => T,
  hooks: CaseLongformMediaSnapshotHooks = {},
): T => {
  const ffmpeg = toolRef(authority.ffmpeg_path, authority.ffmpeg_sha256, authority.ffmpeg_bytes);
  const ffprobe = toolRef(
    authority.ffprobe_path,
    authority.ffprobe_sha256,
    authority.ffprobe_bytes,
  );
  return withCaseLongformSnapshot(
    ffmpeg.root,
    ffmpeg.ref,
    (ffmpegPath) =>
      withCaseLongformSnapshot(
        ffprobe.root,
        ffprobe.ref,
        (ffprobePath) => {
          for (const [kind, path] of [
            ['ffmpeg', ffmpegPath],
            ['ffprobe', ffprobePath],
          ] as const) {
            const result = spawnSync(path, ['-version'], {
              encoding: 'utf8',
              maxBuffer: 1024 * 1024,
            });
            if (result.status !== 0 || !result.stdout.startsWith(`${kind} version `))
              throw new Error('VIDEO-OS-CASE-MEDIA-TOOL-KIND-DRIFT');
          }
          return operation({ffmpeg: ffmpegPath, ffprobe: ffprobePath});
        },
        hooks,
        0o700,
      ),
    hooks,
    0o700,
  );
};
