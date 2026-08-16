import {createHash} from 'node:crypto';
import type {z} from 'zod';

import type {
  CaseLongformCaptionCompositorAuthority,
  CaseLongformCaptionPlacementPlan,
} from './case-longform-caption-contract-authority.ts';
import {
  CaseLongformCaptionExecutionLedger,
  type CaseLongformCaptionExecutionAuthority,
  type CaseLongformCaptionExecutionLedgerValue,
} from './case-longform-caption-execution-authority.ts';

type Placement = z.infer<typeof CaseLongformCaptionPlacementPlan>;
type Compositor = z.infer<typeof CaseLongformCaptionCompositorAuthority>;
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

export const deriveCaseLongformCaptionExecutionLedger = (input: {
  contract: CaseLongformCaptionExecutionAuthority;
  placement: Placement;
  compositor: Compositor;
}): CaseLongformCaptionExecutionLedgerValue => {
  const {contract, placement, compositor} = input;
  const a = contract.artifacts;
  let previous: string | null = null;
  const entries = placement.placements.map((item, sequence) => {
    const value = {
      sequence,
      cue_id: item.cue_id,
      layout_id: item.layout_id,
      start_frame: item.start_frame,
      end_frame: item.end_frame,
      text_sha256: item.text_sha256,
      font_sha256: item.font_sha256,
      geometry: {x: item.x, y: item.y, width: item.width, height: item.height},
      graph_sha256: a.operation_graph.sha256,
      temporal_map_sha256: a.temporal_map.sha256,
      caption_track_sha256: a.caption_track.sha256,
      caption_cleanup_sha256: a.caption_cleanup.sha256,
      layout_authority_sha256: a.caption_layout_authority.sha256,
      compositor_authority_sha256: a.caption_compositor_authority.sha256,
      compositor_executable_sha256: compositor.executable.sha256,
      compositor_command_sha256: compositor.command.sha256,
      compositor_config_sha256: compositor.config.sha256,
      previous_entry_sha256: previous,
    };
    const entry = {...value, entry_sha256: sha(JSON.stringify(value))};
    previous = entry.entry_sha256;
    return entry;
  });
  return CaseLongformCaptionExecutionLedger.parse({
    schema_version: 'case-longform-caption-execution-ledger-v1',
    kind: 'caption_execution_ledger',
    execution_scope: 'CAPTION_DATA_GRAPH_ONLY',
    job_id: contract.job_id,
    source_set_sha256: contract.source_set_sha256,
    placement_plan_sha256: a.caption_placement_plan.sha256,
    graph_sha256: a.operation_graph.sha256,
    temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256,
    caption_cleanup_sha256: a.caption_cleanup.sha256,
    layout_authority_sha256: a.caption_layout_authority.sha256,
    compositor_authority_sha256: a.caption_compositor_authority.sha256,
    compositor_executable_sha256: compositor.executable.sha256,
    compositor_command_sha256: compositor.command.sha256,
    compositor_config_sha256: compositor.config.sha256,
    entries,
    chain_sha256: entries.at(-1)!.entry_sha256,
  });
};
