/** Executes one governed non-manual gate and records its result append-only.
 * Use `/bin/sh scripts/run-check-safe.sh GATE_ID` when the parent is not trusted.
 * The pnpm task is only a convenience alias for trusted parents. [CÓDIGO] */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {CommandsManifestSchema, type CommandEntry} from './lib/commands-schema.js';
import {CheckRunReceiptSchema, type CheckRunReceipt} from './lib/check-run-receipt-schema.js';

const ROOT = process.cwd();
const HERE = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = resolve(HERE, '..');
const RECEIPTS_DIR = resolve(ROOT, '04_estado/receipts/check-runs');

const MANUAL_GATE_EXIT = 2;
const COMMAND_SHELL = '/bin/sh';
const SENSITIVE_ENV_KEYS = new Set(['NODE_OPTIONS', 'BASH_ENV', 'ENV']);

const sha256hex = (bytes: Buffer | string): string =>
  createHash('sha256').update(bytes).digest('hex');

const sanitizedEnv = (environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(environment).filter(([key]) => !SENSITIVE_ENV_KEYS.has(key)));

/**
 * ISO 8601 with local offset, e.g. `2026-08-05T14:30:00-05:00`.
 * Falls back to UTC `Z` when the local offset is zero.
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

const loadManifest = (): {gates: CommandEntry[]} => {
  const path = resolve(SCRIPTS_DIR, 'commands.yaml');
  const manifest = CommandsManifestSchema.parse(parse(readFileSync(path, 'utf8')));
  return manifest;
};

const findEntry = (gates: readonly CommandEntry[], gateId: string): CommandEntry | undefined =>
  gates.find((entry) => entry.gate === gateId);

/** Next zero-padded 3-digit index from existing C-NNN dirs under check-runs/. */
const nextIndex = (): number => {
  if (!existsSync(RECEIPTS_DIR)) return 1;
  const dirs = readdirSync(RECEIPTS_DIR, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^C-[0-9]{3}$/u.test(name));
  if (dirs.length === 0) return 1;
  const max = dirs
    .map((name) => Number.parseInt(name.slice('C-'.length), 10))
    .reduce((acc, n) => (n > acc ? n : acc), 0);
  return max + 1;
};

const formatIndex = (n: number): string => `C-${String(n).padStart(3, '0')}`;

/** Scans prior receipts for the same gate+command+exit_code; returns the prior id or undefined. */
const findDuplicate = (gate: string, command: string, exitCode: number): string | undefined => {
  if (!existsSync(RECEIPTS_DIR)) return undefined;
  const dirs = readdirSync(RECEIPTS_DIR, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^C-[0-9]{3}$/u.test(name))
    .sort();
  for (const name of dirs) {
    const receiptPath = resolve(RECEIPTS_DIR, name, 'receipt.yml');
    if (!existsSync(receiptPath)) continue;
    try {
      const data = parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>;
      if (data.gate === gate && data.command === command && data.exit_code === exitCode) {
        return typeof data.receipt_id === 'string' ? data.receipt_id : name;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

const toYaml = (receipt: CheckRunReceipt): string => {
  const lines: string[] = [];
  lines.push(`schema_version: ${receipt.schema_version}`);
  lines.push(`receipt_id: ${receipt.receipt_id}`);
  lines.push(`gate: ${receipt.gate}`);
  lines.push(`command: ${JSON.stringify(receipt.command)}`);
  lines.push(`exit_code: ${receipt.exit_code}`);
  lines.push(`stdout_sha256: ${receipt.stdout_sha256}`);
  lines.push(`stderr_sha256: ${receipt.stderr_sha256}`);
  lines.push(`duration_ms: ${receipt.duration_ms}`);
  lines.push(`ran_at: ${JSON.stringify(receipt.ran_at)}`);
  lines.push(`append_only: true`);
  lines.push(`runner_actor: ${receipt.runner_actor}`);
  if (receipt.duplicate_of !== undefined) {
    lines.push(`duplicate_of: ${receipt.duplicate_of}`);
  }
  return `${lines.join('\n')}\n`;
};

const fail = (message: string, exitCode: number): never => {
  console.error(message);
  process.exit(exitCode);
};

const main = (): void => {
  const gateId = process.argv[2];
  if (gateId === undefined || gateId.length === 0) {
    fail('Usage: /bin/sh scripts/run-check-safe.sh <GATE_ID>', 2);
    return; // unreachable; satisfies TS narrowing
  }

  const manifest = loadManifest();
  const entry = findEntry(manifest.gates, gateId);
  if (entry === undefined) {
    fail(`run-check: gate ${gateId} no encontrado en commands.yaml`, 2);
    return; // unreachable; satisfies TS narrowing
  }

  if (entry.manual) {
    fail(
      `run-check: gate ${entry.gate} es manual fail-closed. ` +
        `No se ejecuta automáticamente; requiere Guardian/human approval.`,
      MANUAL_GATE_EXIT,
    );
  }

  if (entry.command === null) {
    fail(`run-check: gate ${entry.gate} sin command definido (manual implícito)`, 2);
    return; // unreachable; satisfies TS narrowing
  }

  const command = entry.command;
  const startedAt = Date.now();
  const result = spawnSync(command, {
    shell: COMMAND_SHELL,
    encoding: 'utf8',
    cwd: ROOT,
    env: sanitizedEnv(process.env),
  });
  const durationMs = Date.now() - startedAt;

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const exitCode = result.status ?? 1;

  const stdoutSha = sha256hex(stdout);
  const stderrSha = sha256hex(stderr);

  const index = nextIndex();
  const receiptId = formatIndex(index);
  const duplicateOf = findDuplicate(entry.gate, command, exitCode);

  const receipt: CheckRunReceipt = {
    schema_version: 'check-run-receipt-v1',
    receipt_id: receiptId,
    gate: entry.gate,
    command,
    exit_code: exitCode,
    stdout_sha256: stdoutSha,
    stderr_sha256: stderrSha,
    duration_ms: durationMs,
    ran_at: isoWithOffset(new Date()),
    append_only: true,
    runner_actor: 'qa',
    ...(duplicateOf !== undefined ? {duplicate_of: duplicateOf} : {}),
  };

  // Validate before persisting (fail-closed on shape violation).
  CheckRunReceiptSchema.parse(receipt);

  const dir = resolve(RECEIPTS_DIR, receiptId);
  mkdirSync(dir, {recursive: true});
  writeFileSync(resolve(dir, 'receipt.yml'), toYaml(receipt), 'utf8');

  const outcome = exitCode === 0 ? 'PASS' : 'RECORDED';
  console.info(
    `${outcome} run-check: ${receiptId} gate=${entry.gate} exit=${exitCode} ` +
      `duration=${durationMs}ms stdout=${stdoutSha.slice(0, 12)}…` +
      (duplicateOf !== undefined ? ` duplicate_of=${duplicateOf}` : ''),
  );

  // Propagate the underlying command's exit code so callers can detect gate
  // failures, while still having emitted the receipt above.
  process.exitCode = exitCode;
};

main();
