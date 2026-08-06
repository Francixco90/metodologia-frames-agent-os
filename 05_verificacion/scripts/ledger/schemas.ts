// ledger/schemas.ts — zod validation schemas for the canonical ledger YAML.
// Extracted as a pure leaf (no dependency on the build/compute core). [CÓDIGO]
import {z} from 'zod';

import {
  artifactClasses,
  BASELINE_COMMIT,
  BASELINE_FILE_COUNT,
  dispositions,
  ownerIds,
} from '../lib/file-disposition-policy-v3.ts';

export const nullableNonnegativeInteger = z.number().int().nonnegative().nullable();

export const ledgerEntrySchema = z.strictObject({
  path: z.string().min(1),
  artifact_class: z.enum(artifactClasses),
  initial_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  initial_format: z.enum(['text', 'binary']),
  initial_words: z.number().int().nonnegative(),
  initial_loc: z.number().int().nonnegative(),
  resolved_owner: z.enum(ownerIds),
  decision: z.enum(dispositions),
  justification: z.string().min(1),
  evidence: z.strictObject({
    baseline_ref: z.string().min(1),
    current_ref: z.string().min(1),
    current_state: z.enum(['present', 'missing']),
    current_sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .nullable(),
    current_words: nullableNonnegativeInteger,
    current_loc: nullableNonnegativeInteger,
    byte_identical: z.boolean(),
    material_change: z.boolean(),
    owner_resolution: z.string().min(1),
    generator_ref: z.string().min(1).nullable(),
    successor_path: z.string().min(1).nullable(),
  }),
});

export const ledgerSchema = z
  .object({
    schema_version: z.literal('file-disposition-ledger-v2'),
    ledger_id: z.literal('instagram-agent-os-v2-baseline-disposition'),
    baseline_commit: z.literal(BASELINE_COMMIT),
    baseline_file_count: z.literal(BASELINE_FILE_COUNT),
    coverage: z.literal('387/387'),
    allowed_dispositions: z.array(z.enum(dispositions)).length(dispositions.length),
    budgets: z.object({
      editable_markdown_per_file: z.object({
        maximum_multiplier: z.literal(2),
        violations: z.array(z.string()),
      }),
      authored_eligible_corpus: z.object({
        maximum_multiplier: z.literal(1.5),
        status: z.enum(['pass', 'fail']),
      }),
      total_authored_hard_cap: z.object({
        maximum_multiplier: z.literal(2),
        status: z.enum(['pass', 'fail']),
      }),
      generated_template_budget: z.object({
        maximum_multiplier: z.literal(2),
        inventory_count: z.number().int().nonnegative(),
        applicable_bindings: z.number().int().nonnegative(),
        not_applicable_count: z.number().int().nonnegative(),
        coverage_gaps: z.array(z.string()),
        status: z.enum(['pass', 'fail']),
      }),
      runtime_generated_evidence: z.object({
        excluded_from_authored_budgets: z.literal(true),
        files: z.number().int().nonnegative(),
        paths: z.array(z.string()),
      }),
      immutable_history: z.object({
        excluded_from_authored_budgets: z.literal(true),
        status: z.enum(['pass', 'fail']),
      }),
    }),
    entries: z.array(ledgerEntrySchema).length(BASELINE_FILE_COUNT),
  })
  .passthrough();