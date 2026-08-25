import {
  chmodSync,
  existsSync,
  fstatSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {StableSnapshotError} from 'workflows/video-os/_runner/stable-snapshot-filesystem-boundary.ts';
import {withStableSnapshotSet} from 'workflows/video-os/_runner/stable-snapshot-reader.ts';
import {withStableSnapshotRootCapability} from 'workflows/video-os/_runner/stable-snapshot-root-capability.ts';
import {STABLE_SNAPSHOT_COVERAGE_GAPS} from 'workflows/video-os/_schema/stable-snapshot-reader-v1.schema.ts';
import {
  type StableSnapshotFixture,
  makeOversizedMaterialsProxyFixture,
  makeStableSnapshotFixture,
  withFixtureCapability,
} from '../fixtures/stable-snapshot-reader.fixture.ts';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, {recursive: true, force: true})));
const fixture = () => {
  const value = makeStableSnapshotFixture();
  roots.push(value.root);
  return value;
};
const run = (
  value: StableSnapshotFixture,
  hooks: Parameters<typeof withStableSnapshotSet>[3] = {},
  operation: Parameters<typeof withStableSnapshotSet>[2] = () => null,
) =>
  withFixtureCapability(value, (capability) =>
    withStableSnapshotSet(capability, value.request, operation, hooks),
  );
const stableFailure = (operation: () => unknown) => {
  let captured: unknown;
  try {
    operation();
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(StableSnapshotError);
  const stable = captured as StableSnapshotError;
  expect(stable.message).toMatch(/^STABLE-SNAPSHOT-[A-Z0-9-]+$/u);
  expect(stable.coverage_gaps).toEqual(STABLE_SNAPSHOT_COVERAGE_GAPS);
  return stable;
};

describe('stable snapshot reader', () => {
  it('streams opaque bytes, retains bounded JSON and removes private snapshots', () => {
    const value = fixture();
    const paths: string[] = [];
    let temporaryFd = -1;
    const result = run(
      value,
      {
        beforeTemporaryChmod: (_path, fd) => (temporaryFd = fd),
        write: (fd, buffer, offset, length) =>
          writeSync(fd, buffer, offset, Math.min(7, length), null),
      },
      ({items}) => {
        paths.push(...items.map(({path}) => path));
        expect(items[0]!.json_bytes).toEqual(value.json);
        expect(items[1]!.json_bytes).toBeUndefined();
        expect(readFileSync(items[1]!.path)).toEqual(value.opaque);
        expect(statSync(dirname(items[0]!.path)).mode & 0o777).toBe(0o700);
        expect(items.every(({path}) => (statSync(path).mode & 0o777) === 0o600)).toBe(true);
        return 'used-in-scope';
      },
    );
    expect(result.value).toBe('used-in-scope');
    expect(result.observation).toMatchObject({
      scope: 'MATERIAL_OBSERVATION',
      observation_status: 'OBSERVED',
      promotion_authorized: false,
      coverage_gaps: STABLE_SNAPSHOT_COVERAGE_GAPS,
      json_retained_bytes: value.json.length,
    });
    expect(JSON.stringify(result.observation)).not.toMatch(
      /path|receipt|RENDERED|READY|PUBLISHED/u,
    );
    expect(paths.every((path) => !existsSync(path))).toBe(true);
    expect(() => fstatSync(temporaryFd)).toThrow();
  });
  it('requires an identity-bound opaque root capability', () => {
    const value = fixture();
    for (const authority of [
      {...value.authority, expected_ino: value.authority.expected_ino + 1},
      {...value.authority, expected_realpath: `${value.root}/other`},
      {...value.authority, root_path: `${value.root}/.`},
    ])
      expect(() => withStableSnapshotRootCapability(authority, () => null)).toThrow();
    expect(() => withStableSnapshotSet({} as never, value.request, () => null)).toThrow();
    const fake = new Proxy({}, {get: () => value.authority, has: () => true});
    expect(() => withStableSnapshotSet(fake as never, value.request, () => null)).toThrow(
      /CAPABILITY/u,
    );
    const hostile = new Proxy(value.authority, {get: () => failFixture('authority getter')});
    expect(() => withStableSnapshotRootCapability(hostile, () => null)).toThrow(/AUTHORITY/u);
  });
  it.each([
    '/absolute.json',
    '../escape.json',
    'sources\\spec.json',
    'sources//spec.json',
    './sources/spec.json',
    'sources/./spec.json',
    'sources/spec.json/',
    'https://example.invalid/a',
    '~/source.json',
    'private/a.json',
    'SOURCES/.RUNTIME/a.json',
    'sources/\u0000.json',
  ])('rejects unsafe or private ref %j before reading', (ref) => {
    const value = fixture();
    value.request.materials[0]!.ref = ref;
    expect(() => run(value)).toThrow();
  });
  it('blocks symlink ancestors, symlink finals, directories and hardlinks', () => {
    for (const attack of ['ancestor', 'final', 'directory', 'hardlink'] as const) {
      const value = fixture();
      const source = resolve(value.root, 'sources/spec.json');
      if (attack === 'ancestor') {
        mkdirSync(resolve(value.root, 'outside'));
        writeFileSync(resolve(value.root, 'outside/spec.json'), value.json);
        symlinkSync(resolve(value.root, 'outside'), resolve(value.root, 'linked'));
        value.request.materials[0]!.ref = 'linked/spec.json';
      } else if (attack === 'final') {
        symlinkSync(source, resolve(value.root, 'linked.json'));
        value.request.materials[0]!.ref = 'linked.json';
      } else if (attack === 'directory') {
        value.request.materials[0]!.ref = 'sources';
      } else linkSync(source, resolve(value.root, 'sources/hard.json'));
      expect(() => run(value)).toThrow();
    }
  });
  it('enforces per-ref, total and duplicate budgets before filesystem reads', () => {
    const empty = fixture();
    empty.request.materials[0]!.size_bytes = 0;
    expect(() => run(empty)).toThrow(/REQUEST/u);
    const json = fixture();
    json.request.materials[0]!.size_bytes = 1024 * 1024 + 1;
    expect(() => run(json)).toThrow();
    const total = fixture();
    total.request.materials = Array.from({length: 5}, (_, index) => ({
      ref: `missing-${index}`,
      sha256: 'a'.repeat(64),
      size_bytes: 512 * 1024 * 1024,
      content_kind: 'opaque' as const,
    }));
    expect(() => run(total)).toThrow();
    const duplicate = fixture();
    duplicate.request.materials.push({...duplicate.request.materials[0]!});
    expect(() => run(duplicate)).toThrow();
  });
  it.each(['source-pre', 'source-open', 'source-post', 'snapshot'] as const)(
    'detects identity drift at %s',
    (attacked) => {
      const value = fixture();
      expect(() =>
        run(value, {
          identity: (stage, _ref, current) =>
            stage === attacked ? {...current, ino: current.ino + 1} : current,
        }),
      ).toThrow();
    },
  );
  it('rejects missing O_NOFOLLOW, aliases and set-level source drift', () => {
    expect(() => run(fixture(), {forceNoFollowUnavailable: true})).toThrow(/NOFOLLOW/u);
    const alias = fixture();
    expect(() =>
      run(alias, {
        identity: (stage, _ref, current) =>
          stage === 'source-pre' ? {...current, ino: 1} : current,
      }),
    ).toThrow(/ALIAS/u);
    const changed = fixture();
    expect(() =>
      run(changed, {
        afterChunk: (ref, chunk) => {
          if (ref.endsWith('audio.bin') && chunk === 1)
            writeFileSync(resolve(changed.root, 'sources/spec.json'), Buffer.from('changed'));
        },
      }),
    ).toThrow(/DRIFT/u);
  });
  it('revalidates snapshots, rejects async scope and cleans up on callback failure', () => {
    const changed = fixture();
    expect(() =>
      run(changed, {}, ({items}) => {
        writeFileSync(items[0]!.path, Buffer.from('changed'));
        return null;
      }),
    ).toThrow(/DRIFT/u);
    expect(() => run(fixture(), {}, () => Promise.resolve())).toThrow(/ASYNC/u);
    const failed = fixture();
    let snapshot = '';
    expect(() =>
      run(failed, {}, ({items}) => {
        snapshot = items[0]!.path;
        throw new StableSnapshotError(failed.root);
      }),
    ).toThrow(/UNSAFE-REASON/u);
    expect(existsSync(snapshot)).toBe(false);
    expect(() =>
      run(fixture(), {}, ({items}) => {
        items[0]!.json_bytes![0] = items[0]!.json_bytes![0]! ^ 1;
        return null;
      }),
    ).toThrow(/JSON-BUFFER-DRIFT/u);
    const rootChanged = fixture();
    const movedRoot = `${rootChanged.root}.moved`;
    expect(() =>
      run(rootChanged, {
        beforeSnapshotRevalidation: () => {
          renameSync(rootChanged.root, movedRoot);
          roots.push(movedRoot);
          mkdirSync(rootChanged.root);
        },
      }),
    ).toThrow(/ROOT-IDENTITY-DRIFT/u);
  });
  it('closes input when destination opening fails and contains hostile requests', () => {
    const value = fixture();
    let input = -1;
    expect(() =>
      run(value, {beforeDestinationOpen: (fd) => ((input = fd), failFixture('output open'))}),
    ).toThrow(/HOOK-BEFORE-DESTINATION-OPEN/u);
    expect(() => fstatSync(input)).toThrow();
    expect(() =>
      withStableSnapshotRootCapability(value.authority, () => null, {
        rootStat: (fd) => ((input = fd), failFixture('root stat')),
      }),
    ).toThrow(/ROOT-STAT-HOOK/u);
    expect(() => fstatSync(input)).toThrow();
    let temporary = '';
    expect(() =>
      run(value, {beforeTemporaryChmod: (path) => ((temporary = path), failFixture('chmod'))}),
    ).toThrow(/TEMP-HOOK/u);
    expect(existsSync(temporary)).toBe(false);
    const hostile = new Proxy(value.request, {get: () => failFixture('request getter')});
    expect(() =>
      withFixtureCapability(value, (capability) =>
        withStableSnapshotSet(capability, hostile, () => null),
      ),
    ).toThrow(/STABLE-SNAPSHOT-REQUEST/u);
  });
  it('detects source replacement between preflight and open', () => {
    const value = fixture();
    const source = resolve(value.root, 'sources/spec.json');
    expect(() =>
      run(value, {
        afterSetPreflight: () => {
          renameSync(source, `${source}.old`);
          writeFileSync(source, value.json);
          chmodSync(source, 0o600);
        },
      }),
    ).toThrow(/DRIFT/u);
  });
  it('bounds oversized materials before indexed reads or Zod traversal', () => {
    const hostile = makeOversizedMaterialsProxyFixture();
    const failure = stableFailure(() =>
      withStableSnapshotSet({} as never, hostile.request, () => null),
    );
    expect(failure.reason).toBe('REQUEST');
    expect(hostile.reads()).toEqual({indexedDescriptorReads: 0, indexedValueReads: 0});
  });
  it('does not chmod or remove a substituted temporary root', () => {
    const value = fixture();
    let temporary = '';
    let moved = '';
    const failure = stableFailure(() =>
      run(value, {
        beforeTemporaryChmod: (path) => (temporary = path),
        beforeDestinationOpen: () => {
          moved = `${temporary}.moved`;
          renameSync(temporary, moved);
          mkdirSync(temporary, {mode: 0o755});
          roots.push(moved, temporary);
        },
      }),
    );
    expect(failure.reason).toBe('TEMP-IDENTITY-DRIFT');
    expect(existsSync(temporary)).toBe(true);
    expect(statSync(temporary).mode & 0o777).toBe(0o755);
  });
  it('fails closed when a hook changes temporary-root mode during copy', () => {
    const value = fixture();
    let temporary = '';
    const failure = stableFailure(() =>
      run(value, {
        beforeTemporaryChmod: (path) => {
          temporary = path;
          roots.push(path);
        },
        afterChunk: (_ref, chunk) => {
          if (chunk === 1) chmodSync(temporary, 0o755);
        },
      }),
    );
    expect(failure.reason).toBe('TEMP-IDENTITY-DRIFT');
    expect(statSync(temporary).mode & 0o777).toBe(0o755);
  });
  it('sanitizes filesystem failures without exposing source or temporary paths', () => {
    const source = fixture();
    const sourceError = stableFailure(() =>
      run(source, {
        afterSetPreflight: () => rmSync(resolve(source.root, 'sources/spec.json')),
      }),
    );
    expect(sourceError.reason).toBe('SOURCE-OPEN');
    expect(sourceError.message).not.toContain(source.root);

    const destination = fixture();
    let temporary = '';
    const destinationError = stableFailure(() =>
      run(destination, {
        beforeTemporaryChmod: (path) => (temporary = path),
        beforeDestinationOpen: () => mkdirSync(resolve(temporary, '0.snapshot')),
      }),
    );
    expect(destinationError.reason).toBe('DESTINATION-OPEN');
    expect(destinationError.message).not.toContain(temporary);

    const verify = fixture();
    const verifyError = stableFailure(() => run(verify, {}, ({items}) => rmSync(items[0]!.path)));
    expect(verifyError.reason).toBe('VERIFY-LSTAT');
    expect(verifyError.message).not.toContain(verify.root);
  });
});
const failFixture = (message: string): never => {
  throw new Error(message);
};
