import {describe, it} from 'vitest';

import {expectRejected, type Mutation} from './video-os-method-explainer-fixture.ts';
describe('diagram bounds, choreography and proof-pose gates', () => {
  it.each([
    [
      'a safe zone extending outside the canvas',
      (bundle) => {
        bundle.diagram.stage.safe_zone = {x: 0.8, y: 0.08, width: 0.4, height: 0.76};
        bundle.diagram.nodes[0]!.bounds = {x: 0.82, y: 0.2, width: 0.1, height: 0.12};
        bundle.diagram.nodes[1]!.bounds = {x: 0.94, y: 0.2, width: 0.1, height: 0.12};
      },
    ],
    [
      'a node outside the safe zone',
      (bundle) => {
        bundle.diagram.nodes[0]!.bounds.x = 0.01;
      },
    ],
    [
      'settle before enter',
      (bundle) => {
        bundle.diagram.nodes[0]!.settle_frame = 9;
      },
    ],
    [
      'duplicate node IDs',
      (bundle) => {
        bundle.diagram.nodes[1]!.id = bundle.diagram.nodes[0]!.id;
        bundle.diagram.edges[0]!.target = bundle.diagram.nodes[0]!.id;
      },
    ],
    [
      'duplicate edge IDs',
      (bundle) => {
        bundle.diagram.edges.push({...bundle.diagram.edges[0]!});
      },
    ],
    [
      'an unknown edge endpoint',
      (bundle) => {
        bundle.diagram.edges[0]!.target = 'NODE-MISSING-01';
      },
    ],
    [
      'an edge at settle plus five',
      (bundle) => {
        bundle.diagram.edges[0]!.start_frame = 105;
      },
    ],
    [
      'an edge before an unrelated component settles',
      (bundle) => {
        bundle.diagram.nodes.push({
          id: 'NODE-SISTEMATIZA-01',
          bounds: {x: 0.35, y: 0.5, width: 0.3, height: 0.12},
          text: 'Sistematiza',
          max_lines: 2,
          font_px: 32,
          enter_frame: 110,
          settle_frame: 140,
        });
        bundle.diagram.required_poses.components_settled_frame = 140;
      },
    ],
    [
      'a closing pose before components settle',
      (bundle) => {
        bundle.diagram.edges = [];
        bundle.diagram.required_poses.connectors_complete_frame = 0;
        bundle.diagram.required_poses.closing_frame = 1;
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});
