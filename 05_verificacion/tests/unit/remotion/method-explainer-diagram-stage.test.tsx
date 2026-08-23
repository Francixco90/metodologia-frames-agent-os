import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import pivoteFixture from '../../../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {DiagramContractV2Schema} from 'workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';

let currentFrame = 0;
const videoConfig = {durationInFrames: 100, fps: 30, height: 1920, id: 'TEST', width: 1080};
vi.mock('remotion', () => ({
  useCurrentFrame: () => currentFrame,
  useDelayRender: () => ({cancelRender: vi.fn(), continueRender: vi.fn(), delayRender: () => 1}),
  useVideoConfig: () => videoConfig,
}));

import {DiagramStage} from '../../../../renderers/remotion/src/components/method-explainer/DiagramStage.tsx';
import {
  compileDiagramModel,
  type DiagramContract,
} from '../../../../renderers/remotion/src/components/method-explainer/DiagramModel.ts';
import {DiagramNode} from '../../../../renderers/remotion/src/components/method-explainer/DiagramPrimitives.tsx';

type Node = DiagramContract['nodes'][number];
type Edge = DiagramContract['edges'][number];
const digest = (value: string) => value.repeat(64);
const node = (id: string, text: string, x: number, y: number, index: number): Node => ({
  bounds: {height: 0.1, width: 0.2, x, y},
  enter_frame: 1 + index * 3,
  font_px: 28,
  id,
  max_lines: 1,
  settle_frame: 4 + index * 3,
  text,
});
const edge = (id: string, source: string, target: string, index: number): Edge => ({
  direction: 'forward',
  end_frame: 50 + index * 3,
  id,
  source,
  start_frame: 40 + index * 3,
  target,
});
const contract = (
  grammar: DiagramContract['grammar'],
  nodes: Node[],
  edges: Edge[],
): DiagramContract => ({
  beat_budget_sha256: digest('b'),
  edges,
  grammar,
  nodes,
  required_poses: {
    closing_frame: 90,
    components_settled_frame: 30,
    connectors_complete_frame: 70,
    container_frame: 0,
  },
  schema_version: 'diagram-contract-v2',
  spec_sha256: digest('a'),
  stage: {
    height: 1920,
    safe_zone: {height: 0.84, width: 0.84, x: 0.08, y: 0.08},
    width: 1080,
  },
});
const pasaNodes = [
  node('NODE-PLANIFICA', 'Planifica', 0.4, 0.14, 0),
  node('NODE-ACELERA', 'Acelera', 0.4, 0.34, 1),
  node('NODE-SISTEMATIZA', 'Sistematiza', 0.4, 0.54, 2),
  node('NODE-AMPLIFICA', 'Amplifica', 0.4, 0.74, 3),
];
const pasa = contract('flow', pasaNodes, [
  edge('EDGE-P-A', 'NODE-PLANIFICA', 'NODE-ACELERA', 0),
  edge('EDGE-A-S', 'NODE-ACELERA', 'NODE-SISTEMATIZA', 1),
  edge('EDGE-S-A', 'NODE-SISTEMATIZA', 'NODE-AMPLIFICA', 2),
]);
const pivote = DiagramContractV2Schema.parse(pivoteFixture.diagram);
const render = (diagram: unknown, sha = canonicalSha256(diagram)) =>
  renderToStaticMarkup(<DiagramStage diagram={diagram} diagramSha256={sha} />);
const attack = (source: DiagramContract, change: (value: DiagramContract) => void) => {
  const changed = structuredClone(source);
  change(changed);
  return () =>
    compileDiagramModel(changed, canonicalSha256(changed), {
      ...videoConfig,
      duration: Math.max(100, changed.required_poses.closing_frame + 1),
      frame: 0,
    });
};

describe('method explainer DiagramStage', () => {
  beforeEach(() => {
    currentFrame = 0;
    videoConfig.durationInFrames = 100;
  });

  it('compiles PASA flow and PIVOTE radial contracts', () => {
    expect(
      compileDiagramModel(pasa, canonicalSha256(pasa), {...videoConfig, duration: 100, frame: 0})
        .contract.grammar,
    ).toBe('flow');
    expect(
      compileDiagramModel(pivote, canonicalSha256(pivote), {
        ...videoConfig,
        duration: pivoteFixture.total_frames,
        frame: 0,
      }).contract.grammar,
    ).toBe('radial-lenses');
    videoConfig.durationInFrames = pivoteFixture.total_frames;
    currentFrame = 500;
    const radialHtml = render(pivote);
    expect(radialHtml.match(/data-diagram-node=/gu)).toHaveLength(6);
    expect(radialHtml.match(/data-diagram-edge=/gu)).toHaveLength(6);
  });

  it('renders one bound root, all nodes, safe-zone data, and the mounted guard', () => {
    const html = render(pasa);
    expect(html.match(/data-diagram-root=/gu)).toHaveLength(1);
    expect(html.match(/data-diagram-node=/gu)).toHaveLength(4);
    expect(html).toContain(`data-diagram-root="${canonicalSha256(pasa)}:`);
    expect(html).toContain('data-diagram-pose="container"');
    expect(html).toContain('data-safe-zone="0.08,0.08,0.84,0.84"');
    expect(html).toContain('MetodologIA Work Sans');
    expect(html).toContain('<span aria-hidden="true" style="display:none"></span>');
    expect(html).not.toContain('data-diagram-edge=');
  });

  it('reveals deterministic edge DOM only at its contract frame', () => {
    const instant = {...pasa.nodes[0]!, settle_frame: pasa.nodes[0]!.enter_frame};
    expect(
      renderToStaticMarkup(<DiagramNode frame={instant.enter_frame} node={instant} />),
    ).toContain('opacity:1');
    currentFrame = 39;
    expect(render(pasa)).not.toContain('data-diagram-edge=');
    currentFrame = 40;
    const connected = render(pasa);
    expect(connected.match(/data-diagram-edge=/gu)).toHaveLength(1);
    expect(connected).toContain('data-diagram-pose="components-settled"');
    currentFrame = 46;
    expect(render(pasa).match(/data-diagram-edge=/gu)).toHaveLength(3);
    currentFrame = 90;
    expect(render(pasa)).toContain('data-diagram-pose="closing"');
  });

  it('rejects stale hashes, invalid schemas, and unsupported grammars', () => {
    expect(() => render(pasa, digest('f'))).toThrow('DIAGRAM_SHA256_MISMATCH');
    expect(() => render({...pasa, unknown: true})).toThrow('DIAGRAM_SCHEMA_INVALID');
    expect(
      attack(pasa, (value) => {
        value.grammar = 'cycle';
      }),
    ).toThrow('DIAGRAM_GRAMMAR_UNSUPPORTED');
  });

  it('rejects disconnected, cyclic, duplicate-visual, and overlapping models', () => {
    expect(
      attack(pasa, (value) => {
        value.edges.pop();
      }),
    ).toThrow('DIAGRAM_GRAPH_DISCONNECTED');
    expect(
      attack(pivote, (value) => {
        value.edges[0]!.direction = 'forward';
      }),
    ).toThrow('DIAGRAM_RADIAL_DIRECTION_INVALID');
    expect(
      attack(pivote, (value) => {
        value.edges[0]!.direction = 'cyclic';
      }),
    ).toThrow('DIAGRAM_RADIAL_DIRECTION_INVALID');
    expect(
      attack(pivote, (value) => {
        value.edges.pop();
        value.edges.push({
          ...value.edges[0]!,
          id: 'EDGE-EXTRA',
          source: 'NODE-PERSONAS',
          target: 'NODE-VALOR',
        });
      }),
    ).toThrow('DIAGRAM_RADIAL_DEGREE_INVALID');
    expect(
      attack(pasa, (value) => {
        value.edges.push(edge('EDGE-BACK', 'NODE-AMPLIFICA', 'NODE-PLANIFICA', 3));
      }),
    ).toThrow('DIAGRAM_FLOW_CYCLE');
    expect(
      attack(pivote, (value) => {
        value.edges.push({...value.edges[0]!, id: 'EDGE-DUPLICATE'});
      }),
    ).toThrow('DIAGRAM_EDGE_VISUAL_DUPLICATE');
    expect(
      attack(pasa, (value) => {
        value.nodes[1]!.bounds = {...value.nodes[0]!.bounds};
      }),
    ).toThrow('DIAGRAM_PREFLIGHT_NODE_OVERLAP');
  });
});
