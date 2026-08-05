import {AbsoluteFill} from 'remotion';

import {theme} from '../theme.ts';

export const NetworkGuardProbe = () => {
  let externalRequestWasDenied = false;
  try {
    const request = globalThis['fetch'];
    void request('https://example.invalid/remotion-network-canary');
  } catch (error: unknown) {
    externalRequestWasDenied =
      error instanceof Error && error.message.startsWith('REMOTE_NETWORK_DENIED:');
  }
  if (!externalRequestWasDenied) {
    throw new Error('NETWORK_GUARD_INACTIVE: external canary was not denied synchronously.');
  }

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        backgroundColor: theme.color.background,
        color: theme.color.signal,
        display: 'flex',
        fontFamily: theme.font.mono,
        fontSize: 26,
        justifyContent: 'center',
      }}
    >
      REMOTE NETWORK DENIED
    </AbsoluteFill>
  );
};
