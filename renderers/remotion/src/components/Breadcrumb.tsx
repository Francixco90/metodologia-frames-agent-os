import type {MethodologiaVerticalProps, RenderBeat} from '../schema.ts';
import {theme} from '../theme.ts';

interface BreadcrumbProps {
  readonly beat: RenderBeat;
  readonly props: MethodologiaVerticalProps;
}

export const Breadcrumb = ({beat, props}: BreadcrumbProps) => (
  <div
    data-qa-boundary="breadcrumb"
    data-qa-safe-zone="breadcrumb"
    style={{
      display: 'flex',
      gap: 10,
      left: 245,
      position: 'absolute',
      right: props.profile.safeZonePx,
      top: 245,
    }}
  >
    {props.breadcrumbQuestions.map((question, index) => {
      const active = question === beat.question;
      return (
        <div
          data-qa-text={`breadcrumb-${index + 1}`}
          key={question}
          style={{
            backgroundColor: active ? `${theme.color.signal}18` : theme.color.panel,
            border: `1px solid ${active ? theme.color.signal : theme.color.line}`,
            color: active ? theme.color.signal : theme.color.muted,
            flex: 1,
            fontFamily: theme.font.mono,
            fontSize: 17,
            fontWeight: active ? 800 : 600,
            padding: '14px 16px',
          }}
        >
          {String(index + 1).padStart(2, '0')} · {question}
        </div>
      );
    })}
  </div>
);
