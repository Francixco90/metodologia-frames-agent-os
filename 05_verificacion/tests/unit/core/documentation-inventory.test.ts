import {describe, expect, it} from 'vitest';

import {buildDocumentationInventory} from '../../../scripts/audit-markdown.ts';

describe('DocumentationInventoryV1', () => {
  it('classifies every tracked Markdown and audits the approved authored corpus', () => {
    const inventory = buildDocumentationInventory();
    const classified = Object.values(inventory.classPaths).reduce(
      (total, paths) => total + paths.length,
      0,
    );
    expect(classified).toBe(inventory.totalMarkdown);
    expect(inventory.totalMarkdown).toBeGreaterThanOrEqual(1602);
    expect(inventory.auditedAuthored).toBe(458);
    expect(inventory.classPaths.vendor).toHaveLength(975);
  });

  it('records actionable root findings without rewriting frozen history', () => {
    const inventory = buildDocumentationInventory();
    const claude = inventory.evaluations.find(({path}) => path === 'CLAUDE.md');
    const readme = inventory.evaluations.find(({path}) => path === 'README.md');
    const lessons = inventory.evaluations.find(({path}) => path.endsWith('lessons-learned.md'));
    expect(claude).toMatchObject({score: 80, decision: 'REFACTOR'});
    expect(readme?.findings.map(({code}) => code)).toContain('DOC-DRIFT001');
    expect(lessons?.decision).toBe('FREEZE');
  });
});
