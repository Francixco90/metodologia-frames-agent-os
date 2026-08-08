import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

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

const policy = (
  extraRules: string,
  prBudget = '{target_files: 50, target_loc: 5000, hard_files: 100, hard_loc: 10000}',
): string => `schema_version: file-budget-policy-v2
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
pr_budget: ${prBudget}
`;

const createRepo = (
  extraRules: string,
  files: Record<string, string | Buffer>,
  prBudget?: string,
) => {
  const root = mkdtempSync(join(tmpdir(), 'frames-md-budget-'));
  mkdirSync(resolve(root, '02_proceso/governance'), {recursive: true});
  writeFileSync(
    resolve(root, '02_proceso/governance/docs-budget-policy.yml'),
    policy(extraRules, prBudget),
  );
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(resolve(root, path)), {recursive: true});
    writeFileSync(resolve(root, path), contents);
  }
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Frames Test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'baseline']);
  return {root, base: git(root, ['rev-parse', 'HEAD'])};
};

const runMainResult = (
  root: string,
  base: string,
): {errors: string[]; warnings: string[]; infos: string[]; exitCode: number | undefined} => {
  const previousBase = process.env.BUDGET_BASE_REF;
  const previousExitCode = process.exitCode;
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  const spies = [
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' '))),
    vi.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args.join(' '))),
    vi.spyOn(console, 'info').mockImplementation((...args) => infos.push(args.join(' '))),
  ];
  try {
    process.env.BUDGET_BASE_REF = base;
    process.exitCode = undefined;
    main(root);
    return {errors, warnings, infos, exitCode: process.exitCode};
  } finally {
    if (previousBase === undefined) delete process.env.BUDGET_BASE_REF;
    else process.env.BUDGET_BASE_REF = previousBase;
    process.exitCode = previousExitCode;
    spies.forEach((spy) => spy.mockRestore());
  }
};

const runMain = (root: string, base: string): string[] => {
  const result = runMainResult(root, base);
  expect(result.exitCode).toBe(1);
  return result.errors;
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

  it('excludes more than twelve generated outputs from the authored PR budget but enforces their file hard cap', () => {
    const generatedPaths = Object.fromEntries(
      Array.from({length: 13}, (_, index) => [
        `02_proceso/workflows/multimedia/p${String(index).padStart(2, '0')}-fixture/schematic.html`,
        'baseline\n',
      ]),
    );
    const rules = `  - surface: generated-schematic
    kind: generated
    match: '02_proceso/workflows/multimedia/*/schematic.html'
    scope: changed
    mode: enforce
    changed_mode: enforce
    target: {max_words: 20, max_lines: 2}
    hard: {max_words: 30, max_lines: 2}`;
    const prBudget = '{target_files: 10, target_loc: 100, hard_files: 12, hard_loc: 1000}';
    const {root, base} = createRepo(rules, generatedPaths, prBudget);
    try {
      for (const path of Object.keys(generatedPaths)) {
        writeFileSync(resolve(root, path), 'generated\nprojection\n');
      }

      const withinCap = runMainResult(root, base);
      expect(withinCap.exitCode).toBeUndefined();
      expect(withinCap.errors).not.toEqual(
        expect.arrayContaining([expect.stringContaining('BUDGET-PR-HARD')]),
      );
      expect(withinCap.infos.join('\n')).toContain('authored=0/0 total=13/39');

      const firstPath = Object.keys(generatedPaths)[0];
      expect(firstPath).toBeDefined();
      writeFileSync(resolve(root, firstPath!), 'generated\nprojection\nover-hard-cap\n');
      const overFileCap = runMainResult(root, base);
      expect(overFileCap.exitCode).toBe(1);
      expect(overFileCap.errors).toContain(`[FAIL] BUDGET-HARD generated-schematic: ${firstPath}`);
      expect(overFileCap.errors).not.toEqual(
        expect.arrayContaining([expect.stringContaining('BUDGET-PR-HARD')]),
      );
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('counts authored files and their per-path LOC toward BUDGET-PR-HARD', () => {
    const authoredPaths = Object.fromEntries(
      Array.from({length: 13}, (_, index) => [`authored-${index + 1}.md`, 'baseline\n']),
    );
    const prBudget = '{target_files: 10, target_loc: 100, hard_files: 12, hard_loc: 1000}';
    const {root, base} = createRepo('', authoredPaths, prBudget);
    try {
      for (const path of Object.keys(authoredPaths)) {
        writeFileSync(resolve(root, path), 'authored change\n');
      }

      const result = runMainResult(root, base);
      expect(result.exitCode).toBe(1);
      expect(result.errors).toContain('[FAIL] BUDGET-PR-HARD files=13 loc=26');
      expect(result.infos.join('\n')).toContain('authored=13/26 total=13/26');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });
});
