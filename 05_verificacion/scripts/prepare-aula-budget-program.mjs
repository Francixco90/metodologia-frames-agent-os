#!/usr/bin/env node
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {collectBudgetGitState, readBudgetFile} from './lib/file-budget-git.ts';
import {loadPolicy, effectiveRules} from './lib/file-budget-policy.ts';
import {isBudgetGeneratedPath} from './lib/budget-generated-path.ts';
import {legacyPathInversions, normalizeToLegacyPath} from './ledger/path-utils.ts';
import {metricsFor} from './ledger/git-walker.ts';
import {computeChangeProgramSha256} from './lib/change-program-budget.ts';
const root = process.cwd(),
  delta = collectBudgetGitState(root),
  policy = loadPolicy(root);
const inversions = legacyPathInversions(root);
const authored = [...delta.paths].sort().filter((path) => {
  const logical = normalizeToLegacyPath(path, inversions);
  const rules = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logical));
  return rules.length !== 1 || rules[0].kind === 'authored';
});
const partitions = [],
  perFileLineCaps = [];
let paths = [],
  loc = 0;
const close = () => {
  if (!paths.length) return;
  partitions.push({
    id: `aula-lot-${partitions.length + 1}`,
    paths,
    limits: {targetFiles: paths.length, targetLoc: Math.max(1, loc), hardFiles: 12, hardLoc: 1200},
  });
  paths = [];
  loc = 0;
};
for (const path of authored) {
  const added = delta.locByPath.get(path) || 0;
  if (added > 1200) throw new Error(`Single-file lot exceeds approved limit: ${path}`);
  if (paths.length === 12 || loc + added > 1200) close();
  paths.push(path);
  loc += added;
  const logical = normalizeToLegacyPath(path, inversions);
  const [rule] = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logical));
  const metrics = metricsFor(readBudgetFile(root, path));
  if (rule?.hard.max_lines && metrics.loc > rule.hard.max_lines) {
    const baseline = rule.hard.max_lines;
    const cap = Math.ceil(metrics.loc / 25) * 25;
    if (cap > baseline * 2 || cap > 1000) throw new Error(`Per-file 2x cap: ${path}`);
    perFileLineCaps.push({
      path,
      surface: rule.surface,
      baselineHardLines: baseline,
      programHardLines: cap,
      rationale:
        'Reviewed Aula integration and explicit generated-package policy; word limits unchanged, path-specific successor below twice baseline.',
    });
  }
}
close();
if (partitions.length > 12 || perFileLineCaps.length > 8 || authored.length > 200)
  throw new Error('Approved change-program bound exceeded');
const planRef = '03_artefactos/projects/aula-decks-publication-20261001/budget-plan.md';
const totalLoc = authored.reduce((n, p) => n + (delta.locByPath.get(p) || 0), 0);
const program = {
  schemaVersion: 'change-budget-program-v1',
  programId: 'aula-decks-publication-20261001',
  branch: execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim(),
  baseCommit: delta.base.commit,
  authority: {
    mode: 'LOCAL_SIMULATION',
    planRef,
    planSha256: createHash('sha256').update(readFileSync(planRef)).digest('hex'),
  },
  limits: {
    targetFiles: authored.length,
    targetLoc: Math.max(1, totalLoc),
    hardFiles: Math.min(200, authored.length + 12),
    hardLoc: Math.min(20000, totalLoc + 1200),
  },
  partitions,
  perFileLineCaps,
};
program.canonicalSha256 = computeChangeProgramSha256(program);
writeFileSync(policy.change_program_manifest, JSON.stringify(program, null, 2) + '\n');
console.log(
  `Bound ${authored.length} authored files, ${totalLoc} changed lines, ${partitions.length} lots and ${perFileLineCaps.length} bounded line caps.`,
);
