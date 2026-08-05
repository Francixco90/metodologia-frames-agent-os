/**
 * doctor.ts — S12 of harness v2.
 *
 * CLI: `pnpm doctor` (alias: `pnpm report`).
 *
 * Runs a battery of read-only health checks against the repo and emits:
 *   - a YAML report at `05_verificacion/quality/reports/doctor-{ISO-date}.yml`
 *   - a stdout summary (one line per check + summary line)
 *
 * NO auto-fix. Doctor is advisory (warn) except for hard structural failures
 * (missing symlink, unparseable manifest). Exit 0 if no FAIL (warn ok); exit 1
 * if any FAIL. [CÓDIGO]
 *
 * Report shape:
 *   schema_version: 'doctor-report-v1'
 *   generated_at: <ISO 8601 with local offset>
 *   checks: [{id, status, detail}]
 *   summary: {pass, fail, warn}
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

const ROOT = process.cwd();

type CheckStatus = 'pass' | 'fail' | 'warn';

interface CheckResult {
  id: string;
  status: CheckStatus;
  detail: string;
}

const checks: CheckResult[] = [];

const record = (id: string, status: CheckStatus, detail: string): void => {
  checks.push({id, status, detail});
};

/**
 * ISO 8601 with local offset, e.g. `2026-08-05T14:30:00-05:00`.
 * Falls back to UTC `Z` when the local offset is zero. This is a runtime
 * report (not a contract), so `new Date()` is appropriate here. [CONFIG]
 */
const isoWithOffset = (date: Date): string => {
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

/** ISO date (YYYY-MM-DD) for the report filename, UTC to keep filenames stable. */
const isoDateUtc = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;

/**
 * Run a pnpm script read-only. Returns exit code + trimmed stdout/stderr.
 * Uses spawnSync with shell so `pnpm` resolves from PATH. [CÓDIGO]
 */
const runPnpm = (script: string): {code: number; stdout: string; stderr: string} => {
  const result = spawnSync('pnpm', [script], {
    shell: true,
    encoding: 'utf8',
    cwd: ROOT,
  });
  return {
    code: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
};

/** Read package.json as a typed manifest subset. */
const readPackageJson = (): {
  engines?: {node?: string; pnpm?: string};
  packageManager?: string;
} => JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  engines?: {node?: string; pnpm?: string};
  packageManager?: string;
};

// --- Check 1: toolchain — node/pnpm versions match package.json engines ---
const checkToolchain = (): void => {
  try {
    const manifest = readPackageJson();
    const expectedNode = manifest.engines?.node;
    const expectedPnpm = manifest.engines?.pnpm;
    const issues: string[] = [];
    if (expectedNode !== undefined && process.version !== `v${expectedNode}`) {
      issues.push(`node esperado v${expectedNode}, observado ${process.version}`);
    }
    if (expectedPnpm !== undefined) {
      const observedPnpm = execFileSync('pnpm', ['--version'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
      }).trim();
      if (observedPnpm !== expectedPnpm) {
        issues.push(`pnpm esperado ${expectedPnpm}, observado ${observedPnpm}`);
      }
    }
    if (issues.length > 0) {
      record('toolchain', 'fail', issues.join('; '));
    } else {
      record('toolchain', 'pass', `node ${process.version}, pnpm ${expectedPnpm ?? '?'}`);
    }
  } catch (err) {
    record('toolchain', 'fail', `no se pudo verificar: ${(err as Error).message}`);
  }
};

// --- Check 2: repo — pnpm check:repo (warn on known package.json hash-stale coverage_gap) ---
const REPO_HASH_STALE = /hash-stale|coverage_gap|package\.json.*hash/i;
const checkRepo = (): void => {
  const {code, stdout, stderr} = runPnpm('check:repo');
  if (code === 0) {
    record('repo', 'pass', 'pnpm check:repo exit 0');
    return;
  }
  const combined = `${stdout}\n${stderr}`;
  // Known coverage_gap: package.json hash-stale. Warn, do not fail doctor. [CONFIG]
  if (REPO_HASH_STALE.test(combined)) {
    record(
      'repo',
      'warn',
      `check:repo nonzero (known package.json hash-stale coverage_gap): ${combined.slice(0, 160)}`,
    );
  } else {
    record('repo', 'fail', `check:repo exit ${code}: ${combined.slice(0, 240)}`);
  }
};

// --- Check 3: ownership — pnpm check:ownership exit 0 ---
const checkOwnership = (): void => {
  const {code, stdout, stderr} = runPnpm('check:ownership');
  if (code === 0) {
    record('ownership', 'pass', 'pnpm check:ownership exit 0');
  } else {
    record('ownership', 'fail', `check:ownership exit ${code}: ${stdout}\n${stderr}`.slice(0, 240));
  }
};

// --- Check 4: dag — pnpm check:dag exit 0 ---
const checkDag = (): void => {
  const {code, stdout, stderr} = runPnpm('check:dag');
  if (code === 0) {
    record('dag', 'pass', 'pnpm check:dag exit 0');
  } else {
    record('dag', 'fail', `check:dag exit ${code}: ${stdout}\n${stderr}`.slice(0, 240));
  }
};

// --- Check 5: tasks — pnpm check:tasks exit 0 (count tasks) ---
const countTasks = (): number => {
  const tasksDir = resolve(ROOT, '04_estado/tasks');
  if (!existsSync(tasksDir)) return 0;
  return readdirSync(tasksDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .filter((entry) => existsSync(resolve(tasksDir, entry.name, 'task.yaml')))
    .length;
};

const checkTasks = (): void => {
  const {code, stdout, stderr} = runPnpm('check:tasks');
  const taskCount = countTasks();
  if (code === 0) {
    record('tasks', 'pass', `pnpm check:tasks exit 0; ${taskCount} task dirs`);
  } else {
    record(
      'tasks',
      'fail',
      `check:tasks exit ${code}; ${taskCount} task dirs: ${stdout}\n${stderr}`.slice(0, 240),
    );
  }
};

// --- Check 6: governance manifests exist + parseable ---
const checkGovernance = (): void => {
  const governanceDir = resolve(ROOT, '02_proceso/governance');
  const yamlFiles = ['tool-policy.yml', 'router.yml'] as const;
  const commandsPath = resolve(ROOT, '05_verificacion/scripts/commands.yaml');
  const reconciliationPath = resolve(governanceDir, 'harness-subsystem-reconciliation.md');
  const issues: string[] = [];

  for (const name of yamlFiles) {
    const path = resolve(governanceDir, name);
    if (!existsSync(path)) {
      issues.push(`${name} ausente`);
      continue;
    }
    try {
      const text = readFileSync(path, 'utf8');
      const parsed = parse(text);
      if (parsed === null || typeof parsed !== 'object') {
        issues.push(`${name} parsea a no-objeto`);
      }
    } catch (err) {
      issues.push(`${name} no parseable: ${(err as Error).message}`);
    }
  }

  // commands.yaml — parseable YAML object.
  if (!existsSync(commandsPath)) {
    issues.push('commands.yaml ausente');
  } else {
    try {
      const text = readFileSync(commandsPath, 'utf8');
      const parsed = parse(text);
      if (parsed === null || typeof parsed !== 'object') {
        issues.push('commands.yaml parsea a no-objeto');
      }
    } catch (err) {
      issues.push(`commands.yaml no parseable: ${(err as Error).message}`);
    }
  }

  // harness-subsystem-reconciliation.md — present + non-empty.
  if (!existsSync(reconciliationPath)) {
    issues.push('harness-subsystem-reconciliation.md ausente');
  } else {
    const text = readFileSync(reconciliationPath, 'utf8');
    if (text.trim().length === 0) {
      issues.push('harness-subsystem-reconciliation.md vacío');
    }
  }

  if (issues.length > 0) {
    // Unparseable/missing manifest = hard structural failure. [CONFIG]
    record('governance', 'fail', issues.join('; '));
  } else {
    record('governance', 'pass', 'tool-policy.yml, router.yml, commands.yaml, harness-subsystem-reconciliation.md presentes y parseables');
  }
};

// --- Check 7: tasks symlink resolves: "tasks" -> 04_estado/tasks ---
const checkTasksSymlink = (): void => {
  const linkPath = resolve(ROOT, 'tasks');
  const expectedTarget = '04_estado/tasks';
  if (!existsSync(linkPath)) {
    // Missing symlink = hard structural failure. [CONFIG]
    record('tasks-symlink', 'fail', 'symlink "tasks" ausente');
    return;
  }
  let stat;
  try {
    stat = lstatSync(linkPath);
  } catch (err) {
    record('tasks-symlink', 'fail', `lstat falló: ${(err as Error).message}`);
    return;
  }
  if (!stat.isSymbolicLink()) {
    record('tasks-symlink', 'fail', '"tasks" no es symlink');
    return;
  }
  let target: string;
  try {
    target = readlinkSync(linkPath);
  } catch (err) {
    record('tasks-symlink', 'fail', `readlink falló: ${(err as Error).message}`);
    return;
  }
  if (target !== expectedTarget) {
    record('tasks-symlink', 'fail', `symlink "tasks" -> "${target}" (esperado "${expectedTarget}")`);
    return;
  }
  const resolvedDir = resolve(ROOT, expectedTarget);
  if (!existsSync(resolvedDir)) {
    record('tasks-symlink', 'fail', `symlink "tasks" -> ${expectedTarget} pero el destino no existe`);
    return;
  }
  record('tasks-symlink', 'pass', `tasks -> ${expectedTarget} (resuelve)`);
};

// --- Check 8: task-counter.yml parses + loose_sequence consistent ---
const checkTaskCounter = (): void => {
  const counterPath = resolve(ROOT, '04_estado/registries/tasks/task-counter.yml');
  if (!existsSync(counterPath)) {
    record('task-counter', 'fail', '04_estado/registries/tasks/task-counter.yml ausente');
    return;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(readFileSync(counterPath, 'utf8')) as Record<string, unknown>;
  } catch (err) {
    record('task-counter', 'fail', `no parseable: ${(err as Error).message}`);
    return;
  }
  const counters = parsed.counters as Record<string, unknown> | undefined;
  const looseSequence = counters?.loose_sequence;
  if (typeof looseSequence !== 'number') {
    record('task-counter', 'fail', `loose_sequence no es número (observado ${String(looseSequence)})`);
    return;
  }
  const taskCount = countTasks();
  // loose_sequence reflects the next available index; the count of existing
  // TASK-loose-NNN dirs should be <= loose_sequence. Equality is the steady
  // state; fewer dirs is allowed (tasks may be retired). More dirs than the
  // counter = inconsistency. [INFERENCIA]
  if (taskCount > looseSequence) {
    record(
      'task-counter',
      'fail',
      `loose_sequence=${looseSequence} pero ${taskCount} task dirs (inconsistente)`,
    );
  } else {
    record(
      'task-counter',
      'pass',
      `loose_sequence=${looseSequence}, ${taskCount} task dirs (consistente)`,
    );
  }
};

// --- Check 9: receipts families — 5 family dirs exist under 04_estado/receipts/ ---
const RECEIPTS_FAMILIES = ['imports', 'renders', 'dependency-audits', 'migrations', 'check-runs'] as const;
const checkReceipts = (): void => {
  const receiptsDir = resolve(ROOT, '04_estado/receipts');
  const missing: string[] = [];
  for (const family of RECEIPTS_FAMILIES) {
    if (!existsSync(resolve(receiptsDir, family))) {
      missing.push(family);
    }
  }
  if (missing.length > 0) {
    record('receipts', 'fail', `family dirs ausentes: ${missing.join(', ')}`);
  } else {
    record('receipts', 'pass', `5 family dirs presentes: ${RECEIPTS_FAMILIES.join(', ')}`);
  }
};

// --- Run all checks ---
checkToolchain();
checkRepo();
checkOwnership();
checkDag();
checkTasks();
checkGovernance();
checkTasksSymlink();
checkTaskCounter();
checkReceipts();

const pass = checks.filter((c) => c.status === 'pass').length;
const fail = checks.filter((c) => c.status === 'fail').length;
const warn = checks.filter((c) => c.status === 'warn').length;

// --- Emit YAML report ---
const reportsDir = resolve(ROOT, '05_verificacion/quality/reports');
mkdirSync(reportsDir, {recursive: true});
const generatedAt = isoWithOffset(new Date());
const reportPath = resolve(reportsDir, `doctor-${isoDateUtc(new Date())}.yml`);

const yamlLines: string[] = [];
yamlLines.push(`schema_version: doctor-report-v1`);
yamlLines.push(`generated_at: ${JSON.stringify(generatedAt)}`);
yamlLines.push(`checks:`);
for (const c of checks) {
  yamlLines.push(`  - id: ${c.id}`);
  yamlLines.push(`    status: ${c.status}`);
  yamlLines.push(`    detail: ${JSON.stringify(c.detail)}`);
}
yamlLines.push(`summary:`);
yamlLines.push(`  pass: ${pass}`);
yamlLines.push(`  fail: ${fail}`);
yamlLines.push(`  warn: ${warn}`);
writeFileSync(reportPath, `${yamlLines.join('\n')}\n`, 'utf8');

// --- Stdout summary ---
const statusTag = (s: CheckStatus): string =>
  s === 'pass' ? 'PASS' : s === 'warn' ? 'WARN' : 'FAIL';
for (const c of checks) {
  const line = `[${statusTag(c.status)}] doctor:${c.id} — ${c.detail}`;
  if (c.status === 'fail') {
    console.error(line);
  } else if (c.status === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}
console.info(
  `DOCTOR summary: pass=${pass} warn=${warn} fail=${fail} report=${reportPath}`,
);

// Exit 0 if no FAIL (warn ok); exit 1 if any FAIL. [CONFIG]
if (fail > 0) {
  process.exitCode = 1;
}