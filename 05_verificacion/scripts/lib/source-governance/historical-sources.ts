import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {fileSha256} from './physical-validation.ts';
import type {SourceRegistryCheck} from './registry-schema.ts';

const EXPECTED_PROMPT_RAW = '19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2';
const EXPECTED_PROMPT_NORMALIZED =
  '00de50b02d9cf393a5376781938fd0ba01c3bd8b7460e4b379ef9c31b148e505';
const HISTORICAL_PROJECTION = '02153ec2c50808ae1b91c8dff0bf0f11840ac8237948580b5e0ee6d36cbdf48f';

type MigrationView = {
  receipt_kind?: string;
  event_order?: number;
  superseded_receipt_ids?: string[];
  historical_receipts?: Array<{path?: string; sha256?: string}>;
  legacy_semantics?: {recorded_sha256?: string};
  corrected_source_hashes?: {source_normalized_sha256?: string};
  replacement_projection?: {projection_sha256?: string};
  state_preserved?: string;
};

const CanonicalSourceGapsCheckSchema = z
  .strictObject({
    schema_version: z.literal(1),
    record_id: z.literal('canonical-source-gaps-v1'),
    status: z.literal('coverage_gap'),
    expected_count: z.literal(4),
    confirmed_count: z.literal(0),
    slots: z
      .array(
        z.strictObject({
          expected_slot: z.number().int().min(1).max(4),
          source_id: z.null(),
          title: z.null(),
          raw_sha256: z.null(),
          normalized_sha256: z.null(),
          gap_reason: z.literal('canonical_text_not_provided'),
        }),
      )
      .length(4),
    consequence: z.strictObject({
      source_locked: z.literal(false),
      may_use_synthetic_fixture: z.literal(true),
      may_claim_canonical_corpus_ingested: z.literal(false),
      may_publish: z.literal(false),
    }),
  })
  .superRefine((record, context) => {
    if (record.slots.some(({expected_slot: slot}, index) => slot !== index + 1)) {
      context.addIssue({code: 'custom', message: 'canonical slots must be ordered 1..4'});
    }
  });

export const validateHistoricalSourceInvariants = (
  root: string,
  registry: SourceRegistryCheck,
): string[] => {
  const errors: string[] = [];
  const synthetic = registry.entries.find(({source_id}) => source_id === 'SRC-SYNTH-VS001');
  if (synthetic?.current_state !== 'active' || synthetic.snapshot_id !== 'synthetic-vs-001-v1') {
    errors.push('SRC-SYNTH-VS001 no está activo y fijado al snapshot esperado');
  }

  const prompt = registry.entries.find(({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6');
  if (
    prompt?.snapshot_id !== 'prompt-maestro-v6-source-v1' ||
    prompt.hashes.raw_sha256 !== EXPECTED_PROMPT_RAW ||
    prompt.hashes.source_normalized_sha256 !== EXPECTED_PROMPT_NORMALIZED ||
    prompt.portable_locator_role !== 'derived_projection' ||
    prompt.portable_locator === 'docs/program/requirements-traceability.md'
  ) {
    errors.push('SRC-PROMPT-MAESTRO-V6 no separa source hashes y proyección inmutable');
  }
  validatePromptMigration(root, registry, prompt, errors);

  validateCanonicalGaps(root, errors);
  return errors;
};

const validateCanonicalGaps = (root: string, errors: string[]): void => {
  const locator = resolve(root, 'registries/sources/canonical-source-gaps.yml');
  try {
    const record = parse(readFileSync(locator, 'utf8')) as unknown;
    const result = CanonicalSourceGapsCheckSchema.safeParse(record);
    if (!result.success) {
      errors.push(
        'canonical-source-gaps.yml debe acreditar expected=4, confirmed=0 y source_locked=false',
      );
    }
  } catch (error) {
    errors.push(`canonical-source-gaps.yml no es legible o YAML válido: ${String(error)}`);
  }
};

const validatePromptMigration = (
  root: string,
  registry: SourceRegistryCheck,
  prompt: SourceRegistryCheck['entries'][number] | undefined,
  errors: string[],
): void => {
  const reference = registry.semantic_migrations.find(
    ({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6',
  );
  if (reference === undefined || !existsSync(resolve(root, reference.receipt))) {
    errors.push('SRC-PROMPT-MAESTRO-V6 no tiene receipt de migración semántica');
    return;
  }
  const migration = parse(readFileSync(resolve(root, reference.receipt), 'utf8')) as MigrationView;
  if (
    migration.receipt_kind !== 'hash_semantics_migration' ||
    migration.event_order !== 5 ||
    migration.superseded_receipt_ids?.length !== 4 ||
    migration.historical_receipts?.length !== 4 ||
    migration.historical_receipts.some(
      ({path, sha256}) =>
        path === undefined ||
        sha256 === undefined ||
        !existsSync(resolve(root, path)) ||
        fileSha256(resolve(root, path)) !== sha256,
    ) ||
    migration.legacy_semantics?.recorded_sha256 !== HISTORICAL_PROJECTION ||
    migration.corrected_source_hashes?.source_normalized_sha256 !== EXPECTED_PROMPT_NORMALIZED ||
    migration.replacement_projection?.projection_sha256 !== prompt?.projection?.projection_sha256 ||
    migration.state_preserved !== 'active'
  ) {
    errors.push('SRC-PROMPT-MAESTRO-V6 tiene una migración semántica incompleta');
  }
};
