import {DiagramContractV2Schema} from 'workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
import type {z} from 'zod';

import * as geometry from './diagram-geometry.ts';

export type DiagramContract = z.infer<typeof DiagramContractV2Schema>;
export interface DiagramRuntime {
  readonly duration: number;
  readonly frame: number;
  readonly height: number;
  readonly width: number;
}
export interface DiagramModel {
  readonly binding: string;
  readonly contract: DiagramContract;
  readonly frame: number;
}
export class DiagramModelError extends Error {
  public constructor(public readonly code: string) {
    super(code);
  }
}
const fail = (code: string): never => {
  throw new DiagramModelError(code);
};
const assertGraph = (contract: DiagramContract): void => {
  const ids = contract.nodes.map(({id}) => id);
  const links = new Map(ids.map((id) => [id, new Set<string>()]));
  const incoming = new Map(ids.map((id) => [id, 0]));
  for (const {source, target} of contract.edges) {
    links.get(source)?.add(target);
    links.get(target)?.add(source);
    incoming.set(target, (incoming.get(target) ?? 0) + 1);
  }
  const reached = new Set<string>();
  const pending = [ids[0]!];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    pending.push(...(links.get(id) ?? []));
  }
  if (reached.size !== ids.length) fail('DIAGRAM_GRAPH_DISCONNECTED');
  if (contract.grammar === 'radial-lenses') {
    if (contract.edges.length < ids.length) fail('DIAGRAM_RADIAL_EDGE_COUNT_INVALID');
    if ([...links.values()].some((neighbors) => neighbors.size < 2))
      fail('DIAGRAM_RADIAL_DEGREE_INVALID');
    return;
  }
  const queue = ids.filter((id) => incoming.get(id) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited += 1;
    for (const edge of contract.edges.filter(({source}) => source === id)) {
      const next = (incoming.get(edge.target) ?? 0) - 1;
      incoming.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }
  if (visited !== ids.length) fail('DIAGRAM_FLOW_CYCLE');
};
const assertGeometry = (contract: DiagramContract): void => {
  const {height, safe_zone: safe, width} = contract.stage;
  const safeRect = geometry.normalizedBoundsToLayoutRect({
    bounds: safe,
    compositionHeight: height,
    compositionWidth: width,
  });
  const ids = contract.nodes.map(({id}) => id);
  const rects = contract.nodes.map(({bounds}) =>
    geometry.normalizedBoundsToLayoutRect({
      bounds,
      compositionHeight: height,
      compositionWidth: width,
    }),
  );
  if (rects.some((rect) => !geometry.isInsideLayoutRect(rect, safeRect)))
    fail('DIAGRAM_PREFLIGHT_SAFE_ZONE');
  for (const [index, rect] of rects.entries())
    if (rects.slice(index + 1).some((candidate) => geometry.layoutRectsOverlap(rect, candidate)))
      fail('DIAGRAM_PREFLIGHT_NODE_OVERLAP');
  const lines = contract.edges.map((edge) => ({
    edge,
    end: geometry.layoutRectCenter(rects[ids.indexOf(edge.target)]!),
    start: geometry.layoutRectCenter(rects[ids.indexOf(edge.source)]!),
  }));
  for (const {edge, end, start} of lines)
    if (
      rects.some(
        (rect, index) =>
          ![edge.source, edge.target].includes(ids[index]!) &&
          geometry.segmentIntersectsRect(start, end, rect),
      )
    )
      fail('DIAGRAM_PREFLIGHT_EDGE_THROUGH_NODE');
  for (const [index, left] of lines.entries())
    for (const right of lines.slice(index + 1)) {
      const rightIds = [right.edge.source, right.edge.target];
      const shared = [left.edge.source, left.edge.target].find((id) => rightIds.includes(id));
      if (!shared && geometry.segmentsIntersect(left.start, left.end, right.start, right.end))
        fail('DIAGRAM_PREFLIGHT_EDGE_CROSS');
      if (shared) {
        const point = geometry.layoutRectCenter(rects[ids.indexOf(shared)]!);
        const other = (line: (typeof lines)[number]) =>
          line.edge.source === shared ? line.end : line.start;
        if (geometry.segmentsOverlapBeyondSharedEndpoint(point, other(left), other(right)))
          fail('DIAGRAM_PREFLIGHT_EDGE_OVERLAP');
      }
    }
};
const assertSemantics = (contract: DiagramContract, duration: number): void => {
  if (!['flow', 'radial-lenses'].includes(contract.grammar)) fail('DIAGRAM_GRAMMAR_UNSUPPORTED');
  if (contract.grammar === 'flow' && contract.edges.some(({direction}) => direction !== 'forward'))
    fail('DIAGRAM_FLOW_DIRECTION_INVALID');
  if (
    contract.grammar === 'radial-lenses' &&
    contract.edges.some(({direction}) => direction !== 'bidirectional')
  )
    fail('DIAGRAM_RADIAL_DIRECTION_INVALID');
  const nodeIds = contract.nodes.map(({id}) => id);
  const edgeIds = contract.edges.map(({id}) => id);
  const visual = contract.edges.map(geometry.canonicalVisualEdgeKey);
  if (new Set(nodeIds).size !== nodeIds.length || new Set(edgeIds).size !== edgeIds.length)
    fail('DIAGRAM_ID_DUPLICATE');
  if (new Set(visual).size !== visual.length) fail('DIAGRAM_EDGE_VISUAL_DUPLICATE');
  if (
    contract.nodes.some(({enter_frame, settle_frame}) => settle_frame < enter_frame) ||
    contract.edges.some(
      ({end_frame, source, start_frame, target}) =>
        source === target ||
        !nodeIds.includes(source) ||
        !nodeIds.includes(target) ||
        end_frame <= start_frame,
    )
  )
    fail('DIAGRAM_RELATION_INVALID');
  const first = Math.min(...contract.nodes.map(({enter_frame}) => enter_frame));
  const settled = Math.max(...contract.nodes.map(({settle_frame}) => settle_frame));
  const edgeEnd = Math.max(0, ...contract.edges.map(({end_frame}) => end_frame));
  const pose = contract.required_poses;
  const frames = [
    ...contract.nodes.flatMap(({enter_frame, settle_frame}) => [enter_frame, settle_frame]),
    ...contract.edges.flatMap(({end_frame, start_frame}) => [start_frame, end_frame]),
    ...Object.values(pose),
  ];
  if (frames.some((frame) => frame >= duration)) fail('DIAGRAM_FRAME_OUT_OF_RANGE');
  if (
    pose.container_frame >= first ||
    pose.components_settled_frame < settled ||
    contract.edges.some(({start_frame}) => start_frame < settled + 6) ||
    pose.connectors_complete_frame < Math.max(edgeEnd, pose.components_settled_frame) ||
    pose.closing_frame <= pose.connectors_complete_frame
  )
    fail('DIAGRAM_POSE_ORDER_INVALID');
};

export const compileDiagramModel = (
  diagram: unknown,
  diagramSha256: string,
  runtime: DiagramRuntime,
): DiagramModel => {
  const parsed = DiagramContractV2Schema.safeParse(diagram);
  const contract = parsed.success ? parsed.data : fail('DIAGRAM_SCHEMA_INVALID');
  if (
    runtime.width !== contract.stage.width ||
    runtime.height !== contract.stage.height ||
    !Number.isInteger(runtime.duration) ||
    runtime.duration <= 0 ||
    !Number.isInteger(runtime.frame) ||
    runtime.frame < 0 ||
    runtime.frame >= runtime.duration
  )
    fail('DIAGRAM_RUNTIME_INVALID');
  let binding: string;
  try {
    binding = geometry.canonicalDiagramBinding(diagram, diagramSha256);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'DIAGRAM_SHA256_INVALID');
  }
  assertSemantics(contract, runtime.duration);
  assertGraph(contract);
  assertGeometry(contract);
  return {binding, contract, frame: runtime.frame};
};
