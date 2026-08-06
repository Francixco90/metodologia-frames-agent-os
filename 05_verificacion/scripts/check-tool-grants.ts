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
// Emits `05_verificacion/quality/reports/tool-grants-{ISO-date}.yml` and
// exits nonzero on `unapproved`. Idempotent. [CONFIG]
//
// Usage: node --import tsx 05_verificacion/scripts/check-tool-grants.ts
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {parse} from 'yaml';

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

const isoDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const main = (): void => {
  const allows = loadPolicyAllows();
  const grants = collectGrants();
  const allowed: string[] = [];
  const unapproved: string[] = [];
  const missingFromPolicy: string[] = [];
  for (const g of grants) {
    const tool = grantTool(g);
    if (allows.has(tool)) {
      allowed.push(g);
    } else {
      unapproved.push(g);
      if (!allows.has(tool)) missingFromPolicy.push(tool);
    }
  }
  const reportDir = resolve(ROOT, '02_proceso/governance/reports');
  mkdirSync(reportDir, {recursive: true});
  const reportPath = resolve(reportDir, `tool-grants-${isoDate(new Date())}.yml`);
  const lines: string[] = [
    `schema_version: tool-grants-report-v1`,
    `generated_at: ${new Date().toISOString()}`,
    `summary:`,
    `  total_grants: ${grants.length}`,
    `  allowed: ${allowed.length}`,
    `  unapproved: ${unapproved.length}`,
    `  missing_from_policy: ${missingFromPolicy.length}`,
    `allowed:`,
  ];
  for (const g of allowed) lines.push(`  - ${JSON.stringify(g)}`);
  lines.push(`unapproved:`);
  for (const g of unapproved) lines.push(`  - ${JSON.stringify(g)}`);
  lines.push(`missing_from_policy:`);
  for (const t of missingFromPolicy) lines.push(`  - ${t}`);
  writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  console.info(`tool-grants: total=${grants.length} allowed=${allowed.length} unapproved=${unapproved.length} missing=${missingFromPolicy.length}`);
  console.info(`report -> ${reportPath.split(sep).slice(-3).join(sep)}`);
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