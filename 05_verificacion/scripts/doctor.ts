/**
 * doctor.ts — S12 of harness v2. Orchestrator only; checks live in doctor/.
 *
 * CLI: `pnpm doctor` (alias: `pnpm report`). Runs a read-only health battery
 * and emits an atemporal snapshot at `05_verificacion/quality/reports/doctor-latest.yml`
 * (ADR 0027: overwritten each run; status snapshot, not append-only evidence)
 * plus a stdout summary. Advisory (warn) except hard structural failures
 * (missing symlink, unparseable manifest). Exit 0 if no FAIL; exit 1 if any.
 * [CÓDIGO]
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {checks, type CheckStatus, isoWithOffset, ROOT} from './doctor/types.ts';
import {checkRepo, checkOwnership, checkDag, checkTasks} from './doctor/checks-pnpm.ts';
import {checkToolchain} from './doctor/checks-toolchain.ts';
import {checkGovernance} from './doctor/checks-governance.ts';
import {checkTasksSymlink, checkTaskCounter} from './doctor/checks-symlinks.ts';
import {checkReceipts, checkContinuity} from './doctor/checks-continuity.ts';

// Order matters: cheap structural checks first, pnpm delegations last.
checkToolchain();
checkRepo();
checkOwnership();
checkDag();
checkTasks();
checkGovernance();
checkTasksSymlink();
checkTaskCounter();
checkReceipts();
checkContinuity();

const pass = checks.filter((c) => c.status === 'pass').length;
const fail = checks.filter((c) => c.status === 'fail').length;
const warn = checks.filter((c) => c.status === 'warn').length;

const reportsDir = resolve(ROOT, '05_verificacion/quality/reports');
mkdirSync(reportsDir, {recursive: true});
const generatedAt = isoWithOffset(new Date());
const reportPath = resolve(reportsDir, 'doctor-latest.yml');

const yamlLines: string[] = [
  `schema_version: doctor-report-v1`,
  `generated_at: ${JSON.stringify(generatedAt)}`,
  `checks:`,
];
for (const c of checks) {
  yamlLines.push(`  - id: ${c.id}`);
  yamlLines.push(`    status: ${c.status}`);
  yamlLines.push(`    detail: ${JSON.stringify(c.detail)}`);
}
yamlLines.push(`summary:`, `  pass: ${pass}`, `  fail: ${fail}`, `  warn: ${warn}`);
writeFileSync(reportPath, `${yamlLines.join('\n')}\n`, 'utf8');

const statusTag = (s: CheckStatus): string =>
  s === 'pass' ? 'PASS' : s === 'warn' ? 'WARN' : 'FAIL';
for (const c of checks) {
  const line = `[${statusTag(c.status)}] doctor:${c.id} — ${c.detail}`;
  if (c.status === 'fail') console.error(line);
  else if (c.status === 'warn') console.warn(line);
  else console.info(line);
}
console.info(`DOCTOR summary: pass=${pass} warn=${warn} fail=${fail} report=${reportPath}`);
if (fail > 0) process.exitCode = 1;
