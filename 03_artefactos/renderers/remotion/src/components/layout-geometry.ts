export interface LayoutRect {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface MarkedLayoutRoot {
  readonly dataset: {
    readonly qaRoot?: string;
  };
}

export const layoutGuardDelayOptions = {
  retries: 0,
  timeoutInMilliseconds: 10_000,
} as const;

interface CompositionGeometry {
  readonly compositionHeight: number;
  readonly compositionWidth: number;
  readonly rect: LayoutRect;
  readonly rootRect: LayoutRect;
}

const dimensions = (rect: LayoutRect): {height: number; width: number} => ({
  height: rect.bottom - rect.top,
  width: rect.right - rect.left,
});

export const requireExpectedLayoutRoot = <Root extends MarkedLayoutRoot>(
  candidate: Root | null | undefined,
  frame: number,
): Root => {
  if (candidate?.dataset.qaRoot !== 'composition-root') {
    throw new Error(`LAYOUT_ROOT_ABSENT frame=${frame}`);
  }
  return candidate;
};

export const hasValidLayoutRoot = (rootRect: LayoutRect): boolean => {
  const {height, width} = dimensions(rootRect);
  return (
    Number.isFinite(rootRect.left) &&
    Number.isFinite(rootRect.top) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
};

export const resolveLayoutActivation = ({
  attachedToCanvas,
  frame,
  rootRect,
}: {
  readonly attachedToCanvas: boolean;
  readonly frame: number;
  readonly rootRect: LayoutRect;
}): 'ACTIVE' | 'WAIT_FOR_CANVAS' => {
  if (!attachedToCanvas) {
    return 'WAIT_FOR_CANVAS';
  }
  if (!hasValidLayoutRoot(rootRect)) {
    throw new Error(`LAYOUT_ROOT_INVALID frame=${frame}`);
  }
  return 'ACTIVE';
};

export const toCompositionCoordinates = ({
  compositionHeight,
  compositionWidth,
  rect,
  rootRect,
}: CompositionGeometry): LayoutRect => {
  if (!hasValidLayoutRoot(rootRect) || compositionHeight <= 0 || compositionWidth <= 0) {
    throw new Error('Invalid layout root or composition dimensions.');
  }
  const root = dimensions(rootRect);
  const scaleX = compositionWidth / root.width;
  const scaleY = compositionHeight / root.height;
  return {
    bottom: (rect.bottom - rootRect.top) * scaleY,
    left: (rect.left - rootRect.left) * scaleX,
    right: (rect.right - rootRect.left) * scaleX,
    top: (rect.top - rootRect.top) * scaleY,
  };
};

export const isInsideComposition = ({
  compositionHeight,
  compositionWidth,
  epsilon,
  rect,
}: {
  readonly compositionHeight: number;
  readonly compositionWidth: number;
  readonly epsilon: number;
  readonly rect: LayoutRect;
}): boolean =>
  rect.left >= -epsilon &&
  rect.top >= -epsilon &&
  rect.right <= compositionWidth + epsilon &&
  rect.bottom <= compositionHeight + epsilon;

export const isInsideSafeZone = ({
  compositionHeight,
  compositionWidth,
  epsilon,
  rect,
  safeZonePx,
}: {
  readonly compositionHeight: number;
  readonly compositionWidth: number;
  readonly epsilon: number;
  readonly rect: LayoutRect;
  readonly safeZonePx: number;
}): boolean =>
  rect.left >= safeZonePx - epsilon &&
  rect.top >= safeZonePx - epsilon &&
  rect.right <= compositionWidth - safeZonePx + epsilon &&
  rect.bottom <= compositionHeight - safeZonePx + epsilon;
