import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  checkDocumentationOutputs,
  writeDocumentationOutputs,
} from 'workflows/documentation/generate.ts';

const roots: string[] = [];
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'frames-doc-output-'));
  roots.push(root);
  const workflowRoot = join(root, '01_intencion/reference/workflows');
  mkdirSync(workflowRoot, {recursive: true});
  writeFileSync(join(workflowRoot, 'p99.md'), 'stale but recoverable\n');
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('documentation output boundary', () => {
  it('detects governed stale outputs during check mode', async () => {
    const root = fixture();
    await expect(checkDocumentationOutputs(new Map(), root)).rejects.toThrow(
      /stale:01_intencion\/reference\/workflows\/p99\.md/u,
    );
  });

  it('does not mutate anything when the requested output set is unauthorized', async () => {
    const root = fixture();
    const stalePath = join(root, '01_intencion/reference/workflows/p99.md');
    await expect(
      writeDocumentationOutputs(new Map([['outside/unowned.md', 'unsafe\n']]), root),
    ).rejects.toThrow(/Unowned output/u);
    expect(readFileSync(stalePath, 'utf8')).toBe('stale but recoverable\n');
  });
});
