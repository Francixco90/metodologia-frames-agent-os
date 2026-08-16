import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readSync,
  realpathSync,
  rmSync,
  writeSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, isAbsolute, relative, resolve, sep} from 'node:path';

type Ref = {ref: string; sha256: string; bytes: number};
type Io = (fd: number, buffer: Buffer, offset: number, length: number, position: null) => number;
export type CaseLongformMediaSnapshotHooks = {
  afterOpen?: (path: string) => void;
  afterChunk?: (path: string, chunk: number) => void;
  read?: Io;
  write?: Io;
  observed?: (value: {
    bytes: number;
    sha256: string;
    chunks: number;
    max_chunk_bytes: number;
  }) => void;
};
export type CaseLongformMediaToolAuthority = {
  ffmpeg_path: string;
  ffmpeg_sha256: string;
  ffmpeg_bytes: number;
  ffprobe_path: string;
  ffprobe_sha256: string;
  ffprobe_bytes: number;
};
const LIMIT = 1024 * 1024;
type Identity = {dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number};
const same = (a: Identity, b: Identity): boolean =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeMs === b.mtimeMs &&
  a.ctimeMs === b.ctimeMs;
const sourcePath = (rootRef: string, ref: Ref): string => {
  if (
    !/^[a-f0-9]{64}$/u.test(ref.sha256) ||
    !Number.isSafeInteger(ref.bytes) ||
    ref.bytes < 1 ||
    isAbsolute(ref.ref) ||
    ref.ref.includes('\\') ||
    ref.ref.startsWith('./') ||
    ref.ref.includes('//') ||
    ref.ref.endsWith('/') ||
    ref.ref.split('/').some((part) => part === '' || part === '.' || part === '..') ||
    /^[a-z]+:/iu.test(ref.ref)
  )
    throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-UNSAFE-REF');
  const root = realpathSync(rootRef);
  const path = resolve(root, ref.ref);
  const rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel))
    throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-ESCAPE');
  const unresolved = lstatSync(path);
  if (unresolved.isSymbolicLink() || !unresolved.isFile())
    throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-NOT-REGULAR');
  const real = realpathSync(path);
  if (real !== path) throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-SYMLINK-COMPONENT');
  if (real !== root && !real.startsWith(`${root}${sep}`))
    throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-ESCAPE');
  return real;
};
const copy = (
  root: string,
  ref: Ref,
  destination: string,
  hooks: CaseLongformMediaSnapshotHooks,
  mode: number,
): Identity => {
  const source = sourcePath(root, ref);
  const pathStat = lstatSync(source);
  const input = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW);
  let output: number | undefined;
  try {
    const before = fstatSync(input);
    if (!before.isFile() || before.dev !== pathStat.dev || before.ino !== pathStat.ino)
      throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-IDENTITY-DRIFT');
    hooks.afterOpen?.(source);
    output = openSync(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      mode,
    );
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(LIMIT);
    let bytes = 0;
    let chunks = 0;
    let maxChunk = 0;
    while (true) {
      const count = (hooks.read ?? readSync)(input, buffer, 0, buffer.length, null);
      if (count === 0) break;
      if (count < 0 || count > LIMIT) throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-READ');
      for (let written = 0; written < count;) {
        const size = (hooks.write ?? writeSync)(output, buffer, written, count - written, null);
        if (size <= 0 || size > count - written)
          throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-WRITE');
        written += size;
      }
      hash.update(buffer.subarray(0, count));
      bytes += count;
      chunks += 1;
      maxChunk = Math.max(maxChunk, count);
      hooks.afterChunk?.(source, chunks);
    }
    const after = fstatSync(input);
    const current = lstatSync(source);
    const target = fstatSync(output);
    if (
      !same(before, after) ||
      current.dev !== before.dev ||
      current.ino !== before.ino ||
      !target.isFile() ||
      target.size !== bytes
    )
      throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-IDENTITY-DRIFT');
    const sha256 = hash.digest('hex');
    if (before.size !== ref.bytes || bytes !== ref.bytes || sha256 !== ref.sha256)
      throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-MATERIAL-DRIFT');
    hooks.observed?.({bytes, sha256, chunks, max_chunk_bytes: maxChunk});
    return {
      dev: target.dev,
      ino: target.ino,
      size: target.size,
      mtimeMs: target.mtimeMs,
      ctimeMs: target.ctimeMs,
    };
  } finally {
    closeSync(input);
    if (output !== undefined) closeSync(output);
  }
};
const verifySnapshot = (path: string, ref: Ref, identity: Identity): void => {
  const pathStat = lstatSync(path);
  if (pathStat.isSymbolicLink() || !pathStat.isFile())
    throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-OUTPUT-DRIFT');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(LIMIT);
    for (let count = readSync(fd, buffer, 0, buffer.length, null); count > 0;) {
      hash.update(buffer.subarray(0, count));
      count = readSync(fd, buffer, 0, buffer.length, null);
    }
    const after = fstatSync(fd);
    if (!same(before, after) || !same(before, identity) || hash.digest('hex') !== ref.sha256)
      throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-OUTPUT-DRIFT');
  } finally {
    closeSync(fd);
  }
};

const withSnapshot = <T>(
  root: string,
  ref: Ref,
  operation: (path: string) => T,
  hooks: CaseLongformMediaSnapshotHooks,
  mode: number,
): T => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'video-os-case-media-snapshot-'));
  const destination = resolve(temporary, 'material.mp4');
  try {
    const identity = copy(root, ref, destination, hooks, mode);
    const result = operation(destination);
    verifySnapshot(destination, ref, identity);
    return result;
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
};
export const withCaseLongformMediaSnapshot = <T>(
  root: string,
  ref: Ref,
  operation: (path: string) => T,
  hooks: CaseLongformMediaSnapshotHooks = {},
): T => withSnapshot(root, ref, operation, hooks, 0o600);

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
  return withSnapshot(
    ffmpeg.root,
    ffmpeg.ref,
    (ffmpegPath) =>
      withSnapshot(
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
