import type {CalculateMetadataFunction} from 'remotion';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';

export const minimalExamplePropsSchema = z.object({
  message: z.string().min(1),
  durationInFrames: z.number().int().positive(),
});

export type MinimalExampleProps = z.infer<typeof minimalExamplePropsSchema>;

export const calculateMinimalExampleMetadata: CalculateMetadataFunction<MinimalExampleProps> = ({
  props,
}) => {
  const parsed = minimalExamplePropsSchema.parse(props);
  return {
    durationInFrames: parsed.durationInFrames,
    props: parsed,
  };
};

export const MinimalDeterministicComposition = ({message}: MinimalExampleProps) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        backgroundColor: '#10131a',
        color: '#ffffff',
        display: 'flex',
        fontFamily: 'sans-serif',
        justifyContent: 'center',
        opacity,
      }}
    >
      {message}
    </AbsoluteFill>
  );
};
