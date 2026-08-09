import {describe, expect, it} from 'vitest';

import {routeMaintenanceIntent} from 'workflows/maintenance/index.ts';

describe('R9 maintenance routing', () => {
  it('asks no more than three material questions and stops before mutation', () => {
    const result = routeMaintenanceIntent({request: 'Corrige Frames'});
    expect(result).toMatchObject({
      route_id: 'R9',
      decision: 'NEEDS_INPUT',
      next_gate: 'HM_CHANGE_APPROVED',
    });
    expect(result.blocking_questions).toHaveLength(3);
  });

  it('is deterministic and selects the complete governed stage path', () => {
    const input = {
      request: 'Corrige el generador documental.',
      change_summary: 'El checker acepta referencias rotas.',
      target_surface: 'Generador de documentación',
      expected_outcome: 'Una referencia rota bloquea el cierre.',
    };
    const first = routeMaintenanceIntent(input);
    const second = routeMaintenanceIntent(input);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      decision: 'ROUTED',
      selected_stage_path: ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06'],
      blocking_questions: [],
      next_gate: 'HM_CHANGE_APPROVED',
    });
  });
});
