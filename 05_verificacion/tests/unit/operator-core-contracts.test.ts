import {describe, expect, it} from 'vitest';

import {
  FRAMES_OPERATOR_CONTEXT_BUDGET,
  FRAMES_OPERATOR_PROFILES,
  FRAMES_OPERATOR_PROMPT_CHAIN,
  assertOperatorJobV1,
  buildOperatorCapsuleV1,
  measureOperatorEfficiencyV1,
  planFramesOperatorV1,
  type OperatorJobV1,
} from '../../../02_proceso/workflows/operator-core/index.ts';

const digest = (letter: string): string => letter.repeat(64);

const baseJob = (): OperatorJobV1 => ({
  schema_version: 'operator-job-v1' as const,
  job_id: 'FE.JOB.001',
  domain: 'VIDEO' as const,
  state: 'EXECUTING' as const,
  producer_actor_id: 'producer.01',
  verifier_actor_id: 'verifier.01',
  guardian_actor_id: 'guardian.01',
  prompt_count: 3,
  work_units: [
    {
      schema_version: 'work-unit-v1' as const,
      work_unit_id: 'WU.001',
      status: 'ACTIVE' as const,
      depends_on: [],
      write_set: ['work/private/fe-job-001/spec.json'],
      resource_class: 'LIGHT' as const,
      resource_tags: [],
      checkpoint_ref: 'work/private/fe-job-001/checkpoints/wu-001.json',
      attempts: 1,
    },
    {
      schema_version: 'work-unit-v1' as const,
      work_unit_id: 'WU.002',
      status: 'PENDING' as const,
      depends_on: ['WU.001'],
      write_set: ['work/private/fe-job-001/candidate.mp4'],
      resource_class: 'HEAVY' as const,
      resource_tags: ['video_encode' as const],
      checkpoint_ref: 'work/private/fe-job-001/checkpoints/wu-002.json',
      attempts: 0,
    },
  ],
  artifact: null,
  primary_verification: null,
  human_acceptance: null,
  secondary_exports: [{id: 'youtube.fullhd', state: 'QUEUED' as const}],
  capsule: {
    schema_version: 'session-capsule-v1' as const,
    job_id: 'FE.JOB.001',
    domain: 'VIDEO' as const,
    state: 'EXECUTING' as const,
    outcome: 'Entregar el video principal verificado antes de cualquier derivado.',
    active_work_unit_id: 'WU.001',
    decisions: ['Dirección A aprobada'],
    evidence_refs: [{ref: 'work/private/fe-job-001/spec.json', sha256: digest('a')}],
    gaps: [],
    next_gate: 'VO.PRINCIPAL.VERIFIED',
  },
  efficiency: measureOperatorEfficiencyV1({}),
});

describe('Frames Operator Core v1', () => {
  it('expone cuatro prompts, máximo cinco y solo Career/Video', () => {
    expect(FRAMES_OPERATOR_PROMPT_CHAIN).toHaveLength(4);
    expect(FRAMES_OPERATOR_CONTEXT_BUDGET.max_prompts).toBe(5);
    expect(Object.keys(FRAMES_OPERATOR_PROFILES)).toEqual(['CAREER', 'VIDEO']);
    expect(Object.keys(FRAMES_OPERATOR_PROFILES)).not.toContain('TRAINER');
  });

  it('acepta un job compacto con una unidad activa', () => {
    expect(assertOperatorJobV1(baseJob()).job_id).toBe('FE.JOB.001');
  });

  it('convierte una instrucción completa en plan Career de cuatro checkpoints', () => {
    const plan = planFramesOperatorV1({
      request: 'Crear un CV ejecutivo basado en la evidencia aprobada.',
      domain: 'CAREER',
      outcome: 'Paquete de CV listo para revisión humana.',
      sources: [{source_id: 'evidence.bank.001', sha256: digest('e')}],
      primary_deliverables: ['cv-executive-html'],
      secondary_deliverables: ['cv-ats-docx'],
    });
    expect(plan.decision).toBe('ROUTED');
    expect(plan.prompts).toHaveLength(4);
    expect(plan.standard_documents).toContain('positioning-charter');
    expect(plan.secondary_rule).toBe('QUEUE_ONLY_UNTIL_PRIMARY_PASS');
  });

  it('limita la entrada incompleta a tres preguntas bloqueantes', () => {
    const plan = planFramesOperatorV1({request: 'Haz un video.', domain: 'VIDEO'});
    expect(plan.decision).toBe('NEEDS_INPUT');
    expect(plan.blocking_questions).toHaveLength(3);
  });

  it('bloquea más de una unidad semántica activa', () => {
    const input = baseJob();
    input.work_units[1] = {...input.work_units[1]!, status: 'ACTIVE', depends_on: []};
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-ONE-ACTIVE-WORK-UNIT');
  });

  it('bloquea dependencias no verificadas', () => {
    const input = baseJob();
    input.work_units[0] = {...input.work_units[0]!, status: 'PENDING'};
    input.work_units[1] = {...input.work_units[1]!, status: 'ACTIVE'};
    input.capsule.active_work_unit_id = 'WU.002';
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-DEPENDENCY-NOT-PASS');
  });

  it('bloquea pares de recursos incompatibles', () => {
    const input = baseJob();
    input.work_units[0] = {
      ...input.work_units[0]!,
      resource_class: 'HEAVY',
      resource_tags: ['local_llm', 'video_encode'],
    };
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-RESOURCE-CONFLICT');
  });

  it('bloquea compilación de derivados antes del PASS principal', () => {
    const input = baseJob();
    input.secondary_exports = [{id: 'youtube.fullhd', state: 'COMPILED'}];
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-PRIMARY-BEFORE-DERIVATIVE');
  });

  it('bloquea aceptación humana sin receipt exacto', () => {
    const input = {
      ...baseJob(),
      state: 'HUMAN_ACCEPTED' as const,
      work_units: baseJob().work_units.map((unit) => ({...unit, status: 'PASS' as const})),
      artifact: {
        schema_version: 'artifact-identity-chain-v1' as const,
        artifact_id: 'ART.001',
        source_set_sha256: digest('a'),
        spec_sha256: digest('b'),
        build_sha256: digest('c'),
        manifest_sha256: digest('d'),
        state: 'HUMAN_ACCEPTED' as const,
      },
      primary_verification: {
        verifier_actor_id: 'verifier.01',
        artifact_id: 'ART.001',
        manifest_sha256: digest('d'),
        verdict: 'PASS' as const,
      },
      capsule: {
        ...baseJob().capsule,
        state: 'HUMAN_ACCEPTED' as const,
        active_work_unit_id: null,
      },
    };
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-HUMAN-ACCEPTANCE-REQUIRED');
  });

  it('produce cápsula compacta y portable', () => {
    const capsule = buildOperatorCapsuleV1(baseJob().capsule);
    expect(capsule).toContain('estimated_tokens:');
    expect(capsule).not.toContain('/Users/');
  });

  it('no afirma ahorro sin baseline medido', () => {
    const receipt = measureOperatorEfficiencyV1({candidate_tokens: 400});
    expect(receipt.status).toBe('UNMEASURED');
    expect(receipt.target_half_cost_met).toBe(false);
  });

  it('rechaza un claim de eficiencia agregado sin medición', () => {
    const input = baseJob();
    input.efficiency.target_half_cost_met = true;
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-EFFICIENCY-UNMEASURED-CLAIM');
  });

  it('rechaza un porcentaje medido que no coincide con los tokens', () => {
    const input = baseJob();
    input.efficiency = {
      schema_version: 'efficiency-receipt-v1',
      status: 'MEASURED',
      baseline_tokens: 10_000,
      candidate_tokens: 8_000,
      baseline_prompts: 12,
      candidate_prompts: 4,
      reduction_percent: 50,
      target_half_cost_met: true,
    };
    expect(() => assertOperatorJobV1(input)).toThrow('OPERATOR-EFFICIENCY-MEASUREMENT-MISMATCH');
  });

  it('calcula el target de mitad de costo solo con medición completa', () => {
    const receipt = measureOperatorEfficiencyV1({
      baseline_tokens: 10_000,
      candidate_tokens: 4_800,
      baseline_prompts: 18,
      candidate_prompts: 4,
    });
    expect(receipt.status).toBe('MEASURED');
    expect(receipt.reduction_percent).toBe(52);
    expect(receipt.target_half_cost_met).toBe(true);
  });
});
