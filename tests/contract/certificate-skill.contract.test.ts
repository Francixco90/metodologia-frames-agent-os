import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {createHash} from 'node:crypto';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const skillDir = join(root, 'skills', 'metodologia-certificate-builder');
const registryPath = join(root, 'registries', 'skills', 'skill-registry.yml');

const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const child = join(dir, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });

const packageDigest = (dir: string): string => {
  const manifest = `${walk(dir)
    .sort()
    .map((path) => `${sha256(readFileSync(path))}  ${relative(dir, path).replaceAll('\\', '/')}`)
    .join('\n')}\n`;
  return sha256(manifest);
};

describe('metodologia-certificate-builder skill registry binding', () => {
  it('has SKILL.md with required terms', () => {
    const text = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    expect(text).toContain('metodologia-certificate-builder');
    expect(text).toContain('cb');
    expect(text).toContain('cv');
    expect(text).toContain('RENDERED_DRAFT');
    expect(text).toContain('coverage_gap');
    expect(text).toContain('work/private');
  });

  it('has LINEAGE.yml with correct fields', () => {
    const lineage = parse(readFileSync(join(skillDir, 'LINEAGE.yml'), 'utf8')) as {
      skill_id?: string;
      version?: string;
      content_origin?: string;
      lifecycle_state?: string;
      execution_scope?: string;
      external_fragments_reused?: boolean;
      publication_authority?: boolean;
    };
    expect(lineage.skill_id).toBe('metodologia-certificate-builder');
    expect(lineage.version).toBe('0.1.0');
    expect(lineage.content_origin).toMatch(/^locally_authored/);
    expect(lineage.lifecycle_state).toBe('active');
    expect(lineage.execution_scope).toBe('local-candidate-production');
    expect(lineage.external_fragments_reused).toBe(false);
    expect(lineage.publication_authority).toBe(false);
  });

  it('has positive and negative fixtures', () => {
    expect(existsSync(join(skillDir, 'fixtures', 'positive', 'embajador-batch.yml'))).toBe(true);
    expect(existsSync(join(skillDir, 'fixtures', 'negative', 'hours-mismatch.yml'))).toBe(true);
    expect(existsSync(join(skillDir, 'fixtures', 'negative', 'remote-signature.yml'))).toBe(true);
  });

  it('has template, schema, and scripts', () => {
    expect(existsSync(join(skillDir, 'assets', 'certificate-template.html'))).toBe(true);
    expect(existsSync(join(skillDir, 'schemas', 'certificate-manifest.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'render-certificates.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'validate-certificates.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'references', 'certificate-manifest.md'))).toBe(true);
  });

  it('is registered in skill-registry.yml with correct hash binding', () => {
    const registry = parse(readFileSync(registryPath, 'utf8')) as {
      entries?: Array<Record<string, unknown>>;
    };
    const entry = registry.entries?.find((e) => e.skill_id === 'metodologia-certificate-builder');
    expect(entry).toBeDefined();
    expect(entry?.version).toBe('0.1.0');
    expect(entry?.current_state).toBe('active');
    expect(entry?.execution_scope).toBe('local-candidate-production');
    expect(entry?.production_runtime_status).toBe('publication_blocked');
    expect(entry?.content_sha256).toBe(sha256(readFileSync(join(skillDir, 'SKILL.md'), 'utf8')));
    expect(entry?.package_manifest_sha256).toBe(packageDigest(skillDir));
    expect(entry?.package_manifest_algorithm).toBe(
      'sha256_of_sorted_sha256_double_space_relative_path_lines',
    );
    expect(entry?.lineage).toBe('skills/metodologia-certificate-builder/LINEAGE.yml');
    expect(entry?.content_license).toBe('LicenseRef-MetodologIA-Internal');
    const tests = entry?.tests as string[] | undefined;
    expect(tests).toContain('pnpm verify:skills');
  });

  it('has 4 lifecycle events with correct transitions', () => {
    const registry = parse(readFileSync(registryPath, 'utf8')) as {
      events?: Array<{
        skill_id?: string;
        event_order?: number;
        transition?: {from?: string | null; to?: string};
      }>;
    };
    const events = (registry.events ?? [])
      .filter((e) => e.skill_id === 'metodologia-certificate-builder')
      .sort((a, b) => (a.event_order ?? 0) - (b.event_order ?? 0));
    expect(events).toHaveLength(4);
    const expected = [
      {from: null, to: 'candidate'},
      {from: 'candidate', to: 'quarantined'},
      {from: 'quarantined', to: 'evaluated'},
      {from: 'evaluated', to: 'active'},
    ];
    events.forEach((event, index) => {
      expect(event.transition?.from).toBe(expected[index]?.from ?? null);
      expect(event.transition?.to).toBe(expected[index]?.to);
    });
  });
});