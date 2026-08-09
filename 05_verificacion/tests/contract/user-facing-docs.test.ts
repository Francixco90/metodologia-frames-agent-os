import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {validateUserFacingDocs} from '../../scripts/check-user-facing-docs.ts';

describe('reader-facing Frames documentation', () => {
  it('keeps the closed exemption registry and required reader headings valid', () => {
    expect(validateUserFacingDocs()).toEqual([]);
  });

  it('exempts only the explicitly registered explanation paths', () => {
    const registry = parse(
      readFileSync(resolve('02_proceso/governance/user-facing-docs.yml'), 'utf8'),
    ) as {documents: Array<{path: string}>};
    const paths = registry.documents.map(({path}) => path);
    expect(paths).toHaveLength(9);
    expect(paths).toContain('README.md');
    expect(
      paths.every((path) => path === 'README.md' || path.startsWith('01_intencion/guides/')),
    ).toBe(true);
    expect(paths).not.toContain('AGENTS.md');
    expect(paths).not.toContain('02_proceso/governance/docs-budget-policy.yml');
  });
});
