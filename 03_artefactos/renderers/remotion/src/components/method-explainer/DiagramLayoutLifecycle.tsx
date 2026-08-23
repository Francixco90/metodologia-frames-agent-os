import {useLayoutEffect} from 'react';
import {useDelayRender} from 'remotion';

import {layoutGuardDelayOptions} from '../layout-geometry.ts';
import type {LayoutRect} from './diagram-geometry.ts';

export type DiagramRootActivation = 'ACTIVE' | 'WAIT';
type MutationWatcher = Pick<MutationObserver, 'disconnect' | 'observe'>;
type ResizeWatcher = Pick<ResizeObserver, 'disconnect' | 'observe'>;
type ObserverInput = {
  attempt: (root: Element) => DiagramRootActivation;
  body: Node;
  cleanup: () => void;
  fail: (error: Error) => void;
  MutationObserver: (new (callback: () => void) => MutationWatcher) | undefined;
  pass: () => void;
  resizeTarget: () => Element;
  ResizeObserver: (new (callback: () => void) => ResizeWatcher) | undefined;
};
type LifecycleInput = Omit<ObserverInput, 'cleanup' | 'fail' | 'pass'> & {
  cancelRender: (error: Error) => void;
  continueRender: (handle: number) => void;
  delayRender: (label: string, options: typeof layoutGuardDelayOptions) => number;
  label: string;
};
type Finish = 'cleanup' | 'fail' | 'pass';
const stableError = (code: string, cause?: unknown): Error => new Error(code, {cause});

export const classifyDiagramRoot = (
  root: Pick<HTMLElement, 'isConnected'>,
  rect: LayoutRect,
): DiagramRootActivation => {
  const values = [rect.bottom, rect.left, rect.right, rect.top];
  if (!values.every(Number.isFinite)) throw stableError('DIAGRAM_ROOT_INVALID');
  if (!root.isConnected || rect.right <= rect.left || rect.bottom <= rect.top) return 'WAIT';
  return 'ACTIVE';
};

export const observeDiagramRoot = (input: ObserverInput): (() => void) => {
  let mutationObserver: MutationWatcher | undefined;
  let resizeObserver: ResizeWatcher | undefined;
  let resizeTarget: Element | undefined;
  let settled = false;
  const finish = (kind: Finish, error?: Error) => {
    if (settled) return;
    settled = true;
    let disconnectCause: unknown;
    for (const observer of [mutationObserver, resizeObserver])
      try {
        observer?.disconnect();
      } catch (cause) {
        disconnectCause ??= cause;
      }
    mutationObserver = undefined;
    resizeObserver = undefined;
    if (disconnectCause !== undefined && kind !== 'fail') {
      kind = 'fail';
      error = stableError('DIAGRAM_OBSERVER_DISCONNECT_FAILED', disconnectCause);
    }
    if (kind === 'fail') input.fail(error ?? stableError('DIAGRAM_OBSERVER_FAILED'));
    else if (kind === 'pass') input.pass();
    else input.cleanup();
  };
  const run = () => {
    if (settled) return;
    try {
      resizeTarget = input.resizeTarget();
      if (input.attempt(resizeTarget) === 'ACTIVE') finish('pass');
    } catch (error) {
      finish('fail', error instanceof Error ? error : stableError('DIAGRAM_LAYOUT_FAILED', error));
    }
  };
  run();
  if (!settled) {
    if (!input.MutationObserver || !input.ResizeObserver)
      finish('fail', stableError('DIAGRAM_OBSERVER_ABSENT'));
    else {
      try {
        mutationObserver = new input.MutationObserver(run);
        resizeObserver = new input.ResizeObserver(run);
        mutationObserver.observe(input.body, {childList: true, subtree: true});
        resizeObserver.observe(resizeTarget!);
        run();
      } catch (error) {
        finish('fail', stableError('DIAGRAM_OBSERVER_FAILED', error));
      }
    }
  }
  return () => finish('cleanup');
};

export const startDiagramLayoutLifecycle = (input: LifecycleInput): (() => void) => {
  const handle = input.delayRender(input.label, layoutGuardDelayOptions);
  let released = false;
  const release = (error?: Error) => {
    if (released) return;
    released = true;
    if (error) input.cancelRender(error);
    else input.continueRender(handle);
  };
  return observeDiagramRoot({
    ...input,
    cleanup: () => release(),
    fail: release,
    pass: () => release(),
  });
};

export const useDiagramLayoutLifecycle = (
  label: string,
  resizeTarget: () => Element,
  attempt: (root: Element) => DiagramRootActivation,
): void => {
  const {cancelRender, continueRender, delayRender} = useDelayRender();
  useLayoutEffect(() => {
    return startDiagramLayoutLifecycle({
      attempt,
      body: document.body,
      cancelRender,
      continueRender,
      delayRender,
      label,
      MutationObserver: globalThis.MutationObserver,
      resizeTarget,
      ResizeObserver: globalThis.ResizeObserver,
    });
  }, [attempt, cancelRender, continueRender, delayRender, label, resizeTarget]);
};
