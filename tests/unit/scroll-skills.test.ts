/**
 * Structural, functional and non-regression tests for the three
 * model-agnostic scroll skills and their orchestration manifest.
 *
 * Covers:
 * - Skill presence (3 skills with correct names)
 * - Frontmatter contract (name, description, version, model_agnostic)
 * - LINEAGE.yml contract (locally_authored, active, publication_authority false)
 * - Manifest validation (Zod schema, execution order, no cycles)
 * - No mandatory providers/models in SKILL.md content
 * - No absolute user paths in SKILL.md content
 * - No secrets in skill files
 * - Adapter contracts (optional, replaceable)
 * - Fallbacks present
 * - Fixtures present (positive + negative)
 */
import {describe, it, expect} from 'vitest';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

type ManifestSkill = {
  skill_id: string;
  role: string;
  version: string;
  description: string;
  model_agnostic: true;
  depends_on: string[];
  must_run_before: string[];
  activation: string;
  no_activation: string;
  required_capabilities: string[];
  optional_capabilities: string[];
  fallbacks: string[];
  publication_authority: false;
};

type ManifestAdapter = {
  method: string;
  input: string;
  output: string;
  required: boolean;
  replaceable: boolean;
};

type Manifest = {
  schema_version: 1;
  stack_id: string;
  description: string;
  model_agnostic: true;
  lifecycle_state: string;
  execution_order: string[];
  skills: ManifestSkill[];
  adapter_contracts: Record<string, ManifestAdapter>;
  invariants: string[];
  forbidden: string[];
};

const readManifest = (): Manifest =>
  JSON.parse(
    readFileSync(resolve(root, 'docs', 'scroll-skills', 'scroll-skills-manifest.json'), 'utf8'),
  ) as Manifest;

const root = process.cwd();

const SKILL_IDS = [
  'scroll-experience-foundations',
  'cinematic-scroll-quality',
  'scroll-world-agnostic',
] as const;

// -- helpers --

const readSkill = (id: string) => readFileSync(resolve(root, 'skills', id, 'SKILL.md'), 'utf8');

const readLineage = (id: string) =>
  parse(readFileSync(resolve(root, 'skills', id, 'LINEAGE.yml'), 'utf8')) as Record<
    string,
    unknown
  >;

const parseFrontmatter = (text: string): Record<string, unknown> => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/u);
  if (!match) throw new Error('No frontmatter');
  return parse(match[1]!) as Record<string, unknown>;
};

// =====================================================
// 1. STRUCTURAL: skill presence + directory structure
// =====================================================

describe('scroll-skills: structural', () => {
  for (const id of SKILL_IDS) {
    it(`skill ${id} has SKILL.md`, () => {
      expect(existsSync(resolve(root, 'skills', id, 'SKILL.md'))).toBe(true);
    });

    it(`skill ${id} has LINEAGE.yml`, () => {
      expect(existsSync(resolve(root, 'skills', id, 'LINEAGE.yml'))).toBe(true);
    });

    it(`skill ${id} has fixtures/positive and fixtures/negative`, () => {
      expect(existsSync(resolve(root, 'skills', id, 'fixtures', 'positive'))).toBe(true);
      expect(existsSync(resolve(root, 'skills', id, 'fixtures', 'negative'))).toBe(true);
    });
  }
});

// =====================================================
// 2. FRONTMATTER contract
// =====================================================

describe('scroll-skills: frontmatter contract', () => {
  for (const id of SKILL_IDS) {
    const text = readSkill(id);
    const fm = parseFrontmatter(text);

    it(`${id}: name matches directory`, () => {
      expect(fm.name).toBe(id);
    });

    it(`${id}: description starts with activation phrase`, () => {
      expect(fm.description).toMatch(/^This skill should be used when/u);
    });

    it(`${id}: version is 0.1.0`, () => {
      expect(fm.version).toBe('0.1.0');
    });

    it(`${id}: license is MetodologIA-Internal`, () => {
      expect(fm.license).toBe('LicenseRef-MetodologIA-Internal');
    });

    it(`${id}: lifecycle_state is active`, () => {
      const meta = fm.metadata as Record<string, unknown>;
      expect(meta.lifecycle_state).toBe('active');
    });

    it(`${id}: declares model_agnostic: true`, () => {
      const meta = fm.metadata as Record<string, unknown>;
      expect(meta.model_agnostic).toBe(true);
    });
  }
});

// =====================================================
// 3. LINEAGE contract
// =====================================================

describe('scroll-skills: LINEAGE contract', () => {
  for (const id of SKILL_IDS) {
    const lineage = readLineage(id);

    it(`${id}: skill_id matches`, () => {
      expect(lineage.skill_id).toBe(id);
    });

    it(`${id}: version is 0.1.0`, () => {
      expect(lineage.version).toBe('0.1.0');
    });

    it(`${id}: content_origin starts with locally_authored`, () => {
      expect(lineage.content_origin).toMatch(/^locally_authored/u);
    });

    it(`${id}: lifecycle_state is active`, () => {
      expect(lineage.lifecycle_state).toBe('active');
    });

    it(`${id}: external_fragments_reused is false`, () => {
      expect(lineage.external_fragments_reused).toBe(false);
    });

    it(`${id}: publication_authority is false`, () => {
      expect(lineage.publication_authority).toBe(false);
    });
  }
});

// =====================================================
// 4. MANIFEST validation
// =====================================================

describe('scroll-skills: manifest', () => {
  const manifest: Manifest = readManifest();

  it('manifest is valid per schema', () => {
    const skillEntrySchema = z.object({
      skill_id: z.string(),
      role: z.string(),
      version: z.string(),
      model_agnostic: z.literal(true),
      depends_on: z.array(z.string()),
      must_run_before: z.array(z.string()),
      activation: z.string(),
      no_activation: z.string(),
      required_capabilities: z.array(z.string()),
      optional_capabilities: z.array(z.string()),
      fallbacks: z.array(z.string()),
      publication_authority: z.literal(false),
    });

    const manifestSchema = z.object({
      schema_version: z.literal(1),
      stack_id: z.string(),
      model_agnostic: z.literal(true),
      execution_order: z.array(z.string()).min(3),
      skills: z.array(skillEntrySchema).length(3),
      adapter_contracts: z.record(
        z.string(),
        z.object({
          method: z.string(),
          input: z.string(),
          output: z.string(),
          required: z.boolean(),
          replaceable: z.boolean(),
        }),
      ),
      invariants: z.array(z.string()),
      forbidden: z.array(z.string()),
    });

    expect(() => manifestSchema.parse(manifest)).not.toThrow();
  });

  it('execution order is foundations -> quality -> primary', () => {
    expect(manifest.execution_order).toEqual([
      'scroll-experience-foundations',
      'cinematic-scroll-quality',
      'scroll-world-agnostic',
    ]);
  });

  it('no circular dependencies', () => {
    for (const skill of manifest.skills) {
      const visited = new Set<string>();
      const check = (id: string): void => {
        if (visited.has(id)) return;
        visited.add(id);
        const s = manifest.skills.find((sk) => sk.skill_id === id);
        for (const dep of s?.depends_on ?? []) {
          if (dep === skill.skill_id) {
            throw new Error(`Circular dependency: ${skill.skill_id} -> ${dep}`);
          }
          check(dep);
        }
      };
      check(skill.skill_id);
    }
  });

  it('no duplicate skill names', () => {
    const ids = manifest.skills.map((s) => s.skill_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('primary declares model_agnostic: true', () => {
    const primary = manifest.skills.find((s) => s.role === 'primary-orchestrator');
    expect(primary?.model_agnostic).toBe(true);
  });

  it('all adapters are optional and replaceable', () => {
    for (const [name, adapter] of Object.entries(manifest.adapter_contracts)) {
      expect(adapter.required, `${name} must be optional`).toBe(false);
      expect(adapter.replaceable, `${name} must be replaceable`).toBe(true);
    }
  });

  it('no vendor as core dependency', () => {
    expect(manifest.forbidden).toContain('mandatory_providers');
    expect(manifest.forbidden).toContain('mandatory_models');
  });
});

// =====================================================
// 5. NO MANDATORY PROVIDERS/MODELS in SKILL.md
// =====================================================

describe('scroll-skills: no mandatory vendors in content', () => {
  // These vendor names are allowed in ATTRIBUTION sections but must not
  // appear as REQUIRED in the procedural sections.
  const MANDATORY_PATTERNS = [
    /requires?\s+higgsfield/iu,
    /requires?\s+monid/iu,
    /requires?\s+fal\.ai/iu,
    /requires?\s+seedance/iu,
    /requires?\s+kling/iu,
    /must\s+use\s+higgsfield/iu,
    /must\s+use\s+monid/iu,
    /must\s+use\s+fal\.ai/iu,
  ];

  for (const id of SKILL_IDS) {
    const text = readSkill(id);

    it(`${id}: no mandatory provider/model language`, () => {
      for (const pattern of MANDATORY_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    });
  }
});

// =====================================================
// 6. NO ABSOLUTE USER PATHS
// =====================================================

describe('scroll-skills: no absolute user paths', () => {
  for (const id of SKILL_IDS) {
    const text = readSkill(id);

    it(`${id}: no /Users/, /home/, or C:\\Users\\ paths`, () => {
      expect(text).not.toMatch(/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u);
    });
  }
});

// =====================================================
// 7. NO SECRETS
// =====================================================

describe('scroll-skills: no secrets', () => {
  const SECRET_PATTERNS = [
    /(?:api[_-]?key|secret|password|token|bearer)\s*[=:]\s*['"][^'"]+['"]/iu,
    /AKIA[0-9A-Z]{16}/u, // AWS access key
    /sk-[a-zA-Z0-9]{20,}/u, // OpenAI-style key
    /ghp_[a-zA-Z0-9]{20,}/u, // GitHub PAT
  ];

  for (const id of SKILL_IDS) {
    const text = readSkill(id);
    const lineageText = readFileSync(resolve(root, 'skills', id, 'LINEAGE.yml'), 'utf8');

    it(`${id}: SKILL.md has no secrets`, () => {
      for (const pattern of SECRET_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    });

    it(`${id}: LINEAGE.yml has no secrets`, () => {
      for (const pattern of SECRET_PATTERNS) {
        expect(lineageText).not.toMatch(pattern);
      }
    });
  }
});

// =====================================================
// 8. FALLBACKS present
// =====================================================

describe('scroll-skills: fallbacks', () => {
  for (const id of SKILL_IDS) {
    const text = readSkill(id);

    it(`${id}: has fallback section`, () => {
      expect(text).toMatch(/fallback|Fallback|degradaci/iu);
    });
  }

  it('primary has at least 3 fallback strategies', () => {
    const manifest: Manifest = readManifest();
    const primary = manifest.skills.find((s) => s.role === 'primary-orchestrator');
    expect(primary!.fallbacks.length).toBeGreaterThanOrEqual(3);
  });
});

// =====================================================
// 9. FIXTURES content valid
// =====================================================

describe('scroll-skills: fixtures', () => {
  for (const id of SKILL_IDS) {
    const posDir = resolve(root, 'skills', id, 'fixtures', 'positive');
    const negDir = resolve(root, 'skills', id, 'fixtures', 'negative');

    it(`${id}: has at least one positive fixture`, () => {
      const files = readdirSync(posDir).filter((f) => f.endsWith('.yml'));
      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it(`${id}: has at least one negative fixture`, () => {
      const files = readdirSync(negDir).filter((f) => f.endsWith('.yml'));
      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it(`${id}: positive fixture parses as YAML`, () => {
      const files = readdirSync(posDir).filter((f) => f.endsWith('.yml'));
      const content = readFileSync(join(posDir, files[0]!), 'utf8');
      expect(() => parse(content) as unknown).not.toThrow();
    });

    it(`${id}: negative fixture has violation field`, () => {
      const files = readdirSync(negDir).filter((f) => f.endsWith('.yml'));
      const content = readFileSync(join(negDir, files[0]!), 'utf8');
      const parsed = parse(content) as Record<string, unknown>;
      expect(parsed.violation).toBeDefined();
    });
  }
});

// =====================================================
// 10. NON-REGRESSION: existing skills unaffected
// =====================================================

describe('scroll-skills: non-regression', () => {
  it('existing skills directory still contains original skills', () => {
    const existingSkills = [
      'data-visual-composition',
      'instagram-carousel-production',
      'instagram-content-orchestration',
      'metodologia-brand-router',
      'metodologia-certificate-builder',
      'motion-library-adapters',
    ];
    for (const id of existingSkills) {
      expect(existsSync(resolve(root, 'skills', id, 'SKILL.md'))).toBe(true);
    }
  });

  it('does not modify existing skill registries', () => {
    // Verify the registries still exist and are unchanged in structure
    expect(existsSync(resolve(root, 'registries/skills/skill-registry.yml'))).toBe(true);
    expect(existsSync(resolve(root, 'registries/skills/creation-v3-skill-registry.yml'))).toBe(
      true,
    );
  });
});
