import {sampleGsapFrame} from '../../../renderers/remotion/src/adapters/gsap-adapter.ts';
import {resolveRemotionFrameSample} from '../../../renderers/remotion/src/adapters/remotion-adapter.ts';

const context = {frame: 15, fps: 30, durationInFrames: 31} as const;

export const minimalMotionAdapterExample = Object.freeze({
  remotion: resolveRemotionFrameSample(context),
  gsap: sampleGsapFrame(
    {
      recipeId: 'skill-minimal-frame-seek',
      initial: {x: 0},
      steps: [{atSeconds: 0, durationSeconds: 1, values: {x: 100}, ease: 'none'}],
    },
    context,
  ),
});
