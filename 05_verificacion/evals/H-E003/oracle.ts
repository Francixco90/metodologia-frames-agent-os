// H-E003 oracle — state machine rejects illegal skip INTAKE -> COMPILADO. [CÓDIGO]
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

const req = (from: TaskWorkState, to: TaskWorkState): TaskTransitionRequest => ({
  taskId: 'TASK-eval-h003-001',
  currentState: from,
  nextState: to,
  producerActorId: 'actor-eval-001',
  actorId: 'actor-eval-001',
  actorRole: 'system',
  evidence: [{kind: 'contract-complete', hash: 'a'.repeat(64), ref: 'evals/H-E003/README.md'}],
});

export const oracle: Oracle = {
  hypothesis_id: 'H-E003',
  run: (): OracleOutcome => {
    const evidence = [sha256(readFileSync(MACHINE_SRC, 'utf8'))];
    const checks: OracleOutcome['oracle_checks'] = [];
    let rejected = false;
    try {
      transitionTaskState(req('INTAKE', 'COMPILADO'));
      checks.push({
        name: 'INTAKE->COMPILADO rejected',
        passed: false,
        detail: 'transition accepted (illegal)',
      });
    } catch (err) {
      rejected = err instanceof TaskStateTransitionError;
      checks.push({
        name: 'INTAKE->COMPILADO rejected',
        passed: rejected,
        detail: rejected ? 'TaskStateTransitionError raised' : (err as Error).message,
      });
    }
    return {status: rejected ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};
