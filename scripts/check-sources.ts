import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const nullableHash = sha256.nullable();
const projectionSchema = z.strictObject({
  projection_id: z.string().min(1),
  projection_locator: z.string().min(1),
  projection_sha256: sha256,
  projection_bytes: z.number().int().positive(),
  projection_contract: z.string().min(1),
  derived_from_source_normalized_sha256: sha256,
  immutable: z.literal(true),
});
const registrySchema = z.object({
  schema_version: z.literal(2),
  registry_id: z.literal('source-registry-v2'),
  mutation_policy: z.literal('append-only-events-with-versioned-current-view'),
  semantic_migrations: z.array(
    z.strictObject({
      migration_id: z.string().min(1),
      source_id: z.string().min(1),
      receipt: z.string().min(1),
      applied_to_current_view: z.literal(true),
    }),
  ),
  entries: z.array(
    z
      .object({
        source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
        snapshot_id: z.string().optional(),
        current_state: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
        source_kind: z.string().min(1),
        portable_locator: z.string().optional(),
        portable_locator_role: z.enum(['source_material', 'derived_projection']).optional(),
        canonical_uri: z.url().optional(),
        hashes: z.object({
          raw_sha256: nullableHash,
          normalized_sha256: nullableHash,
          source_normalized_sha256: nullableHash,
        }),
        projection: projectionSchema.optional(),
        rights: z.record(z.string(), z.unknown()),
        authority: z.record(z.string(), z.unknown()),
        receipts: z.array(z.string()).min(1),
        coverage_gaps: z.array(z.string()).optional(),
      })
      .passthrough(),
  ),
});

const root = process.cwd();
const path = resolve(root, 'registries/sources/source-registry.yml');
const raw = readFileSync(path, 'utf8');
const registry = registrySchema.parse(parse(raw));
const errors: string[] = [];
const ids = new Set<string>();
const fileSha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const fileBytes = (path: string): number => readFileSync(path).byteLength;
const activePolicies: Readonly<Record<string, {rightsVerdict: string; authorityVerdict: string}>> =
  {
    first_party_synthetic_fixture: {
      rightsVerdict: 'allowed_local_test_only',
      authorityVerdict: 'verified_for_contract_testing_only',
    },
    product_requirements_authority: {
      rightsVerdict: 'allowed_internal_implementation',
      authorityVerdict: 'verified_product_requirements',
    },
  };

if (/\/Users\/|[A-Za-z]:\\Users\\/u.test(raw)) {
  errors.push('source-registry.yml contiene un locator local absoluto');
}

for (const entry of registry.entries) {
  if (ids.has(entry.source_id)) errors.push(`source_id duplicado: ${entry.source_id}`);
  ids.add(entry.source_id);

  for (const receipt of entry.receipts) {
    if (receipt.startsWith('/') || receipt.includes('..') || !existsSync(resolve(root, receipt))) {
      errors.push(`${entry.source_id}: receipt no portable o inexistente: ${receipt}`);
    }
  }

  if (entry.current_state === 'active') {
    if (entry.hashes.raw_sha256 === null || entry.hashes.source_normalized_sha256 === null) {
      errors.push(`${entry.source_id}: active sin hashes raw+source_normalized`);
    }
    if (entry.hashes.normalized_sha256 !== entry.hashes.source_normalized_sha256) {
      errors.push(`${entry.source_id}: alias normalized_sha256 no coincide con el hash canónico`);
    }
    if (entry.receipts.length < 4) {
      errors.push(`${entry.source_id}: active sin lifecycle receipts completos`);
    }
    if (entry.portable_locator === undefined || entry.portable_locator_role === undefined) {
      errors.push(`${entry.source_id}: active sin locator portable tipado`);
    } else if (
      entry.portable_locator.startsWith('/') ||
      entry.portable_locator.includes('..') ||
      !existsSync(resolve(root, entry.portable_locator))
    ) {
      errors.push(`${entry.source_id}: locator portable inexistente o inseguro`);
    } else if (entry.portable_locator_role === 'source_material') {
      if (
        entry.hashes.source_normalized_sha256 !== null &&
        fileSha256(resolve(root, entry.portable_locator)) !== entry.hashes.source_normalized_sha256
      ) {
        errors.push(`${entry.source_id}: source material no coincide con source_normalized_sha256`);
      }
      if (entry.projection !== undefined) {
        errors.push(`${entry.source_id}: source material no puede declararse como proyección`);
      }
    } else if (entry.projection === undefined) {
      errors.push(`${entry.source_id}: locator derived_projection sin metadata de proyección`);
    } else {
      const projectionPath = resolve(root, entry.projection.projection_locator);
      if (
        entry.projection.projection_locator !== entry.portable_locator ||
        fileSha256(projectionPath) !== entry.projection.projection_sha256 ||
        fileBytes(projectionPath) !== entry.projection.projection_bytes
      ) {
        errors.push(`${entry.source_id}: artefacto de proyección no coincide con registry`);
      }
      if (
        entry.projection.derived_from_source_normalized_sha256 !==
        entry.hashes.source_normalized_sha256
      ) {
        errors.push(`${entry.source_id}: proyección no deriva del hash normalizado canónico`);
      }
    }
    const policy = activePolicies[entry.source_kind];
    if (policy === undefined) {
      errors.push(`${entry.source_id}: source_kind no admitido para estado active`);
    } else {
      if (entry.rights.rights_verdict !== policy.rightsVerdict) {
        errors.push(`${entry.source_id}: active sin rights compatibles con ${entry.source_kind}`);
      }
      if (entry.authority.authority_verdict !== policy.authorityVerdict) {
        errors.push(`${entry.source_id}: active sin autoridad compatible con ${entry.source_kind}`);
      }
    }
  } else if (
    (entry.hashes.raw_sha256 === null || entry.hashes.source_normalized_sha256 === null) &&
    (entry.coverage_gaps?.length ?? 0) === 0
  ) {
    errors.push(`${entry.source_id}: hash ausente sin coverage_gap`);
  }
}

const synthetic = registry.entries.find(({source_id}) => source_id === 'SRC-SYNTH-VS001');
if (synthetic?.current_state !== 'active' || synthetic.snapshot_id !== 'synthetic-vs-001-v1') {
  errors.push('SRC-SYNTH-VS001 no está activo y fijado al snapshot esperado');
}

const prompt = registry.entries.find(({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6');
const expectedPromptRaw = '19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2';
const expectedPromptNormalized = '00de50b02d9cf393a5376781938fd0ba01c3bd8b7460e4b379ef9c31b148e505';
const historicalProjection = '02153ec2c50808ae1b91c8dff0bf0f11840ac8237948580b5e0ee6d36cbdf48f';
if (
  prompt?.snapshot_id !== 'prompt-maestro-v6-source-v1' ||
  prompt.hashes.raw_sha256 !== expectedPromptRaw ||
  prompt.hashes.source_normalized_sha256 !== expectedPromptNormalized ||
  prompt.portable_locator_role !== 'derived_projection' ||
  prompt.portable_locator === 'docs/program/requirements-traceability.md'
) {
  errors.push('SRC-PROMPT-MAESTRO-V6 no separa source hashes y proyección inmutable');
}

const migrationReference = registry.semantic_migrations.find(
  ({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6',
);
if (migrationReference === undefined || !existsSync(resolve(root, migrationReference.receipt))) {
  errors.push('SRC-PROMPT-MAESTRO-V6 no tiene receipt de migración semántica');
} else {
  const migration = parse(readFileSync(resolve(root, migrationReference.receipt), 'utf8')) as {
    receipt_kind?: string;
    event_order?: number;
    superseded_receipt_ids?: string[];
    historical_receipts?: Array<{path?: string; sha256?: string}>;
    legacy_semantics?: {recorded_sha256?: string};
    corrected_source_hashes?: {source_normalized_sha256?: string};
    replacement_projection?: {projection_sha256?: string};
    state_preserved?: string;
  };
  if (
    migration.receipt_kind !== 'hash_semantics_migration' ||
    migration.event_order !== 5 ||
    migration.superseded_receipt_ids?.length !== 4 ||
    migration.historical_receipts?.length !== 4 ||
    migration.historical_receipts.some(
      ({path: historicalPath, sha256: historicalSha256}) =>
        historicalPath === undefined ||
        historicalSha256 === undefined ||
        !existsSync(resolve(root, historicalPath)) ||
        fileSha256(resolve(root, historicalPath)) !== historicalSha256,
    ) ||
    migration.legacy_semantics?.recorded_sha256 !== historicalProjection ||
    migration.corrected_source_hashes?.source_normalized_sha256 !== expectedPromptNormalized ||
    migration.replacement_projection?.projection_sha256 !== prompt?.projection?.projection_sha256 ||
    migration.state_preserved !== 'active'
  ) {
    errors.push('SRC-PROMPT-MAESTRO-V6 tiene una migración semántica incompleta');
  }
}

const canonicalGaps = readFileSync(
  resolve(root, 'registries/sources/canonical-source-gaps.yml'),
  'utf8',
);
if (!/confirmed_count:\s*0/u.test(canonicalGaps) || !/expected_count:\s*4/u.test(canonicalGaps)) {
  errors.push('canonical-source-gaps.yml no declara de forma explícita 0/4 textos');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS G02/G03/G06 SOURCES: ${registry.entries.length} fuentes; fixture activa y corpus canónico 0/4 fail-closed.`,
  );
}
