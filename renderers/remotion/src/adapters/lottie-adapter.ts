import type {LottieAnimationData} from '@remotion/lottie';

import {
  assertFiniteNumber,
  clamp,
  createExplicitFrameContext,
  isPlainRecord,
  MotionAdapterError,
  type ExplicitFrameContextV1,
} from './adapter-runtime.ts';

export interface ValidatedLocalLottieV1 {
  readonly animationData: LottieAnimationData;
  readonly sourceFps: number;
  readonly inPoint: number;
  readonly outPoint: number;
  readonly width: number;
  readonly height: number;
  readonly posterFrame: number;
  readonly assetClosure: 'LOCAL_INLINE_ONLY';
  readonly expressionsAllowed: false;
}

export interface ResolvedLottieFrameV1 {
  readonly renderFrame: number;
  readonly sourceFrame: number;
  readonly posterFrame: number;
  readonly playbackRate: number;
  readonly loop: false;
  readonly autoplay: false;
}

const REMOTE_OR_EMBEDDED_SCHEME = /^(?:https?:|data:|file:|blob:)/iu;

const assertClosedTree = (value: unknown, path: string, visited: WeakSet<object>): void => {
  if (typeof value === 'string' && REMOTE_OR_EMBEDDED_SCHEME.test(value.trim())) {
    throw new MotionAdapterError(
      'LOTTIE_ASSET_NOT_CLOSED',
      `${path} contains an external or embedded locator.`,
    );
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (visited.has(value)) {
    throw new MotionAdapterError('LOTTIE_DOCUMENT_INVALID', `${path} contains a cycle.`);
  }
  visited.add(value);
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertClosedTree(item, `${path}[${index.toString()}]`, visited);
    }
    return;
  }
  if (!isPlainRecord(value)) {
    throw new MotionAdapterError('LOTTIE_DOCUMENT_INVALID', `${path} must contain JSON values.`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'x' && typeof item === 'string' && item.trim().length > 0) {
      throw new MotionAdapterError(
        'LOTTIE_DOCUMENT_INVALID',
        `${path}.${key} contains a Lottie expression.`,
      );
    }
    if ((key === 'p' || key === 'u') && typeof item === 'string' && item.trim().length > 0) {
      throw new MotionAdapterError(
        'LOTTIE_ASSET_NOT_CLOSED',
        `${path}.${key} references an external asset.`,
      );
    }
    assertClosedTree(item, `${path}.${key}`, visited);
  }
};

export const validateLocalLottieDocument = (document: unknown): ValidatedLocalLottieV1 => {
  if (!isPlainRecord(document)) {
    throw new MotionAdapterError('LOTTIE_DOCUMENT_INVALID', 'Lottie document must be an object.');
  }
  assertClosedTree(document, '$', new WeakSet());
  const sourceFps = document.fr;
  const inPoint = document.ip;
  const outPoint = document.op;
  const width = document.w;
  const height = document.h;
  assertFiniteNumber(sourceFps, 'fr', 'LOTTIE_DOCUMENT_INVALID');
  assertFiniteNumber(inPoint, 'ip', 'LOTTIE_DOCUMENT_INVALID');
  assertFiniteNumber(outPoint, 'op', 'LOTTIE_DOCUMENT_INVALID');
  assertFiniteNumber(width, 'w', 'LOTTIE_DOCUMENT_INVALID');
  assertFiniteNumber(height, 'h', 'LOTTIE_DOCUMENT_INVALID');
  if (
    sourceFps <= 0 ||
    inPoint < 0 ||
    outPoint <= inPoint ||
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new MotionAdapterError(
      'LOTTIE_DOCUMENT_INVALID',
      'Lottie timing and dimensions must form positive finite ranges.',
    );
  }
  if (!Array.isArray(document.layers)) {
    throw new MotionAdapterError('LOTTIE_DOCUMENT_INVALID', 'layers must be an array.');
  }
  if (document.fonts !== undefined || document.chars !== undefined) {
    throw new MotionAdapterError(
      'LOTTIE_ASSET_NOT_CLOSED',
      'H-03 Lottie fixtures cannot depend on fonts or glyph assets.',
    );
  }
  if (
    document.assets !== undefined &&
    (!Array.isArray(document.assets) || document.assets.length > 0)
  ) {
    throw new MotionAdapterError(
      'LOTTIE_ASSET_NOT_CLOSED',
      'H-03 accepts only an empty assets collection.',
    );
  }

  return Object.freeze({
    animationData: document as LottieAnimationData,
    sourceFps,
    inPoint,
    outPoint,
    width,
    height,
    posterFrame: inPoint,
    assetClosure: 'LOCAL_INLINE_ONLY',
    expressionsAllowed: false,
  });
};

export const resolveLottieFrame = (
  document: ValidatedLocalLottieV1,
  context: ExplicitFrameContextV1,
): ResolvedLottieFrameV1 => {
  const validContext = createExplicitFrameContext(context);
  const sourceFrame = clamp(
    document.inPoint + (validContext.frame / validContext.fps) * document.sourceFps,
    document.inPoint,
    document.outPoint - 1,
  );
  return Object.freeze({
    renderFrame: validContext.frame,
    sourceFrame,
    posterFrame: document.posterFrame,
    playbackRate: document.sourceFps / validContext.fps,
    loop: false,
    autoplay: false,
  });
};

/** Give lottie-web a disposable clone; it annotates input at runtime. */
export const materializeLottieRenderData = (
  document: ValidatedLocalLottieV1,
): LottieAnimationData => JSON.parse(JSON.stringify(document.animationData)) as LottieAnimationData;

export const H03_LOTTIE_PROBE_DATA = Object.freeze({
  v: '5.13.0',
  fr: 30,
  ip: 0,
  op: 30,
  w: 120,
  h: 120,
  nm: 'MetodologIA progress probe',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'First-party progress dot',
      sr: 1,
      ks: {
        o: {a: 0, k: 100},
        r: {a: 0, k: 0},
        p: {a: 0, k: [60, 60, 0]},
        a: {a: 0, k: [0, 0, 0]},
        s: {a: 0, k: [100, 100, 100]},
      },
      ao: 0,
      shapes: [
        {ty: 'el', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [72, 72]}, nm: 'Dot'},
        {ty: 'fl', c: {a: 0, k: [0.87, 0.66, 0.16, 1]}, o: {a: 0, k: 100}, nm: 'Gold'},
      ],
      ip: 0,
      op: 30,
      st: 0,
      bm: 0,
    },
  ],
});
