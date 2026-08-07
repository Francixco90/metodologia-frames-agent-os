import {describe, expect, it} from 'vitest';

import {type TaskTransitionRequest, type TaskWorkState} from '../../../../core/contracts/index.ts';
import {
  TaskStateTransitionError,
  assertDirectTaskTransition,
  nextTaskState,
  taskPolicies,
  transitionTaskState,
} from '../../../../core/state-machine/task-machine.ts';
import {HASH_A, HASH_B, NOW, portableRef} from './fixtures.ts';

/**
 * Unit tests for the task-level work-state machine (`task-machine.ts`). [CÓDIGO]
 *
 * Covers: 8 legal transitions, illegal skips, monotonic forward successor,
 * BLOQUEADO terminal-under-monotonic, and rule 9 (distinct producer/consumer
 * on ENTREGADO handoff). [CONFIG]
 */
describe('task state machine', () => {
  describe('assertDirectTaskTransition', () => {
    it('accepts all 8 legal transitions', () => {
      const legal: Array<[TaskWorkState, TaskWorkState]> = [
        ['INTAKE', 'ESPECIFICADO'],
        ['ESPECIFICADO', 'COMPILADO'],
        ['COMPILADO', 'EVALUADO'],
        ['EVALUADO', 'ENTREGADO'],
        ['EVALUADO', 'BLOQUEADO'],
        ['COMPILADO', 'BLOQUEADO'],
        ['ESPECIFICADO', 'BLOQUEADO'],
        ['BLOQUEADO', 'ESPECIFICADO'],
      ];
      expect(legal).toHaveLength(taskPolicies.length);
      for (const [from, to] of legal) {
        expect(() => assertDirectTaskTransition(from, to)).not.toThrow();
      }
    });

    it('throws TaskStateTransitionError on illegal skips', () => {
      expect(() => assertDirectTaskTransition('INTAKE', 'COMPILADO')).toThrow(
        TaskStateTransitionError,
      );
      expect(() => assertDirectTaskTransition('INTAKE', 'COMPILADO')).toThrow(
        /Illegal task state transition/u,
      );
      expect(() => assertDirectTaskTransition('BLOQUEADO', 'COMPILADO')).toThrow(
        TaskStateTransitionError,
      );
    });

    it('throws on ENTREGADO as a source (terminal under policies)', () => {
      expect(() => assertDirectTaskTransition('ENTREGADO', 'INTAKE')).toThrow(
        TaskStateTransitionError,
      );
    });
  });

  describe('nextTaskState (monotonic forward)', () => {
    it('returns the monotonic successor chain INTAKE -> ... -> ENTREGADO', () => {
      expect(nextTaskState('INTAKE')).toBe('ESPECIFICADO');
      expect(nextTaskState('ESPECIFICADO')).toBe('COMPILADO');
      expect(nextTaskState('COMPILADO')).toBe('EVALUADO');
      expect(nextTaskState('EVALUADO')).toBe('ENTREGADO');
      expect(nextTaskState('ENTREGADO')).toBeUndefined();
    });

    it('returns undefined for BLOQUEADO (must replan via explicit transition)', () => {
      expect(nextTaskState('BLOQUEADO')).toBeUndefined();
    });
  });

  describe('transitionTaskState — handoff rule 9', () => {
    function handoff(
      producer: string,
      consumer: string,
      decision: 'accepted' | 'revise' | 'blocked' = 'accepted',
    ): unknown {
      return {
        schemaVersion: 'handoff-v1',
        handoffId: 'handoff:task-s16-001',
        packageId: 'A03',
        producerActorId: producer,
        consumerActorId: consumer,
        baseCommit: HASH_A,
        sourceSnapshotId: 'snapshot:task-s16-001',
        inputRefs: [portableRef('source', 'source:one')],
        outputs: [{path: '05_verificacion/tests/unit/core/task-machine.test.ts', sha256: HASH_B}],
        claims: [],
        mutations: [],
        tests: [{command: 'pnpm test', status: 'passed', exitCode: 0}],
        decision,
        risks: [],
        coverageGaps: [],
        nextGate: 'G08',
        timestamp: NOW,
      };
    }

    function transitionRequest(overrides: Record<string, unknown> = {}): unknown {
      return {
        taskId: 'TASK-harness-s16-001',
        currentState: 'EVALUADO',
        nextState: 'ENTREGADO',
        producerActorId: 'actor:producer',
        actorId: 'actor:verifier',
        actorRole: 'verifier',
        evidence: [{kind: 'handoff-accepted', hash: HASH_B, ref: 'receipts/handoff/001.json'}],
        handoff: handoff('actor:producer', 'actor:verifier'),
        ...overrides,
      };
    }

    it('accepts ENTREGADO when consumer differs from producer (rule 9)', () => {
      expect(transitionTaskState(transitionRequest() as TaskTransitionRequest)).toBe('ENTREGADO');
    });

    it('rejects ENTREGADO when consumer === producer (rule 9: distinct actors)', () => {
      const same = transitionRequest({
        handoff: handoff('actor:producer', 'actor:producer'),
      });
      expect(() => transitionTaskState(same as TaskTransitionRequest)).toThrow(
        TaskStateTransitionError,
      );
      expect(() => transitionTaskState(same as TaskTransitionRequest)).toThrow(/distinct actors/u);
    });

    it('rejects ENTREGADO when handoff decision is not accepted', () => {
      const revised = transitionRequest({
        handoff: handoff('actor:producer', 'actor:verifier', 'revise'),
      });
      expect(() => transitionTaskState(revised as TaskTransitionRequest)).toThrow(
        /handoff decision "accepted"/u,
      );
    });

    it('rejects ENTREGADO when handoff is missing', () => {
      const noHandoff = transitionRequest();
      delete (noHandoff as Record<string, unknown>).handoff;
      expect(() => transitionTaskState(noHandoff as TaskTransitionRequest)).toThrow(
        /handoff record/u,
      );
    });
  });
});
