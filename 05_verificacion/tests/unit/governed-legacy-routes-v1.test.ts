import {describe, expect, it} from 'vitest';

import {
  routeEvalIntent,
  routeProjectContinueIntent,
  routeProjectCreateIntent,
  routeTaskCreateIntent,
} from 'workflows/core/governed-legacy-routes-v1.ts';

describe('governed legacy routes', () => {
  it('routes a complete project creation and asks for the missing data otherwise', () => {
    const full = routeProjectCreateIntent({
      request: 'crear proyecto',
      project_id: 'demo-2026',
      title: 'Demo',
      outcome: 'Un demo publicado',
    });
    expect(full).toMatchObject({
      route_id: 'R1',
      decision: 'ROUTED',
      next_gate: 'PJ_SCAFFOLD_APPROVED',
      write_policy: 'read_only_until_PJ_SCAFFOLD_APPROVED',
    });
    expect(full.declared_write_set[0]).toBe('03_artefactos/projects/demo-2026/**');
    const partial = routeProjectCreateIntent({request: 'crear proyecto'});
    expect(partial.decision).toBe('NEEDS_INPUT');
    expect(partial.blocking_questions).toHaveLength(3);
    expect(partial.declared_write_set).toEqual([]);
    expect(routeProjectCreateIntent({request: 'crear proyecto'}).request_hash).toBe(
      partial.request_hash,
    );
  });

  it('never selects a project on its own when several are ongoing', () => {
    const many = routeProjectContinueIntent({request: 'retomar', known_projects: ['a-1', 'b-2']});
    expect(many).toMatchObject({
      route_id: 'R2',
      decision: 'NEEDS_INPUT',
      candidates: ['a-1', 'b-2'],
    });
    expect(routeProjectContinueIntent({request: 'retomar', known_projects: ['a-1']}).decision).toBe(
      'ROUTED',
    );
    expect(
      routeProjectContinueIntent({
        request: 'retomar',
        project_id: 'b-2',
        known_projects: ['a-1', 'b-2'],
      }).decision,
    ).toBe('ROUTED');
    expect(routeProjectContinueIntent({request: 'retomar'}).blocking_questions[0]).toMatch(/R1/u);
  });

  it('separates bound and loose tasks and keeps the write set inside 04_estado/tasks', () => {
    const bound = routeTaskCreateIntent({
      request: 'crear tarea',
      project_id: 'a-1',
      title: 'T',
      acceptance: 'ok',
    });
    const loose = routeTaskCreateIntent({request: 'crear tarea', title: 'T', acceptance: 'ok'});
    expect(bound.route_id).toBe('R3');
    expect(loose.route_id).toBe('R3-LOOSE');
    for (const decision of [bound, loose])
      expect(decision.declared_write_set.every((path) => path.startsWith('04_estado/tasks/'))).toBe(
        true,
      );
    expect(() => routeTaskCreateIntent({request: 'crear tarea', extra: 1})).toThrow();
  });

  it('asks for the eval mode before planning a run', () => {
    expect(routeEvalIntent({request: 'eval'}).decision).toBe('NEEDS_INPUT');
    expect(routeEvalIntent({request: 'eval', mode: 'ablation'})).toMatchObject({
      route_id: 'R5',
      decision: 'ROUTED',
      next_gate: 'EV_RUN_APPROVED',
    });
  });
});
