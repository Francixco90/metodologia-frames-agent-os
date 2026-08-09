import {readFile} from 'node:fs/promises';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';
import {loadWorkflowDocumentation} from '../../../02_proceso/workflows/documentation/workflow-source.ts';

describe('S00-S09 workflow family', () => {
  it('is complete, ordered and bound to specialized skills', async () => {
    const docs = await loadWorkflowDocumentation(process.cwd());
    const skillSystems = docs.filter((item) => item.family === 'skill-system');
    expect(skillSystems.map((item) => item.id)).toEqual(
      Array.from({length: 10}, (_, index) => `S${String(index).padStart(2, '0')}`),
    );
    for (const workflow of skillSystems) {
      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0]?.primarySkill).toMatch(/^skill-|^frames-/u);
      expect(workflow.gates[0]).not.toBe('UNKNOWN');
    }
  });

  it('keeps the reconciled suite at exactly nine exclusive skill packages', async () => {
    const suite = parse(
      await readFile('02_proceso/workflows/skill-systems/skill-suite.yml', 'utf8'),
    ) as {skills: {id: string; responsibility: string}[]};
    expect(suite.skills).toHaveLength(9);
    expect(new Set(suite.skills.map((item) => item.id)).size).toBe(9);
    expect(new Set(suite.skills.map((item) => item.responsibility)).size).toBe(9);
  });

  it('binds automatic SSS gates to material stdin and keeps human gates separate', async () => {
    const manifest = parse(await readFile('05_verificacion/scripts/commands.yaml', 'utf8')) as {
      gates: {gate: string; command: string | null; manual: boolean; fail_closed: boolean}[];
    };
    const gates = new Map(manifest.gates.map((gate) => [gate.gate, gate]));
    for (const id of [
      'SSS_CASE_READY',
      'SSS_ARCHITECTURE_READY',
      'SSS_STATIC_VALIDATED',
      'SSS_EVAL_VALIDATED',
      'SSS_RELEASE_CANDIDATE',
    ]) {
      expect(gates.get(id)).toMatchObject({manual: false, fail_closed: true});
      expect(gates.get(id)?.command).toContain('--stdin');
    }
    for (const id of ['SSS_CANDIDATE_READY', 'SSS_REVIEW_VALIDATED']) {
      expect(gates.get(id)).toMatchObject({manual: true, command: null, fail_closed: true});
    }
  });
});
