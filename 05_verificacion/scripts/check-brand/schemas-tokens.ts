import {z} from 'zod';

import {careerPaletteSchema} from './schemas-career.ts';

const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const relativePath = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('..'), 'portable relative path');

export const tokenSchema = z.strictObject({
  schema_version: z.literal('brand-tokens-v2'),
  token_set_id: z.literal('metodologia-social-light-v2'),
  brand_id: z.literal('metodologia'),
  authored: z.literal(true),
  default_theme: z.literal('light'),
  source_binding: z.object({
    bundle_ref: relativePath,
    source_id: z.literal('BRAND-SRC-TOKENS'),
    source_sha256: sha256,
  }),
  colors: z.strictObject({
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
  semantic: z.record(z.string(), z.string()),
  css_aliases: z.strictObject({
    brand_navy: z.literal('ink'),
    brand_white: z.literal('surface'),
    brand_white_soft: z.literal('surface_alt'),
    brand_white_muted: z.literal('canvas_deep'),
  }),
  typography: z.object({
    heading: z.object({
      family: z.literal('Poppins'),
      fallback: z.string(),
      allowed_weights: z.tuple([z.literal(600), z.literal(700), z.literal(800), z.literal(900)]),
    }),
    body: z.object({
      family: z.literal('Montserrat'),
      fallback: z.string(),
      allowed_weights: z.tuple([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]),
    }),
  }),
  layout: z.object({
    radius: z.literal('16px'),
    radius_large: z.literal('24px'),
    gutter: z.string(),
  }),
  motion: z.object({standard: z.string(), spring: z.string(), out_expo: z.string()}),
  accessibility: z.object({
    body_text_minimum_contrast: z.literal(4.5),
    large_text_and_ui_minimum_contrast: z.literal(3),
    gold_pairing_rule: z.literal('text_on_gold'),
    forbidden_pairing: z.literal('white_on_gold'),
  }),
  career: careerPaletteSchema,
  projection_targets: z.tuple([
    z.literal('brand/generated/social-light.tokens.json'),
    z.literal('brand/generated/social-light.css'),
    z.literal('brand/generated/social-light.tokens.ts'),
  ]),
});
