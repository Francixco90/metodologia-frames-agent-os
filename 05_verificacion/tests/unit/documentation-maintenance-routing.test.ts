import {readFileSync} from 'node:fs';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {MaintenanceWorkflowV1Schema, routeMaintenanceIntent} from 'workflows/maintenance/index.ts';

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

  it('separates RT-11 verdict, RT-10 recording and the one-use H01 promotion gate', () => {
    const workflow = MaintenanceWorkflowV1Schema.parse(
      parse(readFileSync('02_proceso/workflows/maintenance/m06-handoff/workflow.yml', 'utf8')),
    );
    expect(workflow.execution_steps).toEqual([
      expect.objectContaining({
        step_id: 'S01',
        verifier: 'RT-11',
        recorder: 'RT-10',
        decision_actor: 'RT-10',
        outputs: ['guardian-verdict', 'guardian-verdict-receipt'],
        gate: 'HM_GUARDIAN_VERDICT_RECORDED',
      }),
      expect.objectContaining({
        step_id: 'S02',
        verifier: null,
        recorder: null,
        decision_actor: 'H01',
        outputs: ['maintenance-handoff'],
        gate: 'HM_PROMOTION_APPROVED',
      }),
    ]);
    expect(() =>
      MaintenanceWorkflowV1Schema.parse({
        ...workflow,
        execution_steps: [
          {...workflow.execution_steps[0], recorder: 'RT-11', decision_actor: 'RT-11'},
          workflow.execution_steps[1],
        ],
      }),
    ).toThrow(/distinct recorder/u);
    expect(() =>
      MaintenanceWorkflowV1Schema.parse({
        ...workflow,
        execution_steps: [
          workflow.execution_steps[0],
          {...workflow.execution_steps[1], decision_actor: 'RT-11'},
        ],
      }),
    ).toThrow(/Only H01/u);

    const commands = parse(readFileSync('05_verificacion/scripts/commands.yaml', 'utf8')) as {
      gates: Array<{gate: string; owner: string; manual: boolean; idempotency: boolean}>;
    };
    expect(commands.gates.find(({gate}) => gate === 'HM_PROMOTION_APPROVED')).toMatchObject({
      owner: 'h01',
      manual: true,
      idempotency: false,
    });
    const projection = readFileSync('01_intencion/reference/workflows/m06.md', 'utf8');
    expect(projection).toContain('RT-11 emite el verdict');
    expect(projection).toContain('RT-10 persiste guardian-verdict-receipt');
    expect(projection).toContain('H01 decide HM_PROMOTION_APPROVED');
    expect(projection).not.toContain('RT-11 decide HM_PROMOTION_APPROVED');
  });

  it('keeps RT-11 read-only and assigns Guardian report persistence to governance', () => {
    const contract = readFileSync('02_proceso/agents/RT-11/contract.yml', 'utf8');
    const toolPolicy = readFileSync('02_proceso/governance/tool-policy.yml', 'utf8');
    const ownership = parse(
      readFileSync('01_intencion/program/ownership-manifest.yml', 'utf8'),
    ) as {
      writers: Record<string, string[]>;
      non_writers: {guardian: {may_remediate: boolean}};
    };

    expect(contract).toContain('Persistir su propio verdict, receipt o estado de promoción');
    expect(contract).not.toContain('Escritura exclusiva de verdicts');
    expect(toolPolicy).toContain('RT-10 is the recorder actor');
    expect(toolPolicy).toContain('governance-owned guardian/** write set');
    expect(ownership.non_writers.guardian.may_remediate).toBe(false);
    expect(ownership.writers.guardian).toEqual([]);
    expect(ownership.writers.governance).toEqual(
      expect.arrayContaining([
        'guardian/**',
        'projects/vs-001-source-to-campaign/guardian/**',
        'projects/pilot-carousel-001/guardian/**',
      ]),
    );
  });

  it('keeps every preserved experience route in the atemporal naming authority', () => {
    const policy = readFileSync('02_proceso/governance/atemporal-naming-policy.md', 'utf8');
    for (const route of [
      'R0',
      'R1',
      'R2',
      'R3',
      'R3-LOOSE',
      'R4',
      'R5',
      'R6',
      'R7',
      'R8',
      'R9',
      'R10',
    ]) {
      expect(policy).toContain(`\`${route}\``);
    }
    expect(policy).not.toContain('rutas `R0`..`R5`');
  });
});
