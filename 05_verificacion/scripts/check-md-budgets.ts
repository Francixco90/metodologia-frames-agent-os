import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  BASELINE_COMMIT,
  BASELINE_OVERRIDES,
  generatedTemplateBindings,
  ledgerProjectionPaths,
} from './lib/file-disposition-policy-v3.ts';
import {
  effectiveRules,
  exceeded,
  globToRe,
  loadPolicy,
  type BudgetRule,
  type Limits,
} from './lib/file-budget-policy.ts';
import {
  collectBudgetGitState,
  readBudgetFile,
  versionableBudgetPaths,
} from './lib/file-budget-git.ts';
import {isGeneratedProjection} from './ledger/decision.ts';
import {metricsFor} from './ledger/git-walker.ts';
import {legacyPathInversions, normalizeToLegacyPath} from './ledger/path-utils.ts';

const ROOT = process.cwd();
const physicalLedgerProjections = new Set([
  '01_intencion/program/file-disposition-ledger.yml',
  '01_intencion/program/file-disposition-ledger.md',
]);

export const wordCount = (text: string): number => metricsFor(Buffer.from(text)).words;
export const lineCount = (text: string): number => metricsFor(Buffer.from(text)).loc;

const limitsFor = (
  limits: Limits,
  reference: ReturnType<typeof metricsFor> | null,
): {words: number | undefined; lines: number | undefined} => ({
  words:
    limits.max_words ??
    (reference && limits.multiplier !== undefined
      ? Math.floor(reference.words * limits.multiplier)
      : undefined),
  lines:
    limits.max_lines ??
    (reference && limits.multiplier !== undefined
      ? Math.floor(reference.loc * limits.multiplier)
      : undefined),
});

const referenceFor = (
  root: string,
  rule: BudgetRule,
  path: string,
  logicalPath: string,
): ReturnType<typeof metricsFor> | null => {
  if (rule.baseline === 'file-disposition') {
    const ref = BASELINE_OVERRIDES[path] ?? BASELINE_COMMIT;
    return metricsFor(
      execFileSync('git', ['show', `${ref}:${path}`], {
        cwd: root,
        maxBuffer: 256 * 1024 * 1024,
      }),
    );
  }
  if (rule.baseline === 'template') {
    const binding = generatedTemplateBindings.find(({output_path}) => output_path === logicalPath);
    return binding ? metricsFor(readBudgetFile(root, binding.template_path)) : null;
  }
  return null;
};

export const isBudgetGeneratedPath = (path: string, logicalPath: string): boolean =>
  physicalLedgerProjections.has(path) ||
  ledgerProjectionPaths.has(logicalPath) ||
  /^02_proceso\/workflows\/multimedia\/p\d{2}-[^/]+\/schematic\.html$/u.test(path) ||
  /^02_proceso\/workflows\/multimedia\/_assets\/multimedia-library\.(?:md|html)$/u.test(path) ||
  /^02_proceso\/workflows\/multimedia\/p\d{2}-[^/]+\/templates\/[^/]+\.template\.(?:md|html)$/u.test(
    path,
  ) ||
  /^03_artefactos\/content\/experience\/(?:frames-experience-blueprint\.html|projection-manifest\.json)$/u.test(
    path,
  ) ||
  /^(?:\.agents\/plugins\/marketplace\.json|\.agents\/skills\/frames-assist\/SKILL\.md|\.claude\/(?:commands\/frames\/assist\.md|skills\/frames-assist\/SKILL\.md)|\.gemini\/commands\/frames\/assist\.toml)$/u.test(
    path,
  ) ||
  /^02_proceso\/workflows\/multimedia\/(?:_schema\/artifacts\/|_assets\/artifact-registry\.md$)/u.test(
    path,
  ) ||
  isGeneratedProjection(logicalPath);

export const main = (root = ROOT): void => {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const policy = loadPolicy(root);
    const delta = collectBudgetGitState(root);
    const inversions = legacyPathInversions(root);
    const authoredDelta = [...delta.paths].filter((path) => {
      const logicalPath = normalizeToLegacyPath(path, inversions);
      const rules = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logicalPath));
      return rules.length !== 1 || rules[0]?.kind === 'authored';
    });
    const authoredLoc = authoredDelta.reduce(
      (total, path) => total + (delta.locByPath.get(path) ?? 0),
      0,
    );
    if (
      authoredDelta.length > policy.pr_budget.target_files ||
      authoredLoc > policy.pr_budget.target_loc
    ) {
      warnings.push(`BUDGET-PR-TARGET files=${authoredDelta.length} loc=${authoredLoc}`);
    }
    if (
      authoredDelta.length > policy.pr_budget.hard_files ||
      authoredLoc > policy.pr_budget.hard_loc
    ) {
      errors.push(`BUDGET-PR-HARD files=${authoredDelta.length} loc=${authoredLoc}`);
    }

    const versionable = versionableBudgetPaths(root);
    const present = new Set(versionable);
    for (const path of delta.paths) {
      if (present.has(path)) continue;
      const logicalPath = normalizeToLegacyPath(path, inversions);
      const rules = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logicalPath));
      if (rules.length !== 1) {
        errors.push(`${rules.length === 0 ? 'BUDGET-COVERAGE001' : 'BUDGET-COVERAGE002'} ${path}`);
      }
    }

    let measured = 0;
    for (const path of versionable) {
      const changed = delta.paths.has(path);
      const logicalPath = normalizeToLegacyPath(path, inversions);
      const rules = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logicalPath));
      if (changed && rules.length !== 1) {
        errors.push(`${rules.length === 0 ? 'BUDGET-COVERAGE001' : 'BUDGET-COVERAGE002'} ${path}`);
        continue;
      }
      if (rules.length !== 1) continue;
      const rule = rules[0] as BudgetRule;
      if (!changed && (rule.kind === 'exempt' || rule.scope === 'changed')) continue;

      try {
        const metrics = metricsFor(readBudgetFile(root, path));
        if (metrics.format === 'binary') {
          if (changed) errors.push(`BUDGET-BINARY001 ${path}`);
          continue;
        }
        if (rule.kind === 'exempt') continue;
        const reference = referenceFor(root, rule, path, logicalPath);
        if (rule.baseline && !reference) {
          errors.push(`BUDGET-BINDING001 ${path}`);
          continue;
        }
        measured += 1;
        const target = limitsFor(rule.target, reference);
        const hard = limitsFor(rule.hard, reference);
        if (
          changed &&
          (exceeded(metrics.words, target.words) || exceeded(metrics.loc, target.lines))
        ) {
          warnings.push(`BUDGET-TARGET ${rule.surface}: ${path}`);
        }
        if (exceeded(metrics.words, hard.words) || exceeded(metrics.loc, hard.lines)) {
          const message = `BUDGET-HARD ${rule.surface}: ${path}`;
          if ((changed ? rule.changed_mode : rule.mode) === 'enforce') errors.push(message);
          else warnings.push(`coverage_gap ${message}`);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    console.info(
      `file-budgets: base=${delta.base.commit.slice(0, 12)} source=${delta.base.source}` +
        ` authored=${authoredDelta.length}/${authoredLoc} total=${delta.paths.size}/${delta.loc}` +
        ` measured=${measured}`,
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  warnings.forEach((message) => console.warn(`[WARN] ${message}`));
  errors.forEach((message) => console.error(`[FAIL] ${message}`));
  if (errors.length > 0) process.exitCode = 1;
};

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) main();

export {globToRe};
