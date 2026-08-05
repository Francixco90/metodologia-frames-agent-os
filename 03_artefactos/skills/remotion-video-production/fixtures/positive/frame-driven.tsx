import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export const FrameDrivenFixture = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <div style={{opacity}}>MetodologIA</div>;
};
