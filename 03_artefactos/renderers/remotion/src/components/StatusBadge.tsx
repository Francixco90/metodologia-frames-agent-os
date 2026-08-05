import type {CSSProperties} from 'react';

import {theme} from '../theme.ts';

interface StatusBadgeProps {
  readonly kind: 'draft' | 'local';
  readonly label: 'RENDERED_DRAFT' | 'LOCAL TEST ONLY';
}

export const StatusBadge = ({kind, label}: StatusBadgeProps) => {
  const isDraft = kind === 'draft';
  const accent = isDraft ? theme.color.signal : theme.color.cyan;
  const pattern = isDraft
    ? `repeating-linear-gradient(135deg, ${accent}22 0, ${accent}22 4px, transparent 4px, transparent 9px)`
    : `radial-gradient(circle at 3px 3px, ${accent}44 0, ${accent}44 1.5px, transparent 1.5px)`;
  const shape: CSSProperties = isDraft
    ? {borderRadius: 2, height: 16, width: 16}
    : {borderRadius: 999, height: 16, width: 16};

  return (
    <div
      style={{
        alignItems: 'center',
        backgroundColor: theme.color.panel,
        backgroundImage: pattern,
        backgroundSize: isDraft ? undefined : '8px 8px',
        border: `1px solid ${accent}`,
        color: theme.color.text,
        display: 'flex',
        fontFamily: theme.font.mono,
        fontSize: 18,
        fontWeight: 700,
        gap: 12,
        letterSpacing: '0.08em',
        padding: '12px 16px',
      }}
    >
      <span style={{...shape, backgroundColor: accent}} />
      <span>{label}</span>
    </div>
  );
};
