// Regression coverage for hash-bound per-file line caps. [CÓDIGO]
import {describe, expect, it} from 'vitest';

import {
  assessProgramLineCap,
  type ProgramLineCapStatus,
} from '../../scripts/lib/file-budget-evaluation.ts';
import {effectiveRules, loadPolicy} from '../../scripts/lib/file-budget-policy.ts';

const cap = {
  path: '05_verificacion/scripts/commands.yaml',
  surface: 'canonical-control-config',
  baselineHardLines: 450,
  programHardLines: 650,
  rationale: 'Exact branch-local allowance without relaxing the global policy.',
} as const;

const assess = (
  overrides: Partial<Parameters<typeof assessProgramLineCap>[0]> = {},
): ProgramLineCapStatus =>
  assessProgramLineCap({
    cap,
    path: cap.path,
    surface: cap.surface,
    changed: true,
    hardWords: 2_500,
    hardLines: 450,
    actualWords: 2_009,
    actualLines: 456,
    ...overrides,
  });

describe('scoped Markdown budget exceptions', () => {
  it('preserves the original global limits for both governed paths', () => {
    const policy = loadPolicy(process.cwd());
    const commands = effectiveRules(policy.budgets, cap.path, false);
    const sources = effectiveRules(
      policy.budgets,
      '04_estado/registries/sources/source-registry.yml',
      false,
    );
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      surface: 'canonical-control-config',
      hard: {max_words: 2_500, max_lines: 450},
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      surface: 'authored-explicit-fallback',
      hard: {max_words: 2_500, max_lines: 500},
    });
    expect(policy.budgets.map(({surface}) => surface)).not.toContain('gate-command-manifest');
    expect(policy.budgets.map(({surface}) => surface)).not.toContain('source-registry-manifest');
  });

  it('applies only the exact active line allowance and leaves words bounded', () => {
    expect(assess()).toBe('APPLIED');
    expect(assess({actualLines: 450})).toBe('WITHIN_BASELINE');
  });

  it.each([
    ['path', {path: '05_verificacion/scripts/other.yaml'}, 'INVALID_BINDING'],
    ['surface', {surface: 'authored-explicit-fallback'}, 'INVALID_BINDING'],
    ['baseline', {hardLines: 451}, 'INVALID_BINDING'],
    ['unchanged file', {changed: false}, 'DENIED_UNCHANGED'],
    ['word overrun', {actualWords: 2_501}, 'DENIED_WORDS'],
    ['program line overrun', {actualLines: 651}, 'DENIED_PROGRAM_LINES'],
  ] as const)('denies %s drift', (_label, overrides, expected) => {
    expect(assess(overrides)).toBe(expected);
  });
});
