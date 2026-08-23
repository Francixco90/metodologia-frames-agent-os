import {z} from 'zod';

import {ActorIdSchema, PortableIdSchema, Sha256Schema, TimestampSchema} from './primitives.ts';

const ShortTextSchema = z.string().trim().min(1).max(280);
const ScoreSchema = z.number().int().min(0);

export const DecisionRubricV1Schema = z.strictObject({
  evidence: z.literal(25),
  publishability: z.literal(20),
  audienceValue: z.literal(20),
  visualImpact: z.literal(15),
  reuse: z.literal(10),
  effort: z.literal(10),
});
const DecisionScoresV1Schema = z.strictObject({
  evidence: ScoreSchema.max(25),
  publishability: ScoreSchema.max(20),
  audienceValue: ScoreSchema.max(20),
  visualImpact: ScoreSchema.max(15),
  reuse: ScoreSchema.max(10),
  effort: ScoreSchema.max(10),
});
const DecisionCandidateV1Schema = z.strictObject({
  candidateId: PortableIdSchema,
  rank: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(80),
  summary: ShortTextSchema,
  evidenceRefs: z.array(Sha256Schema).min(1).max(8),
  scores: DecisionScoresV1Schema,
  total: z.number().int().min(0).max(100),
});
const DecisionOptionV1Schema = z.strictObject({
  optionId: PortableIdSchema,
  label: z.string().trim().min(1).max(48),
  summary: ShortTextSchema,
  primaryCandidateId: PortableIdSchema,
  absorbedCandidateIds: z.array(PortableIdSchema).length(4),
  rescuedContributions: z
    .array(z.strictObject({candidateId: PortableIdSchema, contribution: ShortTextSchema}))
    .length(3),
});
const InteractionEvidenceV1Schema = z.strictObject({
  interactionId: PortableIdSchema,
  source: z.enum(['CURRENT', 'VERIFIED_RESUME']),
  summary: ShortTextSchema,
  evidenceSha256: Sha256Schema,
  verified: z.literal(true),
});

export const DecisionFunnelV1Schema = z
  .strictObject({
    schemaVersion: z.literal('decision-funnel-v1'),
    requestHash: Sha256Schema,
    riskClass: z.enum(['STANDARD', 'PRIVACY', 'PUBLICATION', 'MATERIAL_DECISION']),
    interactions: z.array(InteractionEvidenceV1Schema).min(2).max(3),
    rubric: DecisionRubricV1Schema,
    candidates: z.array(DecisionCandidateV1Schema).length(5),
    options: z.array(DecisionOptionV1Schema).length(2),
    status: z.literal('OPTIONS_READY'),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.riskClass !== 'STANDARD' && value.interactions.length !== 3) {
      context.addIssue({code: 'custom', message: 'Elevated risk requires three interactions.'});
    }
    const interactionIds = value.interactions.map(({interactionId}) => interactionId);
    const evidence = value.interactions.map(({evidenceSha256}) => evidenceSha256);
    if (
      new Set(interactionIds).size !== value.interactions.length ||
      new Set(evidence).size !== value.interactions.length
    ) {
      context.addIssue({code: 'custom', message: 'Interactions and evidence must be unique.'});
    }
    const candidateIds = value.candidates.map(({candidateId}) => candidateId);
    const candidateSet = new Set(candidateIds);
    if (candidateSet.size !== 5 || new Set(value.candidates.map(({rank}) => rank)).size !== 5) {
      context.addIssue({code: 'custom', message: 'Candidates and ranks must be unique.'});
    }
    for (const candidate of value.candidates) {
      const total = Object.values(candidate.scores).reduce((sum, score) => sum + score, 0);
      if (candidate.total !== total) {
        context.addIssue({code: 'custom', message: 'Candidate total must equal rubric scores.'});
      }
    }
    const optionIds = value.options.map(({optionId}) => optionId);
    const primaryIds = value.options.map(({primaryCandidateId}) => primaryCandidateId);
    if (new Set(optionIds).size !== 2 || new Set(primaryIds).size !== 2) {
      context.addIssue({code: 'custom', message: 'Options and primary candidates must be unique.'});
    }
    for (const [index, option] of value.options.entries()) {
      const otherPrimary = primaryIds[index === 0 ? 1 : 0];
      const absorbed = new Set(option.absorbedCandidateIds);
      const discarded = new Set(
        option.absorbedCandidateIds.filter((id) => id !== option.primaryCandidateId),
      );
      const contributions = new Set(
        option.rescuedContributions.map(({candidateId}) => candidateId),
      );
      if (
        !candidateSet.has(option.primaryCandidateId) ||
        absorbed.size !== 4 ||
        !absorbed.has(option.primaryCandidateId) ||
        (otherPrimary !== undefined && absorbed.has(otherPrimary)) ||
        [...absorbed].some((id) => !candidateSet.has(id)) ||
        contributions.size !== 3 ||
        [...contributions].some((id) => !discarded.has(id)) ||
        [...discarded].some((id) => !contributions.has(id))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Each option must identify contributions from its three discarded candidates.',
        });
      }
    }
  });
export type DecisionFunnelV1 = z.infer<typeof DecisionFunnelV1Schema>;

export const DecisionSelectionV1Schema = z.strictObject({
  schemaVersion: z.literal('decision-selection-v1'),
  requestHash: Sha256Schema,
  funnelSha256: Sha256Schema,
  selectedOptionId: PortableIdSchema,
  selectionKind: z.literal('HUMAN'),
  actorId: ActorIdSchema,
  selectedAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
});
export type DecisionSelectionV1 = z.infer<typeof DecisionSelectionV1Schema>;
