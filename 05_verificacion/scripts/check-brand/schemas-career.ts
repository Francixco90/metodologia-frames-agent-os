import {z} from 'zod';

const theme = z.strictObject({
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
});

/** Career palette extension remains inside the single authored brand-token authority. */
export const careerPaletteSchema = z.strictObject({
  schema_version: z.literal('metodologia-career-palette-v1'),
  default_theme: z.literal('navy'),
  print_theme: z.literal('light'),
  navy: theme,
  light: theme,
});
