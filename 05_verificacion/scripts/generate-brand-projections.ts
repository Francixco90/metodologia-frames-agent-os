import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

import {projectTokenCss, projectTokenTypescript} from './lib/brand-projection-renderers.ts';

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
    career: z.strictObject({
      schema_version: z.literal('metodologia-career-palette-v1'),
      default_theme: z.literal('navy'),
      print_theme: z.literal('light'),
      navy: z.strictObject({
        canvas: z.string(),
        surface: z.string(),
        surface_raised: z.string(),
        text: z.string(),
        text_muted: z.string(),
        accent: z.string(),
        accent_text: z.string(),
        line: z.string(),
        focus: z.string(),
        shadow: z.string(),
        backdrop: z.string(),
      }),
      light: z.strictObject({
        canvas: z.string(),
        surface: z.string(),
        surface_raised: z.string(),
        text: z.string(),
        text_muted: z.string(),
        accent: z.string(),
        accent_text: z.string(),
        line: z.string(),
        focus: z.string(),
        shadow: z.string(),
        backdrop: z.string(),
      }),
    }),
  })
  .passthrough();

export type BrandTokenProjectionInput = z.infer<typeof projectionInputSchema>;
export const parseBrandProjectionInput = (input: unknown): BrandTokenProjectionInput =>
  projectionInputSchema.parse(input);

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

export const renderBrandProjections = (
  tokens: BrandTokenProjectionInput,
): Record<string, string> => ({
  'brand/generated/social-light.tokens.json': projectTokenJsonText(tokens),
  'brand/generated/social-light.css': projectTokenCss(tokens),
  'brand/generated/social-light.tokens.ts': projectTokenTypescript(tokens),
});

export const loadBrandTokens = (root = process.cwd()): BrandTokenProjectionInput =>
  parseBrandProjectionInput(
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
