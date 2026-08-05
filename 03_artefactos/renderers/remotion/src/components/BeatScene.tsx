import {interpolate, useCurrentFrame} from 'remotion';

import type {MethodologiaVerticalProps, RenderBeat} from '../schema.ts';
import {theme} from '../theme.ts';

interface BeatSceneProps {
  readonly beat: RenderBeat;
  readonly props: MethodologiaVerticalProps;
}

const SceneGlyph = ({
  layout,
  props,
}: {
  readonly layout: RenderBeat['layout'];
  readonly props: MethodologiaVerticalProps;
}) => {
  if (layout === 'fork') {
    return (
      <svg aria-label="Bifurcación desde un expediente hacia Web y Motion" viewBox="0 0 680 270">
        <path
          d="M80 135 H280 C340 135 340 65 410 65 H605 M280 135 C340 135 340 205 410 205 H605"
          fill="none"
          stroke={theme.color.signal}
          strokeLinecap="round"
          strokeWidth={8}
        />
        <circle cx={80} cy={135} fill={theme.color.signal} r={18} />
        <rect
          fill={theme.color.panel}
          height={72}
          rx={4}
          stroke={theme.color.signal}
          strokeWidth={4}
          width={150}
          x={505}
          y={29}
        />
        <text
          fill={theme.color.text}
          fontFamily={theme.font.mono}
          fontSize={24}
          fontWeight={700}
          textAnchor="middle"
          x={580}
          y={74}
        >
          WEB
        </text>
        <rect
          fill={theme.color.panel}
          height={72}
          rx={36}
          stroke={theme.color.cyan}
          strokeWidth={4}
          width={150}
          x={505}
          y={169}
        />
        <text
          fill={theme.color.text}
          fontFamily={theme.font.mono}
          fontSize={24}
          fontWeight={700}
          textAnchor="middle"
          x={580}
          y={214}
        >
          MOTION
        </text>
      </svg>
    );
  }

  if (layout === 'gate' || layout === 'closing') {
    return (
      <div
        style={{
          alignItems: 'center',
          backgroundImage: `repeating-linear-gradient(135deg, ${theme.color.blocked}22 0, ${theme.color.blocked}22 8px, transparent 8px, transparent 18px)`,
          border: `3px solid ${theme.color.blocked}`,
          color: theme.color.blocked,
          display: 'flex',
          fontFamily: theme.font.mono,
          fontSize: 30,
          fontWeight: 800,
          justifyContent: 'center',
          minHeight: 190,
          padding: 28,
        }}
      >
        STOP · NO READY · NO PUBLISHED
      </div>
    );
  }

  if (layout === 'custody') {
    const custodyItems = [
      ['SNAPSHOT', props.sourceSnapshot.id],
      ['CLAIMS', 'CLM-001 · CLM-002'],
      [
        'SHA-256',
        `${props.sourceSnapshot.normalizedSha256.slice(0, 8)}…${props.sourceSnapshot.normalizedSha256.slice(-7)}`,
      ],
      ['CORPUS CANÓNICO', '0/4 · COVERAGE GAP'],
    ] as const;
    return (
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        {custodyItems.map(([label, value], index) => (
          <div
            key={label}
            style={{
              border: `2px solid ${index === 3 ? theme.color.blocked : theme.color.line}`,
              color: index === 3 ? theme.color.blocked : theme.color.text,
              fontFamily: theme.font.mono,
              minHeight: 112,
              padding: 22,
            }}
          >
            <div style={{fontSize: 16, fontWeight: 700, marginBottom: 14}}>{label}</div>
            <div style={{fontSize: 20, fontWeight: 800}}>{value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        alignItems: 'end',
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'repeat(5, 1fr)',
        height: 180,
      }}
    >
      {[0.28, 0.48, 0.78, 0.58, 1].map((height, index) => (
        <div
          key={height}
          style={{
            backgroundColor: index === 4 ? theme.color.cyan : theme.color.signal,
            height: `${height * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

export const BeatScene = ({beat, props}: BeatSceneProps) => {
  const localFrame = useCurrentFrame();
  const enterWindow = Math.max(8, beat.incomingTransitionFrames);
  const exitStart = Math.max(0, beat.durationFrames - Math.max(8, beat.outgoingTransitionFrames));
  const enterOpacity =
    beat.incomingTransitionFrames === 0
      ? 1
      : interpolate(localFrame, [0, enterWindow], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const exitOpacity =
    beat.outgoingTransitionFrames === 0
      ? 1
      : interpolate(
          localFrame,
          [exitStart, Math.max(exitStart + 1, beat.durationFrames - 1)],
          [1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        );
  const opacity = Math.min(enterOpacity, exitOpacity);
  const offset =
    props.reducedMotion || beat.incomingTransitionFrames === 0
      ? 0
      : interpolate(localFrame, [0, enterWindow], [28, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  return (
    <div
      data-qa-boundary={`beat-${beat.beatId}`}
      data-qa-safe-zone={`beat-${beat.beatId}`}
      style={{
        bottom: 420,
        left: 245,
        opacity,
        position: 'absolute',
        right: props.profile.safeZonePx,
        top: 400,
        transform: `translateY(${offset}px)`,
      }}
    >
      <p
        data-qa-text={`eyebrow-${beat.beatId}`}
        style={{
          color: theme.color.signal,
          fontFamily: theme.font.mono,
          fontSize: 27,
          fontWeight: 800,
          letterSpacing: '0.08em',
          margin: 0,
          textTransform: 'uppercase',
        }}
      >
        {beat.eyebrow}
      </p>
      <h1
        data-qa-text={`headline-${beat.beatId}`}
        style={{
          color: theme.color.text,
          fontFamily: theme.font.sans,
          fontSize: beat.layout === 'opening' ? 96 : 78,
          letterSpacing: '-0.045em',
          lineHeight: 1.16,
          margin: '34px 0 28px',
          maxWidth: 730,
        }}
      >
        {beat.headline}
      </h1>
      <p
        data-qa-text={`body-${beat.beatId}`}
        style={{
          color: theme.color.muted,
          fontFamily: theme.font.sans,
          fontSize: 36,
          lineHeight: 1.3,
          margin: '0 0 46px',
          maxWidth: 740,
        }}
      >
        {beat.body}
      </p>
      <div style={{maxWidth: 710}}>
        <SceneGlyph layout={beat.layout} props={props} />
      </div>
      <div
        style={{
          color: theme.color.muted,
          display: 'flex',
          flexWrap: 'wrap',
          fontFamily: theme.font.mono,
          fontSize: 17,
          gap: 16,
          marginTop: 30,
        }}
      >
        {[...beat.claimIds, ...beat.configRefs].map((reference) => (
          <span key={reference}>{reference}</span>
        ))}
      </div>
    </div>
  );
};
