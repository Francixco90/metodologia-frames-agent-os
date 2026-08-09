import {describe, expect, it} from 'vitest';
import {
  analyzeSpokenVideoFixtureV1,
  routeSkillSystemIntentV1,
} from '../../../02_proceso/workflows/skill-systems/router.ts';

describe('Skill Systems synthetic canary', () => {
  it('routes ordinary language through R8 and asks only material gaps', () => {
    const result = routeSkillSystemIntentV1({
      request: 'Ayúdame a crear una capacidad para revisar skills',
    });
    expect(result).toMatchObject({
      route_via: 'R8',
      recommended_scope: 'PROJECT_LOCAL',
      alternatives: ['CANONICAL'],
      active_step: 'S00',
      state: 'NEEDS_INPUT',
    });
    expect(result.blocking_questions.length).toBeLessThanOrEqual(3);
  });

  it('routes a complete canonical request through R9 without redundant questions', () => {
    const result = routeSkillSystemIntentV1({
      request: 'Crea una skill canónica para validar contratos',
      scope: 'CANONICAL',
      desiredOutcome: 'Bloquear referencias rotas antes de activar',
      evidenceRefs: ['00_inbox/first-party/source.yml'],
    });
    expect(result).toMatchObject({
      route_via: 'R9',
      blocking_questions: [],
      state: 'READY_FOR_CASE',
      next_gate: 'HM_CHANGE_APPROVED',
    });
  });

  it('classifies the spoken-video fixture without executing media', () => {
    const result = analyzeSpokenVideoFixtureV1();
    expect(result).toMatchObject({decision: 'KEEP', media_execution: false});
    expect(result.components.map(({kind}) => kind)).toEqual([
      'SKILL',
      'TOOL',
      'TOOL',
      'EVALUATOR',
      'HUMAN_GATE',
    ]);
    expect(result.invariants).toEqual(
      expect.arrayContaining(['RIGHTS_REQUIRED', 'ACCESSIBILITY_REQUIRED']),
    );
    expect(result.split.status).toBe('HOLD');
  });
});
