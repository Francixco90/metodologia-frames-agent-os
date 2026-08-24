import {createHash} from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {
  makeStableSnapshotObservation,
  parseStableSnapshotRequest,
} from '../_schema/stable-snapshot-reader-v1.schema.ts';
import {
  assertStableSnapshotSource,
  getStableSnapshotRoot,
  observedStableSnapshotIdentity,
  resolveStableSnapshotSource,
  sameStableSnapshotIdentity,
  stableSnapshotIdentity,
  verifyStableSnapshot,
  type StableSnapshotIdentity,
  type StableSnapshotIdentityHooks,
  type StableSnapshotRootCapability,
} from './stable-snapshot-root-capability.ts';
export type StableSnapshotReaderTestHooks = StableSnapshotIdentityHooks & {
  afterSetPreflight?: () => void;
  afterSourceOpen?: (ref: string) => void;
  afterChunk?: (ref: string, chunk: number) => void;
  beforeSourceSetRevalidation?: () => void;
  beforeSnapshotRevalidation?: () => void;
  beforeDestinationOpen?: (inputFd: number) => void;
  beforeTemporaryChmod?: (path: string) => void;
  forceNoFollowUnavailable?: true;
  read?: (...args: [number, NodeJS.ArrayBufferView, number, number, null]) => number;
  write?: (...args: [number, NodeJS.ArrayBufferView, number, number, null]) => number;
};
const CHUNK_BYTES = 1024 * 1024;
const fail = (code: string): never => {
  throw new Error(`STABLE-SNAPSHOT-${code}`);
};
export const withStableSnapshotSet = <T>(
  capability: StableSnapshotRootCapability,
  raw: unknown,
  operation: (snapshots: {items: readonly {ref: string; path: string; json_bytes?: Buffer}[]}) => T,
  hooks: StableSnapshotReaderTestHooks = {},
) => {
  const request = parseStableSnapshotRequest(raw);
  if (!request) return fail('REQUEST');
  const root = getStableSnapshotRoot(capability);
  const prepared = request.materials.map((material) =>
    resolveStableSnapshotSource(root, material, hooks),
  );
  const aliases = prepared.map(({before}) => `${before.dev}:${before.ino}`);
  if (new Set(aliases).size !== aliases.length) fail('SOURCE-ALIAS');
  hooks.afterSetPreflight?.();
  const temporary = mkdtempSync(resolve(tmpdir(), 'metodologia-stable-snapshot-'));
  try {
    hooks.beforeTemporaryChmod?.(temporary);
    chmodSync(temporary, 0o700);
    const snapshots: {
      ref: string;
      path: string;
      json_bytes?: Buffer;
      identity: StableSnapshotIdentity;
      sha256: string;
    }[] = [];
    for (const [index, item] of prepared.entries()) {
      const noFollow = hooks.forceNoFollowUnavailable ? 0 : constants.O_NOFOLLOW;
      if (!noFollow) fail('NOFOLLOW-UNAVAILABLE');
      const input = openSync(item.path, constants.O_RDONLY | noFollow);
      let output: number | undefined;
      try {
        const destination = resolve(temporary, `${index}.snapshot`);
        hooks.beforeDestinationOpen?.(input);
        output = openSync(
          destination,
          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow,
          0o600,
        );
        const opened = observedStableSnapshotIdentity(
          hooks,
          'source-open',
          item.material.ref,
          fstatSync(input),
        );
        if (!sameStableSnapshotIdentity(item.before, opened)) fail('SOURCE-DRIFT');
        hooks.afterSourceOpen?.(item.material.ref);
        const hash = createHash('sha256');
        const retained: Buffer[] = [];
        const buffer = Buffer.allocUnsafe(CHUNK_BYTES);
        let bytes = 0;
        let chunks = 0;
        for (
          let count = (hooks.read ?? readSync)(input, buffer, 0, buffer.length, null);
          count !== 0;
        ) {
          if (count < 0 || count > buffer.length || bytes + count > item.material.size_bytes)
            fail('READ-BUDGET');
          for (let offset = 0; offset < count;) {
            const written = (hooks.write ?? writeSync)(
              output,
              buffer,
              offset,
              count - offset,
              null,
            );
            if (written <= 0 || written > count - offset) fail('WRITE');
            offset += written;
          }
          const slice = buffer.subarray(0, count);
          hash.update(slice);
          if (item.material.content_kind === 'json') retained.push(Buffer.from(slice));
          bytes += count;
          chunks += 1;
          hooks.afterChunk?.(item.material.ref, chunks);
          count = (hooks.read ?? readSync)(input, buffer, 0, buffer.length, null);
        }
        if (bytes !== item.material.size_bytes || hash.digest('hex') !== item.material.sha256)
          fail('MATERIAL-DRIFT');
        if (
          !sameStableSnapshotIdentity(
            item.before,
            observedStableSnapshotIdentity(
              hooks,
              'source-post',
              item.material.ref,
              fstatSync(input),
            ),
          )
        )
          fail('SOURCE-DRIFT');
        fchmodSync(output, 0o600);
        const target = fstatSync(output);
        if (
          !target.isFile() ||
          target.nlink !== 1 ||
          (target.mode & 0o777) !== 0o600 ||
          target.size !== bytes
        )
          fail('SNAPSHOT-OUTPUT');
        snapshots.push({
          ref: item.material.ref,
          path: destination,
          identity: stableSnapshotIdentity(target),
          sha256: item.material.sha256,
          ...(item.material.content_kind === 'json'
            ? {json_bytes: Buffer.concat(retained, bytes)}
            : {}),
        });
      } finally {
        closeSync(input);
        if (output !== undefined) closeSync(output);
      }
    }
    hooks.beforeSourceSetRevalidation?.();
    prepared.forEach((item) => assertStableSnapshotSource(item, 'source-set', hooks));
    getStableSnapshotRoot(capability);
    const value = operation({
      items: snapshots.map(({ref, path, json_bytes}) => ({
        ref,
        path,
        ...(json_bytes ? {json_bytes} : {}),
      })),
    });
    if (value && typeof value === 'object' && 'then' in value) fail('ASYNC-SCOPE');
    snapshots.forEach((snapshot) => {
      if (
        snapshot.json_bytes &&
        (snapshot.json_bytes.length !== snapshot.identity.size ||
          createHash('sha256').update(snapshot.json_bytes).digest('hex') !== snapshot.sha256)
      )
        fail('JSON-BUFFER-DRIFT');
    });
    hooks.beforeSnapshotRevalidation?.();
    getStableSnapshotRoot(capability);
    snapshots.forEach((snapshot) =>
      verifyStableSnapshot(snapshot.path, snapshot.identity, snapshot.sha256, hooks, snapshot.ref),
    );
    prepared.forEach((item) => assertStableSnapshotSource(item, 'source-set', hooks));
    const observation = makeStableSnapshotObservation(
      createHash('sha256').update(`${root.dev}:${root.ino}`).digest('hex'),
      request.materials,
      snapshots.reduce((sum, item) => sum + (item.json_bytes?.length ?? 0), 0),
    );
    return {value, observation};
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
};
