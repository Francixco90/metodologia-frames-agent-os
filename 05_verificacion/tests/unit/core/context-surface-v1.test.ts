import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';
import {parse} from 'yaml';

import {
  ContextSurfaceRegistryV1Schema,
  ContextSurfaceV1Schema,
  contextProjectionPath,
} from '../../../../02_proceso/core/contracts/context-surface-v1.ts';
import {generateContextSurfaces} from '../../../scripts/generate-context-surfaces.ts';
import {
  loadContextSurfaces,
  projections,
  validateContextGraph,
} from '../../../scripts/context-surface-lib.ts';

const root = process.cwd();

describe('ContextSurfaceV1', () => {
  it('loads exactly 54 governed non-skill surfaces with a valid DAG', () => {
    const surfaces = loadContextSurfaces(root);
    expect(surfaces).toHaveLength(54);
    expect(new Set(surfaces.map(({context_id}) => context_id)).size).toBe(54);
    expect(new Set(surfaces.map(contextProjectionPath)).size).toBe(54);
    expect(validateContextGraph(root, surfaces)).toEqual([]);
  });

  it('renders byte-stable projections with six sections below target', () => {
    const all = loadContextSurfaces(root, 'all');
    const registry = ContextSurfaceRegistryV1Schema.parse(
      parse(
        readFileSync(resolve(root, '02_proceso/governance/context-surfaces/registry.yml'), 'utf8'),
      ),
    );
    const expected = registry.expected_non_skill_projections + registry.expected_skill_projections;
    expect(all).toHaveLength(expected);
    expect(validateContextGraph(root, all, expected)).toEqual([]);
    const first = projections(all);
    const second = projections(all);
    expect([...first]).toEqual([...second]);
    for (const [path, markdown] of first) {
      expect(readFileSync(resolve(root, path), 'utf8')).toBe(markdown);
      expect(markdown.trimEnd().split('\n').length).toBeLessThanOrEqual(80);
      for (let section = 1; section <= 6; section += 1) {
        expect(markdown).toContain(`## ${section}.`);
      }
    }
    expect(generateContextSurfaces(root, false)).toEqual([]);
  });

  it('rejects traversal and detects symlink, missing ref, graph and coverage defects', () => {
    const surfaces = loadContextSurfaces(root);
    expect(() => ContextSurfaceV1Schema.parse({...surfaces[0], root: '../escape'})).toThrow(
      /traversal/u,
    );

    const symlink = surfaces.map((surface, index) =>
      index === 1 ? {...surface, root: 'core' as const} : surface,
    );
    expect(validateContextGraph(root, symlink)).toContain('CTX-PATH001 symlink root core');

    const missingRef = surfaces.map((surface, index) =>
      index === 1 ? {...surface, authority_refs: ['missing-authority.md']} : surface,
    );
    expect(validateContextGraph(root, missingRef)).toContain(
      'CTX-REF003 missing ref CTX-INBOX:missing-authority.md',
    );

    const unknownChild = surfaces.map((surface, index) =>
      index === 0 ? {...surface, children: [...surface.children, 'CTX-UNKNOWN']} : surface,
    );
    expect(validateContextGraph(root, unknownChild)).toContain(
      'CTX-GRAPH003 unknown child CTX-ROOT:CTX-UNKNOWN',
    );
    expect(validateContextGraph(root, surfaces.slice(1))).toContain(
      'CTX-COVERAGE001 expected 54, found 53',
    );
  });

  it('keeps private uppercase context separate and allows future skill shards', () => {
    const registry = ContextSurfaceRegistryV1Schema.parse({
      schema_version: 'context-surface-registry-v1',
      manifest_id: 'frames-public-context-v1',
      source_of_truth: true,
      projection_name: 'context.md',
      private_cabin: 'work/private/CONTEXT.md',
      expected_non_skill_projections: 54,
      expected_skill_projections: 25,
      shards: ['public.yml'],
      skill_shards: ['skills.yml'],
    });
    expect(registry.skill_shards).toEqual(['skills.yml']);
    expect(registry.expected_non_skill_projections + registry.expected_skill_projections).toBe(79);
    expect(readFileSync(resolve(root, '.gitignore'), 'utf8')).toContain('work/private/CONTEXT.md');
    const router = readFileSync(resolve(root, '02_proceso/governance/router.yml'), 'utf8');
    expect(router).toContain("reads: ['context.md']");
    expect(router).not.toContain('CONTEXT.md');
  });
});
