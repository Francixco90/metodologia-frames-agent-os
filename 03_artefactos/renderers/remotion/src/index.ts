import {registerRoot} from 'remotion';

import './font-loader.ts';
import {installRemoteNetworkDenyGuard} from './network-guard.ts';
import {RemotionRoot} from './Root.tsx';

installRemoteNetworkDenyGuard();
registerRoot(RemotionRoot);
