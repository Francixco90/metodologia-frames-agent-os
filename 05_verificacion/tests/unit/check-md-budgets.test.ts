import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {describe, expect, it, vi} from 'vitest';

import {
  globToRe,
  isBudgetGeneratedPath,
  lineCount,
  main,
  wordCount,
} from '../../scripts/check-md-budgets.ts';

const git = (root: string, args: string[]): string =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();

const policy = (extraRules: string): string => `schema_version: file-budget-policy-v2
defaults:
  target: {max_words: 1000, max_lines: 1000}
  hard: {max_words: 2000, max_lines: 2000}
  scope: all
  mode: enforce
  changed_mode: enforce
  rationale: test fixture
budgets:
  - {surface: authored-fallback, kind: authored, match: '**', fallback: true}
  - {surface: generated-fallback, kind: generated, match: '**', fallback: true}
${extraRules}
pr_budget: {target_files: 50, target_loc: 5000, hard_files: 100, hard_loc: 10000}
`;

const createRepo = (extraRules: string, files: Record<string, string | Buffer>) => {
  const root = mkdtempSync(join(tmpdir(), 'frames-md-budget-'));
  mkdirSync(resolve(root, '02_proceso/governance'), {recursive: true});
  writeFileSync(resolve(root, '02_proceso/governance/docs-budget-policy.yml'), policy(extraRules));
  for (const [path, contents] of Object.entries(files))
    writeFileSync(resolve(root, path), contents);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Frames Test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'baseline']);
  return {root, base: git(root, ['rev-parse', 'HEAD'])};
};

const runMain = (root: string, base: string): string[] => {
  const previousBase = process.env.BUDGET_BASE_REF;
  const previousExitCode = process.exitCode;
  const errors: string[] = [];
  const spies = [
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' '))),
    vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    vi.spyOn(console, 'info').mockImplementation(() => undefined),
  ];
  try {
    process.env.BUDGET_BASE_REF = base;
    process.exitCode = undefined;
    main(root);
    expect(process.exitCode).toBe(1);
    return errors;
  } finally {
    if (previousBase === undefined) delete process.env.BUDGET_BASE_REF;
    else process.env.BUDGET_BASE_REF = previousBase;
    process.exitCode = previousExitCode;
    spies.forEach((spy) => spy.mockRestore());
  }
};

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
    expect(lineCount('')).toBe(0);
    expect(lineCount('a\nb\n')).toBe(lineCount('a\nb'));
  });

  it('classifies ledger projections under physical and legacy paths', () => {
    expect(
      isBudgetGeneratedPath(
        '01_intencion/program/file-disposition-ledger.yml',
        '01_intencion/program/file-disposition-ledger.yml',
      ),
    ).toBe(true);
    expect(
      isBudgetGeneratedPath(
        'docs/program/file-disposition-ledger.yml',
        'docs/program/file-disposition-ledger.yml',
      ),
    ).toBe(true);
    expect(isBudgetGeneratedPath('README.md', 'README.md')).toBe(false);
  });

  it('docs-budget-policy.yml exists and parses with required surfaces', async () => {
    const {readFileSync} = await import('node:fs');
    const {resolve} = await import('node:path');
    const {parse} = await import('yaml');
    const policy = parse(
      readFileSync(resolve(process.cwd(), '02_proceso/governance/docs-budget-policy.yml'), 'utf8'),
    ) as {budgets: Array<{surface: string; mode: string; fallback?: boolean}>};
    const surfaces = policy.budgets.map((b) => b.surface);
    expect(surfaces).toContain('SKILL.md');
    expect(surfaces).toContain('prompt-spec.md');
    expect(surfaces).toContain('authored-governance-md');
    expect(surfaces).toContain('authored-decisions-md');
    expect(surfaces).toContain('harness-creator-references');
    expect(policy.budgets.filter((b) => b.fallback)).toHaveLength(2);
    const skill = policy.budgets.find((b) => b.surface === 'SKILL.md');
    expect(skill?.mode).toBe('report'); // phased remediation, not fail-strict
  });

  it('applies exactly-one coverage to a deleted changed path', () => {
    const rules = `  - {surface: deleted-a, kind: authored, match: deleted.md}\n  - {surface: deleted-b, kind: authored, match: deleted.md}`;
    const {root, base} = createRepo(rules, {'deleted.md': 'baseline\n'});
    try {
      unlinkSync(resolve(root, 'deleted.md'));
      expect(runMain(root, base)).toContain('[FAIL] BUDGET-COVERAGE002 deleted.md');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('rejects a changed symlink even when its rule is exempt', () => {
    const rules = `  - {surface: symlink-exempt, kind: exempt, match: link.md}`;
    const {root, base} = createRepo(rules, {'link.md': 'baseline\n'});
    try {
      unlinkSync(resolve(root, 'link.md'));
      symlinkSync('outside.md', resolve(root, 'link.md'));
      expect(runMain(root, base).join('\n')).toMatch(/BUDGET-PATH00[23].*link\.md/u);
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('rejects a changed binary even when its rule is exempt', () => {
    const rules = `  - {surface: binary-exempt, kind: exempt, match: asset.bin}`;
    const {root, base} = createRepo(rules, {'asset.bin': Buffer.from([0, 1, 2])});
    try {
      writeFileSync(resolve(root, 'asset.bin'), Buffer.from([0, 1, 3]));
      expect(runMain(root, base)).toContain('[FAIL] BUDGET-BINARY001 asset.bin');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });
});
