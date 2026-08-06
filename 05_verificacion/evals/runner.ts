/**
 * runner.ts — generic eval runner for the harness-v2 eval suite. [CÓDIGO]
 *
 * Discovers every `05_verificacion/evals/H-E0XX/oracle.ts`, imports it, calls
 * `oracle.run()`, validates the outcome through `EvalResultSchema`, and
 * persists an append-only `eval-result-v1` record to
 * `05_verificacion/evals/results/H-E0XX/{ISO-timestamp}.yml`.
 *
 * CLI:
 *   pnpm eval:run                     # run every oracle
 *   pnpm eval:run --only H-E008       # run a single oracle
 *
 * Semantics:
 *   - `pass`    → all oracle_checks passed (exit 0)
 *   - `skipped` → preconditions absent (exit 0, non-blocking per plan A3)
 *   - `fail`    → an oracle_check failed (exit 1, blocking)
 *
 * Determinism: no `Math.random`; the only nondeterminism is the ISO run dir,
 * which is append-only by construction. Evidence hashes pin the source files
 * each oracle read, so a `pass` is reproducible only against the same inputs.
 *
 * Source: plan A3 (gap closure). [DOC]
 */
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';

import {EvalResultSchema, type Oracle, type OracleOutcome} from './lib/eval-result-schema.ts';

const ROOT = process.cwd();
const EVALS_DIR = resolve(ROOT, '05_verificacion/evals');
const RESULTS_DIR = resolve(EVALS_DIR, 'results');

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

const parseArgs = (argv: string[]): {only: string | null} => {
  let only: string | null = null;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--only=')) only = arg.slice('--only='.length);
  }
  return {only};
};

const discoverOracles = (only: string | null): Array<{id: string; path: string}> => {
  const entries = readdirSync(EVALS_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && /^H-E[0-9]{3}$/u.test(e.name))
    .map((e) => ({id: e.name, path: resolve(EVALS_DIR, e.name, 'oracle.ts')}))
    .filter((e) => existsSync(e.path))
    .sort((a, b) => a.id.localeCompare(b.id));
  return only === null ? entries : entries.filter((e) => e.id === only);
};

const persist = (id: string, outcome: OracleOutcome, ranAt: string): string => {
  const record = {
    schema_version: 'eval-result-v1' as const,
    hypothesis_id: id,
    status: outcome.status,
    oracle_checks: outcome.oracle_checks,
    evidence_hashes: outcome.evidence_hashes,
    ran_at: ranAt,
    runner_actor: 'eval-generic-runner' as const,
    append_only: true as const,
    ...(outcome.notes !== undefined ? {notes: outcome.notes} : {}),
  };
  const parsed = EvalResultSchema.safeParse(record);
  if (!parsed.success) {
    throw new Error(
      `eval-result-v1 reject for ${id}: ${parsed.error.issues.map((i) => `${i.path.join('.')}:${i.message}`).join('; ')}`,
    );
  }
  const dir = resolve(RESULTS_DIR, id, ranAt.replace(/[:+]/gu, '-'));
  mkdirSync(dir, {recursive: true});
  const path = resolve(dir, 'result.yml');
  const lines: string[] = [
    `schema_version: eval-result-v1`,
    `hypothesis_id: ${id}`,
    `status: ${outcome.status}`,
    `oracle_checks:`,
  ];
  for (const c of outcome.oracle_checks) {
    lines.push(`  - name: ${JSON.stringify(c.name)}`);
    lines.push(`    passed: ${c.passed}`);
    if (c.detail !== undefined) lines.push(`    detail: ${JSON.stringify(c.detail)}`);
  }
  lines.push(`evidence_hashes:`);
  for (const h of outcome.evidence_hashes) lines.push(`  - ${h}`);
  lines.push(`ran_at: ${JSON.stringify(ranAt)}`);
  lines.push(`runner_actor: eval-generic-runner`);
  lines.push(`append_only: true`);
  if (outcome.notes !== undefined) lines.push(`notes: ${JSON.stringify(outcome.notes)}`);
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  return path;
};

const runOne = async (entry: {id: string; path: string}): Promise<OracleOutcome> => {
  const mod = (await import(entry.path)) as {oracle?: Oracle};
  if (mod.oracle === undefined || typeof mod.oracle.run !== 'function') {
    throw new Error(`${entry.id}: oracle.ts does not export an 'oracle' with a 'run()'`);
  }
  if (mod.oracle.hypothesis_id !== entry.id) {
    throw new Error(`${entry.id}: oracle.hypothesis_id=${mod.oracle.hypothesis_id} mismatches dir`);
  }
  return mod.oracle.run();
};

const main = async (): Promise<void> => {
  const {only} = parseArgs(process.argv);
  const oracles = discoverOracles(only);
  if (oracles.length === 0) {
    console.error(`[FAIL] no oracle.ts found${only === null ? '' : ` for ${only}`}`);
    process.exitCode = 1;
    return;
  }
  const ranAt = isoWithOffset(new Date());
  let blocking = 0;
  let passed = 0;
  let skipped = 0;
  for (const entry of oracles) {
    let outcome: OracleOutcome;
    try {
      outcome = await runOne(entry);
    } catch (err) {
      console.error(`[ERROR] ${entry.id}: ${(err as Error).message}`);
      blocking += 1;
      continue;
    }
    const path = persist(entry.id, outcome, ranAt);
    const rel = path.split(sep).slice(-4).join(sep);
    const tag = outcome.status.toUpperCase();
    console.info(`[${tag}] ${entry.id} -> ${rel} (${outcome.oracle_checks.length} checks, ${outcome.evidence_hashes.length} hashes)`);
    if (outcome.status === 'fail') blocking += 1;
    else if (outcome.status === 'pass') passed += 1;
    else skipped += 1;
  }
  console.info(`eval:run summary: pass=${passed} skipped=${skipped} fail=${blocking}`);
  if (blocking > 0) process.exitCode = 1;
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

export {main as runEvalSuite};