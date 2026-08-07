import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {stringify} from 'yaml';
import {afterEach, describe, expect, it} from 'vitest';

import {
  effectiveRules,
  globToRe,
  loadPolicy,
  type Policy,
} from '../../scripts/lib/file-budget-policy.ts';

const roots: string[] = [];
const base = (): Record<string, unknown> => ({
  schema_version: 'file-budget-policy-v2',
  defaults: {kind: 'authored', scope: 'changed', mode: 'enforce', changed_mode: 'enforce'},
  pr_budget: {target_files: 8, target_loc: 800, hard_files: 12, hard_loc: 1200},
  budgets: [
    {
      surface: 'authored-fallback',
      fallback: true,
      match: '**',
      exclude: [],
      target: {max_lines: 100},
      hard: {max_lines: 200},
      rationale: 'Catch unmatched authored files.',
    },
    {
      surface: 'generated-fallback',
      kind: 'generated',
      fallback: true,
      match: '**',
      target: {max_lines: 100},
      hard: {max_lines: 200},
      rationale: 'Catch generated files without a template binding.',
    },
  ],
});
const read = (value: Record<string, unknown>): Policy => {
  const root = mkdtempSync(join(tmpdir(), 'frames-budget-policy-'));
  roots.push(root);
  mkdirSync(join(root, '02_proceso/governance'), {recursive: true});
  writeFileSync(join(root, '02_proceso/governance/docs-budget-policy.yml'), stringify(value));
  return loadPolicy(root);
};
const budgets = (value: Record<string, unknown>): Array<Record<string, unknown>> =>
  value.budgets as Array<Record<string, unknown>>;

afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, {recursive: true, force: true}));
});

describe('loadPolicy', () => {
  it('parses a complete v2 policy without coercing typed fields', () => {
    const policy = read(base());
    expect(policy.pr_budget).toEqual({
      target_files: 8,
      target_loc: 800,
      hard_files: 12,
      hard_loc: 1200,
    });
    expect(policy.budgets.map(({fallback}) => fallback)).toEqual([true, true]);
  });

  it.each([
    ['missing pr_budget', (value: Record<string, unknown>) => delete value.pr_budget],
    [
      'fractional pr budget',
      (value: Record<string, unknown>) =>
        Object.assign(value.pr_budget as object, {target_files: 1.5}),
    ],
    [
      'pr target above hard',
      (value: Record<string, unknown>) =>
        Object.assign(value.pr_budget as object, {target_files: 13}),
    ],
    ['non-string match', (value: Record<string, unknown>) => (budgets(value)[0]!.match = [7])],
    [
      'fractional absolute limit',
      (value: Record<string, unknown>) => (budgets(value)[0]!.target = {max_lines: 1.5}),
    ],
    ['invalid enum', (value: Record<string, unknown>) => (budgets(value)[0]!.scope = 'sometimes')],
    ['empty limits', (value: Record<string, unknown>) => (budgets(value)[0]!.target = {})],
    [
      'incoherent limit dimensions',
      (value: Record<string, unknown>) => (budgets(value)[0]!.hard = {max_words: 200}),
    ],
    [
      'target above hard',
      (value: Record<string, unknown>) => (budgets(value)[0]!.hard = {max_lines: 50}),
    ],
    [
      'baseline without multipliers',
      (value: Record<string, unknown>) => (budgets(value)[0]!.baseline = 'file-disposition'),
    ],
    [
      'multipliers without baseline',
      (value: Record<string, unknown>) => {
        budgets(value)[0]!.target = {multiplier: 1};
        budgets(value)[0]!.hard = {multiplier: 2};
      },
    ],
    [
      'template baseline on authored',
      (value: Record<string, unknown>) => {
        budgets(value)[0]!.baseline = 'template';
        budgets(value)[0]!.target = {multiplier: 1};
        budgets(value)[0]!.hard = {multiplier: 2};
      },
    ],
    [
      'file-disposition baseline on generated',
      (value: Record<string, unknown>) => {
        budgets(value)[1]!.baseline = 'file-disposition';
        budgets(value)[1]!.target = {multiplier: 1};
        budgets(value)[1]!.hard = {multiplier: 2};
      },
    ],
    [
      'fallback with a narrow glob',
      (value: Record<string, unknown>) => (budgets(value)[0]!.match = '*.md'),
    ],
    [
      'missing authored fallback',
      (value: Record<string, unknown>) => (budgets(value)[0]!.fallback = false),
    ],
    [
      'duplicate generated fallback',
      (value: Record<string, unknown>) =>
        budgets(value).push({...budgets(value)[1]!, surface: 'generated-fallback-2'}),
    ],
  ])('rejects %s', (_label, mutate) => {
    const value = base();
    mutate(value);
    expect(() => read(value)).toThrow(/BUDGET-POLICY00[124]/u);
  });
});

describe('effectiveRules', () => {
  it('uses the fallback for the requested kind only when no specific rule matches', () => {
    const value = base();
    budgets(value).push({
      surface: 'markdown',
      match: '**/*.md',
      target: {max_lines: 50},
      hard: {max_lines: 80},
      rationale: 'Specific Markdown budget.',
    });
    const rules = read(value).budgets;
    expect(effectiveRules(rules, 'docs/a.md', false).map(({surface}) => surface)).toEqual([
      'markdown',
    ]);
    expect(effectiveRules(rules, 'data/a.json', false)[0]?.surface).toBe('authored-fallback');
    expect(effectiveRules(rules, 'generated/a.json', true)[0]?.surface).toBe('generated-fallback');
  });

  it('preserves specific overlaps and gives exemptions precedence', () => {
    const value = base();
    budgets(value).push(
      {
        surface: 'markdown-a',
        match: '**/*.md',
        target: {max_lines: 50},
        hard: {max_lines: 80},
        rationale: 'First specific rule.',
      },
      {
        surface: 'markdown-b',
        match: 'docs/**',
        target: {max_lines: 60},
        hard: {max_lines: 90},
        rationale: 'Second specific rule.',
      },
      {
        surface: 'vendor',
        kind: 'exempt',
        match: 'docs/vendor/**',
        target: {},
        hard: {},
        rationale: 'Immutable vendored files.',
      },
    );
    const rules = read(value).budgets;
    expect(effectiveRules(rules, 'docs/a.md', false)).toHaveLength(2);
    expect(effectiveRules(rules, 'docs/vendor/a.md', false).map(({surface}) => surface)).toEqual([
      'vendor',
    ]);
  });
});

describe('globToRe', () => {
  it('distinguishes a single path segment from recursive globstars', () => {
    expect(globToRe('docs/*.md').test('docs/a.md')).toBe(true);
    expect(globToRe('docs/*.md').test('docs/nested/a.md')).toBe(false);
    expect(globToRe('**/*.md').test('README.md')).toBe(true);
    expect(globToRe('docs/**/*.md').test('docs/nested/a.md')).toBe(true);
  });
});
