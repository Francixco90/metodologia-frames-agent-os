import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

const projectionInputSchema = z
  .object({
    schema_version: z.literal('brand-tokens-v2'),
    token_set_id: z.literal('metodologia-social-light-v2'),
    colors: z.object({
      canvas: z.string(),
      canvas_deep: z.string(),
      ink: z.string(),
      surface: z.string(),
      surface_alt: z.string(),
      gold_fill: z.string(),
      gold_text: z.string(),
      gold_soft: z.string(),
      text_soft: z.string(),
      muted: z.string(),
      border: z.string(),
      border_hover: z.string(),
    }),
    typography: z.object({
      heading: z.object({
        family: z.literal('Poppins'),
        fallback: z.string(),
        allowed_weights: z.array(z.number().int()).length(4),
      }),
      body: z.object({
        family: z.literal('Montserrat'),
        fallback: z.string(),
        allowed_weights: z.array(z.number().int()).length(4),
      }),
    }),
    layout: z.object({
      radius: z.string(),
      radius_large: z.string(),
      gutter: z.string(),
    }),
    motion: z.object({
      standard: z.string(),
      spring: z.string(),
      out_expo: z.string(),
    }),
  })
  .passthrough();

export type BrandTokenProjectionInput = z.infer<typeof projectionInputSchema>;

export const projectTokenJson = (tokens: BrandTokenProjectionInput): Record<string, unknown> => ({
  schemaVersion: 'brand-token-projection-v1',
  tokenSetId: tokens.token_set_id,
  sourceRef: 'brand/tokens/brand-tokens.yml',
  colors: {
    canvas: tokens.colors.canvas,
    canvasDeep: tokens.colors.canvas_deep,
    ink: tokens.colors.ink,
    surface: tokens.colors.surface,
    surfaceAlt: tokens.colors.surface_alt,
    goldFill: tokens.colors.gold_fill,
    goldText: tokens.colors.gold_text,
    goldSoft: tokens.colors.gold_soft,
    textSoft: tokens.colors.text_soft,
    muted: tokens.colors.muted,
    border: tokens.colors.border,
    borderHover: tokens.colors.border_hover,
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
      family: tokens.typography.heading.family,
      fallback: tokens.typography.heading.fallback,
      allowedWeights: tokens.typography.heading.allowed_weights,
      vendoredWeights: [400, 700, 800],
    },
    body: {
      family: tokens.typography.body.family,
      fallback: tokens.typography.body.fallback,
      allowedWeights: tokens.typography.body.allowed_weights,
      vendoredWeights: '400 700',
    },
  },
  layout: {
    radius: tokens.layout.radius,
    radiusLarge: tokens.layout.radius_large,
    gutter: tokens.layout.gutter,
  },
});

const projectTokenJsonText = (tokens: BrandTokenProjectionInput): string =>
  `${JSON.stringify(projectTokenJson(tokens), null, 2).replace(
    /\[\n\s+(\d+),\n\s+(\d+),\n\s+(\d+)(?:,\n\s+(\d+))?\n\s+\]/gu,
    (_match, first: string, second: string, third: string, fourth: string | undefined) =>
      `[${[first, second, third, fourth].filter((value) => value !== undefined).join(', ')}]`,
  )}\n`;

const normalizeCssNumber = (value: string): string =>
  value.replace(
    /(^|[,(]\s*)\.(\d+)/gu,
    (_match, prefix: string, digits: string) => `${prefix}0.${digits}`,
  );

export const projectTokenCss = (tokens: BrandTokenProjectionInput): string =>
  `/* GENERATED from brand/tokens/brand-tokens.yml. Do not edit. */
@font-face {
  font-family: 'Poppins';
  src: url('../fonts/vendor/poppins/Poppins-Regular.ttf') format('truetype');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Poppins';
  src: url('../fonts/vendor/poppins/Poppins-Bold.ttf') format('truetype');
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Poppins';
  src: url('../fonts/vendor/poppins/Poppins-ExtraBold.ttf') format('truetype');
  font-style: normal;
  font-weight: 800;
  font-display: swap;
}

@font-face {
  font-family: 'Montserrat';
  src: url('../fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf') format('truetype');
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

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
  --brand-border: ${normalizeCssNumber(tokens.colors.border)};
  --brand-border-hover: ${normalizeCssNumber(tokens.colors.border_hover)};
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
  --ease: ${normalizeCssNumber(tokens.motion.standard)};
  --ease-spring: ${normalizeCssNumber(tokens.motion.spring)};
  --ease-out-expo: ${normalizeCssNumber(tokens.motion.out_expo)};
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

export const renderBrandProjections = (
  tokens: BrandTokenProjectionInput,
): Record<string, string> => ({
  'brand/generated/social-light.tokens.json': projectTokenJsonText(tokens),
  'brand/generated/social-light.css': projectTokenCss(tokens),
  'brand/generated/social-light.tokens.ts': projectTokenTypescript(tokens),
});

export const loadBrandTokens = (root = process.cwd()): BrandTokenProjectionInput =>
  projectionInputSchema.parse(
    parse(readFileSync(resolve(root, 'brand/tokens/brand-tokens.yml'), 'utf8')) as unknown,
  );

export const writeBrandProjections = (root = process.cwd()): Record<string, string> => {
  const projections = renderBrandProjections(loadBrandTokens(root));
  for (const [relativePath, contents] of Object.entries(projections)) {
    writeFileSync(resolve(root, relativePath), contents);
  }
  return projections;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const projections = writeBrandProjections();
  const hashes = Object.entries(projections)
    .map(([path, contents]) => `${createHash('sha256').update(contents).digest('hex')}  ${path}`)
    .join('\n');
  console.info(`WROTE deterministic brand projections:\n${hashes}`);
}
