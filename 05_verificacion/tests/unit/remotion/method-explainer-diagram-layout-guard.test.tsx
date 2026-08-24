import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import {
  DiagramLayoutGuardError,
  inspectDiagramDom,
  requireDiagramRoot,
} from '../../../../renderers/remotion/src/components/method-explainer/DiagramLayoutGuard.tsx';
import {
  canonicalDiagramBinding,
  type LayoutRect,
  type parseDiagramContract,
} from '../../../../renderers/remotion/src/components/method-explainer/diagram-geometry.ts';

type FakeElement = HTMLElement & {dataset: DOMStringMap};
type Diagram = ReturnType<typeof parseDiagramContract>;
const hash = (value: string) => value.repeat(64);
const diagram: Diagram = {
  beat_budget_sha256: hash('b'),
  edges: [
    {
      direction: 'forward',
      end_frame: 60,
      id: 'EDGE-ONE-TWO',
      source: 'NODE-ONE',
      start_frame: 40,
      target: 'NODE-TWO',
    },
  ],
  grammar: 'flow',
  nodes: [
    {
      bounds: {height: 0.1, width: 0.2, x: 0.15, y: 0.2},
      enter_frame: 1,
      font_px: 32,
      id: 'NODE-ONE',
      max_lines: 1,
      settle_frame: 20,
      text: 'Uno',
    },
    {
      bounds: {height: 0.1, width: 0.2, x: 0.65, y: 0.4},
      enter_frame: 10,
      font_px: 32,
      id: 'NODE-TWO',
      max_lines: 1,
      settle_frame: 30,
      text: 'Dos',
    },
  ],
  required_poses: {
    closing_frame: 80,
    components_settled_frame: 30,
    connectors_complete_frame: 60,
    container_frame: 0,
  },
  schema_version: 'diagram-contract-v2',
  spec_sha256: hash('a'),
  stage: {height: 1920, safe_zone: {height: 0.7, width: 0.8, x: 0.1, y: 0.1}, width: 1080},
};
const diagramSha = canonicalSha256(diagram);
const rootRect: LayoutRect = {bottom: 1920, left: 0, right: 1080, top: 0};
const domRect = (bounds: Diagram['nodes'][number]['bounds']): DOMRect => ({
  bottom: (bounds.y + bounds.height) * 1920,
  height: bounds.height * 1920,
  left: bounds.x * 1080,
  right: (bounds.x + bounds.width) * 1080,
  toJSON: () => ({}),
  top: bounds.y * 1920,
  width: bounds.width * 1080,
  x: bounds.x * 1080,
  y: bounds.y * 1920,
});
const element = (key: 'diagramEdge' | 'diagramNode', id: string, rect = rootRect): FakeElement =>
  ({
    dataset: {[key]: id},
    getBoundingClientRect: () => rect,
    textContent: id,
  }) as unknown as FakeElement;
const makeRoot = (contract: Diagram = diagram, edges: readonly FakeElement[] = []): HTMLElement => {
  const nodes = contract.nodes.map((node) => ({
    ...element('diagramNode', node.id, domRect(node.bounds)),
    textContent: node.text,
  }));
  return {
    dataset: {diagramRoot: canonicalDiagramBinding(diagram, diagramSha)},
    querySelectorAll: (selector: string) => (selector.includes('node') ? nodes : edges),
  } as unknown as HTMLElement;
};
const run = (
  contract: unknown = diagram,
  frame = 39,
  candidate = makeRoot(),
  durationInFrames = 100,
) =>
  inspectDiagramDom({
    diagram: contract,
    duration: durationInFrames,
    frame,
    height: 1920,
    root: candidate,
    rootRect,
    width: 1080,
  });
const attack = (change: (candidate: Diagram) => void): string | undefined => {
  const candidate = structuredClone(diagram);
  change(candidate);
  try {
    run(candidate, 39, makeRoot(candidate));
  } catch (error) {
    return error instanceof DiagramLayoutGuardError ? error.code : undefined;
  }
};

describe('DiagramLayoutGuard candidate', () => {
  it('accepts exact nodes and only connectors whose start frame has arrived', () => {
    expect(() => run()).not.toThrow();
    expect(() =>
      run(diagram, 40, makeRoot(diagram, [element('diagramEdge', 'EDGE-ONE-TWO')])),
    ).not.toThrow();
  });

  it('runtime-parses hashes/enums and binds the full canonical diagram', () => {
    expect(
      attack((value) => {
        Reflect.set(value, 'grammar', 'invented');
      }),
    ).toBe('DIAGRAM_CONTRACT_INVALID');
    expect(
      attack((value) => {
        value.spec_sha256 = 'bad';
      }),
    ).toBe('DIAGRAM_CONTRACT_INVALID');
    const changed = structuredClone(diagram);
    changed.nodes[0]!.text = 'Café';
    const unicodeRoot = makeRoot(changed);
    const unicodeNode = unicodeRoot.querySelectorAll<FakeElement>('[data-diagram-node]')[0]!;
    unicodeNode.textContent = 'Cafe\u0301';
    expect(() => run(changed, 39, unicodeRoot)).not.toThrow();
    unicodeNode.textContent = 'Cafe';
    expect(() => run(changed, 39, unicodeRoot)).toThrow('DIAGRAM_NODE_TEXT_MISMATCH');
    expect(() => canonicalDiagramBinding(changed, 'bad')).toThrow('DIAGRAM_SHA256_INVALID');
    expect(() => canonicalDiagramBinding(changed, hash('d'))).toThrow('DIAGRAM_SHA256_MISMATCH');
    expect(() =>
      requireDiagramRoot(makeRoot(), canonicalDiagramBinding(changed, canonicalSha256(changed))),
    ).toThrow('DIAGRAM_ROOT_ABSENT');
  });

  it('rejects invalid duration, frame, identities, endpoints, and edge intervals', () => {
    expect(() => run(diagram, 100)).toThrow('DIAGRAM_RUNTIME_PROFILE_MISMATCH');
    expect(() => run(diagram, 0, makeRoot(), 0)).toThrow('DIAGRAM_RUNTIME_PROFILE_MISMATCH');
    expect(
      attack((value) => {
        value.nodes[1]!.id = value.nodes[0]!.id;
      }),
    ).toBe('DIAGRAM_CONTRACT_ID_INVALID');
    expect(
      attack((value) => {
        value.edges.push({...value.edges[0]!});
      }),
    ).toBe('DIAGRAM_CONTRACT_ID_INVALID');
    expect(
      attack((value) => {
        value.edges.push({...value.edges[0]!, id: 'EDGE-DUPLICATE'});
      }),
    ).toBe('DIAGRAM_EDGE_VISUAL_DUPLICATE');
    expect(
      attack((value) => {
        value.edges[0]!.direction = 'bidirectional';
        value.edges.push({
          ...value.edges[0]!,
          id: 'EDGE-REVERSE',
          source: 'NODE-TWO',
          target: 'NODE-ONE',
        });
      }),
    ).toBe('DIAGRAM_EDGE_VISUAL_DUPLICATE');
    expect(
      attack((value) => {
        value.edges[0]!.target = 'NODE-MISSING';
      }),
    ).toBe('DIAGRAM_EDGE_CONTRACT_INVALID');
    expect(
      attack((value) => {
        value.edges[0]!.target = 'NODE-ONE';
      }),
    ).toBe('DIAGRAM_EDGE_CONTRACT_INVALID');
    expect(
      attack((value) => {
        value.edges[0]!.end_frame = value.edges[0]!.start_frame;
      }),
    ).toBe('DIAGRAM_EDGE_CONTRACT_INVALID');
    expect(
      attack((value) => {
        value.required_poses.closing_frame = 100;
      }),
    ).toBe('DIAGRAM_FRAME_RANGE_INVALID');
  });

  it('rejects every non-strict pose/order boundary', () => {
    expect(
      attack((value) => {
        value.required_poses.container_frame = 1;
      }),
    ).toBe('DIAGRAM_POSE_ORDER_INVALID');
    expect(
      attack((value) => {
        value.required_poses.components_settled_frame = 29;
      }),
    ).toBe('DIAGRAM_POSE_ORDER_INVALID');
    expect(
      attack((value) => {
        value.required_poses.connectors_complete_frame = 59;
      }),
    ).toBe('DIAGRAM_POSE_ORDER_INVALID');
    expect(
      attack((value) => {
        value.required_poses.closing_frame = 60;
      }),
    ).toBe('DIAGRAM_POSE_ORDER_INVALID');
    expect(
      attack((value) => {
        value.edges[0]!.start_frame = 35;
      }),
    ).toBe('DIAGRAM_EDGE_ORDER_INVALID');
  });

  it('rejects node overflow/overlap, shared rays, edge-through-node, and crossings', () => {
    expect(
      attack((value) => {
        value.nodes[0]!.bounds.x = 0.1 - 0.5 / 1080;
      }),
    ).toBe('DIAGRAM_NODE_GEOMETRY_MISMATCH');
    expect(
      attack((value) => {
        value.nodes[1]!.bounds = {...value.nodes[0]!.bounds};
      }),
    ).toBe('DIAGRAM_NODE_OVERLAP');
    expect(
      attack((value) => {
        value.nodes.push({
          bounds: {height: 0.04, width: 0.04, x: 0.48, y: 0.33},
          enter_frame: 12,
          font_px: 24,
          id: 'NODE-THREE',
          max_lines: 1,
          settle_frame: 30,
          text: 'Tres',
        });
        value.edges.push({...value.edges[0]!, id: 'EDGE-ONE-THREE', target: 'NODE-THREE'});
      }),
    ).toBe('DIAGRAM_EDGE_CLEARANCE_INVALID');
    expect(
      attack((value) => {
        const positions: readonly (readonly [string, number, number])[] = [
          ['NODE-ONE', 0.15, 0.15],
          ['NODE-TWO', 0.75, 0.65],
          ['NODE-THREE', 0.75, 0.15],
          ['NODE-FOUR', 0.15, 0.65],
        ];
        value.nodes = positions.map(([id, x, y], index) => ({
          bounds: {height: 0.1, width: 0.1, x, y},
          enter_frame: index + 1,
          font_px: 24,
          id,
          max_lines: 1,
          settle_frame: 30,
          text: id,
        }));
        value.edges = [
          value.edges[0]!,
          {...value.edges[0]!, id: 'EDGE-THREE-FOUR', source: 'NODE-THREE', target: 'NODE-FOUR'},
        ];
      }),
    ).toBe('DIAGRAM_EDGE_CLEARANCE_INVALID');
  });

  it('keeps exact DOM correspondence, root scope, Remotion clocks, and quarantine', () => {
    expect(() =>
      run(diagram, 39, {dataset: {}, querySelectorAll: () => []} as unknown as HTMLElement),
    ).toThrow('DIAGRAM_DOM_CONTRACT_MISMATCH');
    const source = readFileSync(
      resolve(
        process.cwd(),
        '03_artefactos/renderers/remotion/src/components/method-explainer/DiagramLayoutGuard.tsx',
      ),
      'utf8',
    );
    for (const token of [
      'useCurrentFrame()',
      'useVideoConfig()',
      'durationInFrames: duration',
      'root.querySelectorAll',
      'CANDIDATE_PENDING_DIAGRAM_STAGE_MOUNT',
    ])
      expect(source).toContain(token);
    expect(source).not.toContain('document.querySelector');
  });
});
