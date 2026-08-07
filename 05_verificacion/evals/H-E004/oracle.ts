// H-E004 oracle — BLOQUEADO->ESPECIFICADO replan allowed; BLOQUEADO->COMPILADO rejected. [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  transitionTaskState,
  TaskStateTransitionError,
} from '../../../02_proceso/core/state-machine/task-machine.ts';
import type {
  TaskTransitionRequest,
  TaskWorkState,
} from '../../../02_proceso/core/contracts/index.ts';
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');
const MACHINE_SRC = resolve(ROOT, '02_proceso/core/state-machine/task-machine.ts');

const req = (
  from: TaskWorkState,
  to: TaskWorkState,
  kind: 'replan' | 'gate-fail',
): TaskTransitionRequest => ({
  taskId: 'TASK-eval-h004-001',
  currentState: from,
  nextState: to,
  producerActorId: 'actor-eval-001',
  actorId: 'actor-eval-001',
  actorRole: 'system',
  evidence: [{kind, hash: 'b'.repeat(64), ref: 'evals/H-E004/README.md'}],
});

const attempt = (from: TaskWorkState, to: TaskWorkState, kind: 'replan' | 'gate-fail'): boolean => {
  try {
    transitionTaskState(req(from, to, kind));
    return true;
  } catch (err) {
    if (err instanceof TaskStateTransitionError) return false;
    throw err;
  }
};

export const oracle: Oracle = {
  hypothesis_id: 'H-E004',
  run: (): OracleOutcome => {
    const evidence = [sha256(readFileSync(MACHINE_SRC, 'utf8'))];
    const checks: OracleOutcome['oracle_checks'] = [];
    const step1 = attempt('BLOQUEADO', 'ESPECIFICADO', 'replan');
    checks.push({
      name: 'step1 BLOQUEADO->ESPECIFICADO (replan) accepted',
      passed: step1,
      detail: step1 ? 'accepted' : 'rejected',
    });
    const step2 = !attempt('BLOQUEADO', 'COMPILADO', 'gate-fail');
    checks.push({
      name: 'step2 BLOQUEADO->COMPILADO rejected',
      passed: step2,
      detail: step2 ? 'rejected' : 'accepted (illegal)',
    });
    const step3 = !attempt('BLOQUEADO', 'ESPECIFICADO', 'gate-fail');
    checks.push({
      name: 'step3 BLOQUEADO->ESPECIFICADO without replan evidence rejected',
      passed: step3,
      detail: step3 ? 'rejected (wrong evidence)' : 'accepted without replan',
    });
    const allPass = step1 && step2 && step3;
    return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};
