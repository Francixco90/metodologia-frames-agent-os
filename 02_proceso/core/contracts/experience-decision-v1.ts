import {createHash} from 'node:crypto';

import {
  DecisionFunnelV1Schema,
  DecisionSelectionV1Schema,
  type DecisionFunnelV1,
  type DecisionSelectionV1,
} from './experience-decision-schema-v1.ts';

export * from './experience-decision-schema-v1.ts';

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
  const canonicalPayload = withoutHash(
    DecisionFunnelV1Schema.parse({...payload, canonicalSha256: '0'.repeat(64)}),
  );
  return DecisionFunnelV1Schema.parse({
    ...canonicalPayload,
    canonicalSha256: hashDecision(canonicalPayload),
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
  const canonicalPayload = withoutHash(
    DecisionSelectionV1Schema.parse({
      ...payload,
      canonicalSha256: '0'.repeat(64),
    }),
  );
  const selection = DecisionSelectionV1Schema.parse({
    ...canonicalPayload,
    canonicalSha256: hashDecision(canonicalPayload),
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
