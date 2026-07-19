import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';

import {BeatScene} from '../../../../renderers/remotion/src/components/BeatScene.tsx';
import {Breadcrumb} from '../../../../renderers/remotion/src/components/Breadcrumb.tsx';
import {CaptionBand} from '../../../../renderers/remotion/src/components/CaptionBand.tsx';
import {LayoutGuard} from '../../../../renderers/remotion/src/components/LayoutGuard.tsx';
import {useLocalFontGate} from '../../../../renderers/remotion/src/font-loader.ts';
import {PersistentChrome} from '../../../../renderers/remotion/src/components/PersistentChrome.tsx';
import {SignalRail} from '../../../../renderers/remotion/src/components/SignalRail.tsx';
import type {MethodologiaVerticalProps} from '../../../../renderers/remotion/src/schema.ts';
import {theme} from '../../../../renderers/remotion/src/theme.ts';

export const MethodologiaVertical = (props: MethodologiaVerticalProps) => {
  const fontsReady = useLocalFontGate();
  const frame = useCurrentFrame();
  const activeBeat =
    props.beats.find(({fromFrame, toFrame}) => frame >= fromFrame && frame < toFrame) ??
    props.beats.at(-1);
  if (activeBeat === undefined) {
    throw new Error('MethodologiaVertical requires a non-empty beat map.');
  }
  if (!fontsReady) {
    return null;
  }

  return (
    <AbsoluteFill
      data-qa-root="composition-root"
      style={{
        backgroundColor: theme.color.background,
        backgroundImage: `radial-gradient(circle at 92% 7%, ${theme.color.cyan}15 0, transparent 34%), linear-gradient(180deg, ${theme.color.background}, #0D0F12)`,
        color: theme.color.text,
        fontFamily: theme.font.sans,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          backgroundImage: `linear-gradient(${theme.color.line}33 1px, transparent 1px), linear-gradient(90deg, ${theme.color.line}33 1px, transparent 1px)`,
          backgroundSize: '54px 54px',
          inset: 0,
          opacity: 0.16,
          position: 'absolute',
        }}
      />
      {props.beats.map((beat) => (
        <Sequence
          durationInFrames={beat.durationFrames}
          from={beat.fromFrame}
          key={beat.beatId}
          name={beat.beatId}
          premountFor={props.profile.transitionFrames}
        >
          <BeatScene beat={beat} props={props} />
        </Sequence>
      ))}
      {props.captions.map((caption) => (
        <Sequence
          durationInFrames={caption.endFrame - caption.startFrame}
          from={caption.startFrame}
          key={caption.captionId}
          name={caption.captionId}
          premountFor={4}
        >
          <CaptionBand props={props} text={caption.text} />
        </Sequence>
      ))}
      <Breadcrumb beat={activeBeat} props={props} />
      <SignalRail beat={activeBeat} frame={frame} props={props} />
      <PersistentChrome props={props} />
      <LayoutGuard
        compositionHeight={props.profile.height}
        compositionWidth={props.profile.width}
        safeZonePx={props.profile.safeZonePx}
      />
    </AbsoluteFill>
  );
};
