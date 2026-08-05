import {StatusBadge} from './StatusBadge.tsx';
import {theme} from '../theme.ts';
import type {MethodologiaVerticalProps} from '../schema.ts';

interface PersistentChromeProps {
  readonly props: MethodologiaVerticalProps;
}

export const PersistentChrome = ({props}: PersistentChromeProps) => (
  <>
    <div
      data-qa-boundary="persistent-header"
      data-qa-safe-zone="persistent-header"
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        left: props.profile.safeZonePx,
        position: 'absolute',
        right: props.profile.safeZonePx,
        top: props.profile.safeZonePx,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          color: theme.color.text,
          display: 'flex',
          fontFamily: theme.font.sans,
          fontSize: 28,
          fontWeight: 800,
          gap: 14,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            border: `2px solid ${theme.color.signal}`,
            color: theme.color.signal,
            display: 'flex',
            fontFamily: theme.font.mono,
            fontSize: 20,
            height: 48,
            justifyContent: 'center',
            width: 48,
          }}
        >
          M
        </div>
        MetodologIA
      </div>
      <div style={{display: 'flex', gap: 12}}>
        <StatusBadge kind="draft" label={props.status} />
        <StatusBadge kind="local" label={props.scopeBadge} />
      </div>
    </div>
    <div
      data-qa-boundary="persistent-footer"
      data-qa-safe-zone="persistent-footer"
      style={{
        bottom: props.profile.safeZonePx,
        color: theme.color.muted,
        display: 'flex',
        fontFamily: theme.font.mono,
        fontSize: 17,
        justifyContent: 'space-between',
        left: props.profile.safeZonePx,
        letterSpacing: '0.04em',
        position: 'absolute',
        right: props.profile.safeZonePx,
      }}
    >
      <span>{props.artifactId}</span>
      <span>0/4 · COVERAGE GAP · NO KPI</span>
      <span>{props.sourceSnapshot.id}</span>
    </div>
  </>
);
