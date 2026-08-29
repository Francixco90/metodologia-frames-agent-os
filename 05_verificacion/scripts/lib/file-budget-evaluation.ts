// Pure metric, baseline and branch-local line-cap evaluation. [CÓDIGO]
import {execFileSync} from 'node:child_process';

import {
  BASELINE_COMMIT,
  BASELINE_OVERRIDES,
  generatedTemplateBindings,
} from './file-disposition-policy-v3.ts';
import {exceeded, type BudgetRule, type Limits} from './file-budget-policy.ts';
import {readBudgetFile} from './file-budget-git.ts';
import type {ChangeProgramFileLineCapV1} from './change-program-budget.ts';
import {metricsFor} from '../ledger/git-walker.ts';

export const limitsFor = (
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

export const referenceFor = (
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

export type ProgramLineCapStatus =
  | 'APPLIED'
  | 'WITHIN_BASELINE'
  | 'INVALID_BINDING'
  | 'DENIED_UNCHANGED'
  | 'DENIED_WORDS'
  | 'DENIED_PROGRAM_LINES';

export const assessProgramLineCap = (input: {
  cap: ChangeProgramFileLineCapV1;
  path: string;
  surface: string;
  changed: boolean;
  hardWords: number | undefined;
  hardLines: number | undefined;
  actualWords: number;
  actualLines: number;
}): ProgramLineCapStatus => {
  if (
    input.cap.path !== input.path ||
    input.cap.surface !== input.surface ||
    input.cap.baselineHardLines !== input.hardLines
  )
    return 'INVALID_BINDING';
  if (!input.changed) return 'DENIED_UNCHANGED';
  if (exceeded(input.actualWords, input.hardWords)) return 'DENIED_WORDS';
  if (input.actualLines > input.cap.programHardLines) return 'DENIED_PROGRAM_LINES';
  if (input.actualLines <= input.cap.baselineHardLines) return 'WITHIN_BASELINE';
  return 'APPLIED';
};
