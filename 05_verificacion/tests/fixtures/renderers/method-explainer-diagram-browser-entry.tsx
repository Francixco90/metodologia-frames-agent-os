import {useLayoutEffect} from 'react';
import {Composition, registerRoot, useCurrentFrame, useDelayRender} from 'remotion';

import pivoteFixture from '../../../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {canonicalJsonSha256} from '../../../../02_proceso/core/canonical-json-sha256.ts';
import {DiagramStage} from '../../../../03_artefactos/renderers/remotion/src/components/method-explainer/DiagramStage.tsx';
import {
  classifyDiagramRoot,
  startDiagramLayoutLifecycle,
} from '../../../../03_artefactos/renderers/remotion/src/components/method-explainer/DiagramLayoutLifecycle.tsx';
import {installRemoteNetworkDenyGuard} from '../../../../03_artefactos/renderers/remotion/src/network-guard.ts';

installRemoteNetworkDenyGuard();
const diagram = pivoteFixture.diagram;
const diagramSha256 = canonicalJsonSha256(diagram);
const marker = '__DIAGRAM_BROWSER_PROOF__';

const Probe = () => {
  const frame = useCurrentFrame();
  const render = useDelayRender();
  useLayoutEffect(
    () =>
      startDiagramLayoutLifecycle({
        attempt: (element) => {
          const root = element as HTMLElement;
          const rootRect = root.getBoundingClientRect();
          if (classifyDiagramRoot(root, rootRect) === 'WAIT') return 'WAIT';
          const elements = <T extends Element>(selector: string) => [
            ...root.querySelectorAll<T>(selector),
          ];
          const nodes = elements<HTMLElement>('[data-diagram-node]').map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              client: [node.clientWidth, node.clientHeight],
              id: node.dataset.diagramNode,
              rect: [rect.x, rect.y, rect.width, rect.height],
              scroll: [node.scrollWidth, node.scrollHeight],
              text: node.textContent,
            };
          });
          const edges = elements<SVGLineElement>('[data-diagram-edge]').map(
            ({dataset}) => dataset.diagramEdge,
          );
          const resources = performance
            .getEntriesByType('resource')
            .map(({name}) => name)
            .filter((name) => new URL(name, location.href).origin !== location.origin);
          const guardCount = root.querySelectorAll(':scope > span[aria-hidden="true"]').length;
          console.info(
            `${marker}${JSON.stringify({
              edges,
              frame,
              guardCount,
              html: root.outerHTML,
              nodes,
              pose: root.dataset.diagramPose,
              resources,
              rootBinding: root.dataset.diagramRoot,
              rootRect: [rootRect.x, rootRect.y, rootRect.width, rootRect.height],
            })}`,
          );
          return 'ACTIVE';
        },
        body: document.body,
        cancelRender: render.cancelRender,
        continueRender: render.continueRender,
        delayRender: render.delayRender,
        label: `DiagramBrowserProof frame=${frame}`,
        MutationObserver: globalThis.MutationObserver,
        resizeTarget: () => {
          const root = document.querySelector<HTMLElement>('[data-diagram-root]');
          if (!root) throw new Error('BROWSER_PROBE_ROOT_ABSENT');
          return root;
        },
        ResizeObserver: globalThis.ResizeObserver,
      }),
    [frame, render.cancelRender, render.continueRender, render.delayRender],
  );
  return <DiagramStage diagram={diagram} diagramSha256={diagramSha256} />;
};

registerRoot(() => (
  <Composition
    id="MethodExplainerDiagramBrowserProof"
    component={Probe}
    durationInFrames={pivoteFixture.total_frames}
    fps={30}
    height={1920}
    width={1080}
  />
));
