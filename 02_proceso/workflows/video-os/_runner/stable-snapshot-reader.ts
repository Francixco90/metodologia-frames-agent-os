import {createHash} from 'node:crypto';

import {
  makeStableSnapshotObservation,
  parseStableSnapshotRequest,
} from '../_schema/stable-snapshot-reader-v1.schema.ts';
import {stableSnapshotBoundary, stableSnapshotFail} from './stable-snapshot-filesystem-boundary.ts';
import {
  copyStableSnapshotMaterial,
  type StableSnapshotReaderTestHooks,
} from './stable-snapshot-material-copy.ts';
import {
  assertStableSnapshotSource,
  getStableSnapshotRoot,
  resolveStableSnapshotSource,
  verifyStableSnapshot,
  type StableSnapshotRootCapability,
} from './stable-snapshot-root-capability.ts';
import {
  assertStableSnapshotTemporaryRoot,
  withStableSnapshotTemporaryRoot,
} from './stable-snapshot-temporary-root-capability.ts';
export type {StableSnapshotReaderTestHooks} from './stable-snapshot-material-copy.ts';

export const withStableSnapshotSet = <T>(
  capability: StableSnapshotRootCapability,
  raw: unknown,
  operation: (snapshots: {items: readonly {ref: string; path: string; json_bytes?: Buffer}[]}) => T,
  hooks: StableSnapshotReaderTestHooks = {},
) => {
  const request = parseStableSnapshotRequest(raw);
  if (!request) return stableSnapshotFail('REQUEST');
  const root = getStableSnapshotRoot(capability);
  const prepared = request.materials.map((material) =>
    resolveStableSnapshotSource(root, material, hooks),
  );
  const aliases = prepared.map(({before}) => `${before.dev}:${before.ino}`);
  if (new Set(aliases).size !== aliases.length) stableSnapshotFail('SOURCE-ALIAS');
  if (hooks.afterSetPreflight)
    stableSnapshotBoundary('HOOK-AFTER-SET-PREFLIGHT', hooks.afterSetPreflight);
  getStableSnapshotRoot(capability);
  return withStableSnapshotTemporaryRoot((temporary) => {
    const snapshots = prepared.map((item, index) =>
      copyStableSnapshotMaterial(temporary, item, index, hooks),
    );
    assertStableSnapshotTemporaryRoot(temporary);
    if (hooks.beforeSourceSetRevalidation)
      stableSnapshotBoundary(
        'HOOK-BEFORE-SOURCE-SET-REVALIDATION',
        hooks.beforeSourceSetRevalidation,
      );
    assertStableSnapshotTemporaryRoot(temporary);
    prepared.forEach((item) => assertStableSnapshotSource(item, 'source-set', hooks));
    getStableSnapshotRoot(capability);
    const value = stableSnapshotBoundary('CONSUMER', () =>
      operation({
        items: snapshots.map(({ref, path, json_bytes}) => ({
          ref,
          path,
          ...(json_bytes ? {json_bytes} : {}),
        })),
      }),
    );
    if (value && typeof value === 'object' && 'then' in value) stableSnapshotFail('ASYNC-SCOPE');
    snapshots.forEach((snapshot) => {
      if (
        snapshot.json_bytes &&
        (snapshot.json_bytes.length !== snapshot.identity.size ||
          createHash('sha256').update(snapshot.json_bytes).digest('hex') !== snapshot.sha256)
      )
        stableSnapshotFail('JSON-BUFFER-DRIFT');
    });
    assertStableSnapshotTemporaryRoot(temporary);
    if (hooks.beforeSnapshotRevalidation)
      stableSnapshotBoundary('HOOK-BEFORE-SNAPSHOT-REVALIDATION', hooks.beforeSnapshotRevalidation);
    assertStableSnapshotTemporaryRoot(temporary);
    getStableSnapshotRoot(capability);
    snapshots.forEach((snapshot) => {
      assertStableSnapshotTemporaryRoot(temporary);
      verifyStableSnapshot(snapshot.path, snapshot.identity, snapshot.sha256, hooks, snapshot.ref);
      assertStableSnapshotTemporaryRoot(temporary);
    });
    prepared.forEach((item) => assertStableSnapshotSource(item, 'source-set', hooks));
    return {
      value,
      observation: makeStableSnapshotObservation(
        createHash('sha256').update(`${root.dev}:${root.ino}`).digest('hex'),
        request.materials,
        snapshots.reduce((sum, item) => sum + (item.json_bytes?.length ?? 0), 0),
      ),
    };
  }, hooks.beforeTemporaryChmod);
};
