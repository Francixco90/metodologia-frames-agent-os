import {describe, expect, it} from 'vitest';

import {TaskContractSchema} from '../../../../core/contracts/index.ts';
import {HASH_A, NOW} from './fixtures.ts';

/**
 * Unit tests for `TaskContractSchema` (task-contract-v1). [CÓDIGO]
 *
 * Covers: valid parse, task_id regex, guardian write_set prefix guard,
 * G13-G17 fail-closed guard on ENTREGADO, loose project_id null, and
 * defaulting of no_objetivos/gaps. [CONFIG]
 */
describe('TaskContractSchema', () => {
  function validInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      schema_version: 'task-contract-v1',
      task_id: 'TASK-harness-s16-001',
      project_id: 'metodologia-frames-agent-os',
      objetivo: 'Implementar S16 del harness v2',
      repo: 'metodologia-frames-agent-os',
      responsable: 'qa',
      inputs: ['02_proceso/core/contracts/task-contract.ts'],
      write_set: ['05_verificacion/tests/unit/core/task-contract.test.ts'],
      done: 'pnpm check:ownership PASS + tests PASS',
      validacion: 'pnpm check:ownership && pnpm typecheck && pnpm test',
      state: 'INTAKE',
      created_from_route: 'R3',
      gate_target: 'G08',
      parent_task_id: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    };
  }

  it('parses a valid contract', () => {
    const result = TaskContractSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('rejects a task_id that violates the regex', () => {
    const result = TaskContractSchema.safeParse(validInput({task_id: 'task-loose-1'}));
    expect(result.success).toBe(false);
  });

  it('rejects a guardian write_set not prefixed with guardian/', () => {
    const result = TaskContractSchema.safeParse(
      validInput({
        responsable: 'guardian',
        write_set: ['05_verificacion/guardian/verdict.md'],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('write_set'))).toBe(true);
    }
  });

  it('accepts a guardian write_set prefixed with guardian/', () => {
    const result = TaskContractSchema.safeParse(
      validInput({
        responsable: 'guardian',
        write_set: ['guardian/verdict.md'],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects state ENTREGADO with a G13-G17 gate_target (fail-closed)', () => {
    for (const gate of ['G13', 'G14', 'G15', 'G16', 'G17']) {
      const result = TaskContractSchema.safeParse(
        validInput({state: 'ENTREGADO', gate_target: gate}),
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('state'))).toBe(true);
      }
    }
  });

  it('accepts state ENTREGADO with a non-manual gate_target', () => {
    const result = TaskContractSchema.safeParse(
      validInput({state: 'ENTREGADO', gate_target: 'G08'}),
    );
    expect(result.success).toBe(true);
  });

  it('accepts project_id null (loose task)', () => {
    const result = TaskContractSchema.safeParse(
      validInput({project_id: null, created_from_route: 'R3-LOOSE'}),
    );
    expect(result.success).toBe(true);
  });

  it('defaults no_objetivos and gaps to empty arrays when omitted', () => {
    const input = validInput();
    // Omit optional/defaulted fields explicitly to assert defaults.
    const {no_objetivos, gaps, spawned_subtasks, evidence_tags, ...rest} = input;
    void no_objetivos;
    void gaps;
    void spawned_subtasks;
    void evidence_tags;
    const parsed = TaskContractSchema.parse(rest);
    expect(parsed.no_objetivos).toEqual([]);
    expect(parsed.gaps).toEqual([]);
    expect(parsed.spawned_subtasks).toEqual([]);
    expect(parsed.evidence_tags).toEqual({});
  });

  it('rejects an unknown field (strict object)', () => {
    const result = TaskContractSchema.safeParse(validInput({extra_field: 'nope'}));
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sha256-style timestamp via the hash-free primitive', () => {
    // Sanity: HASH_A is a 64-char hex string; reused here only as a fixture
    // sentinel to confirm the schema does not accept arbitrary noise on a
    // constrained field. [SUPUESTO]
    void HASH_A;
    const result = TaskContractSchema.safeParse(validInput({created_at: 'not-a-timestamp'}));
    expect(result.success).toBe(false);
  });
});
