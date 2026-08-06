// doctor/types.ts — shared types + helpers for doctor checks (S12 harness v2).
//
// All check modules push results into the shared `checks` array via `record`.
// The orchestrator (doctor.ts) consumes the array to emit the YAML report +
// stdout summary. [CÓDIGO]
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

export const ROOT = process.cwd();

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  id: string;
  status: CheckStatus;
  detail: string;
}

export const checks: CheckResult[] = [];

export const record = (id: string, status: CheckStatus, detail: string): void => {
  checks.push({id, status, detail});
};

/** ISO 8601 with local offset (runtime report, `new Date()` ok). [CONFIG] */
export const isoWithOffset = (date: Date): string => {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  const pad = (n: number) => String(n).padStart(2, '0');
  const base =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  if (tzOffsetMin === 0) return `${base}Z`;
  return `${base}${sign}${hh}:${mm}`;
};

/** Run a pnpm script read-only; shell so `pnpm` resolves from PATH. [CÓDIGO] */
export const runPnpm = (script: string): {code: number; stdout: string; stderr: string} => {
  const result = spawnSync('pnpm', [script], {shell: true, encoding: 'utf8', cwd: ROOT});
  return {
    code: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
};

export const readPackageJson = (): {
  engines?: {node?: string; pnpm?: string};
  packageManager?: string;
} =>
  JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    engines?: {node?: string; pnpm?: string};
    packageManager?: string;
  };

/** Count task dirs with a task.yaml under 04_estado/tasks. [CÓDIGO] */
export const countTasks = (): number => {
  const tasksDir = resolve(ROOT, '04_estado/tasks');
  if (!existsSync(tasksDir)) return 0;
  return readdirSync(tasksDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .filter((entry) => existsSync(resolve(tasksDir, entry.name, 'task.yaml'))).length;
};

export const readYaml = (path: string): unknown => parse(readFileSync(path, 'utf8'));

export const pnpmVersion = (): string =>
  execFileSync('pnpm', ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  }).trim();
