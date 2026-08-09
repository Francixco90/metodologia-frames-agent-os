import {z} from 'zod';

const Id = z.string().regex(/^[A-Z][A-Z0-9_-]{2,63}$/u);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const GitCommit = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u);
const RelativeRef = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\\'));
const Actor = z.string().min(3).max(80);

export const SkillEffectClassV1Schema = z.enum(['E0', 'E1', 'E2', 'E3', 'E4']);
export type SkillEffectClassV1 = z.infer<typeof SkillEffectClassV1Schema>;

export const SkillSystemCaseV1Schema = z.strictObject({
  schema_version: z.literal('skill-system-case-v1'),
  case_id: Id,
  parent_id: Id.nullable(),
  request: z.string().min(8).max(2_000),
  scope: z.enum(['PROJECT_LOCAL', 'USER_LOCAL', 'CANONICAL']),
  desired_outcome: z.string().min(8).max(600),
  source_refs: z.array(RelativeRef).min(1),
  authority_status: z.enum(['VERIFIED', 'PARTIAL', 'MISSING']),
  effect_ceiling: SkillEffectClassV1Schema,
  acceptance: z.array(z.string().min(4).max(300)).min(1),
  blocking_gaps: z.array(z.string().min(3).max(200)).max(3),
  owner: Actor,
  content_sha256: Sha256,
});

export const CapabilityMapV1Schema = z.strictObject({
  schema_version: z.literal('capability-map-v1'),
  map_id: Id,
  case_id: Id,
  existing_capabilities: z.array(z.string().min(2)).default([]),
  components: z
    .array(
      z.strictObject({
        component_id: Id,
        kind: z.enum([
          'SKILL',
          'TOOL',
          'REFERENCE',
          'SCHEMA',
          'STATE',
          'EVALUATOR',
          'ADAPTER',
          'HUMAN_GATE',
        ]),
        responsibility: z.string().min(5).max(400),
        owner: Actor,
        effect_class: SkillEffectClassV1Schema,
      }),
    )
    .min(1),
  demotion_results: z.array(z.string().min(3)).min(1),
  split_reasons: z.array(z.string().min(3)).max(8),
  content_sha256: Sha256,
});

export const ArchitectureDecisionV1Schema = z
  .strictObject({
    schema_version: z.literal('skill-architecture-decision-v1'),
    decision_id: Id,
    case_id: Id,
    capability_map_id: Id,
    decision: z.enum(['CREATE', 'KEEP', 'EVOLVE', 'MERGE', 'SPLIT', 'DEMOTE', 'RETIRE', 'BLOCK']),
    selected_topology: z.array(Id).min(1),
    rejected_alternatives: z.array(z.string().min(3)).min(1),
    tradeoffs: z.array(z.string().min(3)).min(1),
    migration_required: z.boolean(),
    fallback: z.string().min(3),
    owner: Actor,
    content_sha256: Sha256,
  })
  .superRefine((value, context) => {
    if (value.decision === 'SPLIT' && value.tradeoffs.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['tradeoffs'],
        message: 'SSS_SPLIT_REQUIRES_TWO_REASONS',
      });
    }
  });

export const ComponentContractV1Schema = z.strictObject({
  schema_version: z.literal('skill-component-contract-v1'),
  component_id: Id,
  kind: z.enum(['SKILL', 'TOOL', 'REFERENCE', 'SCHEMA', 'EVALUATOR', 'ADAPTER']),
  inputs_schema_ref: RelativeRef,
  outputs_schema_ref: RelativeRef,
  effect_class: SkillEffectClassV1Schema,
  read_set: z.array(RelativeRef),
  write_set: z.array(RelativeRef),
  fallback: z.string().min(3),
  acceptance: z.array(z.string().min(3)).min(1),
  owner: Actor,
  content_sha256: Sha256,
});

export const SkillEvalCaseV1Schema = z.strictObject({
  schema_version: z.literal('skill-eval-case-v1'),
  eval_case_id: Id,
  family: z.enum(['TRIGGER', 'DECISION', 'OUTCOME']),
  corpus: z.enum(['DEVELOPMENT', 'HELD_OUT', 'ADVERSARIAL', 'REGRESSION']),
  prompt: z.string().min(4).max(2_000),
  baseline: z.enum(['NO_SKILL', 'PREVIOUS_VERSION']),
  assertions: z.array(z.string().min(3)).min(1),
  owner_component: Id,
});

export const SkillEvalRunV1Schema = z.strictObject({
  schema_version: z.literal('skill-eval-run-v1'),
  run_id: Id,
  candidate_sha256: Sha256,
  cases: z
    .array(
      z.strictObject({
        eval_case_id: Id,
        infrastructure_status: z.enum(['PASS', 'FAIL', 'UNKNOWN']),
        baseline_pass: z.boolean().nullable(),
        candidate_pass: z.boolean().nullable(),
        evidence_refs: z.array(RelativeRef),
      }),
    )
    .min(1),
  replay_sha256: Sha256,
  actor_id: Actor,
  coverage_policy: z.strictObject({
    minimum_eligible_cases: z.number().int().min(2),
    maximum_infrastructure_failure_ratio: z.number().min(0).max(1),
  }),
});

export const SkillReviewReportV1Schema = z.strictObject({
  schema_version: z.literal('skill-review-report-v1'),
  review_id: Id,
  candidate_sha256: Sha256,
  verdict: z.enum(['PASS', 'REVISE', 'BLOCKED', 'UNKNOWN']),
  findings: z.array(z.string().min(3)),
  owner_component: Id,
  reviewer_actor_id: Actor,
});

export const SkillChangeProposalV1Schema = z.strictObject({
  schema_version: z.literal('skill-change-proposal-v1'),
  proposal_id: Id,
  parent_id: Id.nullable(),
  candidate_sha256: Sha256,
  action: z.enum(['CREATE', 'EVOLVE', 'MERGE', 'SPLIT', 'DEMOTE', 'RETIRE']),
  migration_ref: RelativeRef.nullable(),
  rollback_ref: RelativeRef,
  review_id: Id,
  owner: Actor,
});

export const SkillReleaseCapsuleV1Schema = z.strictObject({
  schema_version: z.literal('skill-release-capsule-v1'),
  release_id: Id,
  parent_release_id: Id.nullable(),
  commit_sha: GitCommit,
  package_sha256: Sha256,
  files: z.array(z.strictObject({ref: RelativeRef, sha256: Sha256})).min(1),
  compatibility: z
    .array(
      z.strictObject({
        profile: z.string().min(2),
        status: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
        probe_ref: RelativeRef.nullable().default(null),
        probe_sha256: Sha256.nullable().default(null),
      }),
    )
    .min(1),
  approvals: z
    .array(
      z.strictObject({
        role: z.enum(['AUTHOR', 'REVIEWER', 'GUARDIAN', 'APPROVER']),
        actor_id: Actor,
        receipt_ref: RelativeRef,
      }),
    )
    .length(4),
  restore_ref: RelativeRef,
  restore_sha256: Sha256,
  state: z.enum(['DRAFT', 'CANDIDATE', 'APPROVED', 'SUPERSEDED', 'RETIRED', 'REVOKED']),
});

export type SkillSystemCaseV1 = z.infer<typeof SkillSystemCaseV1Schema>;
export type SkillEvalRunV1 = z.infer<typeof SkillEvalRunV1Schema>;
