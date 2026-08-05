import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {validateDocs} from '../../scripts/check-docs.ts';
import {
  BASELINE_FILE_COUNT,
  validateDispositionLedger,
  V2_CLOSURE_COMMIT,
} from '../../scripts/generate-file-disposition-ledger.ts';

const root = process.cwd();
const baselineTextLines = 40_566;
const v2ClosurePaths = new Set(
  execFileSync('git', ['ls-tree', '-r', '--name-only', V2_CLOSURE_COMMIT], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean),
);

interface LedgerBudgetProjection {
  allowed_dispositions: string[];
  summary: {
    dispositions: Record<string, number>;
  };
  budgets: {
    editable_markdown_per_file: {
      baseline_files: number;
      violations: string[];
    };
    authored_eligible_corpus: {
      baseline_words: number;
      final_words: number;
      maximum_words: number;
      status: string;
    };
    total_authored_hard_cap: {
      baseline_words: number;
      final_words: number;
      maximum_words: number;
      baseline_loc: number;
      final_loc: number;
      maximum_loc: number;
      status: string;
    };
    generated_template_budget: {
      inventory_count: number;
      applicable_bindings: number;
      not_applicable_count: number;
      coverage_gaps: string[];
      status: string;
    };
    immutable_history: {
      baseline_files: number;
      byte_identical_files: number;
      status: string;
    };
  };
  entries: Array<{
    path: string;
    initial_sha256: string;
    initial_words: number;
    initial_loc: number;
    resolved_owner: string;
    decision: string;
    justification: string;
    evidence: {
      byte_identical: boolean;
      generator_ref: string | null;
      owner_resolution: string;
      successor_path: string | null;
    };
  }>;
}

const versionablePaths = (): string[] =>
  execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(
      (path) => path.length > 0 && path !== 'node_modules' && !path.startsWith('node_modules/'),
    );

const textLineCount = (paths: string[]): number =>
  paths.reduce((total, relativePath) => {
    const absolutePath = resolve(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (!stat.isFile()) return total;
    const bytes = readFileSync(absolutePath);
    if (bytes.includes(0)) return total;
    return total + bytes.toString('utf8').split('\n').length - 1;
  }, 0);

describe('V2 documentation and extension budgets', () => {
  it('keeps the central network document complete and under 300 lines', () => {
    expect(validateDocs(root)).toStrictEqual([]);
    const document = readFileSync(
      resolve(root, 'docs/program/instagram-content-network-v2.md'),
      'utf8',
    );
    expect(document.split('\n').length).toBeLessThanOrEqual(300);
  });

  it('covers all 377 baseline files and protects historical bytes', () => {
    expect(validateDispositionLedger(root)).toStrictEqual([]);
    const source = readFileSync(resolve(root, 'docs/program/file-disposition-ledger.yml'), 'utf8');
    const ledger = parse(source) as LedgerBudgetProjection;
    expect(source).toContain('coverage: 387/387');
    expect(ledger.allowed_dispositions).toStrictEqual([
      'refactored',
      'generator_fixed',
      'superseded',
      'verified_no_change',
      'quarantined',
      'immutable_history',
    ]);
    expect(ledger.summary.dispositions.immutable_history).toBe(95);
    expect(ledger.summary.dispositions.quarantined).toBe(4);
    expect(ledger.summary.dispositions.superseded).toBe(0);
    expect(ledger.entries).toHaveLength(387);
    for (const entry of ledger.entries) {
      expect(entry.initial_sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(Number.isInteger(entry.initial_words)).toBe(true);
      expect(Number.isInteger(entry.initial_loc)).toBe(true);
      expect(entry.resolved_owner.length).toBeGreaterThan(0);
      expect(entry.decision.length).toBeGreaterThan(0);
      expect(entry.justification.length).toBeGreaterThan(0);
      expect(Object.keys(entry.evidence).length).toBeGreaterThan(0);
      expect(entry.evidence.owner_resolution.length).toBeGreaterThan(0);
      if (entry.decision === 'verified_no_change' || entry.decision === 'immutable_history') {
        expect(entry.evidence.byte_identical).toBe(true);
      }
      if (entry.decision === 'generator_fixed') {
        expect(entry.evidence.generator_ref).not.toBeNull();
      }
      if (entry.decision === 'quarantined') {
        expect(entry.path.startsWith('skills/stitch-remotion-walkthrough/')).toBe(true);
      }
      if (entry.decision === 'superseded') {
        expect(entry.evidence.successor_path).not.toBeNull();
      }
    }
  });

  it('enforces per-file, corpus, generated-template and immutable-history budgets', () => {
    const ledger = parse(
      readFileSync(resolve(root, 'docs/program/file-disposition-ledger.yml'), 'utf8'),
    ) as LedgerBudgetProjection;
    expect(ledger.budgets.editable_markdown_per_file).toMatchObject({
      baseline_files: 58,
      violations: [],
    });
    expect(ledger.budgets.authored_eligible_corpus).toMatchObject({
      baseline_words: 92_003,
      status: 'pass',
    });
    expect(ledger.budgets.authored_eligible_corpus.final_words).toBeLessThanOrEqual(
      ledger.budgets.authored_eligible_corpus.maximum_words,
    );
    expect(ledger.budgets.total_authored_hard_cap).toMatchObject({
      baseline_words: 92_003,
      baseline_loc: 34_756,
      status: 'pass',
    });
    expect(ledger.budgets.total_authored_hard_cap.final_words).toBeLessThanOrEqual(
      ledger.budgets.total_authored_hard_cap.maximum_words,
    );
    expect(ledger.budgets.total_authored_hard_cap.final_loc).toBeLessThanOrEqual(
      ledger.budgets.total_authored_hard_cap.maximum_loc,
    );
    expect(ledger.budgets.generated_template_budget).toMatchObject({
      applicable_bindings: 3,
      coverage_gaps: [],
      status: 'pass',
    });
    expect(
      ledger.budgets.generated_template_budget.applicable_bindings +
        ledger.budgets.generated_template_budget.not_applicable_count,
    ).toBe(ledger.budgets.generated_template_budget.inventory_count);
    expect(ledger.budgets.immutable_history).toMatchObject({
      baseline_files: 95,
      byte_identical_files: 95,
      status: 'pass',
    });
  });

  it('keeps the repository below the approved 2x file and text-line ceilings', () => {
    const paths = versionablePaths().filter((path) => v2ClosurePaths.has(path));
    expect(paths.length).toBeLessThanOrEqual(BASELINE_FILE_COUNT * 2);
    expect(textLineCount(paths)).toBeLessThanOrEqual(baselineTextLines * 2);
  });
});
