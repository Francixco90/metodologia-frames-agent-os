// H-E009 oracle — check-run receipts append-only + sha256-bound. [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const CHECK_RUNS = resolve(ROOT, '04_estado/receipts/check-runs');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');
const HEX64 = /^[0-9a-f]{64}$/u;

export const oracle: Oracle = {
  hypothesis_id: 'H-E009',
  run: (): OracleOutcome => {
    const checks: OracleOutcome['oracle_checks'] = [];
    const evidence: string[] = [];
    const dirs = readdirSync(CHECK_RUNS, {withFileTypes: true}).filter((e) => e.isDirectory()).map((e) => e.name);
    checks.push({name: 'check-runs family has ≥1 receipt dir', passed: dirs.length > 0, detail: `${dirs.length} dir(s)`});
    if (dirs.length === 0) return {status: 'skipped', oracle_checks: checks, evidence_hashes: evidence, notes: 'no check-run receipts'};
    let allPass = true;
    let inspected = 0;
    for (const d of dirs) {
      const p = resolve(CHECK_RUNS, d, 'receipt.yml');
      let raw: string;
      try {
        raw = readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      evidence.push(sha256(raw));
      const r = parse(raw) as {schema_version?: string; append_only?: boolean; stdout_sha256?: string; stderr_sha256?: string};
      const isAppend = r.append_only === true;
      const isCheckRun = r.schema_version === 'check-run-receipt-v1';
      const hasHash = HEX64.test(r.stdout_sha256 ?? '') && HEX64.test(r.stderr_sha256 ?? '');
      if (!isAppend || !isCheckRun || !hasHash) allPass = false;
      inspected += 1;
    }
    checks.push({name: `all ${inspected} inspected receipts append-only + sha256-bound`, passed: allPass, detail: allPass ? 'ok' : 'one or more receipts malformed'});
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};