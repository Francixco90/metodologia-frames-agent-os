// H-E006 oracle — tool-policy.yml guardian deny [Edit, Write] + may_remediate false. [CONFIG]
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const POLICY = resolve(ROOT, '02_proceso/governance/tool-policy.yml');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

type Role = {role?: string; tools?: {allow?: string[]; deny?: string[]; conditional?: string[]}};

export const oracle: Oracle = {
  hypothesis_id: 'H-E006',
  run: (): OracleOutcome => {
    const raw = readFileSync(POLICY, 'utf8');
    const evidence = [sha256(raw)];
    const manifest = parse(raw) as {rules?: Role[]};
    const guardian = manifest.rules?.find((o) => o.role === 'guardian');
    const checks: OracleOutcome['oracle_checks'] = [];
    if (!guardian) {
      checks.push({name: 'guardian role present', passed: false});
      return {status: 'fail', oracle_checks: checks, evidence_hashes: evidence};
    }
    const deny = guardian.tools?.deny ?? [];
    const denyOk = deny.includes('Edit') && deny.includes('Write');
    checks.push({name: 'guardian.tools.deny includes Edit + Write', passed: denyOk, detail: `deny=[${deny.join(', ')}]`});
    const conditional = (guardian.tools?.conditional ?? []).join(' ');
    const remediateOk = /may_remediate:\s*false/u.test(conditional);
    checks.push({name: 'guardian may_remediate: false', passed: remediateOk, detail: remediateOk ? 'declared false' : 'not found in conditional'});
    return {status: denyOk && remediateOk ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};