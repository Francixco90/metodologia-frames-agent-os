import {
  assertFiniteNumber,
  createExplicitFrameContext,
  frameProgress,
  MotionAdapterError,
  type ExplicitFrameContextV1,
} from './adapter-runtime.ts';

export type ThreeTuple3V1 = readonly [number, number, number];

export interface ThreeSceneSpecV1 {
  readonly sceneId: string;
  readonly width: number;
  readonly height: number;
  readonly seed: string;
  readonly camera: {
    readonly position: ThreeTuple3V1;
    readonly fov: number;
  };
  readonly ambientLightIntensity: number;
  readonly directionalLight: {
    readonly position: ThreeTuple3V1;
    readonly intensity: number;
  };
  readonly object: {
    readonly geometry: 'box';
    readonly color: string;
    readonly baseRotation: ThreeTuple3V1;
    readonly turnsPerComposition: number;
  };
}

export interface ThreeRuntimeCapabilityV1 {
  readonly angleAvailable: boolean;
  readonly headlessProfilePinned: boolean;
}

export type ThreeScenePlanV1 =
  | {
      readonly status: 'THREE_AVAILABLE';
      readonly sceneId: string;
      readonly seed: string;
      readonly frame: number;
      readonly width: number;
      readonly height: number;
      readonly camera: ThreeSceneSpecV1['camera'];
      readonly ambientLightIntensity: number;
      readonly directionalLight: ThreeSceneSpecV1['directionalLight'];
      readonly object: ThreeSceneSpecV1['object'] & {readonly rotation: ThreeTuple3V1};
      readonly fallbackUsed: false;
    }
  | {
      readonly status: 'FALLBACK_2D_REQUIRED';
      readonly sceneId: string;
      readonly seed: string;
      readonly frame: number;
      readonly fallbackUsed: true;
      readonly fallbackReason: 'ANGLE_UNAVAILABLE' | 'HEADLESS_PROFILE_UNPINNED';
      readonly fallbackModule: 'isometric_layers_svg';
    };

const assertTuple = (tuple: ThreeTuple3V1, field: string): void => {
  for (const [index, value] of tuple.entries()) {
    assertFiniteNumber(value, `${field}[${index.toString()}]`, 'THREE_SCENE_INVALID');
  }
};

const validateScene = (scene: ThreeSceneSpecV1): void => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(scene.sceneId)) {
    throw new MotionAdapterError('THREE_SCENE_INVALID', 'sceneId is not portable.');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(scene.seed)) {
    throw new MotionAdapterError('THREE_SCENE_INVALID', 'seed must be explicit and portable.');
  }
  for (const [field, value] of [
    ['width', scene.width],
    ['height', scene.height],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new MotionAdapterError('THREE_SCENE_INVALID', `${field} must be positive.`);
    }
  }
  assertTuple(scene.camera.position, 'camera.position');
  assertTuple(scene.directionalLight.position, 'directionalLight.position');
  assertTuple(scene.object.baseRotation, 'object.baseRotation');
  for (const [field, value] of [
    ['camera.fov', scene.camera.fov],
    ['ambientLightIntensity', scene.ambientLightIntensity],
    ['directionalLight.intensity', scene.directionalLight.intensity],
    ['object.turnsPerComposition', scene.object.turnsPerComposition],
  ] as const) {
    assertFiniteNumber(value, field, 'THREE_SCENE_INVALID');
  }
  if (scene.camera.fov <= 0 || scene.camera.fov >= 180) {
    throw new MotionAdapterError('THREE_SCENE_INVALID', 'camera.fov must be inside (0, 180).');
  }
  if (!/^#[a-fA-F0-9]{6}$/u.test(scene.object.color)) {
    throw new MotionAdapterError('THREE_SCENE_INVALID', 'object.color must be a six-digit hex.');
  }
};

export const resolveThreeScenePlan = (
  scene: ThreeSceneSpecV1,
  context: ExplicitFrameContextV1,
  runtime: ThreeRuntimeCapabilityV1,
): ThreeScenePlanV1 => {
  validateScene(scene);
  const validContext = createExplicitFrameContext(context);
  if (!runtime.headlessProfilePinned) {
    return Object.freeze({
      status: 'FALLBACK_2D_REQUIRED',
      sceneId: scene.sceneId,
      seed: scene.seed,
      frame: validContext.frame,
      fallbackUsed: true,
      fallbackReason: 'HEADLESS_PROFILE_UNPINNED',
      fallbackModule: 'isometric_layers_svg',
    });
  }
  if (!runtime.angleAvailable) {
    return Object.freeze({
      status: 'FALLBACK_2D_REQUIRED',
      sceneId: scene.sceneId,
      seed: scene.seed,
      frame: validContext.frame,
      fallbackUsed: true,
      fallbackReason: 'ANGLE_UNAVAILABLE',
      fallbackModule: 'isometric_layers_svg',
    });
  }

  const rotationDelta =
    frameProgress(validContext) * scene.object.turnsPerComposition * 2 * Math.PI;
  const rotation: ThreeTuple3V1 = [
    scene.object.baseRotation[0],
    scene.object.baseRotation[1] + rotationDelta,
    scene.object.baseRotation[2],
  ];
  return Object.freeze({
    status: 'THREE_AVAILABLE',
    sceneId: scene.sceneId,
    seed: scene.seed,
    frame: validContext.frame,
    width: scene.width,
    height: scene.height,
    camera: scene.camera,
    ambientLightIntensity: scene.ambientLightIntensity,
    directionalLight: scene.directionalLight,
    object: Object.freeze({
      ...scene.object,
      rotation: Object.freeze(rotation),
    }),
    fallbackUsed: false,
  });
};
