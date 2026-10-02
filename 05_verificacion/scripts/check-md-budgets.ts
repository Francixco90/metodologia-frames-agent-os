import {readFileSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

import {
  effectiveRules,
  exceeded,
  globToRe,
  loadPolicy,
  type BudgetRule,
} from './lib/file-budget-policy.ts';
import {
  collectBudgetGitState,
  lfsManagedPaths,
  readBudgetFile,
  versionableBudgetPaths,
} from './lib/file-budget-git.ts';
import {assessProgramLineCap, limitsFor, referenceFor} from './lib/file-budget-evaluation.ts';
import {
  evaluateConfiguredChangeProgramBudget,
  type ChangeProgramFileLineCapV1,
} from './lib/change-program-budget.ts';
import {isBudgetGeneratedPath} from './lib/budget-generated-path.ts';
import {metricsFor, sha256} from './ledger/git-walker.ts';
import {legacyPathInversions, normalizeToLegacyPath} from './ledger/path-utils.ts';

const ROOT = process.cwd();

export const wordCount = (text: string): number => metricsFor(Buffer.from(text)).words;
export const lineCount = (text: string): number => metricsFor(Buffer.from(text)).loc;

export const isVerifiedAulaFont = (root: string, path: string, bytes: Buffer): boolean => {
  const fonts: Record<string, string> = {
    'Poppins-Bold.ttf': '983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c',
    'Montserrat-VariableFont_wght.ttf':
      '0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7',
  };
  const name = path.split('/').at(-1)!;
  if (!fonts[name] || sha256(bytes) !== fonts[name]) return false;
  const result = z
    .object({
      skills: z.array(z.object({name: z.string().regex(/^[a-z][a-z0-9-]*$/)})).length(18),
    })
    .safeParse(
      JSON.parse(
        readFileSync(resolve(root, '04_estado/registries/skills/aula-decks-package.json'), 'utf8'),
      ) as unknown,
    );
  if (!result.success || new Set(result.data.skills.map((skill) => skill.name)).size !== 18)
    return false;
  const manifest = result.data;
  const scopes = [
    '03_artefactos/renderers/frames-aula/assets/core/fonts/',
    ...manifest.skills.map(
      (skill: {name: string}) => `03_artefactos/skills/${skill.name}/engine/assets/core/fonts/`,
    ),
  ];
  return scopes.some((scope) => path === scope + name);
};

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
    const exceedsPrHard =
      authoredDelta.length > policy.pr_budget.hard_files || authoredLoc > policy.pr_budget.hard_loc;
    let programActive = false;
    const programLineCaps = new Map<string, ChangeProgramFileLineCapV1>();
    if (policy.change_program_manifest) {
      const program = evaluateConfiguredChangeProgramBudget({
        root,
        manifestPath: policy.change_program_manifest,
        baseCommit: delta.base.commit,
        authoredPaths: authoredDelta,
        locByPath: delta.locByPath,
      });
      programActive = program.active;
      program.perFileLineCaps.forEach((cap) => programLineCaps.set(cap.path, cap));
      warnings.push(...program.warnings);
      errors.push(...program.errors);
    }
    if (exceedsPrHard && !programActive) {
      errors.push(`BUDGET-PR-HARD files=${authoredDelta.length} loc=${authoredLoc}`);
    }

    const versionable = versionableBudgetPaths(root);
    const present = new Set(versionable);
    const lfsManaged = lfsManagedPaths(root, [...delta.paths]);
    for (const path of delta.paths) {
      if (present.has(path)) continue;
      const logicalPath = normalizeToLegacyPath(path, inversions);
      const rules = effectiveRules(policy.budgets, path, isBudgetGeneratedPath(path, logicalPath));
      if (rules.length !== 1) {
        errors.push(`${rules.length === 0 ? 'BUDGET-COVERAGE001' : 'BUDGET-COVERAGE002'} ${path}`);
      }
    }

    let measured = 0;
    const assessedProgramLineCaps = new Set<string>();
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
        const bytes = readBudgetFile(root, path);
        const metrics = metricsFor(bytes);
        if (metrics.format === 'binary') {
          if (changed && !lfsManaged.has(path) && !isVerifiedAulaFont(root, path, bytes))
            errors.push(`BUDGET-BINARY001 ${path}`);
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
        const programLineCap = programLineCaps.get(path);
        const programLineCapStatus = programLineCap
          ? assessProgramLineCap({
              cap: programLineCap,
              path,
              surface: rule.surface,
              changed,
              hardWords: hard.words,
              hardLines: hard.lines,
              actualWords: metrics.words,
              actualLines: metrics.loc,
            })
          : undefined;
        if (programLineCap) {
          assessedProgramLineCaps.add(path);
          if (
            programLineCapStatus === 'INVALID_BINDING' ||
            programLineCapStatus === 'DENIED_UNCHANGED'
          )
            errors.push(`BUDGET-PROGRAM010 stale per-file line cap binding: ${path}`);
        }
        if (
          changed &&
          (exceeded(metrics.words, target.words) || exceeded(metrics.loc, target.lines))
        ) {
          warnings.push(`BUDGET-TARGET ${rule.surface}: ${path}`);
        }
        if (exceeded(metrics.words, hard.words) || exceeded(metrics.loc, hard.lines)) {
          const message = `BUDGET-HARD ${rule.surface}: ${path}`;
          if (programLineCapStatus === 'APPLIED') {
            warnings.push(
              `BUDGET-PROGRAM-LINE-CAP ${rule.surface}: ${path}` +
                ` baseline=${programLineCap?.baselineHardLines}` +
                ` scoped=${programLineCap?.programHardLines}`,
            );
          } else if ((changed ? rule.changed_mode : rule.mode) === 'enforce') errors.push(message);
          else warnings.push(`coverage_gap ${message}`);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    for (const path of programLineCaps.keys()) {
      if (!assessedProgramLineCaps.has(path))
        errors.push(`BUDGET-PROGRAM010 unmeasured per-file line cap binding: ${path}`);
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

export {globToRe, isBudgetGeneratedPath};
