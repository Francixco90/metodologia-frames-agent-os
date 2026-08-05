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
    expect(lineage.version).toBe('0.4.1');
    expect(lineage.content_origin).toMatch(/^locally_authored/);
    expect(lineage.lifecycle_state).toBe('active');
    expect(lineage.execution_scope).toBe('local-candidate-production');
    expect(lineage.external_fragments_reused).toBe(true);
    expect(lineage.publication_authority).toBe(false);
  });

  it('has positive and negative fixtures', () => {
    expect(existsSync(join(skillDir, 'fixtures', 'positive', 'embajador-batch.yml'))).toBe(true);
    expect(existsSync(join(skillDir, 'fixtures', 'negative', 'hours-mismatch.yml'))).toBe(true);
    expect(existsSync(join(skillDir, 'fixtures', 'negative', 'remote-signature.yml'))).toBe(true);
  });

  it('has template, schema, and scripts', () => {
    expect(existsSync(join(skillDir, 'assets', 'certificate-template.html'))).toBe(true);
    expect(existsSync(join(skillDir, 'assets', 'certificate-template-v16.html'))).toBe(true);
    expect(existsSync(join(skillDir, 'schemas', 'certificate-manifest.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'render-certificates.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'validate-certificates.ts'))).toBe(true);
    expect(existsSync(join(skillDir, 'references', 'certificate-manifest.md'))).toBe(true);
  });

  it('activates a portable unsigned v16 template and preserves legacy v15', () => {
    const legacyPath = join(skillDir, 'assets', 'certificate-template.html');
    const template = readFileSync(
      join(skillDir, 'assets', 'certificate-template-v16.html'),
      'utf8',
    );
    expect(sha256(readFileSync(legacyPath))).toBe(
      '19cd91136d3c97be6f88529a5283445d86c8d3e54395e2a7857e110e286c4d1a',
    );
    expect(template).toContain('data-template-id="programa-empoderamiento-reconocimiento-v16"');
    expect(sha256(Buffer.from(template))).toBe(
      '6a5a528d4d0f40f4d7cd6db78a24aeee873eb5b4c77e08710d811ef89157668c',
    );
    expect(template).toContain("--serif: 'Poppins', sans-serif;");
    expect(template).not.toMatch(/Iowan Old Style|Palatino Linotype|Georgia/u);
    expect(
      template.match(/<section class="signature" data-signature-slot="[^"]+" hidden>/gu),
    ).toHaveLength(2);
    expect(template).not.toMatch(/Javier Andres|German Eliecer/u);
    expect(template).not.toMatch(/firma(?:Principal|Secundaria)Asset:\s*['"]data:image/u);
  });

  it('is registered in skill-registry.yml with correct hash binding', () => {
    const registry = parse(readFileSync(registryPath, 'utf8')) as {
      entries?: Array<Record<string, unknown>>;
    };
    const entry = registry.entries?.find((e) => e.skill_id === 'metodologia-certificate-builder');
    expect(entry).toBeDefined();
    expect(entry?.version).toBe('0.4.1');
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

  it('preserves the lifecycle chain and appends the visible statement binding event', () => {
    const registry = parse(readFileSync(registryPath, 'utf8')) as {
      events?: Array<{
        skill_id?: string;
        event_order?: number;
        decision?: string;
        transition?: {from?: string | null; to?: string};
      }>;
    };
    const events = (registry.events ?? [])
      .filter((e) => e.skill_id === 'metodologia-certificate-builder')
      .sort((a, b) => (a.event_order ?? 0) - (b.event_order ?? 0));
    expect(events).toHaveLength(8);
    const expected = [
      {from: null, to: 'candidate'},
      {from: 'candidate', to: 'quarantined'},
      {from: 'quarantined', to: 'evaluated'},
      {from: 'evaluated', to: 'active'},
    ];
    events.slice(0, 4).forEach((event, index) => {
      expect(event.transition?.from).toBe(expected[index]?.from ?? null);
      expect(event.transition?.to).toBe(expected[index]?.to);
    });
    expect(events[4]?.transition).toEqual({from: 'active', to: 'active'});
    expect(events[5]?.transition).toEqual({from: 'active', to: 'active'});
    expect(events[6]?.transition).toEqual({from: 'active', to: 'active'});
    expect(events[7]?.transition).toEqual({from: 'active', to: 'active'});
    expect(events[6]?.decision).toBe('activate_unsigned_template_v16');
    expect(events[7]?.decision).toBe('bind_visible_certification_statement_v16_renderer_0_4_1');
  });
});
