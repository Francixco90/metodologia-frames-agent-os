import type {z} from 'zod';

import type {
  CaseLongformCaptionTrack,
  CaseLongformRedactionMap,
  CaseLongformSourceSet,
} from './case-longform-graph-structure.ts';
import type {CaseLongformSourceSegmentMap} from './case-longform-prerender-authority.ts';
import type {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPolicyReceipt,
} from './case-longform-preservation-plan-authority.ts';

type Policy = z.infer<typeof CaseLongformPreservationPolicyReceipt>;
type Participant = Policy['participants'][number];
type Plan = z.infer<typeof CaseLongformPreservationPlan>;
type SourceSet = z.infer<typeof CaseLongformSourceSet>;
type Segments = z.infer<typeof CaseLongformSourceSegmentMap>;
type Redaction = z.infer<typeof CaseLongformRedactionMap>;
type Captions = z.infer<typeof CaseLongformCaptionTrack>;
type Roi = {x: number; y: number; width: number; height: number};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const roiKey = (v: Roi): string => `${v.x}:${v.y}:${v.width}:${v.height}`;
const roiOverlap = (a: Roi, b: Roi): boolean =>
  Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width) &&
  Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height);
const spanOverlap = (a0: number, a1: number, b0: number, b1: number): boolean =>
  Math.max(a0, b0) <= Math.min(a1, b1);
const bounded = (v: Roi): boolean => v.x + v.width <= 1920 && v.y + v.height <= 1080;
const pairKey = (a: string, b: string): string => [a, b].sort().join(':');
const exactIds = (actual: string[], expected: string[], error: string): void => {
  if (new Set(actual).size !== actual.length || !same([...actual].sort(), [...expected].sort()))
    throw new Error(error);
};
const crossPairs = (participant: Participant): string[] =>
  participant.regions.flatMap((left, index) =>
    participant.regions
      .slice(index + 1)
      .flatMap((right) =>
        left.category !== right.category &&
        left.source_role === right.source_role &&
        spanOverlap(
          left.source_start_frame,
          left.source_end_frame,
          right.source_start_frame,
          right.source_end_frame,
        ) &&
        roiOverlap(left.source_roi, right.source_roi)
          ? [pairKey(left.region_id, right.region_id)]
          : [],
      ),
  );
const assertPolicyParticipant = (
  participant: Participant,
  context: {redaction: Redaction; captions: Captions},
): void => {
  const overlayIds = participant.authorized_overlays.map(({overlay_id}) => overlay_id);
  const overlayGeometry = participant.authorized_overlays.map(
    ({kind, source_id, start_frame, end_frame, roi}) =>
      `${kind}:${source_id}:${start_frame}:${end_frame}:${roiKey(roi)}`,
  );
  if (
    new Set(overlayIds).size !== overlayIds.length ||
    new Set(overlayGeometry).size !== overlayGeometry.length
  )
    throw new Error('VIDEO-OS-CASE-PRESERVATION-OVERLAY-DUPLICATE');
  for (const overlay of participant.authorized_overlays) {
    if (!bounded(overlay.roi) || overlay.start_frame > overlay.end_frame)
      throw new Error('VIDEO-OS-CASE-PRESERVATION-OVERLAY-GEOMETRY');
    if (overlay.kind === 'MASK') {
      const mask = context.redaction.masks.find(({id}) => id === overlay.source_id);
      if (
        !mask ||
        mask.start_frame !== overlay.start_frame ||
        mask.end_frame !== overlay.end_frame ||
        !same(mask.roi, overlay.roi)
      )
        throw new Error('VIDEO-OS-CASE-PRESERVATION-MASK-DRIFT');
    } else {
      const cue = context.captions.cues.find(({id}) => id === overlay.source_id);
      if (!cue || cue.start_frame !== overlay.start_frame || cue.end_frame !== overlay.end_frame)
        throw new Error('VIDEO-OS-CASE-PRESERVATION-CAPTION-DRIFT');
    }
  }
  const ids = participant.regions.map(({region_id}) => region_id);
  const geometry = participant.regions.map(
    (v) => `${v.source_role}:${v.source_start_frame}:${v.source_end_frame}:${roiKey(v.source_roi)}`,
  );
  if (
    new Set(ids).size !== ids.length ||
    new Set(geometry).size !== geometry.length ||
    participant.regions.some(
      (v) => v.source_start_frame > v.source_end_frame || !bounded(v.source_roi),
    )
  )
    throw new Error('VIDEO-OS-CASE-PRESERVATION-REGION-DUPLICATE');
  exactIds(
    participant.allowed_cross_category_overlaps.map(([a, b]) => pairKey(a, b)),
    crossPairs(participant),
    'VIDEO-OS-CASE-PRESERVATION-CROSS-CATEGORY-DRIFT',
  );
};

export const assertCaseLongformPreservationPlanGeometry = (
  policy: Policy,
  plan: Plan,
  context: {sourceSet: SourceSet; segments: Segments; redaction: Redaction; captions: Captions},
): void => {
  policy.participants.forEach((participant) => assertPolicyParticipant(participant, context));
  const selected = policy.participants.find(
    ({participant_id}) => participant_id === plan.participant_id,
  );
  if (!selected) throw new Error('VIDEO-OS-CASE-PRESERVATION-PARTICIPANT-DRIFT');
  const overlayIds = selected.authorized_overlays.map(({overlay_id}) => overlay_id);
  exactIds(
    plan.regions.map(({region_id}) => region_id),
    selected.regions.map(({region_id}) => region_id),
    'VIDEO-OS-CASE-PRESERVATION-INVENTORY-DRIFT',
  );
  const usedOverlays = new Set<string>();
  for (const expected of selected.regions) {
    const region = plan.regions.find(({region_id}) => region_id === expected.region_id)!;
    const source = context.sourceSet.sources.find(({role}) => role === expected.source_role);
    const segment = context.segments.segments.filter(
      (item) =>
        item.role === expected.source_role &&
        item.source_start_frame <= expected.source_start_frame &&
        item.source_end_frame >= expected.source_end_frame,
    );
    if (!source || segment.length !== 1)
      throw new Error('VIDEO-OS-CASE-PRESERVATION-SOURCE-GEOMETRY');
    const item = segment[0]!;
    const outputStart =
      item.output_start_frame + expected.source_start_frame - item.source_start_frame;
    const outputEnd = outputStart + expected.source_end_frame - expected.source_start_frame;
    const expectedOverlays = selected.authorized_overlays
      .filter(
        (overlay) =>
          spanOverlap(outputStart, outputEnd, overlay.start_frame, overlay.end_frame) &&
          roiOverlap(expected.source_roi, overlay.roi),
      )
      .map(({overlay_id}) => overlay_id);
    expectedOverlays.forEach((id) => usedOverlays.add(id));
    if (
      region.category !== expected.category ||
      region.source_role !== expected.source_role ||
      region.source_sha256 !== source.media.sha256 ||
      region.source_start_frame !== expected.source_start_frame ||
      region.source_end_frame !== expected.source_end_frame ||
      region.output_start_frame !== outputStart ||
      region.output_end_frame !== outputEnd ||
      !same(region.source_roi, expected.source_roi) ||
      !same(region.output_roi, expected.source_roi)
    )
      throw new Error('VIDEO-OS-CASE-PRESERVATION-REGION-DRIFT');
    exactIds(region.overlay_ids, expectedOverlays, 'VIDEO-OS-CASE-PRESERVATION-OVERLAY-SET-DRIFT');
  }
  exactIds([...usedOverlays], overlayIds, 'VIDEO-OS-CASE-PRESERVATION-OVERLAY-ORPHAN');
};
