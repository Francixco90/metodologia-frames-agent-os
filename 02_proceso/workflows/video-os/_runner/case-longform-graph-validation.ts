import type {z} from 'zod';

import type {
  CaseLongformCaptionCleanup,
  CaseLongformCaptionTrack,
  CaseLongformCompiler,
  CaseLongformOperationGraph,
  CaseLongformRedactionMap,
  CaseLongformRunner,
  CaseLongformTemporalMap,
} from './case-longform-graph-structure.ts';

type Graph = z.infer<typeof CaseLongformOperationGraph>;
type Span = {id: string; start_frame: number; end_frame: number};
type Input = {
  jobId: string;
  sourceSetSha: string;
  hashes: Record<string, string>;
  sources: Array<{media: {sha256: string}}>;
  runner: z.infer<typeof CaseLongformRunner>;
  compiler: z.infer<typeof CaseLongformCompiler>;
  graph: Graph;
  temporal: z.infer<typeof CaseLongformTemporalMap>;
  redaction: z.infer<typeof CaseLongformRedactionMap>;
  captions: z.infer<typeof CaseLongformCaptionTrack>;
  cleanup: z.infer<typeof CaseLongformCaptionCleanup>;
};
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const spans = (items: Span[], frameCount: number, label: string, uniqueIntervals = false): void => {
  if (new Set(items.map(({id}) => id)).size !== items.length)
    throw new Error(`VIDEO-OS-CASE-${label}-DUPLICATE`);
  if (
    uniqueIntervals &&
    new Set(items.map(({start_frame, end_frame}) => `${start_frame}:${end_frame}`)).size !==
      items.length
  )
    throw new Error(`VIDEO-OS-CASE-${label}-INTERVAL-DUPLICATE`);
  if (items.some(({start_frame, end_frame}) => start_frame > end_frame || end_frame >= frameCount))
    throw new Error(`VIDEO-OS-CASE-${label}-RANGE`);
};
const graphTopology = (graph: Graph): void => {
  graph.nodes.forEach((node, index) => {
    if (node.start_frame > node.end_frame) throw new Error('VIDEO-OS-CASE-GRAPH-NODE-RANGE');
    if (node.start_frame !== (index === 0 ? 0 : graph.nodes[index - 1]!.end_frame + 1))
      throw new Error('VIDEO-OS-CASE-GRAPH-DISCONNECTED');
    const inputs = index === 0 ? [] : [`op:${graph.nodes[index - 1]!.role}`];
    if (!same(node.inputs, inputs) || node.sink !== (index === graph.nodes.length - 1))
      throw new Error('VIDEO-OS-CASE-GRAPH-TOPOLOGY');
  });
  if (graph.nodes.at(-1)?.end_frame !== graph.frame_count - 1)
    throw new Error('VIDEO-OS-CASE-GRAPH-FRAME-COUNT');
};

export const validateCaseLongformGraphMaterial = (input: Input): void => {
  const {hashes: h, graph, runner, compiler, temporal, redaction, captions, cleanup} = input;
  if (
    graph.job_id !== input.jobId ||
    graph.source_set_sha256 !== input.sourceSetSha ||
    graph.plan_sha256 !== h.plan ||
    graph.runner_sha256 !== h.runner ||
    graph.compiler_sha256 !== h.compiler ||
    graph.nodes.some((node, index) => node.source_sha256 !== input.sources[index]?.media.sha256)
  )
    throw new Error('VIDEO-OS-CASE-GRAPH-BINDING');
  graphTopology(graph);
  for (const artifact of [temporal, redaction, captions])
    if (
      artifact.job_id !== input.jobId ||
      artifact.graph_sha256 !== h.graph ||
      ('frame_count' in artifact && artifact.frame_count !== graph.frame_count)
    )
      throw new Error('VIDEO-OS-CASE-MAP-BINDING');
  for (const [label, items, uniqueIntervals] of [
    ['LAYOUT', temporal.layouts, true],
    ['SCROLL', temporal.scrolls, true],
    ['FADE', temporal.fades, true],
    ['MASK', redaction.masks, false],
    ['SENSITIVE', redaction.sensitive_spans, false],
    ['CAPTION', captions.cues, false],
  ] as const)
    spans(items, graph.frame_count, label, uniqueIntervals);
  const layouts = [...temporal.layouts].sort((a, b) => a.start_frame - b.start_frame);
  if (
    layouts[0]?.start_frame !== 0 ||
    layouts.at(-1)?.end_frame !== graph.frame_count - 1 ||
    layouts.some(
      (span, index) => index > 0 && span.start_frame !== layouts[index - 1]!.end_frame + 1,
    )
  )
    throw new Error('VIDEO-OS-CASE-LAYOUT-COVERAGE');
  const boundaries = graph.nodes.slice(1).map((node, index) => ({
    id: `${graph.nodes[index]!.role}->${node.role}`,
    frame: node.start_frame,
  }));
  if (!same(temporal.boundaries, boundaries)) throw new Error('VIDEO-OS-CASE-BOUNDARY-DERIVATION');
  const masks = new Map(redaction.masks.map((mask) => [mask.id, mask]));
  if (redaction.masks.some(({roi}) => roi.x + roi.width > 1920 || roi.y + roi.height > 1080))
    throw new Error('VIDEO-OS-CASE-MASK-ROI-BOUNDS');
  if (
    redaction.sensitive_spans.some((span) =>
      span.mask_ids.some((id) => {
        const mask = masks.get(id);
        return !mask || mask.start_frame > span.start_frame || mask.end_frame < span.end_frame;
      }),
    )
  )
    throw new Error('VIDEO-OS-CASE-SENSITIVE-MASK-BINDING');
  const cues = [...captions.cues].sort((a, b) => a.start_frame - b.start_frame);
  if (cues.some((cue, index) => index > 0 && cue.start_frame <= cues[index - 1]!.end_frame))
    throw new Error('VIDEO-OS-CASE-CAPTION-OVERLAP');
  if (
    captions.cleanup.sha256 !== h.cleanup ||
    cleanup.job_id !== input.jobId ||
    cleanup.graph_sha256 !== h.graph ||
    cleanup.track_id !== captions.track_id
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-CLEANUP-BINDING');
  const captionText = captions.cues.map(({text}) => text).join('\n');
  if (
    new Set(cleanup.replacements.map(({from}) => from)).size !== cleanup.replacements.length ||
    cleanup.replacements.some(
      ({from, to}) =>
        from === to || to.trim() === '' || captionText.includes(from) || !captionText.includes(to),
    )
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-CLEANUP-NOT-APPLIED');
  if (
    runner.command_sha256 !== runner.executable.sha256 ||
    compiler.command_sha256 !== compiler.executable.sha256
  )
    throw new Error('VIDEO-OS-CASE-EXECUTABLE-BINDING');
};
