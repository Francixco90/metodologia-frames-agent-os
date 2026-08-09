import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {ExperienceComponentKindV1Schema} from 'core/contracts/index.ts';
import {
  checkBlueprintParity,
  extractEmbeddedModel,
  parseBlueprintMarkdown,
} from 'workflows/experience/index.ts';

const ROOT = process.cwd();
const WORKFLOW_ROOT = resolve(ROOT, '02_proceso/workflows/experience');
const CONTENT_ROOT = resolve(ROOT, '03_artefactos/content/experience');
const markdown = readFileSync(resolve(CONTENT_ROOT, 'frames-experience-blueprint.md'), 'utf8');
const html = readFileSync(resolve(CONTENT_ROOT, 'frames-experience-blueprint.html'), 'utf8');

describe('Frames Experience GenUI and blueprint projection', () => {
  it('keeps the component registry exactly aligned with the governed allowlist', () => {
    const registry = parse(
      readFileSync(resolve(WORKFLOW_ROOT, 'component-registry.yml'), 'utf8'),
    ) as {
      identity: string;
      policy: {
        composition: string;
        primary_actions_max: number;
        secondary_actions_max: number;
        remote_code: string;
        text_fallback: string;
        semantic_source: string;
      };
      components: Array<{id: string; required_fields: string[]}>;
    };
    expect(registry.identity).toBe('Frames ContentOS · por MetodologIA');
    expect(registry.components.map(({id}) => id)).toEqual(ExperienceComponentKindV1Schema.options);
    expect(new Set(registry.components.map(({id}) => id)).size).toBe(11);
    expect(registry.components.every(({required_fields}) => required_fields.length > 0)).toBe(true);
    expect(registry.policy).toEqual({
      composition: 'allowlist_only',
      primary_actions_max: 1,
      secondary_actions_max: 2,
      remote_code: 'forbidden',
      text_fallback: 'required',
      semantic_source: 'AssistanceEnvelopeV1',
    });
  });

  it('projects the canonical Markdown model without semantic drift', () => {
    const source = parseBlueprintMarkdown(markdown);
    const projection = extractEmbeddedModel(html);
    expect(source.sections).toHaveLength(13);
    expect(source.sections.map(({id}) => id)).toEqual(
      Array.from({length: 13}, (_, index) => `section-${String(index + 1).padStart(2, '0')}`),
    );
    expect(projection).toEqual(source);
    expect(checkBlueprintParity(ROOT)).toMatchObject({
      ok: true,
      sectionCount: 13,
      errors: [],
    });
  });

  it('is offline, branded and carries the required deterministic metadata', () => {
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('name="author" content="MetodologIA"');
    expect(html).toContain('name="generator" content="Frames Experience Renderer v1"');
    expect(html).toContain('name="content-sha256"');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'none'");
    expect(html).not.toMatch(/(?:src|href)=["']https?:/iu);
    expect(html).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/u);
    expect(html).not.toMatch(/telemetry|analytics|tracking-id/iu);
    expect(html).toContain('#122562');
    expect(html).toContain('#FFD700');
    expect(html).toContain('#137DC5');
  });

  it('provides static keyboard, responsive, reduced-motion and print controls', () => {
    expect(html.match(/<main\b/gu)).toHaveLength(1);
    expect(html.match(/<h1\b/gu)).toHaveLength(1);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('for="theme"');
    expect(html).toContain(':focus-visible');
    expect(html).toContain('min-height:44px');
    expect(html).toContain('@media(max-width:760px)');
    expect(html).toContain('@media(prefers-reduced-motion:reduce)');
    expect(html).toContain('@media print');
    expect(html).not.toMatch(/outline\s*:\s*(?:0|none)/u);
    expect(html).toContain('color-scheme:light dark');
  });
});
