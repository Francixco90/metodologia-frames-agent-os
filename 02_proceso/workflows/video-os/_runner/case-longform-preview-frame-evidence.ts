import {spawnSync} from 'node:child_process';

import {
  probeCaseLongformMediaPath,
  withCaseLongformMediaSnapshot,
  withCaseLongformMediaTools,
  type CaseLongformMediaSnapshotHooks,
  type CaseLongformMediaToolAuthority,
} from './case-longform-media.ts';

export type CaseLongformRoi = {x: number; y: number; width: number; height: number};
type Span = {id: string; start_frame: number; end_frame: number};
type RegionalSpan = Span & {roi: CaseLongformRoi};
export type CaseLongformCoveragePoint = {
  id: string;
  kind: 'base' | 'layout' | 'scroll' | 'fade' | 'boundary' | 'sensitive';
  subject_id: string;
  frame: number;
  region_id?: string;
  mask_id?: string;
  roi?: CaseLongformRoi;
  frame_sha256?: string;
};
const thirds = (
  kind: CaseLongformCoveragePoint['kind'],
  span: Span | RegionalSpan,
): CaseLongformCoveragePoint[] =>
  (['start', 'mid', 'end'] as const).map((position) => ({
    id: `${kind}:${span.id}:${position}`,
    kind,
    subject_id: span.id,
    frame:
      position === 'start'
        ? span.start_frame
        : position === 'end'
          ? span.end_frame
          : Math.floor((span.start_frame + span.end_frame) / 2),
    ...('roi' in span ? {region_id: span.id, roi: span.roi} : {}),
  }));
export const deriveCaseLongformPreviewCoverage = (
  frameCount: number,
  temporal: {
    layouts: Span[];
    scrolls: RegionalSpan[];
    fades: RegionalSpan[];
    boundaries: Array<{id: string; frame: number}>;
  },
  redaction: {masks: RegionalSpan[]; sensitive_spans: Array<Span & {mask_ids: string[]}>},
): CaseLongformCoveragePoint[] => {
  const points: CaseLongformCoveragePoint[] = [
    {id: 'base:preview:start', kind: 'base', subject_id: 'preview', frame: 0},
    {
      id: 'base:preview:mid',
      kind: 'base',
      subject_id: 'preview',
      frame: Math.floor((frameCount - 1) / 2),
    },
    {id: 'base:preview:end', kind: 'base', subject_id: 'preview', frame: frameCount - 1},
  ];
  const spansByKind = {layout: temporal.layouts, scroll: temporal.scrolls, fade: temporal.fades};
  for (const kind of ['layout', 'scroll', 'fade'] as const)
    spansByKind[kind].forEach((span) => points.push(...thirds(kind, span)));
  temporal.boundaries.forEach(({id, frame}) => {
    for (let offset = -2; offset <= 2; offset += 1) {
      const sampled = frame + offset;
      if (sampled < 0 || sampled >= frameCount)
        throw new Error('VIDEO-OS-CASE-COVERAGE-BOUNDARY-RANGE');
      points.push({
        id: `boundary:${id}:${offset}`,
        kind: 'boundary',
        subject_id: id,
        frame: sampled,
      });
    }
  });
  const masks = new Map(redaction.masks.map((mask) => [mask.id, mask]));
  redaction.sensitive_spans.forEach((span) => {
    for (const maskId of span.mask_ids) {
      const mask = masks.get(maskId);
      if (!mask) throw new Error('VIDEO-OS-CASE-COVERAGE-MASK-MISSING');
      for (let frame = span.start_frame; frame <= span.end_frame; frame += 1)
        points.push({
          id: `sensitive:${span.id}:${maskId}:${frame}`,
          kind: 'sensitive',
          subject_id: span.id,
          region_id: maskId,
          mask_id: maskId,
          roi: mask.roi,
          frame,
        });
    }
  });
  return points.sort((left, right) => left.id.localeCompare(right.id));
};

export const caseLongformRoiKey = ({x, y, width, height}: CaseLongformRoi): string =>
  `${x}:${y}:${width}:${height}`;
const decode = (ffmpeg: string, snapshot: string, roi?: CaseLongformRoi): Map<number, string> => {
  const filters = roi ? ['-vf', `crop=${roi.width}:${roi.height}:${roi.x}:${roi.y}:exact=1`] : [];
  const result = spawnSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      snapshot,
      '-map',
      '0:v:0',
      ...filters,
      '-f',
      'framehash',
      '-hash',
      'sha256',
      '-',
    ],
    {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024},
  );
  if (result.status !== 0) throw new Error('VIDEO-OS-CASE-FRAMEHASH-DECODE-FAILED');
  if (!result.stdout.includes('#tb 0: 1/24'))
    throw new Error('VIDEO-OS-CASE-FRAMEHASH-TIMEBASE-INVALID');
  const hashes = new Map<number, string>();
  result.stdout
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .forEach((line, index) => {
      const fields = line.split(',').map((field) => field.trim());
      const pts = Number(fields[2]);
      const hash = fields[5];
      if (pts !== index || !hash?.match(/^[a-f0-9]{64}$/u))
        throw new Error('VIDEO-OS-CASE-FRAMEHASH-OUTPUT-INVALID');
      hashes.set(index, hash);
    });
  if (hashes.size === 0) throw new Error('VIDEO-OS-CASE-FRAMEHASH-OUTPUT-EMPTY');
  return hashes;
};
const frameHashesFromSnapshot = (
  snapshot: string,
  rois: CaseLongformRoi[],
  ffmpeg: string,
): {full: Map<number, string>; regions: Map<string, Map<number, string>>} => {
  const unique = new Map(rois.map((roi) => [caseLongformRoiKey(roi), roi]));
  return {
    full: decode(ffmpeg, snapshot),
    regions: new Map([...unique].map(([key, roi]) => [key, decode(ffmpeg, snapshot, roi)])),
  };
};

type Ref = {ref: string; sha256: string; bytes: number};
export const inspectCaseLongformPreviewMaterial = (
  root: string,
  ref: Ref,
  rois: CaseLongformRoi[],
  authority: CaseLongformMediaToolAuthority,
  hooks?: CaseLongformMediaSnapshotHooks,
) =>
  withCaseLongformMediaTools(
    authority,
    (tools) =>
      withCaseLongformMediaSnapshot(
        root,
        ref,
        (path) => ({
          measurements: probeCaseLongformMediaPath(path, tools),
          hashes: frameHashesFromSnapshot(path, rois, tools.ffmpeg),
        }),
        hooks,
      ),
    hooks,
  );
