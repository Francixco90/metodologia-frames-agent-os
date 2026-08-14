import {describe, expect, it} from 'vitest';

import {routeCareerIntent} from '../../../02_proceso/workflows/career/_runner/route-career.ts';
import {bindOperatorDomainPlanV1} from '../../../02_proceso/workflows/operator-core/index.ts';
import {planVideoOs} from '../../../02_proceso/workflows/video-os/index.ts';

describe('Operator Core domain bindings', () => {
  it('liga el plan ejecutable actual de Video OS al perfil común', () => {
    const plan = planVideoOs({
      request: 'Crear video largo horizontal con derivado vertical en cola.',
      sourceRefs: ['work/private/video/source.mp4'],
      sourceAuthority: 'verified',
      rights: 'cleared',
      secondaryExports: ['9:16'],
    });
    const binding = bindOperatorDomainPlanV1('VIDEO', plan);
    expect(binding.status).toBe('BOUND');
    expect(binding.documents).toHaveLength(11);
  });

  it('liga la ruta ejecutable actual de Career OS al perfil común', () => {
    const plan = routeCareerIntent({
      request: 'Crear un CV general basado en evidencia.',
      candidateId: 'CAND-SYNTHETIC-001',
      targetRole: 'AI Transformation Lead',
      profileReady: true,
    });
    const binding = bindOperatorDomainPlanV1('CAREER', plan);
    expect(binding.status).toBe('BOUND');
    expect(binding.stages).toContain('C06');
  });

  it('bloquea drift de documentos en Video OS', () => {
    const plan = planVideoOs({
      request: 'Crear video.',
      sourceRefs: ['work/private/video/source.mp4'],
      sourceAuthority: 'verified',
      rights: 'cleared',
    });
    expect(() =>
      bindOperatorDomainPlanV1('VIDEO', {...plan, standard_artifacts: ['brief.md']}),
    ).toThrow('OPERATOR-VIDEO-DOCUMENT-DRIFT');
  });

  it('bloquea una etapa Career ajena al perfil', () => {
    expect(() =>
      bindOperatorDomainPlanV1('CAREER', {
        selected_stage_path: ['T00'],
        blocking_questions: [],
        next_gate: 'CR_BRIEF_APPROVED',
      }),
    ).toThrow('OPERATOR-CAREER-STAGE-DRIFT');
  });
});
