import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {withStableSnapshotRootCapability} from 'workflows/video-os/_runner/stable-snapshot-root-capability.ts';
import {SNAPSHOT_MAX_MATERIALS} from 'workflows/video-os/_schema/stable-snapshot-reader-v1.schema.ts';

export const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export const makeStableSnapshotFixture = () => {
  const root = realpathSync(mkdtempSync(resolve(tmpdir(), 'stable-snapshot-reader-')));
  mkdirSync(resolve(root, 'sources'));
  const json = Buffer.from('{"method":"PASA"}\n');
  const opaque = Buffer.alloc(1024 * 1024 + 17, 0x5a);
  writeFileSync(resolve(root, 'sources/spec.json'), json, {mode: 0o600});
  writeFileSync(resolve(root, 'sources/audio.bin'), opaque, {mode: 0o600});
  const rootInfo = statSync(root);
  const authority = {
    root_path: root,
    expected_realpath: root,
    expected_dev: rootInfo.dev,
    expected_ino: rootInfo.ino,
  };
  const request = {
    schema_version: 'stable-snapshot-request-v1' as const,
    materials: [
      {
        ref: 'sources/spec.json',
        sha256: sha256(json),
        size_bytes: json.length,
        content_kind: 'json' as const,
      },
      {
        ref: 'sources/audio.bin',
        sha256: sha256(opaque),
        size_bytes: opaque.length,
        content_kind: 'opaque' as const,
      },
    ],
  };
  return {root, authority, request, json, opaque};
};

export type StableSnapshotFixture = ReturnType<typeof makeStableSnapshotFixture>;
export const withFixtureCapability = <T>(
  fixture: StableSnapshotFixture,
  operation: Parameters<typeof withStableSnapshotRootCapability<T>>[1],
) => withStableSnapshotRootCapability(fixture.authority, operation);

export const makeOversizedMaterialsProxyFixture = () => {
  let indexedDescriptorReads = 0;
  let indexedValueReads = 0;
  const materials = new Proxy(
    Array.from({length: SNAPSHOT_MAX_MATERIALS + 1}, () => null),
    {
      get: (target, key, receiver) => {
        if (typeof key === 'string' && /^(?:0|[1-9]\d*)$/u.test(key)) indexedValueReads += 1;
        return Reflect.get(target, key, receiver) as unknown;
      },
      getOwnPropertyDescriptor: (target, key) => {
        if (typeof key === 'string' && /^(?:0|[1-9]\d*)$/u.test(key)) indexedDescriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    },
  );
  return {
    request: {schema_version: 'stable-snapshot-request-v1', materials},
    reads: () => ({indexedDescriptorReads, indexedValueReads}),
  };
};
