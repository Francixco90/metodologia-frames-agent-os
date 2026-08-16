import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readSync, symlinkSync, writeFileSync, writeSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformPreservationLedgerAuthority,
  assertCaseLongformRgbRegionPreserved,
  compareCaseLongformRgbRegion,
  probeCaseLongformRgbMedia,
} from 'workflows/video-os/index.ts';
import {withCaseLongformMediaSnapshot} from 'workflows/video-os/_runner/case-longform-media.ts';
import {
  caseFixtureRoots,
  cleanupCaseFixtures,
  writeCaseFixture,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformPreservationLedgerFixture} from '../../../tests/fixtures/video-os-case-longform-preservation-ledger.fixture.ts';
import {materializeCaseLongformPreservationPlanFixture} from '../../../tests/fixtures/video-os-case-longform-preservation-plan.fixture.ts';

export {materializeCaseLongformPreservationLedgerFixture};

const hash = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const BAD = '0'.repeat(64);
const materialize = materializeCaseLongformPreservationLedgerFixture;
type Fixture = ReturnType<typeof materialize>;
const validate = ({base, contract}: Fixture, options = base.preservationOptions) =>
  assertCaseLongformPreservationLedgerAuthority(contract, options);
const rewriteLedger = (fixture: Fixture): void => {
  fixture.contract.artifacts.frame_diff_ledger = writeCaseFixture(
    fixture.base.root,
    fixture.contract.artifacts.frame_diff_ledger.ref,
    fixture.ledgerValue,
  );
};
const media = (
  root: string,
  name: string,
  filter: string,
  ffmpeg: string,
  frames = 3,
  pixelFormat = 'rgb24',
): string => {
  const path = resolve(root, `${name}.mkv`);
  const result = spawnSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      filter,
      '-frames:v',
      String(frames),
      '-c:v',
      'ffv1',
      '-pix_fmt',
      pixelFormat,
      '-y',
      path,
    ],
    {encoding: 'utf8'},
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return path;
};
const directEvidence = (
  ffmpeg: string,
  source: string,
  output: string,
  root: string,
  endFrame: number,
  overlays: Array<{
    overlay_id: string;
    start_frame: number;
    end_frame: number;
    roi: {x: number; y: number; width: number; height: number};
  }> = [],
  roi = {x: 0, y: 0, width: 100, height: 100},
) =>
  compareCaseLongformRgbRegion({
    ffmpeg,
    root,
    source_path: source,
    output_path: output,
    output_sha256: 'b'.repeat(64),
    region: {
      region_id: 'rgb-region',
      source_sha256: 'a'.repeat(64),
      source_start_frame: 0,
      source_end_frame: endFrame,
      output_start_frame: 0,
      output_end_frame: endFrame,
      output_roi: roi,
      overlay_ids: overlays.map(({overlay_id}) => overlay_id),
    },
    overlays,
    tolerance: 0,
    minimum_residual_ratio_ppm: 900_000,
  });

afterEach(cleanupCaseFixtures);

describe('case-longform PR1c1b1 material RGB ledger', () => {
  it('recomputes all regions and remains blocked before caption authority and review', () => {
    const fixture = materialize();
    expect(validate(fixture).status).toBe('BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS');
    expect(fixture.ledgerValue.regions.every(({changed_pixels}) => changed_pixels === 0)).toBe(
      true,
    );
    expect(
      fixture.ledgerValue.regions.every(({samples}) => Object.keys(samples).length === 3),
    ).toBe(true);
    expect(fixture.contract).not.toHaveProperty('review');
    expect(fixture.contract).not.toHaveProperty('render');
    expect(fixture.contract).not.toHaveProperty('effects');
  });

  it.each<[string, (value: Fixture['ledgerValue']) => void]>([
    ['forgery', (value) => void (value.regions[0]!.frame_chain_sha256 = BAD)],
    ['reorder', (value) => void value.regions.reverse()],
    ['truncation', (value) => void value.regions.pop()],
  ])('rejects ledger %s', (_label, mutate) => {
    const fixture = materialize();
    mutate(fixture.ledgerValue);
    rewriteLedger(fixture);
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects lifecycle claims', () => {
    const strict = materialize();
    expect(() =>
      assertCaseLongformPreservationLedgerAuthority(
        {...strict.contract, review: {}, render: {}, effects: true},
        strict.base.preservationOptions,
      ),
    ).toThrow();
  });

  it('rejects ledger ref aliases', () => {
    const strict = materialize();
    strict.contract.artifacts.frame_diff_ledger = strict.contract.artifacts.preservation_plan;
    expect(() => validate(strict)).toThrow(/REF-ALIAS/u);
  });

  it('detects red-blue, an intermediate change and a cross-chunk frame change', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    const ffmpeg = fixture.preservationOptions.preservationToolAuthority.ffmpeg_path;
    const root = mkdtempSync(resolve(tmpdir(), 'case-rgb-direct-'));
    caseFixtureRoots.push(root);
    const source = media(root, 'source', 'color=blue:s=100x100:r=24:d=1.1', ffmpeg, 25);
    const red = media(root, 'red', 'color=red:s=100x100:r=24:d=0.125', ffmpeg);
    expect(() =>
      assertCaseLongformRgbRegionPreserved(directEvidence(ffmpeg, source, red, root, 2)),
    ).toThrow(/OUTSIDE-MASK-CHANGED/u);
    for (const [name, frame] of [
      ['middle', 1],
      ['cross-chunk', 24],
    ] as const) {
      const output = media(
        root,
        name,
        `color=blue:s=100x100:r=24:d=1.1,drawbox=x=0:y=0:w=100:h=100:c=red:t=fill:enable='eq(n,${frame})'`,
        ffmpeg,
        25,
      );
      const otherFrameMasks =
        frame === 1
          ? [0, 2].map((maskedFrame) => ({
              overlay_id: `mask-${maskedFrame}`,
              start_frame: maskedFrame,
              end_frame: maskedFrame,
              roi: {x: 0, y: 0, width: 10, height: 10},
            }))
          : [];
      const observed = directEvidence(ffmpeg, source, output, root, 24, otherFrameMasks);
      expect(observed.worst_output_frame).toBe(frame);
      expect(() => assertCaseLongformRgbRegionPreserved(observed)).toThrow(/OUTSIDE-MASK-CHANGED/u);
    }
  });

  it('uses exact temporal mask unions and blocks 99.99 percent overmask', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    const ffmpeg = fixture.preservationOptions.preservationToolAuthority.ffmpeg_path;
    const root = mkdtempSync(resolve(tmpdir(), 'case-rgb-union-'));
    caseFixtureRoots.push(root);
    const source = media(root, 'source', 'color=blue:s=100x100:r=24:d=0.125', ffmpeg);
    const output = media(root, 'output', 'color=blue:s=100x100:r=24:d=0.125', ffmpeg);
    expect(() =>
      directEvidence(ffmpeg, source, output, root, 2, [
        {
          overlay_id: 'mask-a',
          start_frame: 0,
          end_frame: 2,
          roi: {x: 0, y: 0, width: 100, height: 99},
        },
        {
          overlay_id: 'mask-b',
          start_frame: 0,
          end_frame: 2,
          roi: {x: 0, y: 99, width: 99, height: 1},
        },
      ]),
    ).toThrow(/RESIDUAL-RATIO/u);
  });

  it('preserves odd yuv420p ROI coordinates and detects its declared border', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    const ffmpeg = fixture.preservationOptions.preservationToolAuthority.ffmpeg_path;
    const root = mkdtempSync(resolve(tmpdir(), 'case-rgb-yuv-odd-roi-'));
    caseFixtureRoots.push(root);
    const source = media(
      root,
      'yuv-source',
      'color=black:s=100x100:r=24:d=0.125',
      ffmpeg,
      3,
      'yuv420p',
    );
    const changed = media(
      root,
      'yuv-border-change',
      'color=black:s=100x100:r=24:d=0.125,drawbox=x=4:y=4:w=1:h=1:c=white:t=fill',
      ffmpeg,
      3,
      'yuv420p',
    );
    const oddRoi = {x: 1, y: 1, width: 4, height: 4};
    expect(directEvidence(ffmpeg, source, source, root, 2, [], oddRoi).changed_pixels).toBe(0);
    const observed = directEvidence(ffmpeg, source, changed, root, 2, [], oddRoi);
    expect(observed.changed_pixels).toBeGreaterThan(0);
    expect(() => assertCaseLongformRgbRegionPreserved(observed)).toThrow(/OUTSIDE-MASK-CHANGED/u);
  });

  it('ignores fake PATH', () => {
    const fixture = materialize();
    const previous = process.env.PATH;
    process.env.PATH = fixture.base.root;
    try {
      expect(validate(fixture).status).toBe(
        'BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS',
      );
    } finally {
      if (previous === undefined) delete process.env.PATH;
      else process.env.PATH = previous;
    }
  });

  it('rejects tool drift', () => {
    const toolDrift = materialize();
    toolDrift.base.preservationOptions.preservationToolAuthority.ffmpeg_sha256 = BAD;
    expect(() => validate(toolDrift)).toThrow(/TOOL-UNTRUSTED/u);
  });

  it('rejects timing drift', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    const ffmpeg = fixture.preservationOptions.preservationToolAuthority.ffmpeg_path;
    const ffprobe = fixture.preservationOptions.preservationToolAuthority.ffprobe_path;
    const invalid = resolve(fixture.root, 'timing.mp4');
    const made = spawnSync(
      ffmpeg,
      [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=blue:s=1920x1080:r=25:d=0.12',
        '-an',
        '-y',
        invalid,
      ],
      {encoding: 'utf8'},
    );
    expect(made.status).toBe(0);
    expect(() => probeCaseLongformRgbMedia(ffprobe, invalid)).toThrow(/MEDIA-DRIFT/u);
  });

  it('rejects media drift during the snapshot', () => {
    const mediaDrift = materialize();
    const options = {
      ...mediaDrift.base.preservationOptions,
      rgbMaterialHooks: {
        afterChunk(path: string) {
          if (path.endsWith('.mp4')) writeFileSync(path, 'mutated');
        },
      },
    };
    expect(() => validate(mediaDrift, options)).toThrow(/MEDIA-SNAPSHOT-(?:IDENTITY|MATERIAL)/u);
  });

  it('uses bounded robust snapshots and rejects aliases or snapshot mutation', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'case-rgb-snapshot-'));
    caseFixtureRoots.push(root);
    const bytes = Buffer.alloc(2_500_123, 7);
    writeFileSync(resolve(root, 'large.mp4'), bytes);
    const ref = {ref: 'large.mp4', bytes: bytes.byteLength, sha256: hash(bytes)};
    let observed: {chunks: number; max_chunk_bytes: number} | undefined;
    withCaseLongformMediaSnapshot(root, ref, () => undefined, {
      read: (fd, buffer, offset, length, position) =>
        readSync(fd, buffer, offset, Math.min(length, 131_071), position),
      write: (fd, buffer, offset, length, position) =>
        writeSync(fd, buffer, offset, Math.min(length, 65_537), position),
      observed: (value) => (observed = value),
    });
    expect(observed).toMatchObject({chunks: 20, max_chunk_bytes: 131_071});
    expect(() =>
      withCaseLongformMediaSnapshot(root, ref, (path) => writeFileSync(path, 'tampered')),
    ).toThrow(/OUTPUT-DRIFT/u);
    mkdirSync(resolve(root, 'real'));
    writeFileSync(resolve(root, 'real', 'media.mp4'), bytes);
    symlinkSync(resolve(root, 'real'), resolve(root, 'alias'));
    expect(() =>
      withCaseLongformMediaSnapshot(root, {...ref, ref: 'alias/media.mp4'}, () => undefined),
    ).toThrow(/SYMLINK-COMPONENT/u);
  });
});
