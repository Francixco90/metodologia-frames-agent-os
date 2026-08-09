import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {checkBlueprintParity, renderBlueprintArtifacts} from 'workflows/experience/index.ts';

const ROOT = process.cwd();
const WORKFLOW_ROOT = resolve(ROOT, '02_proceso/workflows/experience');
const CONTENT_ROOT = resolve(ROOT, '03_artefactos/content/experience');
const html = readFileSync(resolve(CONTENT_ROOT, 'frames-experience-blueprint.html'), 'utf8');
const markdown = readFileSync(resolve(CONTENT_ROOT, 'frames-experience-blueprint.md'), 'utf8');
const service = parse(readFileSync(resolve(WORKFLOW_ROOT, 'service-blueprint.yml'), 'utf8')) as {
  stages: Array<{moment: string; frontstage: string}>;
};

describe('Frames Experience journey projection', () => {
  it('renders the same eight governed moments from the service blueprint', () => {
    expect(service.stages).toHaveLength(8);
    for (const stage of service.stages) {
      expect(html).toContain(`<b>${stage.moment}</b>`);
      expect(html).toContain(`<span>${stage.frontstage}</span>`);
    }
  });

  it('keeps the enriched journey in the canonical Markdown model', () => {
    for (const moment of [
      'Llegada',
      'Comprensión',
      'Orientación',
      'Co-diseño',
      'Producción',
      'Revisión',
      'Continuidad',
      'Recuperación',
    ]) {
      expect(markdown).toContain(`**${moment}`);
    }
    expect(markdown).toMatch(/texto libre siempre prevalece/iu);
    expect(markdown).toContain('launch probe material');
  });

  it('regenerates byte-identical HTML and manifest from canonical sources', () => {
    const expected = renderBlueprintArtifacts(ROOT);
    expect(expected.html).toBe(html);
    expect(checkBlueprintParity(ROOT)).toEqual({
      ok: true,
      contentSha256: expected.manifest.content_sha256,
      sectionCount: 13,
      errors: [],
    });
  });
});
