// H-E001 oracle — harness bootstraps an R3 task (state INTAKE, project bound). [CÓDIGO]
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
  hypothesis_id: 'H-E001',
  run: (): OracleOutcome => {
    const checks: OracleOutcome['oracle_checks'] = [];
    const evidence: string[] = [];
    const dirs = readdirSync(TASKS_DIR, {withFileTypes: true})
      .filter((e) => e.isDirectory() && e.name.startsWith('TASK-'))
      .map((e) => e.name);
    const r3Tasks: string[] = [];
    for (const d of dirs) {
      const p = resolve(TASKS_DIR, d, 'task.yaml');
      let raw: string;
      try {
        raw = readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      const parsed = TaskContractSchema.safeParse(parse(raw) as unknown);
      if (parsed.success && parsed.data.created_from_route === 'R3') {
        r3Tasks.push(d);
        evidence.push(sha256(raw));
      }
    }
    checks.push({
      name: 'at least one R3 task discovered',
      passed: r3Tasks.length > 0,
      detail: r3Tasks.length === 0 ? 'no task with created_from_route: R3 found' : `${r3Tasks.length} R3 task(s)`,
    });
    if (r3Tasks.length === 0) {
      return {status: 'skipped', oracle_checks: checks, evidence_hashes: evidence, notes: 'precondition absent: no R3 task in repo'};
    }
    let allPass = true;
    for (const d of r3Tasks) {
      const raw = readFileSync(resolve(TASKS_DIR, d, 'task.yaml'), 'utf8');
      const parsed = TaskContractSchema.safeParse(parse(raw) as unknown);
      if (!parsed.success) {
        checks.push({name: `${d} parses TaskContractSchema`, passed: false, detail: parsed.error.issues[0]?.message});
        allPass = false;
        continue;
      }
      const c = parsed.data;
      const stateOk = c.state === 'INTAKE';
      const pidOk = c.project_id !== null && /^[a-z0-9-]+$/u.test(c.project_id);
      checks.push({name: `${d} state=INTAKE`, passed: stateOk, detail: `state=${c.state}`});
      checks.push({name: `${d} project_id non-null + slug`, passed: pidOk, detail: `project_id=${c.project_id ?? 'null'}`});
      if (!stateOk || !pidOk) allPass = false;
    }
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};