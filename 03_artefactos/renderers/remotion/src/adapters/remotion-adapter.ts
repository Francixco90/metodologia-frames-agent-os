import {useCurrentFrame, useVideoConfig} from 'remotion';

import {
  createExplicitFrameContext,
  frameProgress,
  frameToSeconds,
  type ExplicitFrameContextV1,
} from './adapter-runtime.ts';

export interface RemotionFrameSampleV1 {
  readonly context: ExplicitFrameContextV1;
  readonly seconds: number;
  readonly progress: number;
  readonly clockOwner: 'REMOTION_FRAME';
}

export const resolveRemotionFrameSample = (
  context: ExplicitFrameContextV1,
): RemotionFrameSampleV1 => {
  const validContext = createExplicitFrameContext(context);
  return Object.freeze({
    context: validContext,
    seconds: frameToSeconds(validContext),
    progress: frameProgress(validContext),
    clockOwner: 'REMOTION_FRAME',
  });
};

export const useExplicitRemotionFrame = (): RemotionFrameSampleV1 => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  return resolveRemotionFrameSample({frame, fps, durationInFrames});
};
