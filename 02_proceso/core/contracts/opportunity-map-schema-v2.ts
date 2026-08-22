import {z} from 'zod';

import {DecisionFunnelV1Schema} from './experience-decision-v1.ts';
import {OpportunitySourceBindingV1Schema} from './opportunity-source-receipt-v1.ts';
import {ActorIdSchema, PortableIdSchema, Sha256Schema, TimestampSchema} from './primitives.ts';

const SourceSpanV2Schema = z
  .strictObject({
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive(),
    startFrame: z.number().int().min(0),
    endFrameExclusive: z.number().int().positive(),
  })
  .refine((span) => span.endMs > span.startMs && span.endFrameExclusive > span.startFrame, {
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
    issuedAt: TimestampSchema,
    expiresAt: TimestampSchema,
    source: OpportunitySourceBindingV1Schema,
    decisionFunnel: DecisionFunnelV1Schema,
    candidateDetails: z.array(OpportunityCandidateDetailV2Schema).length(5),
    visibleOptionIds: z.array(PortableIdSchema).length(2),
    compatibilityProjection: z.strictObject({
      deliverableId: z.literal('opportunity-map-v1'),
      sha256: Sha256Schema,
    }),
    allowedNextAction: z.literal('REQUEST_HUMAN_SELECTION'),
    productionAuthority: z.literal(false),
    status: z.literal('OPTIONS_READY'),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((map, context) => {
    const sourceEvidence = new Set(map.source.evidenceRefs);
    const issuedMs = Date.parse(map.issuedAt);
    const expiresMs = Date.parse(map.expiresAt);
    if (
      expiresMs <= issuedMs ||
      expiresMs - issuedMs > 7 * 24 * 60 * 60 * 1000 ||
      issuedMs < Date.parse(map.source.receiptIssuedAt) ||
      expiresMs > Date.parse(map.source.receiptExpiresAt)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Map validity must fit its fresh source receipt.',
      });
    }
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
      const allEvidence = [
        ...detail.evidenceRefs,
        ...detail.privacyAssessment.evidenceRefs,
        ...detail.valueZoneRefs,
        ...(candidate?.evidenceRefs ?? []),
      ];
      if (
        !candidate ||
        candidate.evidenceRefs.some((ref) => !detail.evidenceRefs.includes(ref)) ||
        allEvidence.some((ref) => !sourceEvidence.has(ref))
      ) {
        context.addIssue({code: 'custom', message: 'Candidate evidence must remain source-bound.'});
      }
      if (
        detail.sourceSpans.some((span) => {
          const frameMs = (1000 * map.source.fpsDenominator) / map.source.fpsNumerator;
          return (
            span.endMs > map.source.durationMs ||
            span.endFrameExclusive > map.source.frameCount ||
            Math.abs(span.startMs - span.startFrame * frameMs) > frameMs ||
            Math.abs(span.endMs - span.endFrameExclusive * frameMs) > frameMs
          );
        })
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Candidate span disagrees with the bound source.',
        });
      }
      if (detail.privacyAssessment.state === 'BLOCKED') {
        context.addIssue({code: 'custom', message: 'A blocked candidate cannot be synthesized.'});
      }
    }
    const scoreOrder = [...map.decisionFunnel.candidates].sort(
      (left, right) =>
        right.total - left.total ||
        (left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0),
    );
    if (scoreOrder.some((candidate, index) => candidate.rank !== index + 1)) {
      context.addIssue({code: 'custom', message: 'Candidate ranks must follow total scores.'});
    }
    const expectedPrimaryIds = scoreOrder.slice(0, 2).map(({candidateId}) => candidateId);
    const actualPrimaryIds = map.decisionFunnel.options.map(
      ({primaryCandidateId}) => primaryCandidateId,
    );
    if (actualPrimaryIds.some((candidateId, index) => candidateId !== expectedPrimaryIds[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Visible options must use the two highest scores.',
      });
    }
    if (
      map.visibleOptionIds.some(
        (optionId, index) => optionId !== map.decisionFunnel.options[index]?.optionId,
      )
    ) {
      context.addIssue({code: 'custom', message: 'Exactly the two funnel options may be visible.'});
    }
  });
export type OpportunityMapV2 = z.infer<typeof OpportunityMapV2Schema>;

export const OpportunitySelectionV2Schema = z.strictObject({
  schemaVersion: z.literal('opportunity-selection-v2'),
  requestHash: Sha256Schema,
  funnelSha256: Sha256Schema,
  opportunityMapSha256: Sha256Schema,
  selectedOptionId: PortableIdSchema,
  selectionKind: z.literal('HUMAN'),
  actorId: ActorIdSchema,
  selectedAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
});
export type OpportunitySelectionV2 = z.infer<typeof OpportunitySelectionV2Schema>;
