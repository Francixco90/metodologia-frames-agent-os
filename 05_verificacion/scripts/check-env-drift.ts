/**
 * check-env-drift.ts — A2 of gap-closure plan.
 *
 * CLI: `pnpm check:env` (gate G18).
 *
 * Reads `04_estado/registries/env/env-manifest-v1.yml`, probes the runtime
 * toolchain (node, pnpm, remotion, ffmpeg, playwright; chromium is
 * coverage_gap until pinned), diffs declared vs observed, emits an append-only
 * check-run receipt at `04_estado/receipts/check-runs/C-NNN/receipt.yml` plus
 * an atemporal drift detail at `.../C-NNN/env-drift-detail.yml` (ADR 0027).
 * Exit 0 if no drift; exit 1 if any tool drifts. coverage_gap tools (chromium)
 * warn, never fail. [CÓDIGO]
 *
 * Fail-closed: a missing env-manifest is a hard failure (no inference
 * substituted for the absent baseline). [CONFIG]
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {CheckRunReceiptSchema} from './lib/check-run-receipt-schema.ts';

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, '04_estado/registries/env/env-manifest-v1.yml');
const CHECK_RUNS_DIR = resolve(ROOT, '04_estado/receipts/check-runs');

interface ToolProbe {
  tool: string;
  declared: string;
  observed: string | null;
  status: 'match' | 'drift' | 'coverage_gap' | 'missing';
}

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

const run = (cmd: string, args: string[]): string | null => {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }).trim();
  } catch {
    return null;
  }
};

const readInstalledVersion = (pkg: string): string | null => {
  const path = resolve(ROOT, 'node_modules', pkg, 'package.json');
  if (!existsSync(path)) return null;
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as {version?: string};
    return manifest.version ?? null;
  } catch {
    return null;
  }
};

const probe = (tool: string, declared: string): ToolProbe => {
  if (declared === 'coverage_gap') {
    return {tool, declared, observed: null, status: 'coverage_gap'};
  }
  let observed: string | null = null;
  switch (tool) {
    case 'node':
      observed = process.version.replace(/^v/u, '');
      break;
    case 'pnpm':
      observed = run('pnpm', ['--version']);
      break;
    case 'remotion':
      observed = readInstalledVersion('remotion');
      break;
    case 'zod':
      observed = readInstalledVersion('zod');
      break;
    case 'ffmpeg': {
      const out = run('ffmpeg', ['-version']);
      if (out !== null) {
        const m = /ffmpeg version (\S+)/u.exec(out);
        observed = m?.[1] ?? null;
      }
      break;
    }
    case 'playwright':
      observed = readInstalledVersion('playwright');
      break;
    default:
      observed = null;
  }
  if (observed === null) {
    return {tool, declared, observed: null, status: 'missing'};
  }
  return {
    tool,
    declared,
    observed,
    status: observed === declared ? 'match' : 'drift',
  };
};

const nextReceiptId = (): string => {
  if (!existsSync(CHECK_RUNS_DIR)) return 'C-001';
  const ids = readdirSync(CHECK_RUNS_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && /^C-[0-9]{3}$/u.test(e.name))
    .map((e) => Number.parseInt(e.name.slice('C-'.length), 10));
  const max = ids.length === 0 ? 0 : Math.max(...ids);
  return `C-${String(max + 1).padStart(3, '0')}`;
};

const sha256 = (text: string): string =>
  createHash('sha256').update(text).digest('hex');

const main = (): void => {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`[FAIL] env manifest not found: ${MANIFEST_PATH}`);
    process.exitCode = 1;
    return;
  }
  const parsed: unknown = parse(readFileSync(MANIFEST_PATH, 'utf8'));
  if (parsed === null || typeof parsed !== 'object') {
    console.error('[FAIL] env manifest parsed to non-object');
    process.exitCode = 1;
    return;
  }
  const toolchain = (parsed as Record<string, unknown>).toolchain as
    | Record<string, string>
    | undefined;
  if (toolchain === undefined) {
    console.error('[FAIL] env manifest missing toolchain');
    process.exitCode = 1;
    return;
  }

  const probes: ToolProbe[] = Object.entries(toolchain).map(([tool, declared]) =>
    probe(tool, declared),
  );

  const drift = probes.filter((p) => p.status === 'drift');
  const missing = probes.filter((p) => p.status === 'missing');
  const gaps = probes.filter((p) => p.status === 'coverage_gap');
  const matches = probes.filter((p) => p.status === 'match');

  const stdoutLines: string[] = [];
  for (const p of probes) {
    const tag =
      p.status === 'match'
        ? 'PASS'
        : p.status === 'drift'
          ? 'FAIL'
          : p.status === 'missing'
            ? 'FAIL'
            : 'WARN';
    stdoutLines.push(
      `[${tag}] env:${p.tool} declared=${p.declared} observed=${p.observed ?? '(absent)'}`,
    );
  }
  const driftCount = drift.length + missing.length;
  const summaryLine = `CHECK:ENV summary: match=${matches.length} drift=${drift.length} missing=${missing.length} coverage_gap=${gaps.length} exit=${driftCount === 0 ? 0 : 1}`;
  stdoutLines.push(summaryLine);
  const stdoutText = stdoutLines.join('\n');
  const stderrText = driftCount === 0 ? '' : stdoutText;

  // Emit check-run receipt (append-only) + atemporal detail (ADR 0027).
  const receiptId = nextReceiptId();
  const receiptDir = resolve(CHECK_RUNS_DIR, receiptId);
  mkdirSync(receiptDir, {recursive: true});

  // Drift detail lives alongside the receipt (atemporal path under receipts/).
  const detailLines: string[] = [];
  detailLines.push(`schema_version: env-drift-detail-v1`);
  detailLines.push(`generated_at: ${JSON.stringify(isoWithOffset(new Date()))}`);
  detailLines.push(`manifest_ref: 04_estado/registries/env/env-manifest-v1.yml`);
  detailLines.push(`tools:`);
  for (const p of probes) {
    detailLines.push(`  - tool: ${p.tool}`);
    detailLines.push(`    declared: ${JSON.stringify(p.declared)}`);
    detailLines.push(`    observed: ${p.observed === null ? 'null' : JSON.stringify(p.observed)}`);
    detailLines.push(`    status: ${p.status}`);
  }
  detailLines.push(`summary:`);
  detailLines.push(`  match: ${matches.length}`);
  detailLines.push(`  drift: ${drift.length}`);
  detailLines.push(`  missing: ${missing.length}`);
  detailLines.push(`  coverage_gap: ${gaps.length}`);
  writeFileSync(resolve(receiptDir, 'env-drift-detail.yml'), `${detailLines.join('\n')}\n`, 'utf8');

  const started = Date.now();
  const receipt = {
    schema_version: 'check-run-receipt-v1' as const,
    receipt_id: receiptId,
    gate: 'G18',
    command: 'pnpm check:env',
    exit_code: driftCount === 0 ? 0 : 1,
    stdout_sha256: sha256(stdoutText),
    stderr_sha256: sha256(stderrText),
    duration_ms: Date.now() - started,
    ran_at: isoWithOffset(new Date()),
    append_only: true as const,
    runner_actor: 'qa',
  };
  const parsedReceipt = CheckRunReceiptSchema.safeParse(receipt);
  if (!parsedReceipt.success) {
    console.error(
      `[FAIL] receipt schema reject: ${parsedReceipt.error.issues.map((i) => i.path.join('.')).join('; ')}`,
    );
    process.exitCode = 1;
    return;
  }
  const receiptYml = [
    `schema_version: check-run-receipt-v1`,
    `receipt_id: ${receipt.receipt_id}`,
    `gate: ${receipt.gate}`,
    `command: ${JSON.stringify(receipt.command)}`,
    `exit_code: ${receipt.exit_code}`,
    `stdout_sha256: ${receipt.stdout_sha256}`,
    `stderr_sha256: ${receipt.stderr_sha256}`,
    `duration_ms: ${receipt.duration_ms}`,
    `ran_at: ${JSON.stringify(receipt.ran_at)}`,
    `append_only: true`,
    `runner_actor: ${receipt.runner_actor}`,
  ].join('\n');
  writeFileSync(resolve(receiptDir, 'receipt.yml'), `${receiptYml}\n`, 'utf8');

  // Stdout summary.
  for (const line of stdoutLines) {
    if (line.startsWith('[FAIL]')) console.error(line);
    else if (line.startsWith('[WARN]')) console.warn(line);
    else console.info(line);
  }
  console.info(`CHECK:ENV receipt=${resolve(receiptDir, 'receipt.yml')} detail=${resolve(receiptDir, 'env-drift-detail.yml')}`);

  if (driftCount > 0) process.exitCode = 1;
};

main();