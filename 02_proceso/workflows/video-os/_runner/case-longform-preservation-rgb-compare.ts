import {createHash} from 'node:crypto';
import {closeSync, constants, openSync, readSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  caseLongformRoiUnionArea,
  clipCaseLongformRoi,
} from './case-longform-preservation-plan-mask.ts';
import {
  extractCaseLongformRgbRange,
  type CaseLongformRgbRoi,
} from './case-longform-preservation-rgb.ts';

type Region = {
  region_id: string;
  source_sha256: string;
  source_start_frame: number;
  source_end_frame: number;
  output_start_frame: number;
  output_end_frame: number;
  output_roi: CaseLongformRgbRoi;
  overlay_ids: string[];
};
type Overlay = {
  overlay_id: string;
  start_frame: number;
  end_frame: number;
  roi: CaseLongformRgbRoi;
};
const RGB_CHUNK_FRAMES = 24;
const sha = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const readFrame = (fd: number, bytes: number): Buffer => {
  const frame = Buffer.allocUnsafe(bytes);
  let offset = 0;
  while (offset < bytes) {
    const read = readSync(fd, frame, offset, bytes - offset, null);
    if (read === 0) throw new Error('VIDEO-OS-CASE-RGB-FRAME-TRUNCATED');
    offset += read;
  }
  return frame;
};

export const compareCaseLongformRgbRegion = (args: {
  ffmpeg: string;
  root: string;
  source_path: string;
  output_path: string;
  output_sha256: string;
  region: Region;
  overlays: Overlay[];
  tolerance: number;
  minimum_residual_ratio_ppm: number;
}) => {
  const {region} = args;
  const frameCount = region.source_end_frame - region.source_start_frame + 1;
  if (frameCount !== region.output_end_frame - region.output_start_frame + 1)
    throw new Error('VIDEO-OS-CASE-RGB-FRAME-COUNT-DRIFT');
  const area = region.output_roi.width * region.output_roi.height;
  const summaries = new Map<number, Record<string, number | string>>();
  let chain = sha(`${region.region_id}:${region.source_sha256}:${args.output_sha256}`);
  let totalMasked = 0;
  let totalChanged = 0;
  let minimumPpm = 1_000_000;
  let worstFrame = region.output_start_frame;
  let worstChanged = 0;
  for (let offset = 0; offset < frameCount; offset += RGB_CHUNK_FRAMES) {
    const endOffset = Math.min(frameCount, offset + RGB_CHUNK_FRAMES) - 1;
    const sourceRaw = extractCaseLongformRgbRange(
      args.ffmpeg,
      args.source_path,
      resolve(args.root, `${region.region_id}-source.rgb`),
      region.source_start_frame + offset,
      region.source_start_frame + endOffset,
      region.output_roi,
    );
    const outputRaw = extractCaseLongformRgbRange(
      args.ffmpeg,
      args.output_path,
      resolve(args.root, `${region.region_id}-output.rgb`),
      region.output_start_frame + offset,
      region.output_start_frame + endOffset,
      region.output_roi,
    );
    const sourceFd = openSync(sourceRaw.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const outputFd = openSync(outputRaw.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      for (let local = 0; local < sourceRaw.frame_count; local += 1) {
        const index = offset + local;
        const sourceFrame = readFrame(sourceFd, sourceRaw.frame_bytes);
        const outputFrame = readFrame(outputFd, outputRaw.frame_bytes);
        const outputNumber = region.output_start_frame + index;
        const masks = args.overlays
          .filter(
            (value) =>
              region.overlay_ids.includes(value.overlay_id) &&
              value.start_frame <= outputNumber &&
              value.end_frame >= outputNumber,
          )
          .map((value) => clipCaseLongformRoi(region.output_roi, value.roi))
          .filter((value): value is CaseLongformRgbRoi => value !== null);
        const masked = caseLongformRoiUnionArea(masks);
        const residual = area - masked;
        const ppm = Math.floor((residual * 1_000_000) / area);
        if (ppm < args.minimum_residual_ratio_ppm)
          throw new Error('VIDEO-OS-CASE-RGB-RESIDUAL-RATIO');
        let changed = 0;
        for (let pixel = 0; pixel < area; pixel += 1) {
          const x = region.output_roi.x + (pixel % region.output_roi.width);
          const y = region.output_roi.y + Math.floor(pixel / region.output_roi.width);
          if (
            masks.some(
              (value) =>
                x >= value.x &&
                x < value.x + value.width &&
                y >= value.y &&
                y < value.y + value.height,
            )
          )
            continue;
          const byte = pixel * 3;
          if (
            [0, 1, 2].some(
              (channel) =>
                Math.abs(sourceFrame[byte + channel]! - outputFrame[byte + channel]!) >
                args.tolerance,
            )
          )
            changed += 1;
        }
        const summary = {
          source_frame: region.source_start_frame + index,
          output_frame: outputNumber,
          source_frame_sha256: sha(sourceFrame),
          output_frame_sha256: sha(outputFrame),
          masked_pixels: masked,
          residual_pixels: residual,
          changed_pixels: changed,
        };
        summaries.set(outputNumber, summary);
        chain = sha(`${chain}:${JSON.stringify(summary)}`);
        totalMasked += masked;
        totalChanged += changed;
        minimumPpm = Math.min(minimumPpm, ppm);
        if (changed > worstChanged) [worstChanged, worstFrame] = [changed, outputNumber];
      }
    } finally {
      closeSync(sourceFd);
      closeSync(outputFd);
    }
  }
  const mid = Math.floor((region.output_start_frame + region.output_end_frame) / 2);
  return {
    ...region,
    output_sha256: args.output_sha256,
    frame_count: frameCount,
    pixels_per_frame: area,
    total_masked_pixels: totalMasked,
    total_residual_pixels: area * frameCount - totalMasked,
    minimum_frame_residual_ratio_ppm: minimumPpm,
    changed_pixels: totalChanged,
    worst_output_frame: worstFrame,
    worst_changed_pixels: worstChanged,
    frame_chain_sha256: chain,
    samples: {
      start: summaries.get(region.output_start_frame)!,
      mid: summaries.get(mid)!,
      end: summaries.get(region.output_end_frame)!,
    },
  };
};

export const assertCaseLongformRgbRegionPreserved = (evidence: {changed_pixels: number}): void => {
  if (evidence.changed_pixels !== 0) throw new Error('VIDEO-OS-CASE-RGB-OUTSIDE-MASK-CHANGED');
};
