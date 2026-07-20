import {describe, expect, it} from 'vitest';

import {
  AtomEdgeV1Schema,
  AtomGraphLineageV1Schema,
  AtomizationReceiptV1Schema,
  ContentAtomGraphV1Schema,
  ContentAtomV1Schema,
  type ContentAtomV1,
} from '../../../core/contracts/index.ts';

const sha = (character: string): string => character.repeat(64);

const rights = {
  schemaVersion: 'atom-rights-v1' as const,
  state: 'allowed_internal_derivation' as const,
  allowedUseScopes: ['internal_derivation' as const],
  restrictions: ['No habilita publicación.'],
  basisIds: ['source.freeze.001'],
  distributionAllowed: false as const,
  publicationAllowed: false as const,
};

const makeAtom = (atomId = 'atom.title.001'): ContentAtomV1 =>
  ContentAtomV1Schema.parse({
    schemaVersion: 'content-atom-v1',
    atomId,
    atomClass: 'narrative',
    atomType: 'title',
    graphRole: 'source_root',
    identityAlgorithmVersion: 'atom-identity-v1',
    reconciliationKeySha256: sha('1'),
    secondaryIdentityApplied: false,
    generation: 1,
    revision: 1,
    status: 'active',
    origin: {
      schemaVersion: 'atom-origin-v1',
      kind: 'canonical_field',
      contentId: 'pilot-carousel-002',
      contentVersion: '0.1.0',
      selector: 'body.title',
    },
    payload: {
      kind: 'canonical_field',
      field: 'title',
      value: 'Método antes que herramientas',
    },
    evidenceBindings: [],
    declaredRights: rights,
    effectiveRights: rights,
    contextSha256: sha('2'),
    payloadSha256: sha('3'),
    revisionSha256: sha('4'),
    inputSha256: sha('5'),
    outputSha256: sha('6'),
    reuseEligibility: 'eligible',
    reuseFingerprintSha256: sha('7'),
  });

const makeGraph = () => ({
  schemaVersion: 'content-atom-graph-v1' as const,
  graphId: 'graph.pilot-carousel-002.0.1.0',
  contentId: 'pilot-carousel-002',
  contentVersion: '0.1.0',
  contentSemanticSha256: sha('8'),
  contextSha256: sha('2'),
  atomizerVersion: '1.0.0',
  atoms: [makeAtom()],
  edges: [],
  evidenceState: 'QUALIFIED' as const,
  structuralState: 'ATOMIZED' as const,
  semanticGraphSha256: sha('9'),
  graphSha256: sha('a'),
  readinessEligible: false as const,
  distributionState: 'NOT_DESIGNED' as const,
  publicationAuthority: false as const,
});

describe('ContentAtomGraphV1 contracts', () => {
  it('accepts a persistent source-root atom and a minimal qualified graph', () => {
    const atom = makeAtom();
    const graph = makeGraph();

    expect(ContentAtomV1Schema.parse(atom)).toEqual(atom);
    expect(ContentAtomGraphV1Schema.parse(graph)).toEqual(graph);
    expect(graph.atoms[0]).toMatchObject({
      atomId: 'atom.title.001',
      generation: 1,
      revision: 1,
      graphRole: 'source_root',
    });
  });

  it('accepts a deterministic hard edge in dependency-to-consumer direction', () => {
    const edge = {
      schemaVersion: 'atom-edge-v1',
      edgeId: 'edge.claim.support.001',
      kind: 'grounds',
      sourceAtomId: 'atom.claim.001',
      targetAtomId: 'atom.beat.001',
      propagationPolicy: 'hard',
      edgeSha256: sha('b'),
    };

    expect(AtomEdgeV1Schema.parse(edge)).toEqual(edge);
  });

  it('accepts a hash-bound receipt capped at ATOMIZED with separated actors', () => {
    const receipt = {
      schemaVersion: 'atomization-receipt-v1',
      receiptId: 'receipt.atomization.001',
      graphId: 'graph.pilot-carousel-002.0.1.0',
      graphRef: {
        schemaVersion: 'hash-bound-ref-v1',
        ref: 'content/pilot-carousel-002/generated/atom-graph.json',
        sha256: sha('a'),
      },
      contentId: 'pilot-carousel-002',
      contentVersion: '0.1.0',
      contentRef: 'content/pilot-carousel-002/content.md',
      contentRawSha256: sha('c'),
      contentSemanticSha256: sha('8'),
      sourceFreezeReceiptRef: {
        schemaVersion: 'hash-bound-ref-v1',
        ref: 'content/pilot-carousel-002/generated/source-freeze-receipt.json',
        sha256: sha('d'),
      },
      atomizerVersion: '1.0.0',
      producerActorInstanceId: 'rt05.h02.producer',
      verifierActorInstanceId: 'rt10.h02.verifier',
      atomCount: 39,
      edgeCount: 50,
      semanticGraphSha256: sha('9'),
      graphSha256: sha('a'),
      inputSha256: sha('e'),
      outputSha256: sha('f'),
      evidenceState: 'QUALIFIED',
      structuralState: 'ATOMIZED',
      maximumState: 'ATOMIZED',
      simulationOnly: false,
      readinessEligible: false,
      distributionState: 'NOT_DESIGNED',
      publicationAuthority: false,
      coverageGaps: ['voice.profile.candidate'],
      receiptSha256: sha('0'),
    };

    expect(AtomizationReceiptV1Schema.parse(receipt)).toEqual(receipt);
  });

  it('accepts lineage with exactly one current graph', () => {
    const lineage = {
      schemaVersion: 'atom-graph-lineage-v1',
      lineageId: 'lineage.pilot-carousel-002',
      contentId: 'pilot-carousel-002',
      entries: [
        {
          graphId: 'graph.pilot-carousel-002.0.1.0',
          contentVersion: '0.1.0',
          contentSemanticSha256: sha('8'),
          semanticGraphSha256: sha('9'),
          graphSha256: sha('a'),
          parentGraphSha256: null,
          atomizationReceiptRef: {
            schemaVersion: 'hash-bound-ref-v1',
            ref: 'content/pilot-carousel-002/generated/atomization-receipt.json',
            sha256: sha('0'),
          },
          state: 'current',
          simulationOnly: false,
        },
      ],
      invalidations: [],
      currentGraphSha256: sha('a'),
      distributionState: 'NOT_DESIGNED',
      publicationAuthority: false,
      lineageSha256: sha('1'),
    };

    expect(AtomGraphLineageV1Schema.parse(lineage)).toEqual(lineage);
  });
});
