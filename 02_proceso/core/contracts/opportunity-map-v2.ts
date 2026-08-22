import {createHash} from 'node:crypto';

import {z} from 'zod';

import {
  assertDecisionFunnelV1,
  assertDecisionSelectionV1,
  DecisionFunnelV1Schema,
  type DecisionFunnelV1,
  type DecisionSelectionV1,
} from './experience-decision-v1.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';

const SourceSpanV2Schema = z
  .strictObject({
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive(),
    startFrame: z.number().int().min(0),
    endFrame: z.number().int().positive(),
  })
  .refine((span) => span.endMs > span.startMs && span.endFrame > span.startFrame, {
    message: 'Opportunity spans must have positive duration.',
  });

const OpportunityCandidateDetailV2Schema = z.strictObject({
  candidateId: PortableIdSchema,
  momentType: z.enum([
    'DEMONSTRATION',
    'BEFORE_AFTER',
    'TESTIMONIAL',
    'MICROTUTORIAL',
    'CAPABILITY_PROOF',
    'PROCESS',
    'PORTFOLIO',
  ]),
  sourceSpans: z.array(SourceSpanV2Schema).min(1).max(16),
  evidenceRefs: z.array(Sha256Schema).min(1).max(16),
  privacyAssessment: z.strictObject({
    state: z.enum(['NOT_APPLICABLE', 'VERIFIED_FEASIBLE', 'BLOCKED']),
    evidenceRefs: z.array(Sha256Schema).min(1).max(8),
  }),
  valueZoneRefs: z.array(Sha256Schema).min(1).max(8),
});

export const OpportunityMapV2Schema = z
  .strictObject({
    schemaVersion: z.literal('opportunity-map-v2'),
    requestHash: Sha256Schema,
    sourceInventorySha256: Sha256Schema,
    decisionFunnel: DecisionFunnelV1Schema,
    candidateDetails: z.array(OpportunityCandidateDetailV2Schema).length(5),
    visibleOptionIds: z.array(PortableIdSchema).length(2),
    allowedNextAction: z.literal('REQUEST_HUMAN_SELECTION'),
    productionAuthority: z.literal(false),
    status: z.literal('OPTIONS_READY'),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((map, context) => {
    const funnelIds = map.decisionFunnel.candidates.map(({candidateId}) => candidateId);
    const detailIds = map.candidateDetails.map(({candidateId}) => candidateId);
    if (
      new Set(detailIds).size !== 5 ||
      detailIds.some((candidateId, index) => candidateId !== funnelIds[index])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Candidate details must bind all five candidates.',
      });
    }
    for (const [index, detail] of map.candidateDetails.entries()) {
      const candidate = map.decisionFunnel.candidates[index];
      if (!candidate || candidate.evidenceRefs.some((ref) => !detail.evidenceRefs.includes(ref))) {
        context.addIssue({code: 'custom', message: 'Candidate evidence must remain bound.'});
      }
    }
    const ranked = [...map.decisionFunnel.candidates].sort((left, right) => left.rank - right.rank);
    const expectedPrimaryIds = ranked.slice(0, 2).map(({candidateId}) => candidateId);
    const actualPrimaryIds = map.decisionFunnel.options.map(
      ({primaryCandidateId}) => primaryCandidateId,
    );
    if (actualPrimaryIds.some((candidateId, index) => candidateId !== expectedPrimaryIds[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Visible options must use the two highest ranks.',
      });
    }
    if (
      map.visibleOptionIds.some(
        (optionId, index) => optionId !== map.decisionFunnel.options[index]?.optionId,
      )
    ) {
      context.addIssue({code: 'custom', message: 'Exactly the two funnel options may be visible.'});
    }
    const details = new Map(map.candidateDetails.map((detail) => [detail.candidateId, detail]));
    if (
      actualPrimaryIds.some(
        (candidateId) => details.get(candidateId)?.privacyAssessment.state === 'BLOCKED',
      )
    ) {
      context.addIssue({code: 'custom', message: 'A blocked candidate cannot become visible.'});
    }
  });

export type OpportunityMapV2 = z.infer<typeof OpportunityMapV2Schema>;

const withoutHash = <T extends {canonicalSha256: string}>(value: T): Omit<T, 'canonicalSha256'> => {
  const payload: Partial<T> = {...value};
  delete payload.canonicalSha256;
  return payload as Omit<T, 'canonicalSha256'>;
};
const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function buildOpportunityMapV2(input: {
  sourceInventorySha256: string;
  decisionFunnel: DecisionFunnelV1;
  candidateDetails: OpportunityMapV2['candidateDetails'];
}): OpportunityMapV2 {
  const funnel = assertDecisionFunnelV1(input.decisionFunnel);
  const payload = withoutHash(
    OpportunityMapV2Schema.parse({
      schemaVersion: 'opportunity-map-v2',
      requestHash: funnel.requestHash,
      sourceInventorySha256: input.sourceInventorySha256,
      decisionFunnel: funnel,
      candidateDetails: input.candidateDetails,
      visibleOptionIds: funnel.options.map(({optionId}) => optionId),
      allowedNextAction: 'REQUEST_HUMAN_SELECTION',
      productionAuthority: false,
      status: 'OPTIONS_READY',
      canonicalSha256: '0'.repeat(64),
    }),
  );
  return OpportunityMapV2Schema.parse({...payload, canonicalSha256: digest(payload)});
}

export function assertOpportunityMapV2(input: unknown): OpportunityMapV2 {
  const map = OpportunityMapV2Schema.parse(input);
  assertDecisionFunnelV1(map.decisionFunnel);
  if (
    map.requestHash !== map.decisionFunnel.requestHash ||
    digest(withoutHash(map)) !== map.canonicalSha256
  ) {
    throw new Error('OPPORTUNITY-MAP-HASH-DRIFT');
  }
  return map;
}

export function assertOpportunitySelectionV2(
  mapInput: unknown,
  selectionInput: unknown,
): {map: OpportunityMapV2; selection: DecisionSelectionV1} {
  const map = assertOpportunityMapV2(mapInput);
  const {selection} = assertDecisionSelectionV1(map.decisionFunnel, selectionInput);
  if (!map.visibleOptionIds.includes(selection.selectedOptionId)) {
    throw new Error('OPPORTUNITY-SELECTION-NOT-VISIBLE');
  }
  return {map, selection};
}
