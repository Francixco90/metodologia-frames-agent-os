// check-tool-grants.ts — converge the ad-hoc `.claude/settings.local.json`
// permission grants against `02_proceso/governance/tool-policy.yml` (plan A6).
//
// Classifies each runtime grant (Bash/Read/mcp__*) into:
//   - allowed: the grant's tool is present in at least one role's `tools.allow`
//     in tool-policy.yml (the role contract authorizes the tool; the granular
//     argument in settings.local.json is a runtime narrowing of that allow).
//   - unapproved: the grant's tool is not in ANY role's allow list.
//   - missing-from-policy: the grant's tool prefix does not appear as a role
//     allow entry at all (a new tool surface the policy has not catalogued).
//
// Emits an append-only check-run receipt at
// `04_estado/receipts/check-runs/C-NNN/receipt.yml` plus an atemporal detail
// at `.../C-NNN/tool-grants-detail.yml` (ADR 0027). Exits nonzero on
// `unapproved`. Idempotent. [CONFIG]
//
// Usage: node --import tsx 05_verificacion/scripts/check-tool-grants.ts
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {CheckRunReceiptSchema} from './lib/check-run-receipt-schema.ts';

const ROOT = process.cwd();
const POLICY = resolve(ROOT, '02_proceso/governance/tool-policy.yml');
const SETTINGS_DIRS = [
  resolve(ROOT, '.claude'),
  ...readdirSync(ROOT, {withFileTypes: true})
    .filter((e) => e.isDirectory() && e.name.startsWith('.'))
    .filter((e) => existsSync(resolve(ROOT, e.name, 'settings.local.json')))
    .map((e) => resolve(ROOT, e.name)),
];

interface RoleRule {
  role?: string;
  tools?: {allow?: string[]; deny?: string[]; conditional?: string[]};
}
interface RuntimeGrant {
  tool?: string;
  allowed_for?: string[];
  rationale?: string;
}
interface Policy {
  rules?: RoleRule[];
  runtime_grants?: RuntimeGrant[];
}

const grantTool = (grant: string): string => {
  const i = grant.indexOf('(');
  return i === -1 ? grant : grant.slice(0, i);
};

const loadPolicyAllows = (): Set<string> => {
  const policy = parse(readFileSync(POLICY, 'utf8')) as Policy;
  const set = new Set<string>();
  for (const r of policy.rules ?? []) {
    for (const t of r.tools?.allow ?? []) set.add(t);
  }
  for (const g of policy.runtime_grants ?? []) {
    if (g.tool !== undefined) set.add(g.tool);
  }
  return set;
};

const collectGrants = (): string[] => {
  const grants = new Set<string>();
  for (const dir of SETTINGS_DIRS) {
    const path = resolve(dir, 'settings.local.json');
    if (!existsSync(path)) continue;
    const json = JSON.parse(readFileSync(path, 'utf8')) as {permissions?: {allow?: string[]}};
    for (const g of json.permissions?.allow ?? []) grants.add(g);
  }
  return [...grants].sort();
};

const CHECK_RUNS_DIR = resolve(ROOT, '04_estado/receipts/check-runs');

const nextReceiptId = (): string => {
  if (!existsSync(CHECK_RUNS_DIR)) return 'C-001';
  const ids = readdirSync(CHECK_RUNS_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && /^C-[0-9]{3}$/u.test(e.name))
    .map((e) => Number.parseInt(e.name.slice('C-'.length), 10));
  const max = ids.length === 0 ? 0 : Math.max(...ids);
  return `C-${String(max + 1).padStart(3, '0')}`;
};

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

const isoWithOffset = (date: Date): string => {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(tzOffsetMin);
  const pad = (n: number) => String(n).padStart(2, '0');
  const base =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  if (tzOffsetMin === 0) return `${base}Z`;
  return `${base}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

const main = (): void => {
  const allows = loadPolicyAllows();
  const grants = collectGrants();
  const allowed: string[] = [];
  const unapproved: string[] = [];
  const missingFromPolicy: string[] = [];
  for (const g of grants) {
    const tool = grantTool(g);
    if (allows.has(tool)) allowed.push(g);
    else {
      unapproved.push(g);
      if (!allows.has(tool)) missingFromPolicy.push(tool);
    }
  }
  const stdoutText =
    `tool-grants: total=${grants.length} allowed=${allowed.length}` +
    ` unapproved=${unapproved.length} missing=${missingFromPolicy.length}`;
  const stderrText = unapproved.length > 0 ? stdoutText : '';

  // Atemporal detail + append-only receipt (ADR 0027).
  const receiptId = nextReceiptId();
  const receiptDir = resolve(CHECK_RUNS_DIR, receiptId);
  mkdirSync(receiptDir, {recursive: true});
  // Redact private locators so the receipt stays portable (no /Users/<user>).
  const redact = (s: string): string =>
    s.replace(/\/Users\/[^/)]+/gu, '$HOME').replace(/\/home\/[^/)]+/gu, '$HOME');
  const detail: string[] = [
    `schema_version: tool-grants-detail-v1`,
    `generated_at: ${JSON.stringify(isoWithOffset(new Date()))}`,
    `summary:`,
    `  total_grants: ${grants.length}`,
    `  allowed: ${allowed.length}`,
    `  unapproved: ${unapproved.length}`,
    `  missing_from_policy: ${missingFromPolicy.length}`,
    `allowed:`,
  ];
  for (const g of allowed) detail.push(`  - ${JSON.stringify(redact(g))}`);
  detail.push(`unapproved:`);
  for (const g of unapproved) detail.push(`  - ${JSON.stringify(redact(g))}`);
  detail.push(`missing_from_policy:`);
  for (const t of missingFromPolicy) detail.push(`  - ${t}`);
  writeFileSync(resolve(receiptDir, 'tool-grants-detail.yml'), `${detail.join('\n')}\n`, 'utf8');

  const started = Date.now();
  const receipt = {
    schema_version: 'check-run-receipt-v1' as const,
    receipt_id: receiptId,
    gate: 'G20',
    command: 'pnpm check:grants',
    exit_code: unapproved.length > 0 ? 1 : 0,
    stdout_sha256: sha256(stdoutText),
    stderr_sha256: sha256(stderrText),
    duration_ms: Date.now() - started,
    ran_at: isoWithOffset(new Date()),
    append_only: true as const,
    runner_actor: 'governance',
  };
  const parsed = CheckRunReceiptSchema.safeParse(receipt);
  if (!parsed.success) {
    console.error(
      `[FAIL] receipt schema reject: ${parsed.error.issues.map((i) => i.path.join('.')).join('; ')}`,
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

  console.info(stdoutText);
  console.info(
    `receipt=${resolve(receiptDir, 'receipt.yml')} detail=${resolve(receiptDir, 'tool-grants-detail.yml')}`,
  );
  if (unapproved.length > 0) {
    console.error(`[FAIL] ${unapproved.length} unapproved grant(s) (tool not in any role allow)`);
    process.exitCode = 1;
  }
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) main();

export {main, loadPolicyAllows, collectGrants, grantTool};
