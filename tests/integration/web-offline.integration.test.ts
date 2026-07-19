import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {readRepositoryJson, readRepositoryText} from '../fixtures/verifier/io.ts';

const VisualSmokeSchema = z.strictObject({
  schema_version: z.literal(1),
  pass: z.literal(true),
  results: z
    .array(
      z.strictObject({
        id: z.enum(['desktop', 'mobile']),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        title: z.string().min(1),
        lang: z.literal('es'),
        h1Count: z.literal(1),
        h2Count: z.number().int().positive(),
        mainCount: z.literal(1),
        horizontalOverflow: z.literal(false),
        sourceReferences: z.number().int().positive(),
        bodyTextLength: z.number().int().positive(),
        consoleErrors: z.array(z.string()).length(0),
        screenshotPath: z.string().min(1),
      }),
    )
    .length(2),
});

describe('A06 Web offline integration', () => {
  it('contains no executable scripts, remote assets, absolute locators, or live forms', () => {
    const html = readRepositoryText('projects/vs-001-source-to-campaign/web/artifact/index.html');
    expect(html).not.toMatch(/<script\b/iu);
    expect(html).not.toMatch(/<(?:img|link|iframe|video|audio|source)\b[^>]+https?:/iu);
    expect(html).not.toMatch(/@import|url\(\s*['"]?https?:/iu);
    expect(html).not.toMatch(/<form\b|<input\b|<button\b/iu);
    expect(html).not.toMatch(/\/Users\/|[A-Za-z]:\\Users\\/u);
  });

  it('retains desktop and mobile smoke evidence without overflow or console errors', () => {
    const smoke = VisualSmokeSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/artifact/visual-smoke.json'),
    );
    expect(smoke.results.map(({id}) => id).sort()).toEqual(['desktop', 'mobile']);
    expect(smoke.results.every(({sourceReferences}) => sourceReferences === 3)).toBe(true);
  });
});
