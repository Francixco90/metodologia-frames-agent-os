import {createHash} from 'node:crypto';
import {closeSync, constants, fchmodSync, fstatSync, openSync, readSync, writeSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  observedStableSnapshotIdentity,
  sameStableSnapshotIdentity,
  stableSnapshotBoundary,
  stableSnapshotError,
  stableSnapshotFail,
  stableSnapshotIdentity,
  type StableSnapshotError,
  type StableSnapshotIdentityHooks,
} from './stable-snapshot-filesystem-boundary.ts';
import type {resolveStableSnapshotSource} from './stable-snapshot-root-capability.ts';
import {
  assertStableSnapshotTemporaryRoot,
  getStableSnapshotTemporaryRoot,
  type StableSnapshotTemporaryRootCapability,
} from './stable-snapshot-temporary-root-capability.ts';

export type StableSnapshotReaderTestHooks = StableSnapshotIdentityHooks & {
  afterSetPreflight?: () => void;
  afterSourceOpen?: (ref: string) => void;
  afterChunk?: (ref: string, chunk: number) => void;
  beforeSourceSetRevalidation?: () => void;
  beforeSnapshotRevalidation?: () => void;
  beforeDestinationOpen?: (inputFd: number) => void;
  beforeTemporaryOpen?: (path: string) => void;
  beforeTemporaryChmod?: (path: string, fd: number) => void;
  forceNoFollowUnavailable?: true;
  read?: (...args: [number, NodeJS.ArrayBufferView, number, number, null]) => number;
  write?: (...args: [number, NodeJS.ArrayBufferView, number, number, null]) => number;
};
type PreparedSource = ReturnType<typeof resolveStableSnapshotSource>;
const CHUNK_BYTES = 1024 * 1024;

export const copyStableSnapshotMaterial = (
  temporary: StableSnapshotTemporaryRootCapability,
  item: PreparedSource,
  index: number,
  hooks: StableSnapshotReaderTestHooks,
) => {
  const noFollow = hooks.forceNoFollowUnavailable ? 0 : constants.O_NOFOLLOW;
  if (!noFollow) stableSnapshotFail('NOFOLLOW-UNAVAILABLE');
  assertStableSnapshotTemporaryRoot(temporary);
  const input = stableSnapshotBoundary('SOURCE-OPEN', () =>
    openSync(item.path, constants.O_RDONLY | noFollow),
  );
  let output: number | undefined;
  let failure: StableSnapshotError | undefined;
  let result:
    | Readonly<{
        ref: string;
        path: string;
        json_bytes?: Buffer;
        identity: ReturnType<typeof stableSnapshotIdentity>;
        sha256: string;
      }>
    | undefined;
  try {
    const destination = resolve(
      getStableSnapshotTemporaryRoot(temporary).path,
      `${index}.snapshot`,
    );
    if (hooks.beforeDestinationOpen)
      stableSnapshotBoundary('HOOK-BEFORE-DESTINATION-OPEN', () =>
        hooks.beforeDestinationOpen!(input),
      );
    assertStableSnapshotTemporaryRoot(temporary);
    output = stableSnapshotBoundary('DESTINATION-OPEN', () =>
      openSync(
        destination,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow,
        0o600,
      ),
    );
    assertStableSnapshotTemporaryRoot(temporary);
    const opened = observedStableSnapshotIdentity(
      hooks,
      'source-open',
      item.material.ref,
      stableSnapshotBoundary('SOURCE-FSTAT', () => fstatSync(input)),
    );
    if (!sameStableSnapshotIdentity(item.before, opened)) stableSnapshotFail('SOURCE-DRIFT');
    if (hooks.afterSourceOpen)
      stableSnapshotBoundary('HOOK-AFTER-SOURCE-OPEN', () =>
        hooks.afterSourceOpen!(item.material.ref),
      );
    assertStableSnapshotTemporaryRoot(temporary);
    const hash = createHash('sha256');
    const retained: Buffer[] = [];
    const buffer = Buffer.allocUnsafe(CHUNK_BYTES);
    let bytes = 0;
    let chunks = 0;
    for (
      let count = stableSnapshotBoundary('SOURCE-READ', () =>
        (hooks.read ?? readSync)(input, buffer, 0, buffer.length, null),
      );
      count !== 0;
    ) {
      if (count < 0 || count > buffer.length || bytes + count > item.material.size_bytes)
        stableSnapshotFail('READ-BUDGET');
      for (let offset = 0; offset < count;) {
        const written = stableSnapshotBoundary('DESTINATION-WRITE', () =>
          (hooks.write ?? writeSync)(output!, buffer, offset, count - offset, null),
        );
        if (written <= 0 || written > count - offset) stableSnapshotFail('WRITE');
        offset += written;
      }
      const slice = buffer.subarray(0, count);
      hash.update(slice);
      if (item.material.content_kind === 'json') retained.push(Buffer.from(slice));
      bytes += count;
      chunks += 1;
      if (hooks.afterChunk)
        stableSnapshotBoundary('HOOK-AFTER-CHUNK', () =>
          hooks.afterChunk!(item.material.ref, chunks),
        );
      assertStableSnapshotTemporaryRoot(temporary);
      count = stableSnapshotBoundary('SOURCE-READ', () =>
        (hooks.read ?? readSync)(input, buffer, 0, buffer.length, null),
      );
    }
    if (bytes !== item.material.size_bytes || hash.digest('hex') !== item.material.sha256)
      stableSnapshotFail('MATERIAL-DRIFT');
    const post = observedStableSnapshotIdentity(
      hooks,
      'source-post',
      item.material.ref,
      stableSnapshotBoundary('SOURCE-FSTAT', () => fstatSync(input)),
    );
    if (!sameStableSnapshotIdentity(item.before, post)) stableSnapshotFail('SOURCE-DRIFT');
    stableSnapshotBoundary('DESTINATION-FCHMOD', () => fchmodSync(output!, 0o600));
    const target = stableSnapshotBoundary('DESTINATION-FSTAT', () => fstatSync(output!));
    if (
      !target.isFile() ||
      target.nlink !== 1 ||
      (target.mode & 0o777) !== 0o600 ||
      target.size !== bytes
    )
      stableSnapshotFail('SNAPSHOT-OUTPUT');
    assertStableSnapshotTemporaryRoot(temporary);
    result = {
      ref: item.material.ref,
      path: destination,
      identity: stableSnapshotIdentity(target),
      sha256: item.material.sha256,
      ...(item.material.content_kind === 'json'
        ? {json_bytes: Buffer.concat(retained, bytes)}
        : {}),
    };
  } catch (error) {
    failure = stableSnapshotError(error, 'COPY');
  }
  try {
    closeSync(input);
  } catch (error) {
    failure ??= stableSnapshotError(error, 'SOURCE-CLOSE');
  }
  if (output !== undefined)
    try {
      closeSync(output);
    } catch (error) {
      failure ??= stableSnapshotError(error, 'DESTINATION-CLOSE');
    }
  if (failure) throw failure;
  return result!;
};
