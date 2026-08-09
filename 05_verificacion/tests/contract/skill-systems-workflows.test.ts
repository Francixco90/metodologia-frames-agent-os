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

  it('keeps the suite at exactly eight exclusive skill packages', async () => {
    const suite = parse(
      await readFile('02_proceso/workflows/skill-systems/skill-suite.yml', 'utf8'),
    ) as {skills: {id: string; responsibility: string}[]};
    expect(suite.skills).toHaveLength(8);
    expect(new Set(suite.skills.map((item) => item.id)).size).toBe(8);
    expect(new Set(suite.skills.map((item) => item.responsibility)).size).toBe(8);
  });
});
