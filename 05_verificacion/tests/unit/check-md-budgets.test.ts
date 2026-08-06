import {describe, expect, it} from 'vitest';

import {globToRe, lineCount, wordCount} from '../../scripts/check-md-budgets.ts';

describe('check-md-budgets helpers', () => {
  it('globToRe matches SKILL.md under any skills subtree but not vendor', () => {
    const re = globToRe('03_artefactos/skills/**/SKILL.md');
    expect(re.test('03_artefactos/skills/dev-spec/SKILL.md')).toBe(true);
    expect(re.test('03_artefactos/skills/_shared/SKILL.md')).toBe(true);
    expect(re.test('03_artefactos/skills/vendor/foo/SKILL.md')).toBe(true); // vendor excluded via separate exclude glob
    expect(re.test('02_proceso/governance/SKILL.md')).toBe(false);
  });

  it('globToRe handles single-segment star as non-slash wildcard', () => {
    const re = globToRe('02_proceso/governance/*.md');
    expect(re.test('02_proceso/governance/router.yml')).toBe(false);
    expect(re.test('02_proceso/governance/policy.md')).toBe(true);
    expect(re.test('02_proceso/governance/sub/policy.md')).toBe(false);
  });

  it('wordCount and lineCount are deterministic', () => {
    expect(wordCount('hello world\nfoo')).toBe(3);
    expect(wordCount('   ')).toBe(0);
    expect(lineCount('a\nb\nc')).toBe(3);
    expect(lineCount('')).toBe(1);
  });

  it('docs-budget-policy.yml exists and parses with required surfaces', async () => {
    const {readFileSync} = await import('node:fs');
    const {resolve} = await import('node:path');
    const {parse} = await import('yaml');
    const policy = parse(
      readFileSync(resolve(process.cwd(), '02_proceso/governance/docs-budget-policy.yml'), 'utf8'),
    ) as {budgets: Array<{surface: string; mode: string}>};
    const surfaces = policy.budgets.map((b) => b.surface);
    expect(surfaces).toContain('SKILL.md');
    expect(surfaces).toContain('prompt-spec.md');
    expect(surfaces).toContain('authored-governance-md');
    expect(surfaces).toContain('authored-decisions-md');
    expect(surfaces).toContain('harness-creator-references');
    const skill = policy.budgets.find((b) => b.surface === 'SKILL.md');
    expect(skill?.mode).toBe('report'); // phased remediation, not fail-strict
  });
});
