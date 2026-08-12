import type {BrandTokenProjectionInput} from '../generate-brand-projections.ts';

const cssNumber = (value: string): string =>
  value.replace(
    /(^|[,(]\s*)\.(\d+)/gu,
    (_match, prefix: string, digits: string) => `${prefix}0.${digits}`,
  );

export const projectTokenCss = (
  tokens: BrandTokenProjectionInput,
): string => `/* GENERATED from brand/tokens/brand-tokens.yml. Do not edit. */
@font-face { font-family: 'Poppins'; src: url('../fonts/vendor/poppins/Poppins-Regular.ttf') format('truetype'); font-style: normal; font-weight: 400; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url('../fonts/vendor/poppins/Poppins-Bold.ttf') format('truetype'); font-style: normal; font-weight: 700; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url('../fonts/vendor/poppins/Poppins-ExtraBold.ttf') format('truetype'); font-style: normal; font-weight: 800; font-display: swap; }
@font-face { font-family: 'Montserrat'; src: url('../fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf') format('truetype'); font-style: normal; font-weight: 400 700; font-display: swap; }

:root {
  --brand-canvas: ${tokens.colors.canvas};
  --brand-canvas-deep: ${tokens.colors.canvas_deep};
  --brand-ink: ${tokens.colors.ink};
  --brand-surface: ${tokens.colors.surface};
  --brand-surface-alt: ${tokens.colors.surface_alt};
  --brand-gold: ${tokens.colors.gold_fill};
  --brand-gold-text: ${tokens.colors.gold_text};
  --brand-gold-soft: ${tokens.colors.gold_soft};
  --brand-text: var(--brand-ink);
  --brand-text-soft: ${tokens.colors.text_soft};
  --brand-muted: ${tokens.colors.muted};
  --brand-border: ${cssNumber(tokens.colors.border)};
  --brand-border-hover: ${cssNumber(tokens.colors.border_hover)};
  --brand-dark: var(--brand-canvas);
  --brand-darker: var(--brand-canvas-deep);
  --brand-navy: var(--brand-ink);
  --brand-white: var(--brand-surface);
  --brand-white-soft: var(--brand-surface-alt);
  --brand-white-muted: var(--brand-canvas-deep);
  --brand-on-gold: var(--brand-ink);
  --brand-radius: ${tokens.layout.radius};
  --brand-radius-lg: ${tokens.layout.radius_large};
  --gutter: ${tokens.layout.gutter};
  --font-head: '${tokens.typography.heading.family}', ${tokens.typography.heading.fallback};
  --font-body: '${tokens.typography.body.family}', ${tokens.typography.body.fallback};
  --ease: ${cssNumber(tokens.motion.standard)};
  --ease-spring: ${cssNumber(tokens.motion.spring)};
  --ease-out-expo: ${cssNumber(tokens.motion.out_expo)};
  --career-navy-canvas: ${tokens.career.navy.canvas};
  --career-navy-surface: ${tokens.career.navy.surface};
  --career-navy-surface-raised: ${tokens.career.navy.surface_raised};
  --career-navy-text: ${tokens.career.navy.text};
  --career-navy-text-muted: ${tokens.career.navy.text_muted};
  --career-navy-accent: ${tokens.career.navy.accent};
  --career-navy-accent-text: ${tokens.career.navy.accent_text};
  --career-navy-line: ${tokens.career.navy.line};
  --career-navy-focus: ${tokens.career.navy.focus};
  --career-navy-shadow: ${cssNumber(tokens.career.navy.shadow)};
  --career-navy-backdrop: ${cssNumber(tokens.career.navy.backdrop)};
  --career-light-canvas: ${tokens.career.light.canvas};
  --career-light-surface: ${tokens.career.light.surface};
  --career-light-surface-raised: ${tokens.career.light.surface_raised};
  --career-light-text: ${tokens.career.light.text};
  --career-light-text-muted: ${tokens.career.light.text_muted};
  --career-light-accent: ${tokens.career.light.accent};
  --career-light-accent-text: ${tokens.career.light.accent_text};
  --career-light-line: ${tokens.career.light.line};
  --career-light-focus: ${tokens.career.light.focus};
  --career-light-shadow: ${cssNumber(tokens.career.light.shadow)};
  --career-light-backdrop: ${cssNumber(tokens.career.light.backdrop)};
}
`;

export const projectTokenTypescript = (tokens: BrandTokenProjectionInput): string =>
  `export const socialLightTokens = {
  schemaVersion: 'brand-token-projection-v1',
  tokenSetId: '${tokens.token_set_id}',
  sourceRef: 'brand/tokens/brand-tokens.yml',
  colors: {
    canvas: '${tokens.colors.canvas}',
    canvasDeep: '${tokens.colors.canvas_deep}',
    ink: '${tokens.colors.ink}',
    surface: '${tokens.colors.surface}',
    surfaceAlt: '${tokens.colors.surface_alt}',
    goldFill: '${tokens.colors.gold_fill}',
    goldText: '${tokens.colors.gold_text}',
    goldSoft: '${tokens.colors.gold_soft}',
    textSoft: '${tokens.colors.text_soft}',
    muted: '${tokens.colors.muted}',
    border: '${tokens.colors.border}',
    borderHover: '${tokens.colors.border_hover}',
  },
  aliases: {
    brandNavy: 'ink',
    brandWhite: 'surface',
    brandWhiteSoft: 'surfaceAlt',
    brandWhiteMuted: 'canvasDeep',
    textPrimary: 'ink',
    textOnGold: 'ink',
    accentFill: 'goldFill',
    accentText: 'goldText',
  },
  typography: {
    heading: {
      family: '${tokens.typography.heading.family}',
      fallback: '${tokens.typography.heading.fallback}',
      allowedWeights: [${tokens.typography.heading.allowed_weights.join(', ')}],
      vendoredWeights: [400, 700, 800],
    },
    body: {
      family: '${tokens.typography.body.family}',
      fallback: '${tokens.typography.body.fallback}',
      allowedWeights: [${tokens.typography.body.allowed_weights.join(', ')}],
      vendoredWeights: '400 700',
    },
  },
  layout: {
    radius: '${tokens.layout.radius}',
    radiusLarge: '${tokens.layout.radius_large}',
    gutter: '${tokens.layout.gutter}',
  },
} as const;

export type SocialLightTokens = typeof socialLightTokens;
`;
