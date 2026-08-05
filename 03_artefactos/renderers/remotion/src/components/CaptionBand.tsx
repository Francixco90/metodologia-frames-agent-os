import type {MethodologiaVerticalProps} from '../schema.ts';
import {theme} from '../theme.ts';

interface CaptionBandProps {
  readonly text: string;
  readonly props: MethodologiaVerticalProps;
}

export const CaptionBand = ({text, props}: CaptionBandProps) => {
  return (
    <div
      data-qa-boundary="caption-band"
      data-qa-safe-zone="caption-band"
      data-qa-text="caption-band"
      style={{
        backgroundColor: '#090A0CF2',
        border: `2px solid ${theme.color.line}`,
        bottom: 178,
        color: theme.color.text,
        fontFamily: theme.font.sans,
        fontSize: 38,
        fontWeight: 700,
        left: 245,
        lineHeight: 1.26,
        padding: '24px 30px',
        position: 'absolute',
        right: props.profile.safeZonePx,
      }}
    >
      {text}
    </div>
  );
};
