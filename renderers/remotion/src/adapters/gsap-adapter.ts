import {gsap} from 'gsap';

import {
  createExplicitFrameContext,
  frameToSeconds,
  MotionAdapterError,
  type ExplicitFrameContextV1,
} from './adapter-runtime.ts';

const SAFE_EASINGS = new Set(['none', 'linear', 'power1.in', 'power1.out', 'power1.inOut']);
const SAFE_PROPERTY = /^[A-Za-z][A-Za-z0-9_]*$/u;

export interface GsapFrameStepV1 {
  readonly atSeconds: number;
  readonly durationSeconds: number;
  readonly values: Readonly<Record<string, number>>;
  readonly ease: 'none' | 'linear' | 'power1.in' | 'power1.out' | 'power1.inOut';
}

export interface GsapFrameRecipeV1 {
  readonly recipeId: string;
  readonly initial: Readonly<Record<string, number>>;
  readonly steps: readonly GsapFrameStepV1[];
}

export interface GsapFrameSamplerV1 {
  readonly recipeId: string;
  sample: (context: ExplicitFrameContextV1) => Readonly<Record<string, number>>;
  dispose: () => void;
}

const validateProperties = (
  values: Readonly<Record<string, number>>,
  allowedKeys: ReadonlySet<string>,
  label: string,
): void => {
  for (const [key, value] of Object.entries(values)) {
    if (!SAFE_PROPERTY.test(key) || !allowedKeys.has(key) || !Number.isFinite(value)) {
      throw new MotionAdapterError(
        'GSAP_RECIPE_INVALID',
        `${label}.${key} must be an allowed finite numeric property.`,
      );
    }
  }
};

const validateRecipe = (recipe: GsapFrameRecipeV1): readonly string[] => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(recipe.recipeId)) {
    throw new MotionAdapterError('GSAP_RECIPE_INVALID', 'recipeId is not portable.');
  }
  const propertyKeys = Object.keys(recipe.initial).sort();
  if (propertyKeys.length === 0) {
    throw new MotionAdapterError('GSAP_RECIPE_INVALID', 'initial must declare properties.');
  }
  const allowedKeys = new Set(propertyKeys);
  validateProperties(recipe.initial, allowedKeys, 'initial');
  if (recipe.steps.length === 0) {
    throw new MotionAdapterError('GSAP_RECIPE_INVALID', 'steps cannot be empty.');
  }
  let previousAt = -1;
  for (const [index, step] of recipe.steps.entries()) {
    if (
      !Number.isFinite(step.atSeconds) ||
      step.atSeconds < 0 ||
      step.atSeconds < previousAt ||
      !Number.isFinite(step.durationSeconds) ||
      step.durationSeconds <= 0 ||
      !SAFE_EASINGS.has(step.ease)
    ) {
      throw new MotionAdapterError(
        'GSAP_RECIPE_INVALID',
        `steps[${index.toString()}] has invalid timing or easing.`,
      );
    }
    if (Object.keys(step.values).length === 0) {
      throw new MotionAdapterError(
        'GSAP_RECIPE_INVALID',
        `steps[${index.toString()}].values cannot be empty.`,
      );
    }
    validateProperties(step.values, allowedKeys, `steps[${index.toString()}].values`);
    previousAt = step.atSeconds;
  }
  return propertyKeys;
};

export const createGsapFrameSampler = (recipe: GsapFrameRecipeV1): GsapFrameSamplerV1 => {
  const propertyKeys = validateRecipe(recipe);
  const target = Object.fromEntries(propertyKeys.map((key) => [key, recipe.initial[key] ?? 0]));

  // H-03 allowlisted exception: this adapter owns no autonomous clock.
  const sleepAutonomousTicker = (): void => gsap.ticker.sleep();
  sleepAutonomousTicker();
  const timeline = gsap.timeline({paused: true});
  for (const step of recipe.steps) {
    timeline.to(
      target,
      {duration: step.durationSeconds, ease: step.ease, ...step.values},
      step.atSeconds,
    );
  }
  sleepAutonomousTicker();

  let disposed = false;
  return Object.freeze({
    recipeId: recipe.recipeId,
    sample: (context: ExplicitFrameContextV1) => {
      if (disposed) {
        throw new MotionAdapterError('ADAPTER_DISPOSED', 'GSAP sampler was disposed.');
      }
      const validContext = createExplicitFrameContext(context);
      try {
        timeline.seek(frameToSeconds(validContext), true);
        return Object.freeze(
          Object.fromEntries(propertyKeys.map((key) => [key, Number(target[key] ?? 0)])),
        );
      } finally {
        sleepAutonomousTicker();
      }
    },
    dispose: () => {
      try {
        if (!disposed) {
          timeline.kill();
          disposed = true;
        }
      } finally {
        sleepAutonomousTicker();
      }
    },
  });
};

export const sampleGsapFrame = (
  recipe: GsapFrameRecipeV1,
  context: ExplicitFrameContextV1,
): Readonly<Record<string, number>> => {
  const sampler = createGsapFrameSampler(recipe);
  try {
    return sampler.sample(context);
  } finally {
    sampler.dispose();
  }
};
