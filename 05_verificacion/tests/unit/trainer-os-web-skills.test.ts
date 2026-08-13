import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const base = '03_artefactos/skills';
const ids = ['metodologia-trainer-landing', 'metodologia-trainer-workbook'] as const;
const read = (ref: string) => readFileSync(resolve(root, ref), 'utf8');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const child = resolve(directory, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
const digest = (id: string) => {
  const directory = resolve(root, base, id);
  const manifest = `${walk(directory)
    .sort()
    .map((path) => `${sha(readFileSync(path))}  ${relative(directory, path)}`)
    .join('\n')}\n`;
  return sha(manifest);
};
type Fixture = {
  skill_id: (typeof ids)[number];
  input: Record<string, boolean | number>;
  expect: {verdict: 'PASS' | 'BLOCK'; reasons?: string[]; publication_authority: false};
};
const fixture = (id: (typeof ids)[number], kind: 'positive' | 'negative') =>
  parse(read(`${base}/${id}/fixtures/${kind}/case.yml`)) as Fixture;
const issues = (id: (typeof ids)[number], input: Record<string, boolean | number>) =>
  id === 'metodologia-trainer-landing'
    ? [
        ...(input.sections === 8 ? [] : ['sections']),
        ...(Number(input.cta_words) >= 1 && Number(input.cta_words) <= 3 ? [] : ['cta']),
        ...(input.target_exists ? [] : ['target']),
        ...(input.canonical_path ? [] : ['path']),
        ...(input.network ? ['network'] : []),
      ]
    : [
        ...(input.routes === 3 ? [] : ['routes']),
        ...(input.unique_steps ? [] : ['ids']),
        ...(input.canonical_path ? [] : ['path']),
        ...(input.response_persistence ? ['persistence'] : []),
        ...(input.network ? ['network'] : []),
      ];

describe('Trainer OS landing and workbook skill routers', () => {
  it.each(ids)('%s executes positive and adversarial fixture semantics', (id) => {
    const positive = fixture(id, 'positive');
    const negative = fixture(id, 'negative');
    expect(positive.skill_id).toBe(id);
    expect(positive.expect).toMatchObject({verdict: 'PASS', publication_authority: false});
    expect(issues(id, positive.input)).toEqual([]);
    expect(negative.expect).toMatchObject({verdict: 'BLOCK', publication_authority: false});
    expect(issues(id, negative.input)).toEqual(negative.expect.reasons);
  });

  it.each(ids)('%s is concise, compiler-routed and hash-bound in the registry', (id) => {
    const skill = read(`${base}/${id}/SKILL.md`);
    const lineage = parse(read(`${base}/${id}/LINEAGE.yml`)) as {
      authority_refs: string[];
      runtime_refs: string[];
      production_runtime_status: string;
    };
    expect([...skill].length).toBeLessThanOrEqual(1800);
    expect(skill).toContain('shared Trainer OS compiler');
    expect(skill).toContain('RENDERED_DRAFT');
    expect(skill).toContain('Never author or patch derived HTML');
    expect(lineage.production_runtime_status).toBe('blocked_pending_evaluation');
    for (const ref of [...lineage.authority_refs, ...lineage.runtime_refs])
      expect(statSync(resolve(root, ref)).isFile()).toBe(true);

    const registry = parse(read('04_estado/registries/skills/skill-registry.yml')) as {
      entries: Array<Record<string, unknown>>;
      events: Array<Record<string, unknown>>;
    };
    const entry = registry.entries.find(({skill_id: skillId}) => skillId === id);
    const event = registry.events.find(({skill_id: skillId}) => skillId === id);
    expect(entry).toMatchObject({
      skill_id: id,
      current_state: 'candidate',
      production_runtime_status: 'blocked_pending_evaluation',
      publication_authority: false,
      content_sha256: sha(skill),
      package_manifest_sha256: digest(id),
    });
    expect(event).toMatchObject({skill_id: id, transition: {from: null, to: 'candidate'}});
  });

  it('binds Trainer OS to the existing R6 content route without inventing R10', () => {
    const router = parse(read('02_proceso/governance/router.yml')) as {
      routes: Array<{id: string; signal_patterns?: string[]; reads?: string[]; output?: string}>;
    };
    expect(router.routes.map(({id}) => id)).not.toContain('R10');
    const r6 = router.routes.find(({id}) => id === 'R6');
    expect(r6?.signal_patterns).toEqual(
      expect.arrayContaining([
        'crear una ruta formativa',
        'crear un taller completo',
        'run Trainer OS',
      ]),
    );
    expect(r6?.reads).toEqual(
      expect.arrayContaining([
        '03_artefactos/skills/metodologia-trainer-os/SKILL.md',
        '02_proceso/workflows/trainer-os/trainer-run-manifest-v1.schema.ts',
        '02_proceso/workflows/trainer-os/runner.ts',
      ]),
    );
    expect(r6?.output).toMatch(/perfil Trainer OS.*RENDERED_DRAFT/u);
  });
});
