import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {
  readRepositoryJson,
  readRepositoryText,
  readRepositoryYaml,
  repositoryRoot,
  sha256,
} from '../fixtures/verifier/io.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const PortablePathPattern =
  /^(?!\/)(?!\.\.?(?:\/|$))(?!.*\/\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const PortablePathSchema = z
  .string()
  .min(1)
  .regex(PortablePathPattern, 'Expected a portable repository-relative path');
const SkillStateSchema = z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']);
const BoundFileSchema = z.strictObject({
  ref: PortablePathSchema,
  sha256: Sha256Schema,
});

const ProfileSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
});

const RenderInputSchema = z.strictObject({
  requestId: z.string().min(1),
  projectId: z.string().min(1),
  requestedState: z.literal('RENDERED_DRAFT'),
  sourceSnapshot: z.strictObject({
    id: z.string().min(1),
    normalizedSha256: Sha256Schema,
  }),
  claimsLedgerDigest: Sha256Schema,
  assetsManifestDigest: Sha256Schema,
  profile: ProfileSchema,
  props: z.record(z.string(), z.unknown()),
  runtime: z.strictObject({
    remotionVersion: z.literal('4.0.494'),
    zodMajor: z.literal(4),
    networkAllowed: z.literal(false),
    licenseVerdict: z.enum(['evaluation_only', 'eligible_for_requested_use']),
  }),
});

const RenderOutputSchema = z.strictObject({
  requestId: z.string().min(1),
  status: z.literal('RENDERED_DRAFT'),
  artifactId: z.string().min(1),
  portableMediaPath: PortablePathSchema,
  fileSha256: Sha256Schema,
  normalizedFrameDigest: Sha256Schema,
  normalizedAudioDigest: Sha256Schema.nullable(),
  profile: ProfileSchema,
  humanReview: z.literal('pending'),
  runtimeLicenseStatus: z.enum(['unresolved', 'eligible_for_requested_use']),
  coverageGaps: z.array(z.string().min(1)),
});

const RenderErrorSchema = z.strictObject({
  requestId: z.string().min(1),
  status: z.literal('blocked'),
  code: z.enum([
    'SOURCE_NOT_ACTIVE',
    'CLAIM_NOT_SUPPORTED',
    'ASSET_INVALID',
    'RIGHTS_OR_AUTHORITY_GAP',
    'RUNTIME_LICENSE_GAP',
    'VERSION_MISMATCH',
    'NONDETERMINISTIC_API',
    'OFFLINE_VIOLATION',
    'TIMELINE_INVALID',
    'AV_QA_FAILED',
    'RENDER_FAILED',
  ]),
  phase: z.enum(['preflight', 'bundle', 'render', 'av_qa', 'handoff']),
  message: z.string().min(1),
  retryable: z.boolean(),
  evidence: z.array(z.string().min(1)),
  coverageGaps: z.array(z.string().min(1)),
});

const RegistrySchema = z.object({
  schema_version: z.literal(1),
  mutation_policy: z.string().includes('append-only'),
  entries: z.array(
    z.object({
      skill_id: z.string().min(1),
      version: z.string().min(1),
      current_state: SkillStateSchema,
      content_sha256: Sha256Schema,
      package_manifest_sha256: Sha256Schema,
      package_manifest_algorithm: z.literal(
        'sha256_of_sorted_sha256_double_space_relative_path_lines',
      ),
      lineage: PortablePathSchema,
      content_license: z.string().min(1),
      content_license_evidence: z
        .object({
          text_ref: PortablePathSchema,
          text_sha256: Sha256Schema,
          receipt_ref: PortablePathSchema,
          receipt_sha256: Sha256Schema,
        })
        .optional(),
      runtime_license_evidence: z
        .object({
          receipt_ref: PortablePathSchema,
          receipt_sha256: Sha256Schema,
          commercial_or_production_use: z.literal('coverage_gap'),
          consequence: z.literal('blocked'),
        })
        .optional(),
      execution_scope: z.string().min(1),
      production_runtime_status: z.string().min(1),
      tests: z.array(z.string().min(1)),
    }),
  ),
  events: z.array(
    z.object({
      event_id: z.string().min(1),
      event_order: z.number().int().positive(),
      actor_id: z.string().min(1),
      skill_id: z.string().min(1),
      content_sha256: Sha256Schema,
      transition: z.object({
        from: SkillStateSchema.nullable(),
        to: SkillStateSchema,
      }),
    }),
  ),
});

const CanonicalLineageSchema = z.object({
  schema_version: z.literal(1),
  skill_id: z.literal('remotion-video-production'),
  version: z.enum(['0.1.0', '0.2.0']),
  content_origin: z.literal('locally_authored'),
  content_license: z.literal('LicenseRef-MetodologIA-Internal'),
  content_license_evidence: z.strictObject({
    text_ref: PortablePathSchema,
    text_sha256: Sha256Schema,
    receipt_ref: PortablePathSchema,
    receipt_sha256: Sha256Schema,
  }),
  lifecycle_state: z.literal('active'),
  execution_scope: z.literal('local-design-and-validation'),
  runtime: z.object({
    remotion_version: z.literal('4.0.494'),
    zod_major: z.literal(4),
    local_evaluation: z.literal('permitted_by_program_decision'),
    commercial_or_production_use: z.literal('coverage_gap'),
    license_authority: z.strictObject({
      kind: z.literal('exact_version_hash_bound_evaluation_receipt'),
      receipt_ref: PortablePathSchema,
      receipt_sha256: Sha256Schema,
      legal_eligibility_adjudicated: z.literal(false),
    }),
  }),
  references: z.array(
    z.object({
      source_id: z.enum([
        'SRC-REMOTION-DOCS-001',
        'SRC-REMOTION-SKILLS-001',
        'SRC-LEGACY-STITCH-REMOTION-001',
      ]),
      registry_state: z.enum(['candidate', 'quarantined']),
      url: z.string().url(),
      canonical_uri_sha256: Sha256Schema,
      content_hash_status: z.literal('not_ingested'),
      raw_sha256: Sha256Schema.nullable(),
      normalized_sha256: Sha256Schema.nullable(),
      use: z.string().min(1),
      restrictions: z.array(z.string().min(1)).min(1),
      receipts: z.array(BoundFileSchema).min(1),
      copied_material: z.literal(false),
    }),
  ),
  coverage_gaps: z.array(z.string().min(1)).min(1),
  stop_rules: z.array(z.string().min(1)).min(1),
});

const LegacyLineageSchema = z.object({
  schema_version: z.literal(1),
  skill_id: z.literal('stitch-remotion-walkthrough'),
  version: z.literal('0.1.0'),
  content_origin: z.literal('locally_authored_quarantine_wrapper'),
  content_license: z.literal('LicenseRef-MetodologIA-Internal'),
  lifecycle_state: z.literal('quarantined'),
  execution_scope: z.literal('audit-only'),
  legacy_observation: z.object({
    observed_skill_id: z.literal('remotion'),
    observed_content_sha256: Sha256Schema,
    exact_source_commit: z.literal('coverage_gap'),
    license_status_for_observed_copy: z.literal('unresolved'),
    copied_material_in_this_package: z.literal(false),
  }),
  promotion_blockers: z.array(z.string().min(1)).min(1),
});

const canonicalSkillRoot = 'skills/remotion-video-production';
const legacySkillRoot = 'skills/stitch-remotion-walkthrough';
const canonicalLineagePath = `${canonicalSkillRoot}/LINEAGE.yaml`;
const forbiddenCanonicalLineageAlias = `${canonicalSkillRoot}/LINEAGE.yml`;
const legacyLineagePath = `${legacySkillRoot}/LINEAGE.yml`;
const forbiddenLegacyLineageAlias = `${legacySkillRoot}/LINEAGE.yaml`;
const packageManifestAlgorithm = 'sha256_of_sorted_sha256_double_space_relative_path_lines';
const canonicalScripts = [
  'check-contracts.mjs',
  'check-example.mjs',
  'check-skill.mjs',
  'check-sources.mjs',
];
const canonicalScriptCommands = [
  `node ${canonicalSkillRoot}/scripts/check-skill.mjs`,
  `node ${canonicalSkillRoot}/scripts/check-contracts.mjs`,
  `node ${canonicalSkillRoot}/scripts/check-sources.mjs`,
  `node ${canonicalSkillRoot}/scripts/check-example.mjs`,
];

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const child = join(directory, name);
    return statSync(child).isDirectory() ? walkFiles(child) : [child];
  });
}

function packageManifestDigest(relativeSkillRoot: string): string {
  const absoluteSkillRoot = resolve(repositoryRoot, relativeSkillRoot);
  const manifest = `${walkFiles(absoluteSkillRoot)
    .sort()
    .map(
      (path) =>
        `${sha256(readFileSync(path))}  ${relative(absoluteSkillRoot, path).replaceAll('\\', '/')}`,
    )
    .join('\n')}\n`;
  return sha256(manifest);
}

function listFileNames(relativeDirectory: string): string[] {
  return readdirSync(resolve(repositoryRoot, relativeDirectory), {withFileTypes: true})
    .filter((entry) => entry.isFile())
    .map(({name}) => name)
    .sort();
}

describe('A05 Skill Foundry contracts', () => {
  it('binds the canonical YAML lineage and exact package hashes to the active registry chain', () => {
    expect(existsSync(resolve(repositoryRoot, canonicalLineagePath))).toBe(true);
    expect(existsSync(resolve(repositoryRoot, forbiddenCanonicalLineageAlias))).toBe(false);

    const registry = RegistrySchema.parse(
      readRepositoryYaml('registries/skills/skill-registry.yml'),
    );
    const lineage = CanonicalLineageSchema.parse(readRepositoryYaml(canonicalLineagePath));
    const skillText = readRepositoryText(`${canonicalSkillRoot}/SKILL.md`);
    const expectedContentHash = sha256(skillText);
    const expectedPackageHash = packageManifestDigest(canonicalSkillRoot);
    const entry = registry.entries.find(
      ({skill_id: skillId}) => skillId === 'remotion-video-production',
    );
    expect(entry).toMatchObject({
      current_state: 'active',
      content_sha256: expectedContentHash,
      package_manifest_sha256: expectedPackageHash,
      package_manifest_algorithm: packageManifestAlgorithm,
      lineage: canonicalLineagePath,
      content_license: 'LicenseRef-MetodologIA-Internal',
      content_license_evidence: {
        text_ref: lineage.content_license_evidence.text_ref,
        text_sha256: lineage.content_license_evidence.text_sha256,
        receipt_ref: lineage.content_license_evidence.receipt_ref,
        receipt_sha256: lineage.content_license_evidence.receipt_sha256,
      },
      runtime_license_evidence: {
        receipt_ref: lineage.runtime.license_authority.receipt_ref,
        receipt_sha256: lineage.runtime.license_authority.receipt_sha256,
        commercial_or_production_use: 'coverage_gap',
        consequence: 'blocked',
      },
      execution_scope: 'local-design-and-validation',
      production_runtime_status: 'blocked_license_coverage_gap',
      tests: canonicalScriptCommands,
    });

    const events = registry.events
      .filter(({skill_id: skillId}) => skillId === 'remotion-video-production')
      .sort((left, right) => left.event_order - right.event_order);
    expect(events.map(({transition}) => [transition.from, transition.to])).toEqual([
      [null, 'candidate'],
      ['candidate', 'quarantined'],
      ['quarantined', 'evaluated'],
      ['evaluated', 'active'],
      ['active', 'active'],
    ]);
    expect(events.map(({event_order: eventOrder}) => eventOrder)).toEqual([1, 2, 3, 4, 5]);
    expect(events.at(-1)?.content_sha256).toBe(expectedContentHash);
  });

  it('keeps canonical external references reference-only and production licensing fail-closed', () => {
    const lineage = CanonicalLineageSchema.parse(readRepositoryYaml(canonicalLineagePath));
    const sourceRegistry = z
      .object({
        entries: z.array(
          z.object({
            source_id: z.string().min(1),
            current_state: z.string().min(1),
            canonical_uri: z.string().url().optional(),
            canonical_uri_sha256: Sha256Schema.optional(),
            hashes: z.object({
              raw_sha256: Sha256Schema.nullable(),
              normalized_sha256: Sha256Schema.nullable(),
              status: z.string().min(1).optional(),
            }),
            receipts: z.array(PortablePathSchema),
            restrictions: z.array(z.string().min(1)).optional(),
          }),
        ),
      })
      .parse(readRepositoryYaml('registries/sources/source-registry.yml'));
    const verdict = z
      .object({
        schema_version: z.literal(1),
        runtime: z.literal('Remotion'),
        version: z.literal('4.0.494'),
        official_license_url: z.literal(
          'https://github.com/remotion-dev/remotion/blob/v4.0.494/LICENSE.md',
        ),
        official_locator_version_pinned: z.literal(true),
        evaluation_receipt: BoundFileSchema,
        local_evaluation: z.object({verdict: z.literal('permitted')}),
        commercial_or_production_use: z.object({
          verdict: z.literal('coverage_gap'),
          consequence: z.literal('blocked'),
        }),
      })
      .parse(readRepositoryYaml(`${canonicalSkillRoot}/licenses/runtime-license-verdict.yml`));
    const licenseReadme = readRepositoryText(`${canonicalSkillRoot}/licenses/README.md`);
    const contentLicenseText = readRepositoryText(lineage.content_license_evidence.text_ref);
    const contentLicenseReceipt = z
      .object({
        license_id: z.literal('LicenseRef-MetodologIA-Internal'),
        license_text_ref: PortablePathSchema,
        license_text_sha256: Sha256Schema,
        applies_to: z.object({
          package_refs: z.tuple([
            z.literal('skills/remotion-video-production'),
            z.literal('skills/stitch-remotion-walkthrough'),
          ]),
          content_origin: z.literal('locally_authored'),
        }),
        permissions: z.object({
          external_distribution: z.literal('requires_separate_verifiable_authorization'),
          commercial_or_production_use: z.literal('requires_separate_rights_and_license_review'),
        }),
      })
      .parse(readRepositoryYaml(lineage.content_license_evidence.receipt_ref));
    const runtimeReceipt = z
      .object({
        runtime: z.object({name: z.literal('Remotion'), version: z.literal('4.0.494')}),
        version_binding: z.object({
          lockfile_ref: PortablePathSchema,
          lockfile_sha256: Sha256Schema,
          package_key: z.literal('remotion@4.0.494'),
        }),
        installed_evidence: z.object({
          package_manifest_ref: PortablePathSchema,
          package_manifest_sha256: Sha256Schema,
          license_text_ref: PortablePathSchema,
          license_text_sha256: Sha256Schema,
          external_text_copied_into_skill: z.literal(false),
        }),
        evaluation: z.object({
          legal_eligibility_adjudicated: z.literal(false),
          commercial_or_production_use: z.literal('coverage_gap'),
          consequence: z.literal('blocked'),
        }),
      })
      .parse(readRepositoryYaml(lineage.runtime.license_authority.receipt_ref));

    expect(lineage.references.every(({copied_material: copiedMaterial}) => !copiedMaterial)).toBe(
      true,
    );
    expect(lineage.references.map(({source_id: sourceId}) => sourceId).sort()).toEqual([
      'SRC-LEGACY-STITCH-REMOTION-001',
      'SRC-REMOTION-DOCS-001',
      'SRC-REMOTION-SKILLS-001',
    ]);
    for (const reference of lineage.references) {
      const registered = sourceRegistry.entries.find(
        ({source_id: sourceId}) => sourceId === reference.source_id,
      );
      expect(reference).toMatchObject({
        registry_state: registered?.current_state,
        url: registered?.canonical_uri,
        canonical_uri_sha256: registered?.canonical_uri_sha256,
        content_hash_status: registered?.hashes.status,
        raw_sha256: registered?.hashes.raw_sha256,
        normalized_sha256: registered?.hashes.normalized_sha256,
      });
      expect(
        reference.restrictions.every((restriction) =>
          registered?.restrictions?.includes(restriction),
        ),
      ).toBe(true);
      for (const receipt of reference.receipts) {
        expect(registered?.receipts).toContain(receipt.ref);
        expect(sha256(readRepositoryText(receipt.ref))).toBe(receipt.sha256);
      }
    }
    expect(
      lineage.references.find(({source_id: sourceId}) => sourceId === 'SRC-REMOTION-SKILLS-001'),
    ).toMatchObject({
      use: 'reference_only_license_unresolved',
      copied_material: false,
    });
    expect(lineage.coverage_gaps).toContain('remotion_runtime_commercial_eligibility_unresolved');
    expect(lineage.stop_rules).toContain(
      'do_not_produce_commercially_without_runtime_license_verdict',
    );
    expect(verdict.commercial_or_production_use.consequence).toBe('blocked');
    expect(sha256(contentLicenseText)).toBe(lineage.content_license_evidence.text_sha256);
    expect(sha256(readRepositoryText(lineage.content_license_evidence.receipt_ref))).toBe(
      lineage.content_license_evidence.receipt_sha256,
    );
    expect(contentLicenseReceipt).toMatchObject({
      license_text_ref: lineage.content_license_evidence.text_ref,
      license_text_sha256: lineage.content_license_evidence.text_sha256,
      applies_to: {
        package_refs: [canonicalSkillRoot, legacySkillRoot],
      },
    });
    expect(verdict.evaluation_receipt).toEqual({
      ref: lineage.runtime.license_authority.receipt_ref,
      sha256: lineage.runtime.license_authority.receipt_sha256,
    });
    expect(sha256(readRepositoryText(lineage.runtime.license_authority.receipt_ref))).toBe(
      lineage.runtime.license_authority.receipt_sha256,
    );
    expect(sha256(readRepositoryText(runtimeReceipt.version_binding.lockfile_ref))).toBe(
      runtimeReceipt.version_binding.lockfile_sha256,
    );
    expect(sha256(readRepositoryText(runtimeReceipt.installed_evidence.package_manifest_ref))).toBe(
      runtimeReceipt.installed_evidence.package_manifest_sha256,
    );
    expect(sha256(readRepositoryText(runtimeReceipt.installed_evidence.license_text_ref))).toBe(
      runtimeReceipt.installed_evidence.license_text_sha256,
    );
    expect(licenseReadme).toContain('LicenseRef-MetodologIA-Internal');
    expect(licenseReadme).toContain('content-license-receipt.yml');
    expect(licenseReadme).toContain('runtime-license-verdict.yml');
  });

  it('declares exactly four canonical checks and executes all four successfully', () => {
    expect(listFileNames(`${canonicalSkillRoot}/scripts`)).toEqual(canonicalScripts);

    for (const command of canonicalScriptCommands) {
      const script = command.replace(/^node /u, '');
      const result = spawnSync(process.execPath, [script], {
        cwd: repositoryRoot,
        encoding: 'utf8',
      });
      const output = `${result.stdout}${result.stderr}`.trim();
      expect(result.error, output).toBeUndefined();
      expect(result.status, output).toBe(0);
      expect(output).toMatch(/PASS/u);
    }
  }, 15_000);

  it('accepts every declared positive fixture and rejects every declared negative fixture', () => {
    expect(listFileNames(`${canonicalSkillRoot}/fixtures/positive`)).toEqual([
      'frame-driven.tsx',
      'portable-media-paths.json',
      'render-error.json',
      'render-input.json',
      'render-output.json',
    ]);
    expect(listFileNames(`${canonicalSkillRoot}/fixtures/negative`)).toEqual([
      'banned-apis.fixture.txt',
      'portable-media-paths.json',
      'render-input-missing-source-digest.json',
      'render-output-ready-with-license-gap.json',
    ]);

    expect(() =>
      RenderInputSchema.parse(
        readRepositoryJson(`${canonicalSkillRoot}/fixtures/positive/render-input.json`),
      ),
    ).not.toThrow();
    expect(() =>
      RenderOutputSchema.parse(
        readRepositoryJson(`${canonicalSkillRoot}/fixtures/positive/render-output.json`),
      ),
    ).not.toThrow();
    expect(() =>
      RenderErrorSchema.parse(
        readRepositoryJson(`${canonicalSkillRoot}/fixtures/positive/render-error.json`),
      ),
    ).not.toThrow();
    expect(() =>
      RenderInputSchema.parse(
        readRepositoryJson(
          `${canonicalSkillRoot}/fixtures/negative/render-input-missing-source-digest.json`,
        ),
      ),
    ).toThrow();
    expect(() =>
      RenderOutputSchema.parse(
        readRepositoryJson(
          `${canonicalSkillRoot}/fixtures/negative/render-output-ready-with-license-gap.json`,
        ),
      ),
    ).toThrow();

    const positivePaths = z
      .object({
        cases: z.array(z.strictObject({case: z.string().min(1), value: z.string()})).length(3),
      })
      .parse(
        readRepositoryJson(`${canonicalSkillRoot}/fixtures/positive/portable-media-paths.json`),
      );
    const negativePaths = z
      .object({
        cases: z.array(z.strictObject({case: z.string().min(1), value: z.string()})).length(12),
      })
      .parse(
        readRepositoryJson(`${canonicalSkillRoot}/fixtures/negative/portable-media-paths.json`),
      );
    expect(
      positivePaths.cases.every(({value}) => PortablePathSchema.safeParse(value).success),
    ).toBe(true);
    expect(
      negativePaths.cases.every(({value}) => !PortablePathSchema.safeParse(value).success),
    ).toBe(true);
  });

  it('adds hash-bound source-count evidence without rewriting the historical report', () => {
    const evidence = z
      .object({
        evidence_id: z.literal('EVD-A02C-SOURCE-INVENTORY-SUPERSEDING-002'),
        supersedes: z.object({
          evidence_ref: PortablePathSchema,
          evidence_sha256: Sha256Schema,
          scope: z.literal('source_inventory_and_brand_lifecycle'),
          historical_result: z.literal('Eight source records'),
          history_rewritten: z.literal(false),
        }),
        current_inventory: z.object({
          registry_ref: PortablePathSchema,
          registry_sha256: Sha256Schema,
          registry_id: z.literal('source-registry-v2'),
          registry_schema_version: z.literal(2),
          source_count: z.literal(11),
          source_ids: z.array(z.string().regex(/^SRC-/u)).length(11),
        }),
        validation: z.object({
          expected_record_count: z.literal(11),
          canonical_expected: z.literal(4),
          canonical_confirmed: z.literal(0),
          source_locked: z.literal(false),
          state_effect: z.literal('NONE_ON_READY_RELEASE_OR_PUBLISHED'),
        }),
        append_only: z.literal(true),
      })
      .parse(readRepositoryYaml('quality/reports/a02c-source-inventory-superseding-v2.yml'));
    const priorEvidenceText = readRepositoryText(evidence.supersedes.evidence_ref);
    const priorEvidence = z
      .object({
        evidence_id: z.literal('EVD-A02-SOURCE-INVENTORY-SUPERSEDING-001'),
        supersedes: z.object({
          evidence_ref: PortablePathSchema,
          evidence_sha256: Sha256Schema,
          historical_result: z.literal('Three source records'),
          history_rewritten: z.literal(false),
        }),
      })
      .parse(readRepositoryYaml(evidence.supersedes.evidence_ref));
    const historicalText = readRepositoryText(priorEvidence.supersedes.evidence_ref);
    const currentRegistry = z
      .object({
        schema_version: z.literal(2),
        registry_id: z.literal('source-registry-v2'),
        entries: z.array(z.object({source_id: z.string().regex(/^SRC-/u)})).length(11),
      })
      .parse(readRepositoryYaml(evidence.current_inventory.registry_ref));

    expect(sha256(priorEvidenceText)).toBe(evidence.supersedes.evidence_sha256);
    expect(historicalText).toContain(priorEvidence.supersedes.historical_result);
    expect(sha256(historicalText)).toBe(priorEvidence.supersedes.evidence_sha256);
    expect(sha256(readRepositoryText(evidence.current_inventory.registry_ref))).toBe(
      evidence.current_inventory.registry_sha256,
    );
    expect(currentRegistry.entries.map(({source_id: sourceId}) => sourceId)).toEqual(
      evidence.current_inventory.source_ids,
    );
  });

  it('preserves the legacy lowercase-yml lineage and its quarantined registry hashes', () => {
    expect(existsSync(resolve(repositoryRoot, legacyLineagePath))).toBe(true);
    expect(existsSync(resolve(repositoryRoot, forbiddenLegacyLineageAlias))).toBe(false);

    const legacyLineage = LegacyLineageSchema.parse(readRepositoryYaml(legacyLineagePath));
    const canonicalLineage = CanonicalLineageSchema.parse(readRepositoryYaml(canonicalLineagePath));
    const registry = RegistrySchema.parse(
      readRepositoryYaml('registries/skills/skill-registry.yml'),
    );
    const legacySkillText = readRepositoryText(`${legacySkillRoot}/SKILL.md`);
    const expectedContentHash = sha256(legacySkillText);
    const legacy = registry.entries.find(
      ({skill_id: skillId}) => skillId === 'stitch-remotion-walkthrough',
    );
    expect(legacy).toMatchObject({
      current_state: 'quarantined',
      content_sha256: expectedContentHash,
      package_manifest_sha256: packageManifestDigest(legacySkillRoot),
      package_manifest_algorithm: packageManifestAlgorithm,
      lineage: legacyLineagePath,
      content_license: 'LicenseRef-MetodologIA-Internal',
      content_license_evidence: canonicalLineage.content_license_evidence,
      execution_scope: 'reference_only',
      production_runtime_status: 'forbidden',
    });
    expect(legacyLineage.legacy_observation.copied_material_in_this_package).toBe(false);
    expect(legacyLineage.promotion_blockers).toContain('exact_source_commit_unknown');
    expect(legacyLineage.promotion_blockers).toContain('license_for_observed_copy_unresolved');

    const events = registry.events
      .filter(({skill_id: skillId}) => skillId === 'stitch-remotion-walkthrough')
      .sort((left, right) => left.event_order - right.event_order);
    expect(events.map(({transition}) => [transition.from, transition.to])).toEqual([
      [null, 'candidate'],
      ['candidate', 'quarantined'],
    ]);
    expect(events.map(({event_order: eventOrder}) => eventOrder)).toEqual([1, 2]);
    expect(events.every(({content_sha256: digest}) => digest === expectedContentHash)).toBe(true);
    expect(registry.entries.some(({skill_id: skillId}) => skillId === 'remotion')).toBe(false);
  });
});
