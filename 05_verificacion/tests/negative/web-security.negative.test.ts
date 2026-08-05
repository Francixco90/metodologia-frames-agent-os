import {createHash} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {pageModelSchema} from '../../../networks/web/src/model.ts';
import {renderPage} from '../../../networks/web/src/render.ts';
import {readRepositoryJson, readRepositoryText} from '../fixtures/verifier/io.ts';

describe('A06 Web adversarial verification', () => {
  it('escapes hostile copy instead of emitting executable markup', () => {
    const source = pageModelSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/page.json'),
    );
    const hostile = pageModelSchema.parse({
      ...source,
      title: '<script>alert("title")</script>',
      thesis: '<img src=x onerror=alert("thesis")>',
      sections: source.sections.map((section, index) =>
        index === 0 ? {...section, body: '<svg onload=alert("section")></svg>'} : section,
      ),
    });
    const rendered = renderPage(hostile, 'body { color: white; }');

    expect(rendered).not.toContain('<script>alert');
    expect(rendered).not.toContain('<img src=x');
    expect(rendered).not.toContain('<svg onload');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).toContain('&lt;img src=x onerror=alert');
  });

  it('rejects unknown governance fields at the strict page-model boundary', () => {
    const source = pageModelSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/page.json'),
    );
    const parsed = pageModelSchema.safeParse({
      ...source,
      publishAuthorized: true,
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects orphan and blocked claim references in material sections', () => {
    const source = pageModelSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/page.json'),
    );
    const orphan = pageModelSchema.safeParse({
      ...source,
      sections: source.sections.map((section, index) =>
        index === 0 ? {...section, claimIds: ['CLM-NOT-REGISTERED']} : section,
      ),
    });
    const blocked = pageModelSchema.safeParse({
      ...source,
      claims: source.claims.map((claim, index) =>
        index === 0 ? {...claim, status: 'blocked'} : claim,
      ),
      sections: source.sections,
    });

    expect(orphan.success).toBe(false);
    expect(blocked.success).toBe(false);
  });

  it('binds both the strict page model and renderer implementation into the build receipt', () => {
    const receipt = readRepositoryJson(
      'projects/vs-001-source-to-campaign/web/artifact/build-receipt.json',
    ) as {inputs?: Array<{path?: string; sha256?: string}>};
    const inputs = new Map(receipt.inputs?.map(({path, sha256}) => [path, sha256]));
    const expected = ['networks/web/src/model.ts', 'networks/web/src/render.ts'] as const;

    for (const path of expected) {
      const source = readRepositoryText(path);
      expect(source.length).toBeGreaterThan(0);
      expect(inputs.get(path)).toBe(createHash('sha256').update(source).digest('hex'));
    }
  });
});
