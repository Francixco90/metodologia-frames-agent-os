import {describe, expect, it} from 'vitest';

import {readRepositoryYaml} from '../../fixtures/verifier/io.ts';

/**
 * Contract test: `02_proceso/governance/router.yml` (router-v1).
 * Asserts the 12 routes, R3-LOOSE project_id null, productive routes,
 * route semantics and source_of_truth true. Gate execution belongs to commands.yaml. [CONFIG]
 */
describe('router.yml contract', () => {
  const router = readRepositoryYaml('02_proceso/governance/router.yml') as {
    schema_version: number;
    manifest_id: string;
    source_of_truth: boolean;
    routes: Array<{
      id: string;
      binds_to: string | null;
      signal?: string;
      signal_patterns?: string[];
      reads?: string[];
      output?: string;
    }>;
  };
  const commands = readRepositoryYaml('05_verificacion/scripts/commands.yaml') as {
    gates: Array<{
      gate: string;
      command: string | null;
      manual: boolean;
      fail_closed: boolean;
      idempotency: boolean;
      owner: string;
    }>;
  };
  const commandByGate = new Map(commands.gates.map((entry) => [entry.gate, entry]));

  it('declares schema_version 1 and manifest_id router-v1', () => {
    expect(router.schema_version).toBe(1);
    expect(router.manifest_id).toBe('router-v1');
  });

  it('is marked source_of_truth: true', () => {
    expect(router.source_of_truth).toBe(true);
  });

  it('declares R0-R10 plus R3-LOOSE', () => {
    const ids = router.routes.map((r) => r.id);
    expect(ids).toHaveLength(12);
    expect(ids).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('R8 and R9 resolve local extension and maintenance workflows fail-closed', () => {
    const local = router.routes.find((route) => route.id === 'R8');
    expect(local?.reads).toEqual(
      expect.arrayContaining([
        '02_proceso/workflows/local-extensions/contracts.ts',
        '03_artefactos/skills/frames-local-extension-foundry/SKILL.md',
      ]),
    );
    expect(local?.output).toMatch(/L00-L05/u);
    expect(local?.output).toMatch(/LX_BRIEF_APPROVED/u);

    const maintenance = router.routes.find((route) => route.id === 'R9');
    expect(maintenance?.reads).toEqual(
      expect.arrayContaining([
        '02_proceso/workflows/maintenance/_schema/workflow-v1.schema.ts',
        '02_proceso/core/contracts/documentation-governance-v1.ts',
        '03_artefactos/skills/frames-harness-maintainer/SKILL.md',
      ]),
    );
    expect(maintenance?.output).toMatch(/M00-M06/u);
    expect(maintenance?.output).toMatch(/HM_CHANGE_APPROVED/u);
  });

  it('R7 resolves career intent and keeps C09 at the material package gate', () => {
    const career = router.routes.find((route) => route.id === 'R7');
    expect(career?.binds_to).toBe('task');
    expect(career?.reads).toEqual(
      expect.arrayContaining([
        '03_artefactos/skills/career-application-orchestrator/SKILL.md',
        '02_proceso/workflows/career/_schema/intent-v1.schema.ts',
        '02_proceso/workflows/career/_schema/brief-v1.schema.ts',
      ]),
    );
    expect(career?.output).toMatch(/C00-C09/u);
    expect(career?.output).toMatch(/STOP material en CR_PACKAGE_APPROVED/u);
    expect(career?.output).toMatch(/fase posterior.*receipt material one-use/u);
    expect(career?.output).not.toMatch(/STOP en CR_BRIEF_APPROVED o CR_SUBMISSION_AUTHORIZED/u);
  });

  it('R3-LOOSE binds to task with project_id null semantics', () => {
    const loose = router.routes.find((r) => r.id === 'R3-LOOSE');
    expect(loose).toBeDefined();
    expect(loose?.binds_to).toBe('task');
    // The route output explicitly states project_id: null — assert it is the
    // loose-task route with no project binding. [DOC]
    expect(JSON.stringify(router)).toMatch(/project_id: null/u);
  });

  it('R6 resolves generic content intent through canonical contracts and stops at brief approval', () => {
    const content = router.routes.find((route) => route.id === 'R6');

    expect(content).toBeDefined();
    expect(content?.binds_to).toBe('task');
    expect(content?.signal_patterns).toContain('ayúdame a generar una pieza');
    expect(content?.reads).toEqual(
      expect.arrayContaining([
        '03_artefactos/skills/content-os-router/SKILL.md',
        '02_proceso/workflows/multimedia/_schema/content-intent-v2.schema.ts',
        '02_proceso/workflows/multimedia/_schema/brief-v1.schema.ts',
      ]),
    );
    expect(content?.output).toMatch(/content-intent-v2/u);
    expect(content?.output).toMatch(/brief\.md/u);
    expect(content?.output).toMatch(/P00-P09/u);
    expect(content?.output).toMatch(/STOP en MW_BRIEF_APPROVED/u);
  });

  it('R6 dispatches Trainer OS while R10 remains a separate NotebookLM authority', () => {
    const content = router.routes.find((route) => route.id === 'R6');
    expect(router.routes.map(({id}) => id)).toContain('R10');
    expect(content?.signal_patterns).toEqual(
      expect.arrayContaining([
        'crear una ruta formativa',
        'crear un taller completo',
        'run Trainer OS',
      ]),
    );
    expect(content?.reads).toEqual(
      expect.arrayContaining([
        '03_artefactos/skills/metodologia-trainer-os/SKILL.md',
        '02_proceso/workflows/trainer-os/trainer-intake-v1.schema.ts',
        '02_proceso/workflows/trainer-os/trainer-run-manifest-v1.schema.ts',
        '02_proceso/workflows/trainer-os/runner.ts',
      ]),
    );
    expect(content?.output).toMatch(/perfil Trainer OS candidate.*STOP en EXP_BRIEF_APPROVED/u);
    expect(content?.output).toMatch(/RENDERED_DRAFT siguen coverage_gap/u);
    expect(content?.output).toMatch(/sin publicar/u);
  });

  it('R6 dispatches Video OS as a spec-first profile and R7 reuses Operator Core', () => {
    const content = router.routes.find((route) => route.id === 'R6');
    const career = router.routes.find((route) => route.id === 'R7');

    expect(content?.signal_patterns).toEqual(expect.arrayContaining(['crear video', 'Video OS']));
    expect(content?.reads).toEqual(
      expect.arrayContaining([
        '02_proceso/workflows/video-os/index.ts',
        '02_proceso/workflows/operator-core/index.ts',
      ]),
    );
    expect(content?.output).toMatch(/principal antes de derivados.*VO_DIRECTION_APPROVED/u);
    expect(career?.reads).toContain('02_proceso/workflows/operator-core/index.ts');
    expect(commandByGate.get('G09_VIDEO_OS')?.command).toBe('pnpm verify:video-os');
  });

  it('keeps operational gate metadata exclusively in commands.yaml', () => {
    expect(router).not.toHaveProperty('gate_commands');
    expect(router).not.toHaveProperty('manual_fail_closed_gates');
    expect(commandByGate.get('DOCS_TRANSVERSAL_COMPLETE')).toMatchObject({
      manual: false,
      fail_closed: true,
      owner: 'qa',
    });
    expect(commandByGate.get('HM_GUARDIAN_VERDICT_RECORDED')).toMatchObject({
      command: null,
      manual: true,
      fail_closed: true,
      owner: 'governance',
    });
    expect(commandByGate.get('HM_PROMOTION_APPROVED')).toMatchObject({
      command: null,
      manual: true,
      fail_closed: true,
      idempotency: false,
      owner: 'h01',
    });
  });
});
