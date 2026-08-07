// H-E007 oracle — commands.yaml G13-G17 manual + fail_closed. [CONFIG]
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const COMMANDS = resolve(ROOT, '05_verificacion/scripts/commands.yaml');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

type Gate = {gate: string; manual?: boolean; fail_closed?: boolean};

export const oracle: Oracle = {
  hypothesis_id: 'H-E007',
  run: (): OracleOutcome => {
    const raw = readFileSync(COMMANDS, 'utf8');
    const evidence = [sha256(raw)];
    const manifest = parse(raw) as {gates?: Gate[]};
    const checks: OracleOutcome['oracle_checks'] = [];
    let allPass = true;
    for (const id of ['G13', 'G14', 'G15', 'G16', 'G17']) {
      const g = manifest.gates?.find((x) => x.gate === id);
      const ok = g?.manual === true && g?.fail_closed === true;
      checks.push({
        name: `${id} manual+fail_closed`,
        passed: ok,
        detail: ok ? 'ok' : `manual=${g?.manual} fail_closed=${g?.fail_closed}`,
      });
      if (!ok) allPass = false;
    }
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};
