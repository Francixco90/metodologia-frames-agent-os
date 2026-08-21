import {createHash} from 'node:crypto';
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
      if (
        !candidateSet.has(option.primaryCandidateId) ||
        absorbed.size !== 4 ||
        !absorbed.has(option.primaryCandidateId) ||
        (otherPrimary !== undefined && absorbed.has(otherPrimary)) ||
        [...absorbed].some((id) => !candidateSet.has(id))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Each option must absorb its primary and the same three discarded candidates.',
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

const withoutHash = <T extends {canonicalSha256: string}>(value: T): Omit<T, 'canonicalSha256'> => {
  const payload: Partial<T> = {...value};
  delete payload.canonicalSha256;
  return payload as Omit<T, 'canonicalSha256'>;
};
const hashDecision = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function buildDecisionFunnelV1(input: {
  requestHash: string;
  riskClass: DecisionFunnelV1['riskClass'];
  interactions: DecisionFunnelV1['interactions'];
  candidates: DecisionFunnelV1['candidates'];
  options: DecisionFunnelV1['options'];
}): DecisionFunnelV1 {
  const payload = {
    schemaVersion: 'decision-funnel-v1' as const,
    requestHash: input.requestHash,
    riskClass: input.riskClass,
    interactions: input.interactions,
    rubric: {
      evidence: 25,
      publishability: 20,
      audienceValue: 20,
      visualImpact: 15,
      reuse: 10,
      effort: 10,
    } as const,
    candidates: input.candidates,
    options: input.options,
    status: 'OPTIONS_READY' as const,
  };
  return DecisionFunnelV1Schema.parse({
    ...payload,
    canonicalSha256: hashDecision(payload),
  });
}

export function createDecisionSelectionV1(
  funnelInput: unknown,
  input: {selectedOptionId: string; actorId: string; selectedAt: string},
): DecisionSelectionV1 {
  const funnel = assertDecisionFunnelV1(funnelInput);
  const payload = {
    schemaVersion: 'decision-selection-v1' as const,
    requestHash: funnel.requestHash,
    funnelSha256: funnel.canonicalSha256,
    selectedOptionId: input.selectedOptionId,
    selectionKind: 'HUMAN' as const,
    actorId: input.actorId,
    selectedAt: input.selectedAt,
  };
  const selection = DecisionSelectionV1Schema.parse({
    ...payload,
    canonicalSha256: hashDecision(payload),
  });
  return assertDecisionSelectionV1(funnel, selection).selection;
}

export function assertDecisionFunnelV1(input: unknown): DecisionFunnelV1 {
  const funnel = DecisionFunnelV1Schema.parse(input);
  if (hashDecision(withoutHash(funnel)) !== funnel.canonicalSha256) {
    throw new Error('DECISION-FUNNEL-HASH-DRIFT');
  }
  return funnel;
}

export function assertDecisionSelectionV1(
  funnelInput: unknown,
  selectionInput: unknown,
): {funnel: DecisionFunnelV1; selection: DecisionSelectionV1} {
  const funnel = assertDecisionFunnelV1(funnelInput);
  const selection = DecisionSelectionV1Schema.parse(selectionInput);
  if (
    selection.requestHash !== funnel.requestHash ||
    selection.funnelSha256 !== funnel.canonicalSha256 ||
    !funnel.options.some(({optionId}) => optionId === selection.selectedOptionId) ||
    hashDecision(withoutHash(selection)) !== selection.canonicalSha256
  ) {
    throw new Error('DECISION-SELECTION-DRIFT');
  }
  return {funnel, selection};
}
