import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {readRepositoryJson, readRepositoryText, repositoryRoot} from '../fixtures/verifier/io.ts';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    ?.map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Invalid color: ${hex}`);
  }
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('A06 Web WCAG 2.2 AA static and visual evidence', () => {
  it('has core language, landmark, heading, skip-link, and reduced-motion structure', () => {
    const html = readRepositoryText('projects/vs-001-source-to-campaign/web/artifact/index.html');
    const css = readRepositoryText('networks/web/src/styles.css');

    expect(html).toMatch(/<html lang="es">/u);
    expect(html.match(/<h1\b/gu)).toHaveLength(1);
    expect(html.match(/<main\b/gu)).toHaveLength(1);
    expect(html).toContain('class="skip-link" href="#contenido"');
    expect(html).toContain('<main id="contenido">');
    expect(html).toContain('aria-labelledby=');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toMatch(/outline\s*:\s*(?:0|none)/u);
  });

  it('meets the AA 4.5:1 text contrast floor for declared text/background pairs', () => {
    const pairs = [
      ['#f7f6f1', '#090a0c'],
      ['#f7f6f1', '#121418'],
      ['#a9aaa4', '#090a0c'],
      ['#a9aaa4', '#121418'],
      ['#d6ff4b', '#090a0c'],
      ['#68e6e0', '#121418'],
      ['#000000', '#d6ff4b'],
    ] as const;

    for (const [foreground, background] of pairs) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('binds the declared desktop and mobile screenshots to existing review files', () => {
    const smoke = z
      .object({
        results: z.array(
          z.object({
            id: z.enum(['desktop', 'mobile']),
            screenshotPath: z.string().min(1),
          }),
        ),
      })
      .parse(
        readRepositoryJson('projects/vs-001-source-to-campaign/web/artifact/visual-smoke.json'),
      );
    for (const result of smoke.results) {
      expect(
        existsSync(
          resolve(
            repositoryRoot,
            'projects/vs-001-source-to-campaign/web/artifact',
            result.screenshotPath,
          ),
        ),
      ).toBe(true);
    }
  });
});
