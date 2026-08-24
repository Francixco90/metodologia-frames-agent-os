import {describe, expect, it, vi} from 'vitest';

import {
  classifyDiagramRoot,
  observeDiagramRoot,
  startDiagramLayoutLifecycle,
} from '../../../../renderers/remotion/src/components/method-explainer/DiagramLayoutLifecycle.tsx';

const rect = {bottom: 1920, left: 0, right: 1080, top: 0};
type Side = 'both' | 'mutation' | 'resize';
type Attacks = {construct?: Side; disconnect?: Side; observe?: Side};
const attacks = (value: Side | undefined, side: Exclude<Side, 'both'>) =>
  value === side || value === 'both';
const observerHarness = (options: Attacks = {}) => {
  let mutationCallback: () => void = () => undefined;
  let resizeCallback: () => void = () => undefined;
  const mutationDisconnect = vi.fn(() => {
    if (attacks(options.disconnect, 'mutation')) throw new Error('MUTATION_DISCONNECT_ATTACK');
  });
  const resizeDisconnect = vi.fn(() => {
    if (attacks(options.disconnect, 'resize')) throw new Error('RESIZE_DISCONNECT_ATTACK');
  });
  const mutationObserve = vi.fn(() => {
    if (attacks(options.observe, 'mutation')) throw new Error('MUTATION_OBSERVE_ATTACK');
  });
  const resizeObserve = vi.fn(() => {
    if (attacks(options.observe, 'resize')) throw new Error('RESIZE_OBSERVE_ATTACK');
  });
  class Mutation {
    public constructor(callback: () => void) {
      if (attacks(options.construct, 'mutation')) throw new Error('MUTATION_CONSTRUCTOR_ATTACK');
      mutationCallback = callback;
    }
    public disconnect = mutationDisconnect;
    public observe = mutationObserve;
  }
  class Resize {
    public constructor(callback: () => void) {
      if (attacks(options.construct, 'resize')) throw new Error('RESIZE_CONSTRUCTOR_ATTACK');
      resizeCallback = callback;
    }
    public disconnect = resizeDisconnect;
    public observe = resizeObserve;
  }
  return {
    MutationObserver: Mutation as unknown as typeof MutationObserver,
    ResizeObserver: Resize as unknown as typeof ResizeObserver,
    mutationCallback: () => mutationCallback(),
    mutationDisconnect,
    mutationObserve,
    resizeCallback: () => resizeCallback(),
    resizeDisconnect,
    resizeObserve,
  };
};
const watch = (
  attempt: (root: Element) => 'ACTIVE' | 'WAIT',
  observers: ReturnType<typeof observerHarness>,
  resizeTarget = () => ({}) as Element,
) => {
  const events = {cleanup: vi.fn(), fail: vi.fn(), pass: vi.fn()};
  const stop = observeDiagramRoot({
    attempt,
    body: {} as Node,
    resizeTarget,
    ...observers,
    ...events,
  });
  return {events, stop};
};

describe('DiagramLayoutLifecycle observers', () => {
  it('classifies finite, connected, positive roots only', () => {
    expect(classifyDiagramRoot({isConnected: true}, rect)).toBe('ACTIVE');
    expect(classifyDiagramRoot({isConnected: false}, rect)).toBe('WAIT');
    expect(classifyDiagramRoot({isConnected: true}, {...rect, bottom: 0})).toBe('WAIT');
    expect(() => classifyDiagramRoot({isConnected: true}, {...rect, right: Number.NaN})).toThrow(
      'DIAGRAM_ROOT_INVALID',
    );
    expect(() =>
      classifyDiagramRoot({isConnected: true}, {...rect, top: Number.POSITIVE_INFINITY}),
    ).toThrow('DIAGRAM_ROOT_INVALID');
  });

  it('waits through reparent at zero size, then wakes on positive resize', () => {
    const root = {isConnected: false} as Element & {isConnected: boolean};
    let size = 0;
    const resizeTarget = vi.fn(() => root);
    const observers = observerHarness();
    const result = watch(
      (candidate) => classifyDiagramRoot(candidate, {...rect, bottom: size, right: size}),
      observers,
      resizeTarget,
    );
    root.isConnected = true;
    observers.mutationCallback();
    expect(result.events.pass).not.toHaveBeenCalled();
    size = 100;
    observers.resizeCallback();
    observers.resizeCallback();
    result.stop();
    expect(resizeTarget).toHaveBeenCalledTimes(4);
    expect(result.events.pass).toHaveBeenCalledOnce();
    expect(result.events.fail).not.toHaveBeenCalled();
    expect(observers.mutationDisconnect).toHaveBeenCalledOnce();
    expect(observers.resizeDisconnect).toHaveBeenCalledOnce();
  });

  it('fails closed for absent, constructor, and observe failures', () => {
    for (const missing of ['MutationObserver', 'ResizeObserver'] as const) {
      const absentFail = vi.fn();
      const input = observerHarness();
      const stopAbsent = observeDiagramRoot({
        attempt: () => 'WAIT',
        body: {} as Node,
        cleanup: vi.fn(),
        fail: absentFail,
        ...input,
        [missing]: undefined,
        pass: vi.fn(),
        resizeTarget: () => ({}) as Element,
      });
      stopAbsent();
      expect(absentFail).toHaveBeenCalledOnce();
      expect(absentFail).toHaveBeenCalledWith(
        expect.objectContaining({message: 'DIAGRAM_OBSERVER_ABSENT'}),
      );
    }

    for (const phase of ['construct', 'observe'] as const)
      for (const side of ['mutation', 'resize'] as const) {
        const observers = observerHarness({[phase]: side});
        const result = watch(() => 'WAIT', observers);
        result.stop();
        expect(result.events.fail).toHaveBeenCalledOnce();
        expect(result.events.fail).toHaveBeenCalledWith(
          expect.objectContaining({message: 'DIAGRAM_OBSERVER_FAILED'}),
        );
        if (phase === 'observe') {
          expect(observers.mutationDisconnect).toHaveBeenCalledOnce();
          expect(observers.resizeDisconnect).toHaveBeenCalledOnce();
        }
      }
  });

  it('disconnects both best-effort and preserves the first material failure', () => {
    const observers = observerHarness({disconnect: 'both'});
    let active = false;
    const result = watch(() => (active ? 'ACTIVE' : 'WAIT'), observers);
    active = true;
    observers.resizeCallback();
    result.stop();
    expect(result.events.fail).toHaveBeenCalledOnce();
    expect(result.events.fail).toHaveBeenCalledWith(
      expect.objectContaining({message: 'DIAGRAM_OBSERVER_DISCONNECT_FAILED'}),
    );
    expect(observers.mutationDisconnect).toHaveBeenCalledOnce();
    expect(observers.resizeDisconnect).toHaveBeenCalledOnce();

    const setup = observerHarness({disconnect: 'mutation', observe: 'resize'});
    const setupResult = watch(() => 'WAIT', setup);
    expect(setupResult.events.fail).toHaveBeenCalledWith(
      expect.objectContaining({message: 'DIAGRAM_OBSERVER_FAILED'}),
    );
  });
});

describe('startDiagramLayoutLifecycle', () => {
  const controls = () => ({
    cancelRender: vi.fn(),
    continueRender: vi.fn(),
    delayRender: vi.fn(() => 42),
  });

  it('releases one delay handle exactly once on PASS and FAIL', () => {
    const passControls = controls();
    const stopPass = startDiagramLayoutLifecycle({
      ...passControls,
      ...observerHarness(),
      attempt: () => 'ACTIVE',
      body: {} as Node,
      label: 'PASS',
      resizeTarget: () => ({}) as Element,
    });
    stopPass();
    expect(passControls.delayRender).toHaveBeenCalledOnce();
    expect(passControls.continueRender).toHaveBeenCalledOnce();
    expect(passControls.continueRender).toHaveBeenCalledWith(42);
    expect(passControls.cancelRender).not.toHaveBeenCalled();

    const failControls = controls();
    const stopFail = startDiagramLayoutLifecycle({
      ...failControls,
      ...observerHarness(),
      attempt: () => {
        throw new Error('BROKEN_LAYOUT');
      },
      body: {} as Node,
      label: 'FAIL',
      resizeTarget: () => ({}) as Element,
    });
    stopFail();
    expect(failControls.delayRender).toHaveBeenCalledOnce();
    expect(failControls.cancelRender).toHaveBeenCalledOnce();
    expect(failControls.continueRender).not.toHaveBeenCalled();
  });

  it('releases a pending handle once on cleanup', () => {
    const render = controls();
    const observers = observerHarness();
    const stop = startDiagramLayoutLifecycle({
      ...render,
      ...observers,
      attempt: () => 'WAIT',
      body: {} as Node,
      label: 'CLEANUP',
      resizeTarget: () => ({}) as Element,
    });
    stop();
    stop();
    observers.mutationCallback();
    observers.resizeCallback();
    expect(render.delayRender).toHaveBeenCalledOnce();
    expect(render.continueRender).toHaveBeenCalledOnce();
    expect(render.cancelRender).not.toHaveBeenCalled();
  });
});
