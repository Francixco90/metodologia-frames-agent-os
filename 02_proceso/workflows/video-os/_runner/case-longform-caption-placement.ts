import {createHash} from 'node:crypto';
import type {z} from 'zod';

import type {
  CaseLongformCaptionTrack,
  CaseLongformOperationGraph,
  CaseLongformTemporalMap,
} from './case-longform-graph-structure.ts';
import {
  CaseLongformCaptionPlacementPlan,
  type CaseLongformCaptionContractAuthority,
  type CaseLongformCaptionLayoutAuthorityValue,
} from './case-longform-caption-contract-authority.ts';

type Ref = {ref: string; sha256: string; bytes: number};
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const lineCount = (text: string, maxChars: number): number => {
  const forbidden = [...text].some((character) => {
    const codepoint = character.codePointAt(0)!;
    return (codepoint < 32 && codepoint !== 10) || codepoint === 127;
  });
  if (forbidden) throw new Error('VIDEO-OS-CASE-CAPTION-TEXT-CONTROL');
  return text
    .split('\n')
    .reduce((total, segment) => total + Math.max(1, Math.ceil([...segment].length / maxChars)), 0);
};

export const caseLongformCaptionFontSetSha256 = (fonts: Ref[]): string =>
  sha(JSON.stringify(fonts.map(({sha256, bytes}) => ({sha256, bytes}))));

export const deriveCaseLongformCaptionPlacements = (input: {
  contract: CaseLongformCaptionContractAuthority;
  graph: z.infer<typeof CaseLongformOperationGraph>;
  temporal: z.infer<typeof CaseLongformTemporalMap>;
  track: z.infer<typeof CaseLongformCaptionTrack>;
  layout: CaseLongformCaptionLayoutAuthorityValue;
}) => {
  const {contract, graph, temporal, track, layout} = input;
  const placements = track.cues.flatMap((cue) => {
    const layouts = temporal.layouts
      .filter((value) => value.start_frame <= cue.end_frame && value.end_frame >= cue.start_frame)
      .sort((left, right) => left.start_frame - right.start_frame);
    if (
      layouts.length === 0 ||
      cue.end_frame >= graph.frame_count ||
      layouts[0]!.start_frame > cue.start_frame ||
      layouts.at(-1)!.end_frame < cue.end_frame ||
      layouts.some(
        (value, index) => index > 0 && layouts[index - 1]!.end_frame + 1 !== value.start_frame,
      )
    )
      throw new Error('VIDEO-OS-CASE-CAPTION-LAYOUT-COVERAGE');
    return layouts.map((active) => {
      const rule = layout.rules.find(({layout_id}) => layout_id === active.id)!;
      const lines = lineCount(cue.text, rule.max_chars_per_line);
      if (lines > rule.max_lines) throw new Error('VIDEO-OS-CASE-CAPTION-TEXT-OVERFLOW');
      const height = lines * rule.line_height;
      return {
        cue_id: cue.id,
        layout_id: rule.layout_id,
        start_frame: Math.max(cue.start_frame, active.start_frame),
        end_frame: Math.min(cue.end_frame, active.end_frame),
        text_sha256: sha(cue.text),
        font_sha256: rule.font_sha256,
        x: Math.floor((1920 - rule.box_width) / 2),
        y: 1080 - rule.bottom_margin - height,
        width: rule.box_width,
        height,
      };
    });
  });
  return CaseLongformCaptionPlacementPlan.parse({
    schema_version: 'case-longform-caption-placement-plan-v1',
    kind: 'caption_placement_plan',
    job_id: contract.job_id,
    plan_sha256: contract.artifacts.plan.sha256,
    source_set_sha256: contract.source_set_sha256,
    graph_sha256: contract.artifacts.operation_graph.sha256,
    temporal_map_sha256: contract.artifacts.temporal_map.sha256,
    caption_track_sha256: contract.artifacts.caption_track.sha256,
    caption_cleanup_sha256: contract.artifacts.caption_cleanup.sha256,
    layout_authority_sha256: contract.artifacts.caption_layout_authority.sha256,
    font_set_sha256: layout.font_set_sha256,
    placements,
  });
};
