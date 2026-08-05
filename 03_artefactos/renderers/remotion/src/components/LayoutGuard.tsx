import {useEffect, useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useDelayRender} from 'remotion';

import {
  isInsideComposition,
  isInsideSafeZone,
  layoutGuardDelayOptions,
  requireExpectedLayoutRoot,
  resolveLayoutActivation,
  toCompositionCoordinates,
} from './layout-geometry.ts';

interface LayoutGuardProps {
  readonly compositionHeight: number;
  readonly compositionWidth: number;
  readonly safeZonePx: number;
}

const visible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
};

export const LayoutGuard = ({
  compositionHeight,
  compositionWidth,
  safeZonePx,
}: LayoutGuardProps) => {
  const frame = useCurrentFrame();
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const pendingCheckRef = useRef<{frame: number; handle: number} | null>(null);
  const {cancelRender, continueRender, delayRender} = useDelayRender();

  useLayoutEffect(() => {
    const handle = delayRender(`LayoutGuard frame=${frame}`, layoutGuardDelayOptions);
    pendingCheckRef.current = {frame, handle};
    return () => {
      if (pendingCheckRef.current?.handle === handle) {
        pendingCheckRef.current = null;
        continueRender(handle);
      }
    };
  }, [continueRender, delayRender, frame]);

  useEffect(() => {
    const pendingCheck = pendingCheckRef.current;
    if (pendingCheck?.frame !== frame) {
      cancelRender(new Error(`LAYOUT_GUARD_HANDLE_ABSENT frame=${frame}`));
      return;
    }

    const composition = requireExpectedLayoutRoot(sentinelRef.current?.parentElement, frame);
    let observer: MutationObserver | null = null;
    let settled = false;
    const fail = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      observer?.disconnect();
      pendingCheckRef.current = null;
      cancelRender(error instanceof Error ? error : new Error(String(error)));
    };
    const inspectActiveLayout = (): boolean => {
      if (settled) {
        return true;
      }
      const rootBox = composition.getBoundingClientRect();
      let activation: 'ACTIVE' | 'WAIT_FOR_CANVAS';
      try {
        activation = resolveLayoutActivation({
          attachedToCanvas: composition.closest('#remotion-canvas') !== null,
          frame,
          rootRect: rootBox,
        });
      } catch (error) {
        fail(error);
        return true;
      }
      if (activation === 'WAIT_FOR_CANVAS') {
        return false;
      }
      try {
        const epsilon = 1;
        for (const element of composition.querySelectorAll<HTMLElement>('[data-qa-boundary]')) {
          if (!visible(element)) {
            continue;
          }
          const box = toCompositionCoordinates({
            compositionHeight,
            compositionWidth,
            rect: element.getBoundingClientRect(),
            rootRect: rootBox,
          });
          if (!isInsideComposition({compositionHeight, compositionWidth, epsilon, rect: box})) {
            throw new Error(
              `LAYOUT_OVERFLOW frame=${frame} element=${element.dataset.qaBoundary ?? 'unknown'}`,
            );
          }
        }

        for (const element of composition.querySelectorAll<HTMLElement>('[data-qa-safe-zone]')) {
          if (!visible(element)) {
            continue;
          }
          const box = toCompositionCoordinates({
            compositionHeight,
            compositionWidth,
            rect: element.getBoundingClientRect(),
            rootRect: rootBox,
          });
          if (
            !isInsideSafeZone({
              compositionHeight,
              compositionWidth,
              epsilon,
              rect: box,
              safeZonePx,
            })
          ) {
            throw new Error(
              `SAFE_ZONE_VIOLATION frame=${frame} element=${element.dataset.qaSafeZone ?? 'unknown'}`,
            );
          }
        }

        for (const element of composition.querySelectorAll<HTMLElement>('[data-qa-text]')) {
          const widthOverflow = element.scrollWidth - element.clientWidth;
          const heightOverflow = element.scrollHeight - element.clientHeight;
          if (visible(element) && (widthOverflow > epsilon || heightOverflow > epsilon)) {
            throw new Error(
              `TEXT_OVERFLOW frame=${frame} element=${element.dataset.qaText ?? 'unknown'} width=${widthOverflow}px height=${heightOverflow}px scroll=${element.scrollWidth}x${element.scrollHeight} client=${element.clientWidth}x${element.clientHeight}`,
            );
          }
        }
      } catch (error) {
        fail(error);
        return true;
      }

      settled = true;
      observer?.disconnect();
      pendingCheckRef.current = null;
      continueRender(pendingCheck.handle);
      return true;
    };

    if (!inspectActiveLayout()) {
      const canvas = document.getElementById('remotion-canvas');
      if (canvas === null) {
        fail(new Error(`LAYOUT_CANVAS_ABSENT frame=${frame}`));
        return;
      }
      observer = new MutationObserver(() => {
        inspectActiveLayout();
      });
      observer.observe(canvas, {childList: true});
    }

    return () => {
      observer?.disconnect();
    };
  }, [cancelRender, compositionHeight, compositionWidth, continueRender, frame, safeZonePx]);

  return (
    <span
      aria-hidden="true"
      data-qa-layout-guard="sentinel"
      ref={sentinelRef}
      style={{display: 'none'}}
    />
  );
};
