import {createHash} from 'node:crypto';

import {assertDecisionFunnelV1, type DecisionFunnelV1} from './experience-decision-v1.ts';
import {
  OpportunityMapV2Schema,
  OpportunitySelectionV2Schema,
  type OpportunityMapV2,
  type OpportunitySelectionV2,
} from './opportunity-map-schema-v2.ts';

export * from './opportunity-map-schema-v2.ts';

const withoutHash = <T extends {canonicalSha256: string}>(value: T): Omit<T, 'canonicalSha256'> => {
  const payload: Partial<T> = {...value};
  delete payload.canonicalSha256;
  return payload as Omit<T, 'canonicalSha256'>;
};
const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function buildOpportunityMapV2(input: {
  source: OpportunityMapV2['source'];
  decisionFunnel: DecisionFunnelV1;
  candidateDetails: OpportunityMapV2['candidateDetails'];
}): OpportunityMapV2 {
  const funnel = assertDecisionFunnelV1(input.decisionFunnel);
  const payload = withoutHash(
    OpportunityMapV2Schema.parse({
      schemaVersion: 'opportunity-map-v2',
      requestHash: funnel.requestHash,
      source: input.source,
      decisionFunnel: funnel,
      candidateDetails: input.candidateDetails,
      visibleOptionIds: funnel.options.map(({optionId}) => optionId),
      workflowProjection: {
        deliverableId: 'opportunity-map-v1',
        authority: 'opportunity-map-v2',
        role: 'COMPATIBILITY_PROJECTION_ONLY',
      },
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

export function createOpportunitySelectionV2(
  mapInput: unknown,
  input: {selectedOptionId: string; actorId: string; selectedAt: string},
): OpportunitySelectionV2 {
  const map = assertOpportunityMapV2(mapInput);
  const payload = withoutHash(
    OpportunitySelectionV2Schema.parse({
      schemaVersion: 'opportunity-selection-v2',
      requestHash: map.requestHash,
      funnelSha256: map.decisionFunnel.canonicalSha256,
      opportunityMapSha256: map.canonicalSha256,
      selectedOptionId: input.selectedOptionId,
      selectionKind: 'HUMAN',
      actorId: input.actorId,
      selectedAt: input.selectedAt,
      canonicalSha256: '0'.repeat(64),
    }),
  );
  const selection = OpportunitySelectionV2Schema.parse({
    ...payload,
    canonicalSha256: digest(payload),
  });
  return assertOpportunitySelectionV2(map, selection).selection;
}

export function assertOpportunitySelectionV2(
  mapInput: unknown,
  selectionInput: unknown,
): {map: OpportunityMapV2; selection: OpportunitySelectionV2} {
  const map = assertOpportunityMapV2(mapInput);
  const selection = OpportunitySelectionV2Schema.parse(selectionInput);
  if (
    selection.requestHash !== map.requestHash ||
    selection.funnelSha256 !== map.decisionFunnel.canonicalSha256 ||
    selection.opportunityMapSha256 !== map.canonicalSha256 ||
    !map.visibleOptionIds.includes(selection.selectedOptionId) ||
    digest(withoutHash(selection)) !== selection.canonicalSha256
  ) {
    throw new Error('OPPORTUNITY-SELECTION-DRIFT');
  }
  return {map, selection};
}
