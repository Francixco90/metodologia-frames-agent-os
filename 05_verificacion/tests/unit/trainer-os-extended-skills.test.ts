import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';

const root = process.cwd();
const base = '03_artefactos/skills';
const ids = ['metodologia-learning-playbook-html', 'metodologia-prompt-library'] as const;
const read = (ref: string) => readFileSync(resolve(root, ref), 'utf8');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const child = resolve(dir, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
const digest = (id: string) => {
  const dir = resolve(root, base, id);
  return sha(
    `${walk(dir)
      .sort()
      .map((path) => `${sha(readFileSync(path, 'utf8'))}  ${relative(dir, path)}`)
      .join('\n')}\n`,
  );
};
const nonnegative = z.number().int().nonnegative();
const playbookInput = z.strictObject({
  essential: nonnegative,
  declared_ids: z.array(z.string()).max(8),
  selected_ids: z.array(z.string()).max(9),
  core_without_js: z.boolean(),
  publish: z.boolean(),
});
const promptInput = z.strictObject({
  levels: z.array(nonnegative).max(4),
  steps: z.array(z.string()).min(1),
  prompt_steps: z.array(z.string()),
  copy_accessible: z.boolean(),
  no_js_visible: z.boolean(),
  publish: z.boolean(),
});
const playbookIssues = (input: z.infer<typeof playbookInput>) => [
  ...(input.essential === 12 ? [] : ['essential_count']),
  ...(input.declared_ids.length <= 7 ? [] : ['optional_maximum']),
  ...(new Set(input.declared_ids).size === input.declared_ids.length &&
  new Set(input.selected_ids).size === input.selected_ids.length &&
  [...input.selected_ids].sort().join(',') === [...input.declared_ids].sort().join(',')
    ? []
    : ['optional_selection']),
  ...(input.core_without_js ? [] : ['no_js']),
  ...(input.publish ? ['publication'] : []),
];
const promptIssues = (input: z.infer<typeof promptInput>) => [
  ...(input.levels.join(',') === '1,2,3,4' ? [] : ['levels']),
  ...(new Set(input.steps).size === input.steps.length &&
  new Set(input.prompt_steps).size === input.prompt_steps.length &&
  [...input.steps].sort().join(',') === [...input.prompt_steps].sort().join(',')
    ? []
    : ['step_bijection']),
  ...(input.copy_accessible ? [] : ['copy_accessibility']),
  ...(input.no_js_visible ? [] : ['no_js']),
  ...(input.publish ? ['publication'] : []),
];

describe('Trainer OS extended candidate skill routers', () => {
  it.each(ids)('%s routes with progressive disclosure and candidate limits', (id) => {
    const skill = read(`${base}/${id}/SKILL.md`);
    const lineage = parse(read(`${base}/${id}/LINEAGE.yml`)) as {
      authority_refs: string[];
      runtime_refs: string[];
      production_runtime_status: string;
    };
    expect([...skill].length).toBeLessThanOrEqual(3000);
    expect(skill).toContain('operating-contract.md)');
    const contract =
      id === 'metodologia-learning-playbook-html'
        ? `${base}/${id}/references/operating-contract.md`
        : `${base}/metodologia-learning-playbook-html/references/operating-contract.md`;
    expect(statSync(resolve(root, contract)).isFile()).toBe(true);
    expect(lineage.production_runtime_status).toBe('blocked_pending_evaluation');
    for (const ref of [...lineage.authority_refs, ...lineage.runtime_refs])
      expect(statSync(resolve(root, ref)).isFile()).toBe(true);
  });

  it('executes playbook positive, negative and mutation oracles', () => {
    const positive = playbookInput.parse(
      (parse(read(`${base}/${ids[0]}/fixtures/positive/case.yml`)) as {input: unknown}).input,
    );
    const negative = playbookInput.parse(
      (parse(read(`${base}/${ids[0]}/fixtures/negative/case.yml`)) as {input: unknown}).input,
    );
    expect(playbookIssues(positive)).toEqual([]);
    expect(playbookIssues(negative)).toEqual([
      'essential_count',
      'optional_maximum',
      'optional_selection',
      'no_js',
      'publication',
    ]);
    expect(playbookIssues({...positive, essential: 13})).toContain('essential_count');
    expect(playbookIssues({...positive, selected_ids: ['optional-a', 'missing']})).toContain(
      'optional_selection',
    );
    expect(playbookIssues({...positive, declared_ids: ['optional-a', 'optional-a']})).toContain(
      'optional_selection',
    );
  });

  it('executes prompt positive, negative and mutation oracles', () => {
    const positive = promptInput.parse(
      (parse(read(`${base}/${ids[1]}/fixtures/positive/case.yml`)) as {input: unknown}).input,
    );
    const negative = promptInput.parse(
      (parse(read(`${base}/${ids[1]}/fixtures/negative/case.yml`)) as {input: unknown}).input,
    );
    expect(promptIssues(positive)).toEqual([]);
    expect(promptIssues(negative)).toEqual([
      'levels',
      'step_bijection',
      'copy_accessibility',
      'no_js',
      'publication',
    ]);
    expect(promptIssues({...positive, levels: [1, 2, 4, 3]})).toContain('levels');
    expect(promptIssues({...positive, prompt_steps: ['step-a', 'step-a']})).toContain(
      'step_bijection',
    );
    expect(promptIssues({...positive, steps: ['step-a', 'step-a']})).toContain('step_bijection');
  });

  it('binds registry entries and append-only events to exact package bytes', () => {
    const registry = parse(read('04_estado/registries/skills/skill-registry.yml')) as {
      entries: Array<Record<string, unknown>>;
      events: Array<Record<string, unknown>>;
    };
    for (const id of ids) {
      const entry = registry.entries.find(({skill_id: skillId}) => skillId === id);
      const event = registry.events.find(({skill_id: skillId}) => skillId === id);
      expect(entry).toMatchObject({
        skill_id: id,
        current_state: 'candidate',
        production_runtime_status: 'blocked_pending_evaluation',
        publication_authority: false,
      });
      expect(entry?.content_sha256).toBe(sha(read(`${base}/${id}/SKILL.md`)));
      expect(entry?.package_manifest_sha256).toBe(digest(id));
      expect(event).toMatchObject({
        skill_id: id,
        content_sha256: entry?.content_sha256,
        transition: {from: null, to: 'candidate'},
      });
    }
  });
});
