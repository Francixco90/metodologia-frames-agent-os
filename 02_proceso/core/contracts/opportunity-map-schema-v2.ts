import {z} from 'zod';

import {DecisionFunnelV1Schema} from './experience-decision-v1.ts';
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

const SourceBindingV2Schema = z.strictObject({
  materialSha256: Sha256Schema,
  inventorySha256: Sha256Schema,
  durationMs: z.number().int().positive(),
  frameCount: z.number().int().positive(),
  fpsNumerator: z.number().int().positive(),
  fpsDenominator: z.number().int().positive(),
  evidenceRefs: z.array(Sha256Schema).min(5).max(64),
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
    source: SourceBindingV2Schema,
    decisionFunnel: DecisionFunnelV1Schema,
    candidateDetails: z.array(OpportunityCandidateDetailV2Schema).length(5),
    visibleOptionIds: z.array(PortableIdSchema).length(2),
    workflowProjection: z.strictObject({
      deliverableId: z.literal('opportunity-map-v1'),
      authority: z.literal('opportunity-map-v2'),
      role: z.literal('COMPATIBILITY_PROJECTION_ONLY'),
    }),
    allowedNextAction: z.literal('REQUEST_HUMAN_SELECTION'),
    productionAuthority: z.literal(false),
    status: z.literal('OPTIONS_READY'),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((map, context) => {
    const sourceEvidence = new Set(map.source.evidenceRefs);
    if (sourceEvidence.size !== map.source.evidenceRefs.length) {
      context.addIssue({code: 'custom', message: 'Source evidence must be unique.'});
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
        detail.sourceSpans.some(
          (span) =>
            span.endMs > map.source.durationMs || span.endFrameExclusive > map.source.frameCount,
        )
      ) {
        context.addIssue({code: 'custom', message: 'Candidate span exceeds the bound source.'});
      }
      if (detail.privacyAssessment.state === 'BLOCKED') {
        context.addIssue({code: 'custom', message: 'A blocked candidate cannot be synthesized.'});
      }
    }
    const scoreOrder = [...map.decisionFunnel.candidates].sort(
      (left, right) =>
        right.total - left.total || left.candidateId.localeCompare(right.candidateId),
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
