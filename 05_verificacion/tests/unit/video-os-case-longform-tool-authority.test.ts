import {createHash} from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformPreservationPlanAuthority,
  assertCaseLongformPreviewEvidence,
  assertCaseLongformPrerenderGraphAuthority,
  assertCaseLongformPrerenderReviewAuthority,
} from 'workflows/video-os/index.ts';
import {
  withCaseLongformMediaSnapshot,
  withCaseLongformMediaTools,
} from 'workflows/video-os/_runner/case-longform-media.ts';
import {
  caseFixtureRoots,
  cleanupCaseFixtures,
  materializeCaseLongformGraphFixture,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformPrerenderReviewFixture} from './video-os-case-longform-prerender-review-fixture.test.ts';
import {materializeCaseLongformPreservationPlanFixture} from './video-os-case-longform-preservation-plan-fixture.test.ts';
import {materializeCaseLongformPreviewEvidenceFixture} from './video-os-case-longform-preview-evidence.test.ts';

const digest = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
afterEach(cleanupCaseFixtures);

describe('case-longform A0 immutable tool authority', () => {
  it('ignores PATH spoofing across graph and audio while remaining blocked', () => {
    const graph = materializeCaseLongformGraphFixture();
    const review = materializeCaseLongformPrerenderReviewFixture();
    const preview = materializeCaseLongformPreviewEvidenceFixture();
    const preservation = materializeCaseLongformPreservationPlanFixture();
    const previous = process.env.PATH;
    process.env.PATH = graph.root;
    try {
      expect(assertCaseLongformPrerenderGraphAuthority(graph.contract, graph.options).status).toBe(
        'BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS',
      );
      expect(
        assertCaseLongformPrerenderReviewAuthority(review.reviewContract, review.options).status,
      ).toBe('BLOCKED_PENDING_TRANSCRIPT_SEMANTIC_PRESERVATION_REVIEW_CONTRACTS');
      expect(
        assertCaseLongformPreviewEvidence(preview.contract, preview.fixture.options).status,
      ).toBe('BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS');
      expect(
        assertCaseLongformPreservationPlanAuthority(
          preservation.preservationContract,
          preservation.preservationOptions,
        ).status,
      ).toBe('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS');
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
    }
  });

  it('rejects preview tool drift and source mutation through the governed chain', () => {
    const drift = materializeCaseLongformPreviewEvidenceFixture();
    drift.fixture.options.mediaToolAuthority.ffmpeg_sha256 = '0'.repeat(64);
    expect(() => assertCaseLongformPreviewEvidence(drift.contract, drift.fixture.options)).toThrow(
      /^VIDEO-OS-CASE-TOOL-UNTRUSTED$/u,
    );
    const mutation = materializeCaseLongformPreviewEvidenceFixture();
    const options = {
      ...mutation.fixture.options,
      mediaSnapshotHooks: {
        afterChunk(path: string) {
          if (path.endsWith('.mp4')) writeFileSync(path, 'mutated');
        },
      },
    };
    expect(() => assertCaseLongformPreviewEvidence(mutation.contract, options)).toThrow(
      /MEDIA-SNAPSHOT-(?:IDENTITY|MATERIAL)-DRIFT/u,
    );
  });

  it('rejects absent, drifted or arbitrary tool authority', () => {
    const fixture = materializeCaseLongformGraphFixture();
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, {
        ...fixture.options,
        mediaToolAuthority: undefined as never,
      }),
    ).toThrow();
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, {
        ...fixture.options,
        mediaToolAuthority: {...fixture.options.mediaToolAuthority, ffmpeg_sha256: '0'.repeat(64)},
      }),
    ).toThrow(/^VIDEO-OS-CASE-TOOL-UNTRUSTED$/u);
    const fakeAlias = resolve(fixture.root, 'fake-ffmpeg');
    writeFileSync(fakeAlias, '#!/bin/sh\necho forged\n');
    chmodSync(fakeAlias, 0o700);
    const fake = realpathSync(fakeAlias);
    const bytes = readFileSync(fake);
    expect(() =>
      withCaseLongformMediaTools(
        {
          ...fixture.options.mediaToolAuthority,
          ffmpeg_path: fake,
          ffmpeg_sha256: digest(bytes),
          ffmpeg_bytes: bytes.byteLength,
        },
        () => undefined,
      ),
    ).toThrow(/^VIDEO-OS-CASE-TOOL-UNTRUSTED$/u);
    expect(() =>
      withCaseLongformMediaTools(fixture.options.mediaToolAuthority, () => {
        throw new Error('VIDEO-OS-CASE-MEDIA-SNAPSHOT-MATERIAL-DRIFT');
      }),
    ).toThrow(/^VIDEO-OS-CASE-MEDIA-SNAPSHOT-MATERIAL-DRIFT$/u);
  });

  it('rejects tool swap-restore and intermediate symlink aliases', () => {
    const fixture = materializeCaseLongformGraphFixture();
    const toolAlias = resolve(fixture.root, 'trusted-ffmpeg-copy');
    copyFileSync(fixture.options.mediaToolAuthority.ffmpeg_path, toolAlias);
    chmodSync(toolAlias, 0o700);
    const tool = realpathSync(toolAlias);
    const bytes = readFileSync(tool);
    expect(() =>
      withCaseLongformMediaTools(
        {
          ...fixture.options.mediaToolAuthority,
          ffmpeg_path: tool,
          ffmpeg_sha256: digest(bytes),
          ffmpeg_bytes: bytes.byteLength,
        },
        () => undefined,
        {
          afterOpen(path) {
            if (path !== tool) return;
            renameSync(path, `${path}.swap`);
            writeFileSync(path, bytes, {mode: 0o755});
            unlinkSync(path);
            renameSync(`${path}.swap`, path);
          },
        },
      ),
    ).toThrow(/^VIDEO-OS-CASE-TOOL-UNTRUSTED$/u);

    const root = mkdtempSync(resolve(tmpdir(), 'case-media-alias-'));
    caseFixtureRoots.push(root);
    mkdirSync(resolve(root, 'real'));
    const material = Buffer.from('material');
    writeFileSync(resolve(root, 'real', 'source.mp4'), material);
    symlinkSync(resolve(root, 'real'), resolve(root, 'alias'));
    expect(() =>
      withCaseLongformMediaSnapshot(
        root,
        {ref: 'alias/source.mp4', sha256: digest(material), bytes: material.byteLength},
        () => undefined,
      ),
    ).toThrow(/SYMLINK-COMPONENT/u);
    rmSync(root, {recursive: true, force: true});
  });
});
