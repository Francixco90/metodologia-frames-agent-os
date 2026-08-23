import type {CSSProperties} from 'react';

import {theme} from '../../theme.ts';
import type {DiagramContract} from './DiagramModel.ts';

type Node = DiagramContract['nodes'][number];
type Edge = DiagramContract['edges'][number];
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const progress = (frame: number, start: number, end: number): number =>
  end === start ? Number(frame >= start) : clamp((frame - start) / (end - start));

export const DiagramNode = ({frame, node}: {readonly frame: number; readonly node: Node}) => {
  const bounds = node.bounds;
  const style: CSSProperties = {
    alignItems: 'center',
    background: 'rgba(5, 32, 72, 0.94)',
    border: '2px solid #20d5ff',
    borderRadius: 24,
    boxSizing: 'border-box',
    color: '#ffffff',
    display: 'flex',
    fontFamily: theme.font.sans,
    fontSize: node.font_px,
    fontWeight: 700,
    height: `${bounds.height * 100}%`,
    justifyContent: 'center',
    left: `${bounds.x * 100}%`,
    lineHeight: 1.12,
    opacity: progress(frame, node.enter_frame, node.settle_frame),
    overflow: 'hidden',
    padding: '12px 18px',
    position: 'absolute',
    textAlign: 'center',
    top: `${bounds.y * 100}%`,
    width: `${bounds.width * 100}%`,
    zIndex: 2,
  };
  return (
    <div
      data-diagram-node={node.id}
      data-enter-frame={node.enter_frame}
      data-settle-frame={node.settle_frame}
      style={style}
    >
      {node.text}
    </div>
  );
};

export const DiagramEdge = ({
  edge,
  frame,
  nodes,
}: {
  readonly edge: Edge;
  readonly frame: number;
  readonly nodes: ReadonlyMap<string, Node>;
}) => {
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  if (!source || !target) throw new Error('DIAGRAM_PRIMITIVE_ENDPOINT_ABSENT');
  const center = ({bounds}: Node) => ({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  });
  const from = center(source);
  const to = center(target);
  const drawn = progress(frame, edge.start_frame, edge.end_frame);
  return (
    <line
      data-diagram-edge={edge.id}
      data-direction={edge.direction}
      markerEnd="url(#diagram-arrow-end)"
      markerStart={edge.direction === 'bidirectional' ? 'url(#diagram-arrow-start)' : undefined}
      pathLength={1}
      stroke="#20d5ff"
      strokeDasharray={1}
      strokeDashoffset={1 - drawn}
      strokeLinecap="round"
      strokeWidth={4}
      vectorEffect="non-scaling-stroke"
      x1={`${from.x * 100}%`}
      x2={`${to.x * 100}%`}
      y1={`${from.y * 100}%`}
      y2={`${to.y * 100}%`}
    />
  );
};

export const DiagramPrimitives = ({
  contract,
  frame,
}: {
  readonly contract: DiagramContract;
  readonly frame: number;
}) => {
  const nodes = new Map(contract.nodes.map((node) => [node.id, node]));
  return (
    <>
      <svg
        aria-hidden="true"
        data-diagram-edge-layer={contract.grammar}
        height="100%"
        style={{inset: 0, overflow: 'visible', position: 'absolute', zIndex: 1}}
        viewBox="0 0 1080 1920"
        width="100%"
      >
        <defs>
          <marker id="diagram-arrow-end" markerHeight="4" markerWidth="4" orient="auto" refX="3">
            <path d="M0,0 L4,2 L0,4 Z" fill="#20d5ff" />
          </marker>
          <marker
            id="diagram-arrow-start"
            markerHeight="4"
            markerWidth="4"
            orient="auto-start-reverse"
            refX="3"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill="#20d5ff" />
          </marker>
        </defs>
        {contract.edges
          .filter(({start_frame}) => frame >= start_frame)
          .map((edge) => (
            <DiagramEdge edge={edge} frame={frame} key={edge.id} nodes={nodes} />
          ))}
      </svg>
      {contract.nodes.map((node) => (
        <DiagramNode frame={frame} key={node.id} node={node} />
      ))}
    </>
  );
};
