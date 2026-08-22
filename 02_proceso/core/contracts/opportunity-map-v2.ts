import {createHash} from 'node:crypto';

import {assertDecisionFunnelV1, type DecisionFunnelV1} from './experience-decision-v1.ts';
import {
  OpportunityMapV2Schema,
  OpportunitySelectionV2Schema,
  type OpportunityMapV2,
  type OpportunitySelectionV2,
} from './opportunity-map-schema-v2.ts';
import {
  assertOpportunitySourceReceiptV1,
  bindOpportunitySourceReceiptV1,
  type OpportunitySourceReceiptV1,
} from './opportunity-source-receipt-v1.ts';

export * from './opportunity-map-schema-v2.ts';
export * from './opportunity-source-receipt-v1.ts';

const withoutHash = <T extends {canonicalSha256: string}>(value: T): Omit<T, 'canonicalSha256'> => {
  const payload: Partial<T> = {...value};
  delete payload.canonicalSha256;
  return payload as Omit<T, 'canonicalSha256'>;
};
const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digestBytes = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

export type OpportunityMapEvidenceV2 = {
  sourceReceipt: OpportunitySourceReceiptV1;
  materialBytes: Uint8Array;
  compatibilityProjectionBytes: Uint8Array;
};

export function buildOpportunityMapV2(input: {
  issuedAt: string;
  expiresAt: string;
  sourceReceipt: OpportunitySourceReceiptV1;
  materialBytes: Uint8Array;
  compatibilityProjectionBytes: Uint8Array;
  decisionFunnel: DecisionFunnelV1;
  candidateDetails: OpportunityMapV2['candidateDetails'];
}): OpportunityMapV2 {
  const funnel = assertDecisionFunnelV1(input.decisionFunnel);
  const receipt = assertOpportunitySourceReceiptV1(
    input.sourceReceipt,
    input.materialBytes,
    input.issuedAt,
  );
  const payload = withoutHash(
    OpportunityMapV2Schema.parse({
      schemaVersion: 'opportunity-map-v2',
      requestHash: funnel.requestHash,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      source: bindOpportunitySourceReceiptV1(receipt),
      decisionFunnel: funnel,
      candidateDetails: input.candidateDetails,
      visibleOptionIds: funnel.options.map(({optionId}) => optionId),
      compatibilityProjection: {
        deliverableId: 'opportunity-map-v1',
        sha256: digestBytes(input.compatibilityProjectionBytes),
      },
      allowedNextAction: 'REQUEST_HUMAN_SELECTION',
      productionAuthority: false,
      status: 'OPTIONS_READY',
      canonicalSha256: '0'.repeat(64),
    }),
  );
  const map = OpportunityMapV2Schema.parse({...payload, canonicalSha256: digest(payload)});
  return assertOpportunityMapV2(
    map,
    {
      sourceReceipt: receipt,
      materialBytes: input.materialBytes,
      compatibilityProjectionBytes: input.compatibilityProjectionBytes,
    },
    input.issuedAt,
  );
}

export function assertOpportunityMapV2(
  input: unknown,
  evidence: OpportunityMapEvidenceV2,
  verifiedAt: string,
): OpportunityMapV2 {
  const map = OpportunityMapV2Schema.parse(input);
  assertDecisionFunnelV1(map.decisionFunnel);
  const receipt = assertOpportunitySourceReceiptV1(
    evidence.sourceReceipt,
    evidence.materialBytes,
    verifiedAt,
  );
  if (
    map.requestHash !== map.decisionFunnel.requestHash ||
    JSON.stringify(map.source) !== JSON.stringify(bindOpportunitySourceReceiptV1(receipt)) ||
    digestBytes(evidence.compatibilityProjectionBytes) !== map.compatibilityProjection.sha256 ||
    Date.parse(verifiedAt) < Date.parse(map.issuedAt) ||
    Date.parse(verifiedAt) > Date.parse(map.expiresAt) ||
    digest(withoutHash(map)) !== map.canonicalSha256
  ) {
    throw new Error('OPPORTUNITY-MAP-HASH-DRIFT');
  }
  return map;
}

export function createOpportunitySelectionV2(
  mapInput: unknown,
  evidence: OpportunityMapEvidenceV2,
  input: {selectedOptionId: string; actorId: string; selectedAt: string},
): OpportunitySelectionV2 {
  const map = assertOpportunityMapV2(mapInput, evidence, input.selectedAt);
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
  return assertOpportunitySelectionV2(map, selection, evidence, input.selectedAt).selection;
}

export function assertOpportunitySelectionV2(
  mapInput: unknown,
  selectionInput: unknown,
  evidence: OpportunityMapEvidenceV2,
  verifiedAt: string,
): {map: OpportunityMapV2; selection: OpportunitySelectionV2} {
  const map = assertOpportunityMapV2(mapInput, evidence, verifiedAt);
  const selection = OpportunitySelectionV2Schema.parse(selectionInput);
  if (
    selection.requestHash !== map.requestHash ||
    selection.funnelSha256 !== map.decisionFunnel.canonicalSha256 ||
    selection.opportunityMapSha256 !== map.canonicalSha256 ||
    !map.visibleOptionIds.includes(selection.selectedOptionId) ||
    Date.parse(selection.selectedAt) < Date.parse(map.issuedAt) ||
    Date.parse(selection.selectedAt) > Date.parse(map.expiresAt) ||
    Date.parse(verifiedAt) < Date.parse(selection.selectedAt) ||
    digest(withoutHash(selection)) !== selection.canonicalSha256
  ) {
    throw new Error('OPPORTUNITY-SELECTION-DRIFT');
  }
  return {map, selection};
}
