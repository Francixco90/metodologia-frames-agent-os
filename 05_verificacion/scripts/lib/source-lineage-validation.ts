import {z} from 'zod';

import {Sha256Schema} from './project-validation.ts';

export const governedSourceBundleSchema = z.strictObject({
  schema_version: z.literal(2),
  bundle_id: z.string().min(1),
  project_id: z.string().min(1),
  source_snapshot_id: z.string().min(1),
  state: z.literal('PARTIAL_CONTROLLED'),
  source_locked: z.boolean(),
  normalization_contract: z.string().min(1),
  privacy_contract: z.object({
    public_projection: z.literal('derived_sanitized_content_only'),
    forbidden: z.array(z.string().min(1)).min(1),
  }),
  active_sources: z.array(
    z.object({source_id: z.string().min(1), normalized_sha256: Sha256Schema}),
  ),
  official_references: z.array(z.object({source_id: z.string().min(1)})),
  excluded_sources: z.array(
    z.object({
      source_id: z.string().min(1),
      normalized_sha256: Sha256Schema,
      exclusion_reason: z.string().min(1),
    }),
  ),
  coverage_gaps: z.array(z.string().min(1)).min(1),
  hard_limits: z.array(z.string().min(1)).min(1),
});

export const governedClaimsLedgerSchema = z.strictObject({
  schema_version: z.literal(1),
  ledger_id: z.string().min(1),
  project_id: z.string().min(1),
  mutation_policy: z.literal('append-only-records'),
  source_snapshot_id: z.string().min(1),
  entries: z.array(
    z.object({
      claim_id: z.string().min(1),
      source_ids: z.array(z.string().min(1)).min(1),
    }),
  ),
  blocked_claim_classes: z.array(z.string().min(1)).min(1),
  coverage_gaps: z.array(z.string().min(1)).min(1),
});

const duplicates = (values: string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

export const validateGovernedSourceLineage = (input: {
  projectId: string;
  snapshotId: string;
  sourceLocked: boolean;
  bundle: unknown;
  ledger: unknown;
}): string[] => {
  const bundle = governedSourceBundleSchema.parse(input.bundle);
  const ledger = governedClaimsLedgerSchema.parse(input.ledger);
  const errors: string[] = [];
  if (bundle.project_id !== input.projectId || ledger.project_id !== input.projectId) {
    errors.push('source bundle and claims ledger must match project_id');
  }
  if (
    bundle.source_snapshot_id !== input.snapshotId ||
    ledger.source_snapshot_id !== input.snapshotId
  ) {
    errors.push('manifest, source bundle and claims ledger must share source_snapshot_id');
  }
  if (bundle.source_locked !== input.sourceLocked) {
    errors.push('source_locked drift between manifest and source bundle');
  }
  const active = bundle.active_sources.map(({source_id}) => source_id);
  const official = bundle.official_references.map(({source_id}) => source_id);
  const excluded = bundle.excluded_sources.map(({source_id}) => source_id);
  if (duplicates([...active, ...official, ...excluded]).length > 0) {
    errors.push('source ids must be globally unique');
  }
  const allowed = new Set([...active, ...official]);
  const rejected = new Set(excluded);
  for (const claim of ledger.entries) {
    if (claim.source_ids.some((id) => !allowed.has(id))) {
      errors.push(`${claim.claim_id}: unknown source id`);
    }
    if (claim.source_ids.some((id) => rejected.has(id))) {
      errors.push(`${claim.claim_id}: excluded source cannot support claims`);
    }
  }
  return errors;
};
