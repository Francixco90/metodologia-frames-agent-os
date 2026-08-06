// doctor/checks-continuity.ts — receipts families + per-task continuity files.
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {record, ROOT} from '../doctor/types.ts';

const RECEIPTS_FAMILIES = [
  'imports',
  'renders',
  'dependency-audits',
  'migrations',
  'check-runs',
  'workflows',
] as const;

// Check: receipts — 6 family dirs exist under 04_estado/receipts/.
export const checkReceipts = (): void => {
  const receiptsDir = resolve(ROOT, '04_estado/receipts');
  const missing: string[] = [];
  for (const family of RECEIPTS_FAMILIES) {
    if (!existsSync(resolve(receiptsDir, family))) missing.push(family);
  }
  if (missing.length > 0) {
    record('receipts', 'fail', `family dirs ausentes: ${missing.join(', ')}`);
  } else {
    record(
      'receipts',
      'pass',
      `${RECEIPTS_FAMILIES.length} family dirs presentes: ${RECEIPTS_FAMILIES.join(', ')}`,
    );
  }
};

// Check: continuity — PROGRESS.md + continuity/{state.yaml,resume.md} per task.
// Fail if a task in COMPILADO/EVALUADO lacks PROGRESS.md (resumption risk).
export const checkContinuity = (): void => {
  const tasksDir = resolve(ROOT, '04_estado/tasks');
  if (!existsSync(tasksDir)) {
    record('continuity', 'warn', '04_estado/tasks ausente');
    return;
  }
  const dirs = readdirSync(tasksDir, {withFileTypes: true})
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .filter((e) => existsSync(resolve(tasksDir, e.name, 'task.yaml')));
  let missingProgress = 0;
  let missingState = 0;
  let missingResume = 0;
  let failMissingProgress = 0;
  for (const entry of dirs) {
    const dir = resolve(tasksDir, entry.name);
    const hasProgress = existsSync(resolve(dir, 'PROGRESS.md'));
    const hasState = existsSync(resolve(dir, 'continuity/state.yaml'));
    const hasResume = existsSync(resolve(dir, 'continuity/resume.md'));
    if (!hasProgress) missingProgress++;
    if (!hasState) missingState++;
    if (!hasResume) missingResume++;
    if (!hasProgress) {
      let state: string | undefined;
      try {
        const parsed: unknown = parse(readFileSync(resolve(dir, 'task.yaml'), 'utf8'));
        if (parsed !== null && typeof parsed === 'object') {
          state = (parsed as Record<string, unknown>).state as string | undefined;
        }
      } catch {
        state = undefined;
      }
      if (state === 'COMPILADO' || state === 'EVALUADO') failMissingProgress++;
    }
  }
  const total = dirs.length;
  if (failMissingProgress > 0) {
    record(
      'continuity',
      'fail',
      `${failMissingProgress} task(s) in COMPILADO/EVALUADO lack PROGRESS.md (resumption risk)`,
    );
    return;
  }
  const missing = missingProgress + missingState + missingResume;
  if (missing > 0) {
    record(
      'continuity',
      'warn',
      `${total} tasks: missing PROGRESS.md=${missingProgress}, continuity/state.yaml=${missingState}, continuity/resume.md=${missingResume} (run: pnpm task:scaffold-continuity)`,
    );
  } else {
    record(
      'continuity',
      'pass',
      `${total} tasks have PROGRESS.md + continuity/{state.yaml,resume.md}`,
    );
  }
};
