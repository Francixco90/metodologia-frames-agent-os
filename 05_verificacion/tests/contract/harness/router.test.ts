import {describe, expect, it} from 'vitest';

import {readRepositoryYaml} from '../../fixtures/verifier/io.ts';

/**
 * Contract test: `02_proceso/governance/router.yml` (router-v1).
 * Asserts the 11 routes, R3-LOOSE project_id null, productive routes,
 * manual fail-closed gates and source_of_truth true. [CONFIG]
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
    gate_commands: Record<string, string>;
    manual_fail_closed_gates: string[];
  };

  it('declares schema_version 1 and manifest_id router-v1', () => {
    expect(router.schema_version).toBe(1);
    expect(router.manifest_id).toBe('router-v1');
  });

  it('is marked source_of_truth: true', () => {
    expect(router.source_of_truth).toBe(true);
  });

  it('declares R0-R9 plus R3-LOOSE', () => {
    const ids = router.routes.map((r) => r.id);
    expect(ids).toHaveLength(11);
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

  it('R7 resolves career intent and stops at an explicit human gate', () => {
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
    expect(career?.output).toMatch(/CR_BRIEF_APPROVED/u);
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

  it('R6 dispatches Trainer OS as a governed content profile without inventing R10', () => {
    const content = router.routes.find((route) => route.id === 'R6');
    expect(router.routes.map(({id}) => id)).not.toContain('R10');
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
    expect(router.gate_commands.G09_VIDEO_OS_contracts).toBe('pnpm verify:video-os');
  });

  it('lists G13-G17 and brief approval as manual fail-closed gates', () => {
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining(['G13', 'G14', 'G15', 'G16', 'G17', 'MW_BRIEF_APPROVED']),
    );
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining([
        'CR_BRIEF_APPROVED',
        'CR_CV_DESIGN_APPROVED',
        'CR_CV_SPEC_APPROVED',
        'CR_PACKAGE_APPROVED',
        'CR_SUBMISSION_AUTHORIZED',
      ]),
    );
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining(['EXP_BRIEF_APPROVED', 'EXP_RELEASE_APPROVED']),
    );
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining([
        'VO_INTAKE_COMPLETE',
        'VO_DIRECTION_APPROVED',
        'VO_PRINCIPAL_VERIFIED',
        'VO_HANDOFF_APPROVED',
      ]),
    );
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining([
        'LX_BRIEF_APPROVED',
        'HM_CHANGE_APPROVED',
        'DOCS_TRANSVERSAL_COMPLETE',
        'HM_PROMOTION_APPROVED',
      ]),
    );
    expect(router.manual_fail_closed_gates).not.toContain('CR_CAREER_EVIDENCE_READY');
    expect(router.manual_fail_closed_gates).not.toContain('CR_CV_COMPILED');
    expect(router.manual_fail_closed_gates).not.toContain('CR_PACKAGE_QA');
    expect(router.manual_fail_closed_gates).toHaveLength(21);
  });
});
