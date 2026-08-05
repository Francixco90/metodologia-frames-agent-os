import {describe, expect, it} from 'vitest';

import {ContentAtomGraphV1Schema, ContentAtomV1Schema} from '../../../../core/contracts/index.ts';

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

const atom = {
  schemaVersion: 'content-atom-v1' as const,
  atomId: 'atom.title.001',
  atomClass: 'narrative' as const,
  atomType: 'title' as const,
  graphRole: 'source_root' as const,
  identityAlgorithmVersion: 'atom-identity-v1' as const,
  reconciliationKeySha256: sha('1'),
  secondaryIdentityApplied: false,
  generation: 1,
  revision: 1,
  status: 'active' as const,
  origin: {
    schemaVersion: 'atom-origin-v1' as const,
    kind: 'canonical_field' as const,
    contentId: 'pilot-carousel-002',
    contentVersion: '0.1.0',
    selector: 'body.title',
  },
  payload: {
    kind: 'canonical_field' as const,
    field: 'title' as const,
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
  reuseEligibility: 'eligible' as const,
  reuseFingerprintSha256: sha('7'),
};

const graph = {
  schemaVersion: 'content-atom-graph-v1' as const,
  graphId: 'graph.pilot-carousel-002.0.1.0',
  contentId: 'pilot-carousel-002',
  contentVersion: '0.1.0',
  contentSemanticSha256: sha('8'),
  contextSha256: sha('2'),
  atomizerVersion: '1.0.0',
  atoms: [atom],
  edges: [],
  evidenceState: 'QUALIFIED' as const,
  structuralState: 'ATOMIZED' as const,
  semanticGraphSha256: sha('9'),
  graphSha256: sha('a'),
  readinessEligible: false as const,
  distributionState: 'NOT_DESIGNED' as const,
  publicationAuthority: false as const,
};

describe('ContentAtomGraphV1 adversarial rejection', () => {
  it('rejects unknown fields at graph, atom and payload boundaries', () => {
    expect(() => ContentAtomGraphV1Schema.parse({...graph, unexpected: true})).toThrow();
    expect(() =>
      ContentAtomV1Schema.parse({...atom, origin: {...atom.origin, absolutePath: '/tmp/source'}}),
    ).toThrow();
    expect(() =>
      ContentAtomV1Schema.parse({...atom, payload: {...atom.payload, rendererHint: 'd3'}}),
    ).toThrow();
  });

  it('rejects state promotion beyond QUALIFIED and ATOMIZED', () => {
    expect(() => ContentAtomGraphV1Schema.parse({...graph, evidenceState: 'VALIDATED'})).toThrow();
    expect(() => ContentAtomGraphV1Schema.parse({...graph, structuralState: 'COMPOSED'})).toThrow();
  });

  it('rejects malformed hashes and nonpositive revisions', () => {
    expect(() => ContentAtomV1Schema.parse({...atom, payloadSha256: 'ABC'})).toThrow(/SHA-256/u);
    expect(() => ContentAtomV1Schema.parse({...atom, revision: 0})).toThrow();
  });

  it('rejects publication or distribution authority at every boundary', () => {
    expect(() => ContentAtomGraphV1Schema.parse({...graph, publicationAuthority: true})).toThrow();
    expect(() =>
      ContentAtomV1Schema.parse({
        ...atom,
        effectiveRights: {...rights, publicationAllowed: true},
      }),
    ).toThrow();
    expect(() =>
      ContentAtomV1Schema.parse({
        ...atom,
        declaredRights: {...rights, distributionAllowed: true},
      }),
    ).toThrow();
  });
});
