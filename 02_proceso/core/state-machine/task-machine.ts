import {
  TaskTransitionRequestSchema,
  type TaskTransitionRequest,
  type TaskWorkState,
} from '../contracts/index.ts';

/**
 * Task-level work-state machine.
 *
 * Sibling to `machine.ts` (which holds the work-product level
 * `GlobalWorkState` / `AudiovisualWorkState` machines). This module governs
 * the lifecycle of a single task contract (`TaskWorkState`) and MUST NOT be
 * confused with the work-product machines. [CÓDIGO]
 *
 * Legal transitions (8 total):
 *   INTAKE       -> ESPECIFICADO   (contract-complete)
 *   ESPECIFICADO -> COMPILADO      (work-built)
 *   COMPILADO    -> EVALUADO       (checks-green)
 *   EVALUADO     -> ENTREGADO      (handoff-accepted — producer/verifier distinct, rule 9)
 *   EVALUADO     -> BLOQUEADO      (gate-fail)
 *   COMPILADO    -> BLOQUEADO      (gate-fail)
 *   ESPECIFICADO -> BLOQUEADO      (gate-fail)
 *   BLOQUEADO    -> ESPECIFICADO   (replan — only non-monotonic path)
 *
 * BLOQUEADO never transitions to COMPILADO. [CONFIG]
 */

export class TaskStateTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TaskStateTransitionError';
  }
}

export const taskOrder = [
  'INTAKE',
  'ESPECIFICADO',
  'COMPILADO',
  'EVALUADO',
  'ENTREGADO',
  'BLOQUEADO',
] as const;

type TaskPolicy = {
  readonly from: TaskWorkState;
  readonly to: TaskWorkState;
  readonly guard: (req: TaskTransitionRequest) => true | string;
};

function hasEvidence(
  req: TaskTransitionRequest,
  kind: TaskTransitionRequest['evidence'][number]['kind'],
): boolean {
  return req.evidence.some((item) => item.kind === kind);
}

const contractCompleteGuard: TaskPolicy['guard'] = (req) =>
  hasEvidence(req, 'contract-complete')
    ? true
    : 'INTAKE -> ESPECIFICADO requires evidence kind "contract-complete"';

const workBuiltGuard: TaskPolicy['guard'] = (req) =>
  hasEvidence(req, 'work-built')
    ? true
    : 'ESPECIFICADO -> COMPILADO requires evidence kind "work-built"';

const checksGreenGuard: TaskPolicy['guard'] = (req) =>
  hasEvidence(req, 'checks-green')
    ? true
    : 'COMPILADO -> EVALUADO requires evidence kind "checks-green"';

const gateFailGuard: TaskPolicy['guard'] = (req) =>
  hasEvidence(req, 'gate-fail')
    ? true
    : 'Transition to BLOQUEADO requires evidence kind "gate-fail"';

const replanGuard: TaskPolicy['guard'] = (req) =>
  hasEvidence(req, 'replan') ? true : 'BLOQUEADO -> ESPECIFICADO requires evidence kind "replan"';

const handoffAcceptedGuard: TaskPolicy['guard'] = (req) => {
  if (req.handoff === undefined) {
    return 'EVALUADO -> ENTREGADO requires a handoff record';
  }
  if (req.handoff.decision !== 'accepted') {
    return `EVALUADO -> ENTREGADO requires handoff decision "accepted", got "${req.handoff.decision}"`;
  }
  // Rule 9: producer, verifier and Guardian must be distinct. The handoff
  // consumer is the accepting verifier; it must differ from the producer. [CONFIG]
  if (req.handoff.consumerActorId === req.producerActorId) {
    return 'EVALUADO -> ENTREGADO requires handoff consumer to differ from producer (rule 9: distinct actors)';
  }
  return true;
};

export const taskPolicies: readonly TaskPolicy[] = [
  {from: 'INTAKE', to: 'ESPECIFICADO', guard: contractCompleteGuard},
  {from: 'ESPECIFICADO', to: 'COMPILADO', guard: workBuiltGuard},
  {from: 'COMPILADO', to: 'EVALUADO', guard: checksGreenGuard},
  {from: 'EVALUADO', to: 'ENTREGADO', guard: handoffAcceptedGuard},
  {from: 'EVALUADO', to: 'BLOQUEADO', guard: gateFailGuard},
  {from: 'COMPILADO', to: 'BLOQUEADO', guard: gateFailGuard},
  {from: 'ESPECIFICADO', to: 'BLOQUEADO', guard: gateFailGuard},
  {from: 'BLOQUEADO', to: 'ESPECIFICADO', guard: replanGuard},
];

export function assertDirectTaskTransition(current: TaskWorkState, next: TaskWorkState): void {
  const matches = taskPolicies.some((p) => p.from === current && p.to === next);
  if (!matches) {
    throw new TaskStateTransitionError(`Illegal task state transition: ${current} -> ${next}`);
  }
}

export function transitionTaskState(req: TaskTransitionRequest): TaskWorkState {
  // Validate the input shape even when called with a typed value, mirroring
  // executeTransition's `TransitionRequestSchema.parse(input)` step. [CÓDIGO]
  const request = TaskTransitionRequestSchema.parse(req);
  const current = request.currentState;
  const next = request.nextState;
  assertDirectTaskTransition(current, next);
  const policy = taskPolicies.find((p) => p.from === current && p.to === next);
  // assertDirectTaskTransition guarantees a match; guard for the type system
  // under noUncheckedIndexedAccess. [SUPUESTO]
  if (policy === undefined) {
    throw new TaskStateTransitionError(`Illegal task state transition: ${current} -> ${next}`);
  }
  const guardResult = policy.guard(request);
  if (guardResult !== true) {
    throw new TaskStateTransitionError(guardResult);
  }
  return next;
}

/**
 * Monotonic forward successor, ignoring BLOQUEADO branches.
 *
 * Returns the single non-BLOQUEADO forward successor for states that have
 * exactly one (INTAKE, ESPECIFICADO, COMPILADO). Returns undefined for
 * EVALUADO (branches to both ENTREGADO and BLOQUEADO — caller must use
 * transitionTaskState with explicit nextState), ENTREGADO (terminal) and
 * BLOQUEADO (must replan via transitionTaskState with replan evidence).
 *
 * Simplified per spec: INTAKE->ESPECIFICADO, ESPECIFICADO->COMPILADO,
 * COMPILADO->EVALUADO, EVALUADO->ENTREGADO; ENTREGADO->undefined;
 * BLOQUEADO->undefined. [CONFIG]
 */
const monotonicForward: Readonly<Record<TaskWorkState, TaskWorkState | undefined>> = {
  INTAKE: 'ESPECIFICADO',
  ESPECIFICADO: 'COMPILADO',
  COMPILADO: 'EVALUADO',
  EVALUADO: 'ENTREGADO',
  ENTREGADO: undefined,
  BLOQUEADO: undefined,
};

export function nextTaskState(current: TaskWorkState): TaskWorkState | undefined {
  return monotonicForward[current];
}
