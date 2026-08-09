import {z} from 'zod';

const SkillId = z.string().regex(/^[a-z][a-z0-9-]{2,63}$/u);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const RelativeRef = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\\'));

export const PortfolioDispositionV1Schema = z.enum(['KEEP', 'ALIAS', 'SPLIT', 'ADD', 'REUSE']);

export const SkillPortfolioReconciliationV1Schema = z.strictObject({
  schema_version: z.literal('skill-portfolio-reconciliation-v1'),
  source_id: z.literal('SRC-SKILL-SYSTEMS-DOSSIER-V1'),
  source_sha256: Sha256,
  decisions: z
    .array(
      z.strictObject({
        proposed_id: SkillId,
        disposition: PortfolioDispositionV1Schema,
        canonical_ids: z.array(SkillId).min(1).max(3),
        reason: z.string().min(12).max(320),
        migration_note: z.string().min(8).max(240),
      }),
    )
    .length(8),
  resulting_active_ids: z.array(SkillId).min(8),
  duplicate_active_roles: z.array(SkillId).length(0),
});

export const SkillResourceDispositionV1Schema = z.strictObject({
  schema_version: z.literal('skill-resource-disposition-v1'),
  source_id: z.literal('SRC-MULTIMEDIA-PIVOTE-20PLUS1-V4'),
  bundle_sha256: Sha256,
  resources: z
    .array(
      z.strictObject({
        resource_id: z.string().regex(/^[A-Z0-9_-]{3,80}$/u),
        source_refs: z.array(RelativeRef).min(1),
        disposition: z.enum(['ADOPT', 'ADAPT', 'REFERENCE', 'REJECT', 'GAP']),
        frames_owner: SkillId,
        acceptance: z.array(z.string().min(6)).min(1),
        limitation: z.string().min(4),
      }),
    )
    .min(1),
});

export const SkillSystemsDossierAdoptionV1Schema = z.strictObject({
  schema_version: z.literal('skill-systems-dossier-adoption-v1'),
  reconciliation: SkillPortfolioReconciliationV1Schema,
  resource_disposition: SkillResourceDispositionV1Schema,
});

export const DualOracleReviewV1Schema = z
  .strictObject({
    schema_version: z.literal('dual-oracle-review-v1'),
    review_id: z.string().regex(/^DOR-[A-Z0-9-]{4,64}$/u),
    candidate_ref: RelativeRef,
    candidate_sha256: Sha256,
    frames_contract_refs: z.array(RelativeRef).min(1),
    pivote_oracle_refs: z.array(RelativeRef).min(1),
    checks: z
      .array(
        z.strictObject({
          check_id: z.string().regex(/^DOR-[A-Z0-9-]{3,64}$/u),
          frames_verdict: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']),
          pivote_verdict: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']),
          evidence_refs: z.array(RelativeRef),
          resolution: z.enum(['ACCEPT', 'REVISE', 'BLOCK', 'HUMAN_DECISION']),
        }),
      )
      .min(1),
    reviewer_actor_id: z.string().min(3).max(80),
    producer_actor_id: z.string().min(3).max(80),
    final_verdict: z.enum(['PASS', 'REVISE', 'BLOCKED', 'UNKNOWN']),
  })
  .superRefine((value, context) => {
    if (value.reviewer_actor_id === value.producer_actor_id) {
      context.addIssue({
        code: 'custom',
        path: ['reviewer_actor_id'],
        message: 'DOR-ACTOR-SEPARATION',
      });
    }
    if (
      value.checks.some((check) => check.resolution !== 'ACCEPT') &&
      value.final_verdict === 'PASS'
    ) {
      context.addIssue({code: 'custom', path: ['final_verdict'], message: 'DOR-UNRESOLVED-CHECK'});
    }
  });

export type SkillPortfolioReconciliationV1 = z.infer<typeof SkillPortfolioReconciliationV1Schema>;
export type SkillResourceDispositionV1 = z.infer<typeof SkillResourceDispositionV1Schema>;
export type DualOracleReviewV1 = z.infer<typeof DualOracleReviewV1Schema>;
