import {
  AtomGraphInvalidationV1Schema,
  AtomGraphLineageV1Schema,
  AtomInvalidationSimulationV1Schema,
  AtomizationReceiptV1Schema,
  GraphBoundApprovalSimulationV1Schema,
  SourceFreezeReceiptV1Schema,
  type AtomGraphInvalidationV1,
  type AtomGraphLineageV1,
  type AtomInvalidationSimulationV1,
  type AtomizationReceiptV1,
  type ContentAtomGraphV1,
  type GraphBoundApprovalSimulationV1,
  type SourceFreezeReceiptV1,
} from '../../../core/contracts/index.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import {computeSourceFreezeReceiptSha256} from '../markdown/source-freeze.ts';
import type {AtomGraphComparisonV1} from './compare-atom-graphs-v1.ts';

export const computeAtomizationReceiptSha256 = (
  receipt: Omit<AtomizationReceiptV1, 'receiptSha256'>,
): string => hashCanonical({domain: 'atomization-receipt-v1:integrity:v1', receipt});

export const assertAtomizationReceiptReplayV1 = (
  previous: AtomizationReceiptV1,
  candidate: AtomizationReceiptV1,
): void => {
  if (
    previous.receiptId === candidate.receiptId &&
    previous.receiptSha256 !== candidate.receiptSha256
  ) {
    throw new Error(
      `RECEIPT_ID_REUSED: ${candidate.receiptId} is bound to two different payload hashes.`,
    );
  }
};

export const buildAtomizationReceiptV1 = (input: {
  graph: ContentAtomGraphV1;
  graphRef: string;
  graphFileSha256: string;
  contentRef: string;
  sourceReceiptRef: string;
  sourceReceiptFileSha256: string;
  sourceReceipt: SourceFreezeReceiptV1;
}): AtomizationReceiptV1 => {
  const {graph, sourceReceipt} = input;
  if (
    graph.contentId !== sourceReceipt.contentId ||
    graph.contentVersion !== sourceReceipt.contentVersion ||
    graph.contentSemanticSha256 !== sourceReceipt.contentSemanticSha256
  ) {
    throw new Error('SOURCE_RECEIPT_DRIFT: graph and H-01 receipt bindings differ.');
  }
  const unsigned = {
    schemaVersion: 'atomization-receipt-v1' as const,
    receiptId: 'RCP-H02-RT05-ATOMIZATION-001',
    graphId: graph.graphId,
    graphRef: {
      schemaVersion: 'hash-bound-ref-v1' as const,
      ref: input.graphRef,
      sha256: input.graphFileSha256,
    },
    contentId: graph.contentId,
    contentVersion: graph.contentVersion,
    contentRef: input.contentRef,
    contentRawSha256: sourceReceipt.contentRawSha256,
    contentSemanticSha256: graph.contentSemanticSha256,
    sourceFreezeReceiptRef: {
      schemaVersion: 'hash-bound-ref-v1' as const,
      ref: input.sourceReceiptRef,
      sha256: input.sourceReceiptFileSha256,
    },
    atomizerVersion: graph.atomizerVersion,
    producerActorInstanceId: 'RT-05-H02-001',
    verifierActorInstanceId: 'RT-10-H02-001',
    atomCount: graph.atoms.filter(({status}) => status === 'active').length,
    edgeCount: graph.edges.length,
    semanticGraphSha256: graph.semanticGraphSha256,
    graphSha256: graph.graphSha256,
    inputSha256: hashCanonical({
      domain: 'atomization-receipt-v1:inputs:v1',
      contentRawSha256: sourceReceipt.contentRawSha256,
      contentSemanticSha256: sourceReceipt.contentSemanticSha256,
      sourceFreezeReceiptSha256: sourceReceipt.receiptSha256,
      contextSha256: graph.contextSha256,
    }),
    outputSha256: hashCanonical({
      domain: 'atomization-receipt-v1:outputs:v1',
      semanticGraphSha256: graph.semanticGraphSha256,
      graphSha256: graph.graphSha256,
      atomCount: graph.atoms.filter(({status}) => status === 'active').length,
      edgeCount: graph.edges.length,
      evidenceState: graph.evidenceState,
      structuralState: graph.structuralState,
    }),
    evidenceState: 'QUALIFIED' as const,
    structuralState: 'ATOMIZED' as const,
    maximumState: 'ATOMIZED' as const,
    simulationOnly: false as const,
    readinessEligible: false as const,
    distributionState: 'NOT_DESIGNED' as const,
    publicationAuthority: false as const,
    coverageGaps: [
      ...sourceReceipt.coverageGaps,
      'h03_capabilities_not_installed_licensed_or_deterministic',
      'dag_v2_still_coupled_to_a11',
    ].toSorted(),
  };
  return AtomizationReceiptV1Schema.parse({
    ...unsigned,
    receiptSha256: computeAtomizationReceiptSha256(unsigned),
  });
};

export const buildSyntheticSourceReceiptV1 = (
  receipt: SourceFreezeReceiptV1,
  input: {contentVersion: string; contentRawSha256: string; contentSemanticSha256: string},
): SourceFreezeReceiptV1 => {
  const base = {...receipt};
  Reflect.deleteProperty(base, 'receiptSha256');
  const unsigned = {
    ...base,
    receiptId: 'RCP-H02-SIM-SOURCE-FREEZE-001',
    contentVersion: input.contentVersion,
    contentRawSha256: input.contentRawSha256,
    contentSemanticSha256: input.contentSemanticSha256,
    producerActorInstanceId: 'RT-02-H02-SIM-001',
    verifierActorInstanceId: 'RT-03-H02-SIM-001',
  };
  return SourceFreezeReceiptV1Schema.parse({
    ...unsigned,
    receiptSha256: computeSourceFreezeReceiptSha256(unsigned),
  });
};

export const buildGraphBoundApprovalSimulationV1 = (
  graph: ContentAtomGraphV1,
): GraphBoundApprovalSimulationV1 =>
  GraphBoundApprovalSimulationV1Schema.parse({
    schemaVersion: 'graph-bound-approval-simulation-v1',
    approvalId: 'APP-H02-SIM-GRAPH-001',
    graphSha256: graph.graphSha256,
    state: 'VALID_BEFORE_SIMULATION',
    simulationOnly: true,
    distributionState: 'NOT_DESIGNED',
    publicationAuthority: false,
  });

export const buildAtomGraphInvalidationV1 = (input: {
  previous: ContentAtomGraphV1;
  current: ContentAtomGraphV1;
  comparison: AtomGraphComparisonV1;
  invalidatedApprovalRef: {schemaVersion: 'hash-bound-ref-v1'; ref: string; sha256: string};
}): AtomGraphInvalidationV1 => {
  const topologyTargets = new Set(
    input.current.edges
      .filter(({propagationPolicy}) => propagationPolicy === 'topology_only')
      .map(({targetAtomId}) => targetAtomId),
  );
  const stableTopologyAtomIds = input.comparison.unchangedAtomIds.filter((atomId) =>
    topologyTargets.has(atomId),
  );
  const unsigned = {
    schemaVersion: 'atom-graph-invalidation-v1' as const,
    fromGraphSha256: input.previous.graphSha256,
    toGraphSha256: input.current.graphSha256,
    changeKind: 'semantic_patch' as const,
    changedAtomIds: input.comparison.changedAtomIds,
    unchangedAtomIds: input.comparison.unchangedAtomIds,
    addedAtomIds: input.comparison.newAtomIds,
    tombstonedAtomIds: input.comparison.removedAtomIds,
    stableTopologyAtomIds,
    invalidatedApprovalRefs: [input.invalidatedApprovalRef],
    priorApprovalState: 'STALE' as const,
    simulationOnly: true,
  };
  return AtomGraphInvalidationV1Schema.parse({
    ...unsigned,
    invalidationSha256: hashCanonical({
      domain: 'atom-graph-invalidation-v1:integrity:v1',
      invalidation: unsigned,
    }),
  });
};

export const buildAtomInvalidationSimulationV1 = (input: {
  previous: ContentAtomGraphV1;
  current: ContentAtomGraphV1;
  comparison: AtomGraphComparisonV1;
  invalidation: AtomGraphInvalidationV1;
  syntheticSourceReceipt: SourceFreezeReceiptV1;
  fromText: string;
  toText: string;
}): AtomInvalidationSimulationV1 => {
  const previousBeat = input.previous.atoms.find(
    (atom) =>
      atom.status === 'active' &&
      atom.payload.kind === 'narrative_beat' &&
      atom.payload.statement.includes(input.fromText),
  );
  const currentBeat = input.current.atoms.find(
    (atom) =>
      atom.status === 'active' &&
      atom.payload.kind === 'narrative_beat' &&
      atom.payload.statement.includes(input.toText),
  );
  const previousSequence = input.previous.atoms.find(
    ({status, atomType}) => status === 'active' && atomType === 'narrative_sequence',
  );
  const currentSequence = input.current.atoms.find(
    ({status, atomType}) => status === 'active' && atomType === 'narrative_sequence',
  );
  if (
    previousBeat === undefined ||
    currentBeat === undefined ||
    previousSequence === undefined ||
    currentSequence === undefined
  ) {
    throw new Error('INVALIDATION_FIXTURE_INCOMPLETE: beat or sequence atom missing.');
  }
  const unsigned = {
    schemaVersion: 'atom-invalidation-simulation-v1' as const,
    simulationId: 'SIM-H02-SELECTIVE-INVALIDATION-001',
    simulationOnly: true as const,
    fromContentVersion: input.previous.contentVersion,
    toContentVersion: input.current.contentVersion,
    mutation: {fromText: input.fromText, toText: input.toText},
    simulatedSourceReceipt: {
      receiptId: input.syntheticSourceReceipt.receiptId,
      contentRawSha256: input.syntheticSourceReceipt.contentRawSha256,
      contentSemanticSha256: input.syntheticSourceReceipt.contentSemanticSha256,
      receiptSha256: input.syntheticSourceReceipt.receiptSha256,
    },
    priorBeatAtomId: previousBeat.atomId,
    currentBeatAtomId: currentBeat.atomId,
    changedAtomCount: 1 as const,
    unchangedAtomCount: 38 as const,
    sequenceOutputStable: true as const,
    approvalState: 'STALE' as const,
    invalidation: input.invalidation,
    distributionState: 'NOT_DESIGNED' as const,
    publicationAuthority: false as const,
  };
  if (
    input.comparison.changedAtomIds.length !== 1 ||
    input.comparison.unchangedAtomIds.length !== 38 ||
    previousBeat.atomId !== currentBeat.atomId ||
    previousSequence.outputSha256 !== currentSequence.outputSha256 ||
    input.comparison.staleApprovalIds.length !== 1
  ) {
    throw new Error(
      'SELECTIVE_INVALIDATION_FAILED: expected 1 changed, 38 stable and stale approval.',
    );
  }
  return AtomInvalidationSimulationV1Schema.parse({
    ...unsigned,
    simulationSha256: hashCanonical({
      domain: 'atom-invalidation-simulation-v1:integrity:v1',
      simulation: unsigned,
    }),
  });
};

export const buildAtomGraphLineageV1 = (input: {
  graph: ContentAtomGraphV1;
  receiptRef: string;
  receiptFileSha256: string;
  invalidation: AtomGraphInvalidationV1;
}): AtomGraphLineageV1 => {
  const unsigned = {
    schemaVersion: 'atom-graph-lineage-v1' as const,
    lineageId: `LINEAGE-${input.graph.contentId}`,
    contentId: input.graph.contentId,
    entries: [
      {
        graphId: input.graph.graphId,
        contentVersion: input.graph.contentVersion,
        contentSemanticSha256: input.graph.contentSemanticSha256,
        semanticGraphSha256: input.graph.semanticGraphSha256,
        graphSha256: input.graph.graphSha256,
        parentGraphSha256: null,
        atomizationReceiptRef: {
          schemaVersion: 'hash-bound-ref-v1' as const,
          ref: input.receiptRef,
          sha256: input.receiptFileSha256,
        },
        state: 'current' as const,
        simulationOnly: false,
      },
    ],
    invalidations: [input.invalidation],
    currentGraphSha256: input.graph.graphSha256,
    distributionState: 'NOT_DESIGNED' as const,
    publicationAuthority: false as const,
  };
  return AtomGraphLineageV1Schema.parse({
    ...unsigned,
    lineageSha256: hashCanonical({
      domain: 'atom-graph-lineage-v1:integrity:v1',
      lineage: unsigned,
    }),
  });
};
