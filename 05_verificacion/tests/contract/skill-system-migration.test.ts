import {readFile} from 'node:fs/promises';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

describe('Skill Systems migration', () => {
  it('supersedes overlapping authorities without deleting compatibility aliases', async () => {
    const registry = parse(
      await readFile('04_estado/registries/skills/skill-system-migration.yml', 'utf8'),
    ) as {
      dispositions: {skill_id: string; authority_state: string; replacements?: string[]}[];
      separation_of_functions: {typed_as_skills: boolean};
    };
    const skillify = registry.dispositions.find(({skill_id}) => skill_id === 'dev-skillify');
    const writing = registry.dispositions.find(({skill_id}) => skill_id === 'dev-writing-skills');
    expect(skillify).toMatchObject({
      authority_state: 'SUPERSEDED',
      replacements: ['skill-system-architect', 'skill-authoring-engineer'],
    });
    expect(writing).toMatchObject({
      authority_state: 'SUPERSEDED',
      replacements: ['skill-authoring-engineer'],
    });
    expect(registry.separation_of_functions.typed_as_skills).toBe(false);
  });
});
