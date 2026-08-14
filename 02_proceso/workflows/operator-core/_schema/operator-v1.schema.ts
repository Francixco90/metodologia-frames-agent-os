import {z} from 'zod';

import {
  ActorIdSchema,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../../core/contracts/primitives.ts';

export const OperatorDomainV1Schema = z.enum(['CAREER', 'VIDEO']);
export const EvidenceClassV1Schema = z.enum([
  'DOCUMENTED',
  'IMPLEMENTED',
  'UNIT_TESTED',
  'INTEGRATION_TESTED',
  'CONVERSATION_OBSERVED',
  'USER_ACCEPTED',
  'PRODUCTION_VERIFIED',
]);
export const CausalPlaneV1Schema = z.enum([
  'REPOSITORY',
  'AI_OPERATOR',
  'HOST_RUNTIME',
  'MACHINE_RESOURCES',
  'HUMAN_OUTCOME',
  'MIXED',
]);
export const ResourceClassV1Schema = z.enum(['LIGHT', 'HEAVY', 'BROWSER']);
export const OperatorStateV1Schema = z.enum([
  'INTAKE',
  'SOURCE_FROZEN',
  'SPEC_LOCKED',
  'PLANNED',
  'EXECUTING',
  'RENDERED_DRAFT',
  'VERIFIED',
  'HUMAN_ACCEPTED',
  'BLOCKED',
]);

const EvidenceRefSchema = z.strictObject({
  ref: RelativePathSchema,
  sha256: Sha256Schema,
});

export const ConversationManifestV1Schema = z.strictObject({
  schema_version: z.literal('conversation-manifest-v1'),
  conversation_id: PortableIdSchema,
  domain: OperatorDomainV1Schema,
  request_sha256: Sha256Schema,
  prompt_count: z.number().int().min(1).max(5),
  source_refs: z.array(EvidenceRefSchema).max(24),
  created_at: TimestampSchema,
});

export const FrictionEventV1Schema = z.strictObject({
  schema_version: z.literal('friction-event-v1'),
  event_id: PortableIdSchema,
  plane: CausalPlaneV1Schema,
  work_unit_id: PortableIdSchema.nullable(),
  reason_code: PortableIdSchema,
  retry_count: z.number().int().min(0).max(2),
  evidence: z.array(EvidenceRefSchema).min(1).max(8),
});

export const CapabilityMaturityV1Schema = z.strictObject({
  schema_version: z.literal('capability-maturity-v1'),
  capability_id: PortableIdSchema,
  maturity: EvidenceClassV1Schema,
  evidence: z.array(EvidenceRefSchema).min(1).max(12),
});

export const OperatorBehaviorEventV1Schema = z.strictObject({
  schema_version: z.literal('operator-behavior-event-v1'),
  event_id: PortableIdSchema,
  behavior: z.enum(['SELECT', 'WRITE', 'COMPRESS', 'ISOLATE', 'VERIFY', 'STOP']),
  reason_code: PortableIdSchema,
  evidence_class: EvidenceClassV1Schema,
});

export const ArtifactIdentityChainV1Schema = z.strictObject({
  schema_version: z.literal('artifact-identity-chain-v1'),
  artifact_id: PortableIdSchema,
  source_set_sha256: Sha256Schema,
  spec_sha256: Sha256Schema,
  build_sha256: Sha256Schema,
  manifest_sha256: Sha256Schema,
  state: z.enum(['CANDIDATE', 'RENDERED_DRAFT', 'VERIFIED', 'HUMAN_ACCEPTED']),
});

export const ResourceIncidentV1Schema = z.strictObject({
  schema_version: z.literal('resource-incident-v1'),
  incident_id: PortableIdSchema,
  resource_class: ResourceClassV1Schema,
  plane: z.literal('MACHINE_RESOURCES'),
  checkpoint_ref: RelativePathSchema,
  recovered: z.boolean(),
});

export const ImprovementItemV1Schema = z.strictObject({
  schema_version: z.literal('improvement-item-v1'),
  item_id: PortableIdSchema,
  title: z.string().trim().min(1).max(160),
  plane: CausalPlaneV1Schema,
  maturity: EvidenceClassV1Schema,
  target_metric: z.string().trim().min(1).max(200),
  evidence: z.array(EvidenceRefSchema).max(8),
});

export const WorkUnitV1Schema = z.strictObject({
  schema_version: z.literal('work-unit-v1'),
  work_unit_id: PortableIdSchema,
  status: z.enum(['PENDING', 'ACTIVE', 'PASS', 'FAIL', 'BLOCKED']),
  depends_on: z.array(PortableIdSchema).max(12),
  write_set: z.array(RelativePathSchema).min(1).max(24),
  resource_class: ResourceClassV1Schema,
  resource_tags: z
    .array(z.enum(['local_llm', 'video_encode', 'browser_render', 'long_encode']))
    .max(4),
  checkpoint_ref: RelativePathSchema,
  attempts: z.number().int().min(0).max(2),
});

export const SessionCapsuleV1Schema = z.strictObject({
  schema_version: z.literal('session-capsule-v1'),
  job_id: PortableIdSchema,
  domain: OperatorDomainV1Schema,
  state: OperatorStateV1Schema,
  outcome: z.string().trim().min(1).max(500),
  active_work_unit_id: PortableIdSchema.nullable(),
  decisions: z.array(z.string().trim().min(1).max(240)).max(5),
  evidence_refs: z.array(EvidenceRefSchema).max(12),
  gaps: z.array(z.string().trim().min(1).max(240)).max(8),
  next_gate: PortableIdSchema,
});

export const EfficiencyReceiptV1Schema = z.strictObject({
  schema_version: z.literal('efficiency-receipt-v1'),
  status: z.enum(['UNMEASURED', 'MEASURED']),
  baseline_tokens: z.number().int().positive().nullable(),
  candidate_tokens: z.number().int().positive().nullable(),
  baseline_prompts: z.number().int().positive().nullable(),
  candidate_prompts: z.number().int().min(1).max(5).nullable(),
  reduction_percent: z.number().min(0).max(100).nullable(),
  target_half_cost_met: z.boolean(),
});

const VerificationReceiptSchema = z.strictObject({
  verifier_actor_id: ActorIdSchema,
  artifact_id: PortableIdSchema,
  manifest_sha256: Sha256Schema,
  verdict: z.enum(['PASS', 'FAIL']),
});

export const OperatorJobV1Schema = z.strictObject({
  schema_version: z.literal('operator-job-v1'),
  job_id: PortableIdSchema,
  domain: OperatorDomainV1Schema,
  state: OperatorStateV1Schema,
  producer_actor_id: ActorIdSchema,
  verifier_actor_id: ActorIdSchema,
  guardian_actor_id: ActorIdSchema,
  prompt_count: z.number().int().min(1).max(5),
  work_units: z.array(WorkUnitV1Schema).min(1).max(48),
  artifact: ArtifactIdentityChainV1Schema.nullable(),
  primary_verification: VerificationReceiptSchema.nullable(),
  human_acceptance: z
    .strictObject({
      approver_actor_id: ActorIdSchema,
      artifact_id: PortableIdSchema,
      manifest_sha256: Sha256Schema,
      accepted: z.literal(true),
    })
    .nullable(),
  secondary_exports: z
    .array(z.strictObject({id: PortableIdSchema, state: z.enum(['QUEUED', 'COMPILED'])}))
    .max(8),
  capsule: SessionCapsuleV1Schema,
  efficiency: EfficiencyReceiptV1Schema,
});

export type OperatorJobV1 = z.infer<typeof OperatorJobV1Schema>;
export type SessionCapsuleV1 = z.infer<typeof SessionCapsuleV1Schema>;
