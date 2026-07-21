import {Composition, registerRoot} from 'remotion';

import {H03MotionAdapterProbe} from '../../../renderers/remotion/src/adapters/h03-probe-components.tsx';
import {installRemoteNetworkDenyGuard} from '../../../renderers/remotion/src/network-guard.ts';

installRemoteNetworkDenyGuard();

const H03ProbeRoot = () => (
  <Composition
    id="H03RendererProbe"
    component={H03MotionAdapterProbe}
    durationInFrames={30}
    fps={30}
    width={480}
    height={240}
  />
);

registerRoot(H03ProbeRoot);
