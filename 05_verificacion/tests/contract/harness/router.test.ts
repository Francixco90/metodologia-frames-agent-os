import {describe, expect, it} from 'vitest';

import {readRepositoryYaml} from '../../fixtures/verifier/io.ts';

/**
 * Contract test: `02_proceso/governance/router.yml` (router-v1).
 * Asserts the 7 routes, R3-LOOSE project_id null, manual fail-closed gates
 * G13-G17, and source_of_truth true. [CONFIG]
 */
describe('router.yml contract', () => {
  const router = readRepositoryYaml('02_proceso/governance/router.yml') as {
    schema_version: number;
    manifest_id: string;
    source_of_truth: boolean;
    routes: Array<{id: string; binds_to: string | null; signal?: string}>;
    manual_fail_closed_gates: string[];
  };

  it('declares schema_version 1 and manifest_id router-v1', () => {
    expect(router.schema_version).toBe(1);
    expect(router.manifest_id).toBe('router-v1');
  });

  it('is marked source_of_truth: true', () => {
    expect(router.source_of_truth).toBe(true);
  });

  it('declares 7 routes (R0, R1, R2, R3, R3-LOOSE, R4, R5)', () => {
    const ids = router.routes.map((r) => r.id);
    expect(ids).toHaveLength(7);
    expect(ids).toEqual(expect.arrayContaining(['R0', 'R1', 'R2', 'R3', 'R3-LOOSE', 'R4', 'R5']));
  });

  it('R3-LOOSE binds to task with project_id null semantics', () => {
    const loose = router.routes.find((r) => r.id === 'R3-LOOSE');
    expect(loose).toBeDefined();
    expect(loose?.binds_to).toBe('task');
    // The route output explicitly states project_id: null — assert it is the
    // loose-task route with no project binding. [DOC]
    expect(JSON.stringify(router)).toMatch(/project_id: null/u);
  });

  it('lists G13-G17 as manual fail-closed gates', () => {
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining(['G13', 'G14', 'G15', 'G16', 'G17']),
    );
    expect(router.manual_fail_closed_gates).toHaveLength(5);
  });
});
