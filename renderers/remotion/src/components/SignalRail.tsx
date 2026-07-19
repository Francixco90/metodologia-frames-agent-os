import {interpolate} from 'remotion';

import type {MethodologiaVerticalProps, RenderBeat} from '../schema.ts';
import {theme} from '../theme.ts';

interface SignalRailProps {
  readonly beat: RenderBeat;
  readonly frame: number;
  readonly props: MethodologiaVerticalProps;
}

const stageIndexByLayout: Readonly<Record<RenderBeat['layout'], number>> = {
  opening: 0,
  source: 0,
  committee: 1,
  custody: 1,
  fork: 2,
  gate: 3,
  closing: 3,
};

export const SignalRail = ({beat, frame, props}: SignalRailProps) => {
  const stageIndex = stageIndexByLayout[beat.layout];
  const durationInFrames = props.beats.at(-1)?.toFrame ?? 1;
  const progress = props.reducedMotion
    ? (stageIndex + 1) / props.chainStages.length
    : interpolate(frame, [0, durationInFrames - 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  return (
    <div
      data-qa-boundary="signal-rail"
      style={{
        bottom: 300,
        left: props.profile.safeZonePx,
        position: 'absolute',
        top: 310,
        width: 132,
      }}
    >
      <svg
        aria-label="Cadena Fuente, Comité, Web y Motion, Gate"
        height="100%"
        viewBox="0 0 132 1200"
        width="100%"
      >
        <path
          d="M34 70 L34 835 M34 615 C34 670 92 670 92 735 M34 615 C34 670 34 670 34 735"
          fill="none"
          opacity={0.45}
          stroke={theme.color.line}
          strokeWidth={4}
        />
        <path
          d="M34 70 L34 835"
          fill="none"
          pathLength={1}
          stroke={theme.color.signal}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
          strokeLinecap="round"
          strokeWidth={6}
        />
        {props.chainStages.map((stage, index) => {
          const y = [70, 335, 615, 835][index] ?? 70;
          const active = index <= stageIndex;
          return (
            <g key={stage.stageId}>
              <rect
                fill={active ? theme.color.signal : theme.color.panel}
                height={28}
                rx={index === 3 ? 2 : 14}
                stroke={active ? theme.color.signal : theme.color.line}
                strokeWidth={3}
                width={28}
                x={20}
                y={y - 14}
              />
              {stage.stageId === 'products' ? (
                <text
                  fill={active ? theme.color.text : theme.color.muted}
                  fontFamily={theme.font.mono}
                  fontSize={13}
                  fontWeight={700}
                  x={58}
                  y={y - 3}
                >
                  <tspan x={58}>Web</tspan>
                  <tspan dy={17} x={58}>
                    Motion
                  </tspan>
                </text>
              ) : (
                <text
                  fill={active ? theme.color.text : theme.color.muted}
                  fontFamily={theme.font.mono}
                  fontSize={16}
                  fontWeight={700}
                  x={58}
                  y={y + 6}
                >
                  {stage.label}
                </text>
              )}
            </g>
          );
        })}
        <path
          d="M34 615 C34 670 92 670 92 735"
          fill="none"
          opacity={stageIndex >= 2 ? 1 : 0.18}
          stroke={theme.color.cyan}
          strokeWidth={5}
        />
        <circle
          cx={92}
          cy={735}
          fill={stageIndex >= 2 ? theme.color.cyan : theme.color.panel}
          r={11}
          stroke={theme.color.cyan}
          strokeWidth={3}
        />
      </svg>
    </div>
  );
};
