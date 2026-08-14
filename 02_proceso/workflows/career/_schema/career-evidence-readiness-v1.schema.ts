import {z} from 'zod';

import {CareerIdSchema, Sha256Schema} from './primitives-v1.schema.ts';

const CandidateItemSchema = z
  .strictObject({
    item_id: CareerIdSchema,
    kind: z.enum(['achievement', 'competency', 'strength']),
    statement: z.string().min(1).max(600),
    confidence: z.enum(['verified', 'user_confirmed', 'inferred']),
    source_ids: z.array(CareerIdSchema).min(1),
    evidence_ids: z.array(CareerIdSchema),
    role_families: z.array(z.string().min(1).max(120)),
    attribution_limit: z.string().min(1).max(360),
    allowed_channels: z.array(z.enum(['cv', 'portfolio', 'interview', 'cover_letter'])).min(1),
    forbidden_claims: z.array(z.string().min(1).max(240)),
  })
  .superRefine((value, context) => {
    if (new Set(value.source_ids).size !== value.source_ids.length) {
      context.addIssue({code: 'custom', message: 'source_ids must be unique'});
    }
    if (new Set(value.evidence_ids).size !== value.evidence_ids.length) {
      context.addIssue({code: 'custom', message: 'evidence_ids must be unique'});
    }
    if (value.confidence !== 'inferred' && value.evidence_ids.length === 0) {
      context.addIssue({code: 'custom', message: 'promotable items require evidence_ids'});
    }
    if (
      value.confidence === 'inferred' &&
      (value.allowed_channels.some((channel) => channel !== 'interview') ||
        value.forbidden_claims.length === 0)
    ) {
      context.addIssue({code: 'custom', message: 'inferred items are interview-only hypotheses'});
    }
  });

export const EvidenceCandidatePacketV1Schema = z
  .strictObject({
    schema_version: z.literal('evidence-candidate-packet-v1'),
    packet_id: CareerIdSchema,
    candidate_id: CareerIdSchema,
    discovery_session_sha256: Sha256Schema,
    evidence_bank_sha256: Sha256Schema,
    items: z.array(CandidateItemSchema).min(1),
    packet_sha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const itemIds = value.items.map(({item_id}) => item_id);
    if (new Set(itemIds).size !== itemIds.length) {
      context.addIssue({code: 'custom', message: 'item_id must be unique'});
    }
  });

const ReadinessCheckSchema = z
  .strictObject({
    passed: z.boolean(),
    evidence_ids: z.array(CareerIdSchema),
    accepted_gap_ids: z.array(CareerIdSchema),
  })
  .superRefine((value, context) => {
    if (value.passed && value.evidence_ids.length + value.accepted_gap_ids.length === 0) {
      context.addIssue({code: 'custom', message: 'passed checks require observed evidence or gap'});
    }
  });

export const CareerEvidenceReadinessV1Schema = z
  .strictObject({
    schema_version: z.literal('career-evidence-readiness-v1'),
    readiness_id: CareerIdSchema,
    candidate_id: CareerIdSchema,
    evidence_bank_sha256: Sha256Schema,
    candidate_packet_sha256: Sha256Schema,
    checks: z.strictObject({
      identity_and_chronology: ReadinessCheckSchema,
      competency_evidence: ReadinessCheckSchema,
      recent_role_interventions: ReadinessCheckSchema,
      contradictions_resolved: ReadinessCheckSchema,
      role_family_selected: ReadinessCheckSchema,
      privacy_boundary: ReadinessCheckSchema,
      gaps_accepted: ReadinessCheckSchema,
    }),
    blocking_gap_ids: z.array(CareerIdSchema),
    status: z.enum(['BLOCKED', 'READY']),
    next_gate: z.literal('CR_CAREER_EVIDENCE_READY'),
    readiness_sha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (
      value.status === 'READY' &&
      (value.checks.competency_evidence.evidence_ids.length === 0 ||
        value.checks.recent_role_interventions.evidence_ids.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'capabilities and interventions require evidence',
      });
    }
    const complete =
      Object.values(value.checks).every(({passed}) => passed) &&
      value.blocking_gap_ids.length === 0;
    if ((value.status === 'READY') !== complete) {
      context.addIssue({
        code: 'custom',
        message: 'READY requires every check and zero blocking gaps',
      });
    }
  });

export type EvidenceCandidatePacketV1 = z.infer<typeof EvidenceCandidatePacketV1Schema>;
export type CareerEvidenceReadinessV1 = z.infer<typeof CareerEvidenceReadinessV1Schema>;
