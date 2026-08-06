// H-E010 oracle — R3-LOOSE creates project_id: null task. [CONFIG] [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {TaskContractSchema} from '../../../02_proceso/core/contracts/index.ts';
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const TASKS_DIR = resolve(ROOT, '04_estado/tasks');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

export const oracle: Oracle = {
  hypothesis_id: 'H-E010',
  run: (): OracleOutcome => {
    const checks: OracleOutcome['oracle_checks'] = [];
    const evidence: string[] = [];
    const dirs = readdirSync(TASKS_DIR, {withFileTypes: true}).filter((e) => e.isDirectory() && e.name.startsWith('TASK-')).map((e) => e.name);
    const loose: string[] = [];
    for (const d of dirs) {
      const p = resolve(TASKS_DIR, d, 'task.yaml');
      let raw: string;
      try {
        raw = readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      const parsed = TaskContractSchema.safeParse(parse(raw) as unknown);
      if (parsed.success && parsed.data.created_from_route === 'R3-LOOSE') {
        loose.push(d);
        evidence.push(sha256(raw));
      }
    }
    checks.push({name: 'at least one R3-LOOSE task discovered', passed: loose.length > 0, detail: `${loose.length} loose task(s)`});
    if (loose.length === 0) return {status: 'skipped', oracle_checks: checks, evidence_hashes: evidence, notes: 'no R3-LOOSE task in repo'};
    let allPass = true;
    for (const d of loose) {
      const raw = readFileSync(resolve(TASKS_DIR, d, 'task.yaml'), 'utf8');
      const parsed = TaskContractSchema.safeParse(parse(raw) as unknown);
      if (!parsed.success) {
        checks.push({name: `${d} parses`, passed: false});
        allPass = false;
        continue;
      }
      const c = parsed.data;
      const pidOk = c.project_id === null;
      const routeOk = c.created_from_route === 'R3-LOOSE';
      checks.push({name: `${d} project_id=null`, passed: pidOk, detail: `project_id=${c.project_id ?? 'null'}`});
      checks.push({name: `${d} created_from_route=R3-LOOSE`, passed: routeOk});
      if (!pidOk || !routeOk) allPass = false;
    }
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};