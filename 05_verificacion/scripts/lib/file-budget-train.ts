import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {effectiveRules, type Policy} from './file-budget-policy.ts';
import {legacyPathInversions, normalizeToLegacyPath} from '../ledger/path-utils.ts';

const MANIFEST_REF = '02_proceso/governance/budget-train.yml';
const SegmentSchema = z
  .object({id: z.string().min(1), base_ref: z.string().min(1), head_ref: z.string().min(1)})
  .strict();
const ManifestSchema = z
  .object({
    schema_version: z.literal('file-budget-train-v1'),
    base_commit: z.string().regex(/^[0-9a-f]{40}$/u),
    segments: z.array(SegmentSchema).min(1),
  })
  .strict();

type GeneratedClassifier = (path: string, logicalPath: string) => boolean;
export interface BudgetTrainResult {
  active: boolean;
  errors: string[];
  warnings: string[];
  summary: string | null;
}

const git = (root: string, args: string[]): Buffer =>
  execFileSync('git', args, {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
const text = (root: string, args: string[]): string => git(root, args).toString('utf8').trim();
const commit = (root: string, ref: string): string =>
  text(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]);
const pathsBetween = (root: string, base: string, head: string): string[] =>
  git(root, ['diff', '--name-only', '-z', '--no-renames', base, head, '--'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
const locBetween = (root: string, base: string, head: string): Map<string, number> => {
  const result = new Map<string, number>();
  for (const row of text(root, ['diff', '--numstat', '--no-renames', base, head, '--'])
    .split('\n')
    .filter(Boolean)) {
    const [added, deleted, ...parts] = row.split('\t');
    const path = parts.join('\t');
    result.set(path, added === '-' || deleted === '-' ? 0 : Number(added) + Number(deleted));
  }
  return result;
};

export const validateBudgetTrain = (
  root: string,
  policy: Policy,
  generated: GeneratedClassifier,
  resolvedBase: string,
): BudgetTrainResult => {
  const empty = {active: false, errors: [], warnings: [], summary: null};
  const manifestPath = resolve(root, MANIFEST_REF);
  if (!existsSync(manifestPath)) return empty;
  const status = text(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status.length > 0) return empty;

  try {
    const manifest = ManifestSchema.parse(parse(readFileSync(manifestPath, 'utf8')));
    const currentHead = commit(root, 'HEAD');
    const lastHead = commit(root, manifest.segments.at(-1)!.head_ref);
    if (lastHead !== currentHead) return empty;

    const errors: string[] = [];
    const warnings: string[] = [];
    if (manifest.base_commit !== resolvedBase)
      errors.push(`BUDGET-TRAIN-BASE expected=${manifest.base_commit} actual=${resolvedBase}`);
    const inversions = legacyPathInversions(root);
    let expectedBase = manifest.base_commit;
    let authoredFiles = 0;
    let authoredLoc = 0;

    for (const segment of manifest.segments) {
      const base = commit(root, segment.base_ref);
      const head = commit(root, segment.head_ref);
      if (base !== expectedBase)
        errors.push(`BUDGET-TRAIN-CHAIN ${segment.id} expected=${expectedBase} actual=${base}`);
      const loc = locBetween(root, base, head);
      const authored = pathsBetween(root, base, head).filter((path) => {
        const logical = normalizeToLegacyPath(path, inversions);
        const rules = effectiveRules(policy.budgets, path, generated(path, logical));
        return rules.length !== 1 || rules[0]?.kind === 'authored';
      });
      const segmentLoc = authored.reduce((sum, path) => sum + (loc.get(path) ?? 0), 0);
      authoredFiles += authored.length;
      authoredLoc += segmentLoc;
      if (authored.length > policy.pr_budget.hard_files || segmentLoc > policy.pr_budget.hard_loc)
        errors.push(`BUDGET-TRAIN-HARD ${segment.id} files=${authored.length} loc=${segmentLoc}`);
      else if (
        authored.length > policy.pr_budget.target_files ||
        segmentLoc > policy.pr_budget.target_loc
      )
        warnings.push(
          `BUDGET-TRAIN-TARGET ${segment.id} files=${authored.length} loc=${segmentLoc}`,
        );
      expectedBase = head;
    }
    if (expectedBase !== currentHead)
      errors.push(`BUDGET-TRAIN-HEAD expected=${currentHead} actual=${expectedBase}`);
    return {
      active: true,
      errors,
      warnings,
      summary: `segments=${manifest.segments.length} authored=${authoredFiles}/${authoredLoc}`,
    };
  } catch (error) {
    return {
      active: true,
      errors: [error instanceof Error ? `BUDGET-TRAIN-INVALID ${error.message}` : String(error)],
      warnings: [],
      summary: null,
    };
  }
};
