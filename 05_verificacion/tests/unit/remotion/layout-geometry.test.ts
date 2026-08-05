import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  hasValidLayoutRoot,
  isInsideComposition,
  isInsideSafeZone,
  layoutGuardDelayOptions,
  requireExpectedLayoutRoot,
  resolveLayoutActivation,
  type LayoutRect,
  toCompositionCoordinates,
} from '../../../../renderers/remotion/src/components/layout-geometry.ts';

const compositionWidth = 1080;
const compositionHeight = 1920;

const scaledRect = ({
  left,
  top,
  right,
  bottom,
  rootLeft,
  rootTop,
  scale,
}: LayoutRect & {
  readonly rootLeft: number;
  readonly rootTop: number;
  readonly scale: number;
}): LayoutRect => ({
  bottom: rootTop + bottom * scale,
  left: rootLeft + left * scale,
  right: rootLeft + right * scale,
  top: rootTop + top * scale,
});

describe.each([0.25, 1])('layout geometry at render scale %s', (scale) => {
  const rootLeft = 17;
  const rootTop = 23;
  const rootRect: LayoutRect = {
    bottom: rootTop + compositionHeight * scale,
    left: rootLeft,
    right: rootLeft + compositionWidth * scale,
    top: rootTop,
  };

  it('normalizes viewport and safe-zone bounds into composition coordinates', () => {
    expect(hasValidLayoutRoot(rootRect)).toBe(true);
    const logicalRect = toCompositionCoordinates({
      compositionHeight,
      compositionWidth,
      rect: scaledRect({
        bottom: 1824,
        left: 96,
        right: 984,
        rootLeft,
        rootTop,
        scale,
        top: 96,
      }),
      rootRect,
    });

    expect(logicalRect).toEqual({
      bottom: 1824,
      left: 96,
      right: 984,
      top: 96,
    });
    expect(
      isInsideComposition({
        compositionHeight,
        compositionWidth,
        epsilon: 1,
        rect: logicalRect,
      }),
    ).toBe(true);
    expect(
      isInsideSafeZone({
        compositionHeight,
        compositionWidth,
        epsilon: 1,
        rect: logicalRect,
        safeZonePx: 96,
      }),
    ).toBe(true);
  });

  it('detects the same overflow and safe-zone violations at either scale', () => {
    const logicalRect = toCompositionCoordinates({
      compositionHeight,
      compositionWidth,
      rect: scaledRect({
        bottom: 1930,
        left: 40,
        right: 1090,
        rootLeft,
        rootTop,
        scale,
        top: 40,
      }),
      rootRect,
    });

    expect(
      isInsideComposition({
        compositionHeight,
        compositionWidth,
        epsilon: 1,
        rect: logicalRect,
      }),
    ).toBe(false);
    expect(
      isInsideSafeZone({
        compositionHeight,
        compositionWidth,
        epsilon: 1,
        rect: logicalRect,
        safeZonePx: 96,
      }),
    ).toBe(false);
  });
});

it('rejects a zero-area root instead of silently skipping layout QA', () => {
  expect(hasValidLayoutRoot({bottom: 0, left: 0, right: 0, top: 0})).toBe(false);
  expect(() =>
    toCompositionCoordinates({
      compositionHeight,
      compositionWidth,
      rect: {bottom: 100, left: 0, right: 100, top: 0},
      rootRect: {bottom: 0, left: 0, right: 0, top: 0},
    }),
  ).toThrow('Invalid layout root or composition dimensions.');
});

it('waits through the preparatory portal and activates only after reparenting to the canvas', () => {
  const zeroRect = {bottom: 0, left: 0, right: 0, top: 0};
  expect(resolveLayoutActivation({attachedToCanvas: false, frame: 0, rootRect: zeroRect})).toBe(
    'WAIT_FOR_CANVAS',
  );
  expect(
    resolveLayoutActivation({
      attachedToCanvas: true,
      frame: 0,
      rootRect: {bottom: 1920, left: 0, right: 1080, top: 0},
    }),
  ).toBe('ACTIVE');
});

it('fails closed for a zero-area active canvas root and a deterministic timeout', () => {
  expect(() =>
    resolveLayoutActivation({
      attachedToCanvas: true,
      frame: 12,
      rootRect: {bottom: 0, left: 0, right: 0, top: 0},
    }),
  ).toThrow('LAYOUT_ROOT_INVALID frame=12');
  expect(layoutGuardDelayOptions).toEqual({
    retries: 0,
    timeoutInMilliseconds: 10_000,
  });
});

it('fails closed when the sentinel has no parent or the parent is not the expected root', () => {
  expect(() => requireExpectedLayoutRoot(undefined, 7)).toThrow('LAYOUT_ROOT_ABSENT frame=7');
  expect(() =>
    requireExpectedLayoutRoot({dataset: {qaRoot: 'hidden-metadata-instance'}}, 8),
  ).toThrow('LAYOUT_ROOT_ABSENT frame=8');
  expect(requireExpectedLayoutRoot({dataset: {qaRoot: 'composition-root'}}, 9)).toEqual({
    dataset: {qaRoot: 'composition-root'},
  });
});

it('binds runtime queries to the sentinel composition instead of the global document', () => {
  const guardSource = readFileSync(
    resolve(process.cwd(), 'renderers/remotion/src/components/LayoutGuard.tsx'),
    'utf8',
  );
  expect(guardSource).toContain('sentinelRef.current?.parentElement');
  expect(guardSource).toContain('useDelayRender');
  expect(guardSource).toContain('delayRender(`LayoutGuard frame=${frame}`');
  expect(guardSource).toContain('cancelRender(');
  expect(guardSource).toContain("composition.closest('#remotion-canvas')");
  expect(guardSource).toContain('new MutationObserver');
  expect(guardSource).toContain('observer.observe(canvas, {childList: true})');
  expect(guardSource).not.toContain('observer.observe(document.body');
  expect(guardSource).not.toContain('document.querySelector');
  expect(guardSource.match(/composition\.querySelectorAll/gmu)).toHaveLength(3);
});
