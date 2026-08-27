import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml, stringify as stringifyYaml} from 'yaml';
import {afterEach, describe, expect, it} from 'vitest';

import {validateNotebookLmCanonV3} from '../../scripts/check-notebooklm-canon-v3.ts';
import {createValidFixture} from './notebooklm-canon-v3/fixture.ts';

describe('Canon v3 filesystem validator: valid tree and manifest identity', () => {
  const temporaryRoots: string[] = [];
  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, {recursive: true, force: true});
  });

  it('accepts a complete, bounded and indexable Canon v3 tree', () => {
    const report = validateNotebookLmCanonV3(createValidFixture(temporaryRoots));
    expect(report.errors).toEqual([]);
    expect(report.metrics).toMatchObject({
      markdownDocuments: 27,
      activeDocuments: 27,
      promptTemplates: 22,
      sourceManifestSources: 27,
      importPlanSources: 27,
      groundingTests: 7,
    });
  });

  it('rejects manifest summary, digest, and identity drift', () => {
    const root = createValidFixture(temporaryRoots);
    const manifestPath = resolve(root, 'source-manifest.yml');
    const manifest = parseYaml(readFileSync(manifestPath, 'utf8')) as {
      summary: {markdown: number};
      sources: Array<{content_sha256: string}>;
    };
    manifest.summary.markdown -= 1;
    manifest.sources[1]!.content_sha256 = manifest.sources[0]!.content_sha256;
    writeFileSync(manifestPath, stringifyYaml(manifest));
    const report = validateNotebookLmCanonV3(root);
    expect(report.errors.some((error) => error.includes('summary.markdown'))).toBe(true);
    expect(
      report.errors.some((error) => error.includes('content_sha256 values must be unique')),
    ).toBe(true);
    expect(report.errors.some((error) => error.includes('content hash drift'))).toBe(true);
  });
});
