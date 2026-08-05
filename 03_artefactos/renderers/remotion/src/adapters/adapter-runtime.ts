export type MotionAdapterErrorCode =
  | 'INVALID_FRAME_CONTEXT'
  | 'ADAPTER_DISPOSED'
  | 'GSAP_RECIPE_INVALID'
  | 'THREE_SCENE_INVALID'
  | 'LOTTIE_DOCUMENT_INVALID'
  | 'LOTTIE_ASSET_NOT_CLOSED'
  | 'DEPENDENCY_LICENSE_UNRESOLVED';

export class MotionAdapterError extends Error {
  public readonly code: MotionAdapterErrorCode;

  public constructor(code: MotionAdapterErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'MotionAdapterError';
    this.code = code;
  }
}

export interface ExplicitFrameContextV1 {
  readonly frame: number;
  readonly fps: number;
  readonly durationInFrames: number;
}

export interface MotionAdapterLicenseRequestV1 {
  readonly adapterId: string;
  readonly licenseState: 'allowed_scoped' | 'local_evaluation_only' | 'unresolved';
  readonly requestedScope: 'local_evaluation' | 'production';
}

export const assertMotionAdapterLicense = (request: MotionAdapterLicenseRequestV1): void => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(request.adapterId)) {
    throw new MotionAdapterError(
      'DEPENDENCY_LICENSE_UNRESOLVED',
      'adapterId is not a portable license binding.',
    );
  }
  if (
    request.licenseState === 'unresolved' ||
    (request.requestedScope === 'production' && request.licenseState !== 'allowed_scoped')
  ) {
    throw new MotionAdapterError(
      'DEPENDENCY_LICENSE_UNRESOLVED',
      `${request.adapterId} is not licensed for ${request.requestedScope}.`,
    );
  }
};

const assertPositiveInteger = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new MotionAdapterError('INVALID_FRAME_CONTEXT', `${field} must be a positive integer.`);
  }
};

export const createExplicitFrameContext = (
  input: ExplicitFrameContextV1,
): ExplicitFrameContextV1 => {
  assertPositiveInteger(input.fps, 'fps');
  assertPositiveInteger(input.durationInFrames, 'durationInFrames');
  if (!Number.isInteger(input.frame) || input.frame < 0 || input.frame >= input.durationInFrames) {
    throw new MotionAdapterError(
      'INVALID_FRAME_CONTEXT',
      'frame must be an integer inside [0, durationInFrames).',
    );
  }

  return Object.freeze({...input});
};

export const frameToSeconds = (context: ExplicitFrameContextV1): number => {
  const valid = createExplicitFrameContext(context);
  return valid.frame / valid.fps;
};

export const frameProgress = (context: ExplicitFrameContextV1): number => {
  const valid = createExplicitFrameContext(context);
  if (valid.durationInFrames === 1) {
    return 1;
  }
  return valid.frame / (valid.durationInFrames - 1);
};

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
};

export function assertFiniteNumber(
  value: unknown,
  field: string,
  code: MotionAdapterErrorCode,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MotionAdapterError(code, `${field} must be a finite number.`);
  }
}
