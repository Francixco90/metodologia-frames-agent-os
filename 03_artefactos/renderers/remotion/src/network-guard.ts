const NETWORK_GUARD_MARKER = '__METHODOLOGIA_REMOTE_NETWORK_DENIED__';

const toUrl = (target: RequestInfo | URL, baseUrl: string): URL => {
  if (target instanceof URL) {
    return target;
  }
  if (typeof target === 'string') {
    return new URL(target, baseUrl);
  }
  return new URL(target.url, baseUrl);
};

export const assertRuntimeRequestAllowed = (
  target: RequestInfo | URL,
  runtimeOrigin: string,
): void => {
  const parsed = toUrl(target, runtimeOrigin);
  if (
    parsed.protocol === 'data:' ||
    parsed.protocol === 'blob:' ||
    parsed.origin === runtimeOrigin
  ) {
    return;
  }

  throw new Error(`REMOTE_NETWORK_DENIED: ${parsed.origin}`);
};

export const installRemoteNetworkDenyGuard = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const guardedWindow = window as typeof window & Record<string, unknown>;
  if (guardedWindow[NETWORK_GUARD_MARKER] === true) {
    return;
  }

  const originalRequest = window.fetch.bind(window);
  window.fetch = (target: RequestInfo | URL, init?: RequestInit) => {
    assertRuntimeRequestAllowed(target, window.location.origin);
    return originalRequest(target, init);
  };
  guardedWindow[NETWORK_GUARD_MARKER] = true;
};

export const remoteNetworkDenyGuardMarker = NETWORK_GUARD_MARKER;
