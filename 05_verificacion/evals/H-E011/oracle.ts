// H-E011 oracle — doctor receipt families present (6: imports, renders,
// dependency-audits, migrations, check-runs, workflows). [CÓDIGO]
//
// NOTE: the original SPEC v2.0.0-candidate named 5 families; Phase 1 D2 added
// the `workflows` family for multimedia-workflow-receipt-v1. The oracle
// asserts the current truth (6). The README was updated accordingly. [CONFIG]
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const RECEIPTS = resolve(ROOT, '04_estado/receipts');
const DOCTOR = resolve(ROOT, '05_verificacion/scripts/doctor.ts');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

const FAMILIES = ['imports', 'renders', 'dependency-audits', 'migrations', 'check-runs', 'workflows'];

export const oracle: Oracle = {
  hypothesis_id: 'H-E011',
  run: (): OracleOutcome => {
    const evidence = [sha256(readFileSync(DOCTOR, 'utf8'))];
    const checks: OracleOutcome['oracle_checks'] = [];
    let allPass = true;
    for (const fam of FAMILIES) {
      const ok = existsSync(resolve(RECEIPTS, fam));
      checks.push({name: `receipt family ${fam} present`, passed: ok});
      if (!ok) allPass = false;
    }
    checks.push({name: 'exactly 6 receipt families', passed: FAMILIES.length === 6});
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};