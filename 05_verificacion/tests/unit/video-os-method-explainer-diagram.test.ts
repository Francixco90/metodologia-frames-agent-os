import {describe, expect, it} from 'vitest';

import {assertMethodExplainerContractBundle, canonicalSha256} from 'workflows/video-os/index.ts';
import {
  artifact,
  expectRejected,
  makeBundle,
  refreshRunMaterial,
  type Bundle,
  type Mutation,
} from './video-os-method-explainer-fixture.ts';

const expectPoseRejected = (mutate: Mutation): void => {
  const bundle = makeBundle();
  mutate(bundle);
  const diagramHash = canonicalSha256(bundle.diagram);
  bundle.hashes.diagram = diagramHash;
  bundle.build_manifest.contract_hashes.diagram = diagramHash;
  bundle.build_manifest.contract_set_sha256 = canonicalSha256(
    bundle.build_manifest.contract_hashes,
  );
  const diagramOutput = bundle.build_manifest.required_outputs.diagram_contract;
  const refreshedDiagramOutput = artifact(diagramOutput.ref, JSON.stringify(bundle.diagram));
  diagramOutput.sha256 = refreshedDiagramOutput.sha256;
  diagramOutput.size_bytes = refreshedDiagramOutput.size_bytes;
  const buildHash = canonicalSha256(bundle.build_manifest);
  bundle.hashes.build_manifest = buildHash;
  bundle.unattended_run.build_manifest_sha256 = buildHash;
  refreshRunMaterial(bundle);
  expect(() => assertMethodExplainerContractBundle(bundle)).toThrow('POSE-ORDER');
};

describe('diagram bounds, choreography and proof-pose gates', () => {
  it('accepts a container before the first node and a closing pose after connectors', () => {
    expect(() => assertMethodExplainerContractBundle(makeBundle())).not.toThrow();
  });

  it.each([
    [
      'a container pose equal to the first node entry',
      (bundle: Bundle) => {
        bundle.diagram.required_poses.container_frame = Math.min(
          ...bundle.diagram.nodes.map(({enter_frame}) => enter_frame),
        );
      },
    ],
    [
      'a closing pose equal to connectors complete',
      (bundle: Bundle) => {
        bundle.diagram.required_poses.closing_frame =
          bundle.diagram.required_poses.connectors_complete_frame;
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)(
    'rejects %s at POSE-ORDER',
    (_, mutate) => {
      expectPoseRejected(mutate);
    },
  );

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
