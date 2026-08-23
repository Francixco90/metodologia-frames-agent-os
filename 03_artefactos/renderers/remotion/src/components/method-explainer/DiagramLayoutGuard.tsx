import {useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {DiagramContractV2Schema} from 'workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
import {toCompositionCoordinates} from '../layout-geometry.ts';
import * as geometry from './diagram-geometry.ts';
import {classifyDiagramRoot, useDiagramLayoutLifecycle} from './DiagramLayoutLifecycle.tsx';

type DiagramContractV2 = ReturnType<typeof DiagramContractV2Schema.parse>;
type DiagramElement = HTMLElement & {dataset: DOMStringMap};
interface Inspection {
  readonly diagram: unknown;
  readonly duration: number;
  readonly frame: number;
  readonly height: number;
  readonly root: HTMLElement;
  readonly rootRect: geometry.LayoutRect;
  readonly width: number;
}
export const DIAGRAM_LAYOUT_GUARD_STATUS = 'CANDIDATE_PENDING_DIAGRAM_STAGE_MOUNT' as const;
export class DiagramLayoutGuardError extends Error {
  public constructor(public readonly code: string) {
    super(code);
  }
}
const fail = (code: string): never => {
  throw new DiagramLayoutGuardError(code);
};
const parseContract = (value: unknown): DiagramContractV2 => {
  const parsed = DiagramContractV2Schema.safeParse(value);
  return parsed.success ? parsed.data : fail('DIAGRAM_CONTRACT_INVALID');
};
const exactElements = (
  elements: readonly DiagramElement[],
  expectedIds: readonly string[],
  key: 'diagramEdge' | 'diagramNode',
): Map<string, DiagramElement> => {
  const entries = elements.map((element) => [element.dataset[key], element] as const);
  const ids = entries.map(([id]) => id);
  if (ids.some((id) => !id)) fail('DIAGRAM_DOM_ID_ABSENT');
  if (new Set(ids).size !== ids.length) fail('DIAGRAM_DOM_ID_DUPLICATE');
  const sorted = (values: readonly (string | undefined)[]) => [...values].sort().join('\0');
  if (sorted(ids) !== sorted(expectedIds)) fail('DIAGRAM_DOM_CONTRACT_MISMATCH');
  return new Map(entries as readonly (readonly [string, DiagramElement])[]);
};
export const requireDiagramRoot = (
  candidate: HTMLElement | null | undefined,
  binding: string,
): HTMLElement =>
  candidate?.dataset.diagramRoot === binding ? candidate : fail('DIAGRAM_ROOT_ABSENT');

export const inspectDiagramDom = (input: Inspection): void => {
  const {diagram, duration, frame, height, root, rootRect, width} = input;
  const contract = parseContract(diagram);
  if (
    contract.stage.width !== width ||
    contract.stage.height !== height ||
    !Number.isInteger(duration) ||
    duration <= 0 ||
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >= duration
  )
    fail('DIAGRAM_RUNTIME_PROFILE_MISMATCH');
  const nodeIds = contract.nodes.map(({id}) => id);
  const edgeIds = contract.edges.map(({id}) => id);
  const visualKeys = contract.edges.map(geometry.canonicalVisualEdgeKey);
  const frames = [
    ...contract.nodes.flatMap(({enter_frame, settle_frame}) => [enter_frame, settle_frame]),
    ...contract.edges.flatMap(({end_frame, start_frame}) => [start_frame, end_frame]),
    ...Object.values(contract.required_poses),
  ];
  if (new Set(nodeIds).size !== nodeIds.length || new Set(edgeIds).size !== edgeIds.length)
    fail('DIAGRAM_CONTRACT_ID_INVALID');
  if (new Set(visualKeys).size !== visualKeys.length) fail('DIAGRAM_EDGE_VISUAL_DUPLICATE');
  if (frames.some((value) => value >= duration)) fail('DIAGRAM_FRAME_RANGE_INVALID');
  if (
    contract.edges.some(
      ({end_frame, source, start_frame, target}) =>
        source === target ||
        !nodeIds.includes(source) ||
        !nodeIds.includes(target) ||
        end_frame <= start_frame,
    )
  )
    fail('DIAGRAM_EDGE_CONTRACT_INVALID');
  const firstEnter = Math.min(...contract.nodes.map(({enter_frame}) => enter_frame));
  const lastSettle = Math.max(...contract.nodes.map(({settle_frame}) => settle_frame));
  const lastEdge = Math.max(0, ...contract.edges.map(({end_frame}) => end_frame));
  const poses = contract.required_poses;
  if (
    poses.container_frame >= firstEnter ||
    poses.components_settled_frame < lastSettle ||
    poses.connectors_complete_frame < Math.max(lastEdge, poses.components_settled_frame) ||
    poses.closing_frame <= poses.connectors_complete_frame
  )
    fail('DIAGRAM_POSE_ORDER_INVALID');

  const safeZone = geometry.normalizedBoundsToLayoutRect({
    bounds: contract.stage.safe_zone,
    compositionHeight: height,
    compositionWidth: width,
  });
  const elements = exactElements(
    [...root.querySelectorAll<DiagramElement>('[data-diagram-node]')],
    nodeIds,
    'diagramNode',
  );
  const rects = contract.nodes.map((node) => {
    const element = elements.get(node.id) ?? fail('DIAGRAM_DOM_CONTRACT_MISMATCH');
    if (
      geometry.normalizeDiagramText(element.textContent ?? '') !==
      geometry.normalizeDiagramText(node.text)
    )
      fail('DIAGRAM_NODE_TEXT_MISMATCH');
    const actual = toCompositionCoordinates({
      compositionHeight: height,
      compositionWidth: width,
      rect: element.getBoundingClientRect(),
      rootRect,
    });
    const expected = geometry.normalizedBoundsToLayoutRect({
      bounds: node.bounds,
      compositionHeight: height,
      compositionWidth: width,
    });
    if (
      !geometry.isInsideLayoutRect(expected, safeZone) ||
      !geometry.rectsApproximatelyEqual(actual, expected)
    )
      fail('DIAGRAM_NODE_GEOMETRY_MISMATCH');
    return actual;
  });
  for (const [index, rect] of rects.entries())
    if (rects.slice(index + 1).some((candidate) => geometry.layoutRectsOverlap(rect, candidate)))
      fail('DIAGRAM_NODE_OVERLAP');
  if (contract.edges.some(({start_frame}) => start_frame < lastSettle + 6))
    fail('DIAGRAM_EDGE_ORDER_INVALID');

  const lines = contract.edges.map((edge) => ({
    edge,
    end: geometry.layoutRectCenter(rects[nodeIds.indexOf(edge.target)]!),
    start: geometry.layoutRectCenter(rects[nodeIds.indexOf(edge.source)]!),
  }));
  for (const {edge, end, start} of lines)
    if (
      rects.some(
        (rect, index) =>
          ![edge.source, edge.target].includes(nodeIds[index]!) &&
          geometry.segmentIntersectsRect(start, end, rect),
      )
    )
      fail('DIAGRAM_EDGE_CLEARANCE_INVALID');
  for (const [index, left] of lines.entries())
    if (
      lines.slice(index + 1).some((right) => {
        const rightIds = [right.edge.source, right.edge.target];
        const shared = [left.edge.source, left.edge.target].find((id) => rightIds.includes(id));
        if (!shared)
          return geometry.segmentsIntersect(left.start, left.end, right.start, right.end);
        const point = geometry.layoutRectCenter(rects[nodeIds.indexOf(shared)]!);
        const other = (line: (typeof lines)[number]) =>
          line.edge.source === shared ? line.end : line.start;
        return geometry.segmentsOverlapBeyondSharedEndpoint(point, other(left), other(right));
      })
    )
      fail('DIAGRAM_EDGE_CLEARANCE_INVALID');
  exactElements(
    [...root.querySelectorAll<DiagramElement>('[data-diagram-edge]')],
    contract.edges.filter(({start_frame}) => frame >= start_frame).map(({id}) => id),
    'diagramEdge',
  );
};

type GuardProps = Readonly<{diagram: unknown; diagramSha256: string}>;
export const DiagramLayoutGuard = (props: GuardProps) => {
  const {diagram, diagramSha256: sha} = props;
  const frame = useCurrentFrame();
  const {durationInFrames: duration, height, width} = useVideoConfig();
  const sentinel = useRef<HTMLSpanElement>(null);
  const binding = geometry.canonicalDiagramBinding(diagram, sha);
  useDiagramLayoutLifecycle(
    `DiagramLayoutGuard frame=${frame}`,
    () => requireDiagramRoot(sentinel.current?.parentElement, binding),
    (element) => {
      const root = element as HTMLElement;
      const rootRect = root.getBoundingClientRect();
      if (classifyDiagramRoot(root, rootRect) === 'WAIT') return 'WAIT';
      inspectDiagramDom({diagram, duration, frame, height, root, rootRect, width});
      return 'ACTIVE';
    },
  );
  return <span aria-hidden="true" ref={sentinel} style={{display: 'none'}} />;
};
