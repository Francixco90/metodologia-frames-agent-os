import {Composition, registerRoot} from 'remotion';

import pivoteFixture from '../../../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {canonicalJsonSha256} from '../../../../02_proceso/core/canonical-json-sha256.ts';
import {DiagramStage} from '../../../../03_artefactos/renderers/remotion/src/components/method-explainer/DiagramStage.tsx';

const diagram = pivoteFixture.diagram;
const BrowserSafeDiagram = () => (
  <DiagramStage diagram={diagram} diagramSha256={canonicalJsonSha256(diagram)} />
);
registerRoot(() => (
  <Composition
    id="MethodExplainerBrowserSafeSha"
    component={BrowserSafeDiagram}
    durationInFrames={pivoteFixture.total_frames}
    fps={30}
    height={1920}
    width={1080}
  />
));
