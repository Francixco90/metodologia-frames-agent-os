import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import type {
  CanonicalContentDocumentV1,
  ContentAtomGraphV1,
} from '../../../../core/contracts/index.ts';
import {hashCanonical} from '../../../../core/evidence/hash.ts';
import {
  AtomizationError,
  assertAtomizationReceiptReplayV1,
  atomizeCanonicalContentV1,
  compareAtomGraphsV1,
  validateContentAtomGraphV1,
} from '../../../../workflows/content/atoms/index.ts';
import {
  loadCanonicalContent,
  parseCanonicalContentMarkdown,
  type LoadedCanonicalContentV1,
} from '../../../../workflows/content/markdown/parse-canonical-content.ts';

const root = process.cwd();
const contentRef = 'content/pilot-carousel-002/content.md';

const rehash = (document: CanonicalContentDocumentV1): CanonicalContentDocumentV1 => ({
  ...document,
  semanticSha256: hashCanonical({
    domain: 'canonical-content-document-v1:semantic:v1',
    frontmatter: document.frontmatter,
    body: document.body,
  }),
});

const derive = (
  loaded: LoadedCanonicalContentV1,
  version: string,
  mutate: (document: CanonicalContentDocumentV1) => void,
): LoadedCanonicalContentV1 => {
  const document = structuredClone(loaded.document);
  document.frontmatter.version = version;
  mutate(document);
  return {...loaded, document: rehash(document)};
};

const activeBeat = (graph: ContentAtomGraphV1, purpose: string) =>
  graph.atoms.find(
    (atom) =>
      atom.status === 'active' &&
      atom.payload.kind === 'narrative_beat' &&
      atom.payload.purpose === purpose,
  );

describe('Content atomizer V1', () => {
  it('materializes the exact pilot fixture without making it a schema limit', () => {
    const graph = atomizeCanonicalContentV1({loaded: loadCanonicalContent(root, contentRef)});
    const active = graph.atoms.filter(({status}) => status === 'active');

    expect(active).toHaveLength(39);
    expect(graph.edges).toHaveLength(50);
    expect(graph.edges.filter(({propagationPolicy}) => propagationPolicy === 'hard')).toHaveLength(
      37,
    );
    expect(
      graph.edges.filter(({propagationPolicy}) => propagationPolicy === 'topology_only'),
    ).toHaveLength(13);
    expect(
      Object.fromEntries(
        ['narrative', 'visual', 'temporal', 'delivery'].map((atomClass) => [
          atomClass,
          active.filter((atom) => atom.atomClass === atomClass).length,
        ]),
      ),
    ).toEqual({narrative: 23, visual: 11, temporal: 1, delivery: 4});
  });

  it('rebuilds byte-equivalent data and ignores CRLF in semantic inputs', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const first = atomizeCanonicalContentV1({loaded});
    const second = atomizeCanonicalContentV1({loaded});
    const crlfDocument = parseCanonicalContentMarkdown(
      readFileSync(resolve(root, contentRef), 'utf8').replaceAll('\n', '\r\n'),
    );
    const crlf = atomizeCanonicalContentV1({loaded: {...loaded, document: crlfDocument}});

    expect(second).toEqual(first);
    expect(crlfDocument.rawSha256).not.toBe(loaded.document.rawSha256);
    expect(crlfDocument.semanticSha256).toBe(loaded.document.semanticSha256);
    expect(crlf).toEqual(first);
  });

  it('treats Markdown paragraph reflow as a byte change without semantic invalidation', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const baseline = atomizeCanonicalContentV1({loaded});
    const raw = readFileSync(resolve(root, contentRef), 'utf8');
    const reflowedRaw = raw.replace(
      'Profesionales y equipos que quieren adoptar IA con un criterio claro, sin acumular herramientas ni\npromesas sin evidencia.',
      'Profesionales y equipos que quieren adoptar IA con un criterio claro,\nsin acumular herramientas ni promesas sin evidencia.',
    );
    const reflowedDocument = parseCanonicalContentMarkdown(reflowedRaw);
    const reflowed = atomizeCanonicalContentV1({
      loaded: {...loaded, document: reflowedDocument},
    });

    expect(reflowedRaw).not.toBe(raw);
    expect(reflowedDocument.rawSha256).not.toBe(loaded.document.rawSha256);
    expect(reflowedDocument.semanticSha256).toBe(loaded.document.semanticSha256);
    expect(reflowed).toEqual(baseline);
  });

  it('changes only one beat revision for the approved phrase patch', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const previous = atomizeCanonicalContentV1({loaded});
    const raw = readFileSync(resolve(root, contentRef), 'utf8')
      .replace('version: 0.1.0', 'version: 0.1.1')
      .replace('la velocidad no reemplaza la dirección', 'la velocidad necesita dirección');
    const current = atomizeCanonicalContentV1({
      loaded: {...loaded, document: parseCanonicalContentMarkdown(raw)},
      parentGraph: previous,
    });
    const comparison = compareAtomGraphsV1(previous, current, [
      {approvalId: 'approval.simulation.001', graphSha256: previous.graphSha256},
    ]);

    expect(comparison.changedAtomIds).toHaveLength(1);
    expect(comparison.unchangedAtomIds).toHaveLength(38);
    expect(comparison.newAtomIds).toEqual([]);
    expect(comparison.removedAtomIds).toEqual([]);
    expect(comparison.staleApprovalIds).toEqual(['approval.simulation.001']);
    expect(activeBeat(previous, 'thesis')?.atomId).toBe(activeBeat(current, 'thesis')?.atomId);
    expect(
      previous.atoms.find(({atomType}) => atomType === 'narrative_sequence')?.outputSha256,
    ).toBe(current.atoms.find(({atomType}) => atomType === 'narrative_sequence')?.outputSha256);
  });

  it('treats reorder as topology while preserving beat identities', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const previous = atomizeCanonicalContentV1({loaded});
    const reordered = derive(loaded, '0.2.0', (document) => {
      const beats = document.body.narrativeBeats;
      [beats[1], beats[2]] = [beats[2]!, beats[1]!];
      document.body.narrativeBeats = beats.map((beat, index) => ({...beat, position: index + 1}));
    });
    const current = atomizeCanonicalContentV1({loaded: reordered, parentGraph: previous});

    expect(activeBeat(current, 'decision')?.atomId).toBe(activeBeat(previous, 'decision')?.atomId);
    expect(activeBeat(current, 'system')?.atomId).toBe(activeBeat(previous, 'system')?.atomId);
    expect(
      current.atoms.find(({atomType}) => atomType === 'narrative_sequence')?.outputSha256,
    ).not.toBe(
      previous.atoms.find(({atomType}) => atomType === 'narrative_sequence')?.outputSha256,
    );
  });

  it('supports repeated purposes when stable bindings differ', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const previous = atomizeCanonicalContentV1({loaded});
    const repeated = derive(loaded, '0.2.0', (document) => {
      document.body.narrativeBeats[2] = {
        ...document.body.narrativeBeats[2]!,
        purpose: 'decision',
        claimIds: ['CLM-PILOT2-PIPELINE-001'],
      };
    });
    const current = atomizeCanonicalContentV1({loaded: repeated, parentGraph: previous});
    const decisionBeats = current.atoms.filter(
      (atom) =>
        atom.status === 'active' &&
        atom.payload.kind === 'narrative_beat' &&
        atom.payload.purpose === 'decision',
    );

    expect(decisionBeats).toHaveLength(2);
    expect(new Set(decisionBeats.map(({atomId}) => atomId)).size).toBe(2);
  });

  it('adds one persistent identity for an insertion and tombstones identities changed by split', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const initial = atomizeCanonicalContentV1({loaded});
    const inserted = derive(loaded, '0.2.0', (document) => {
      document.body.narrativeBeats.push({
        position: 9,
        label: 'Soporte adicional',
        purpose: 'support',
        statement: 'Una unidad adicional, ligada a una fuente, prueba la inserción estable.',
        claimIds: ['CLM-PILOT2-EVIDENCE-001'],
        plannedCapabilityIds: [],
        stateDisclosure: 'not_applicable',
      });
    });
    const afterInsert = atomizeCanonicalContentV1({loaded: inserted, parentGraph: initial});
    const insertion = compareAtomGraphsV1(initial, afterInsert);
    expect(afterInsert.atoms.filter(({status}) => status === 'active')).toHaveLength(40);
    expect(insertion.newAtomIds).toHaveLength(1);
    expect(insertion.removedAtomIds).toEqual([]);

    const split = derive(loaded, '0.3.0', (document) => {
      document.body.narrativeBeats[4] = {
        ...document.body.narrativeBeats[4]!,
        purpose: 'support',
        claimIds: ['CLM-PILOT2-EVIDENCE-001'],
      };
      document.body.narrativeBeats.push({
        position: 9,
        label: 'Proceso verificable',
        purpose: 'support',
        statement: 'El proceso conserva una segunda unidad después del split explícito.',
        claimIds: ['CLM-PILOT2-PIPELINE-001'],
        plannedCapabilityIds: [],
        stateDisclosure: 'not_applicable',
      });
    });
    const afterSplit = atomizeCanonicalContentV1({loaded: split, parentGraph: initial});
    const splitComparison = compareAtomGraphsV1(initial, afterSplit);
    expect(splitComparison.newAtomIds.length).toBeGreaterThanOrEqual(2);
    expect(splitComparison.removedAtomIds).toHaveLength(1);
    expect(afterSplit.atoms.some(({status}) => status === 'tombstone')).toBe(true);
  });

  it('models a merge by retaining the survivor identity and tombstoning the absorbed beat', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const initial = atomizeCanonicalContentV1({loaded});
    const decisionBefore = activeBeat(initial, 'decision');
    const systemBefore = activeBeat(initial, 'system');
    const mergedDocument = derive(loaded, '0.2.0', (document) => {
      const decision = document.body.narrativeBeats[1]!;
      decision.statement =
        'Una ruta conocida requiere un workflow; los agentes administran sus excepciones y decisiones.';
      document.body.narrativeBeats = document.body.narrativeBeats
        .filter(({purpose}) => purpose !== 'system')
        .map((beat, index) => ({...beat, position: index + 1}));
    });
    const merged = atomizeCanonicalContentV1({loaded: mergedDocument, parentGraph: initial});
    const comparison = compareAtomGraphsV1(initial, merged);
    const decisionAfter = activeBeat(merged, 'decision');

    expect(merged.atoms.filter(({status}) => status === 'active')).toHaveLength(38);
    expect(decisionAfter?.atomId).toBe(decisionBefore?.atomId);
    expect(decisionAfter?.revision).toBe((decisionBefore?.revision ?? 0) + 1);
    expect(activeBeat(merged, 'system')).toBeUndefined();
    expect(comparison.removedAtomIds).toContain(systemBefore?.atomId);
    expect(
      merged.atoms.some(
        ({atomId, status}) => atomId === systemBefore?.atomId && status === 'tombstone',
      ),
    ).toBe(true);
  });

  it('fails closed when primary and secondary beat identity are both ambiguous', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const previous = atomizeCanonicalContentV1({loaded});
    const ambiguous = derive(loaded, '0.2.0', (document) => {
      document.body.narrativeBeats[2] = {
        ...document.body.narrativeBeats[1]!,
        position: 3,
      };
    });

    expect(() => atomizeCanonicalContentV1({loaded: ambiguous, parentGraph: previous})).toThrow(
      /ATOM_IDENTITY_AMBIGUOUS/u,
    );
  });

  it('tombstones a deletion and never resurrects its identity', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const initial = atomizeCanonicalContentV1({loaded});
    const deleted = derive(loaded, '0.2.0', (document) => {
      document.body.narrativeBeats = document.body.narrativeBeats
        .slice(0, 7)
        .map((beat, index) => ({...beat, position: index + 1}));
    });
    const afterDelete = atomizeCanonicalContentV1({loaded: deleted, parentGraph: initial});
    const restored = derive(loaded, '0.3.0', () => undefined);
    const afterRestore = atomizeCanonicalContentV1({
      loaded: restored,
      parentGraph: afterDelete,
    });
    const oldCta = activeBeat(initial, 'cta');
    const newCta = activeBeat(afterRestore, 'cta');

    expect(afterDelete.atoms.filter(({status}) => status === 'tombstone')).toHaveLength(1);
    expect(newCta?.atomId).not.toBe(oldCta?.atomId);
    expect(newCta?.generation).toBe(2);
    expect(
      afterRestore.atoms.some(
        ({atomId, status}) => atomId === oldCta?.atomId && status === 'tombstone',
      ),
    ).toBe(true);
  });

  it('rejects semantic edits without a version advance and empty version bumps', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const parentGraph = atomizeCanonicalContentV1({loaded});
    const changedWithoutVersion = derive(loaded, '0.1.0', (document) => {
      document.body.narrativeBeats[0]!.statement = 'Otra frase con la misma identidad.';
    });
    const bumpWithoutChange = derive(loaded, '0.1.1', () => undefined);

    expect(() => atomizeCanonicalContentV1({loaded: changedWithoutVersion, parentGraph})).toThrow(
      /CONTENT_VERSION_NOT_ADVANCED/u,
    );
    expect(() => atomizeCanonicalContentV1({loaded: bumpWithoutChange, parentGraph})).toThrow(
      /UNNECESSARY_CONTENT_VERSION_BUMP/u,
    );
  });

  it('rejects parent drift, cycles, self-edges, unknown endpoints and stale payload hashes', () => {
    const graph = atomizeCanonicalContentV1({loaded: loadCanonicalContent(root, contentRef)});
    const sourceEdge = graph.edges[0]!;
    const reverseUnsigned = {
      ...sourceEdge,
      edgeId: `AAA-${sourceEdge.edgeId}`,
      sourceAtomId: sourceEdge.targetAtomId,
      targetAtomId: sourceEdge.sourceAtomId,
      edgeSha256: '',
    };
    const reverseForHash = {...reverseUnsigned};
    Reflect.deleteProperty(reverseForHash, 'edgeSha256');
    const cycle = structuredClone(graph);
    cycle.edges = [
      {...reverseUnsigned, edgeSha256: hashCanonical(reverseForHash)},
      ...cycle.edges,
    ].sort(({edgeId: left}, {edgeId: right}) => left.localeCompare(right));
    expect(() => validateContentAtomGraphV1(cycle)).toThrow(/ATOM_GRAPH_CYCLE/u);

    const selfEdge = structuredClone(graph);
    selfEdge.edges[0]!.targetAtomId = selfEdge.edges[0]!.sourceAtomId;
    expect(() => validateContentAtomGraphV1(selfEdge)).toThrow(/ATOM_SELF_EDGE/u);

    const orphan = structuredClone(graph);
    orphan.edges[0]!.sourceAtomId = 'ATM-unknown-endpoint';
    expect(() => validateContentAtomGraphV1(orphan)).toThrow(/ATOM_ORPHAN/u);

    const stale = structuredClone(graph);
    const title = stale.atoms.find(({atomType}) => atomType === 'title')!;
    if (title.payload.kind !== 'canonical_field') throw new Error('title fixture missing');
    title.payload.value = 'Título alterado sin rehash';
    expect(() => validateContentAtomGraphV1(stale)).toThrow(/ATOM_PAYLOAD_HASH_STALE/u);

    const wrongParent = structuredClone(graph);
    wrongParent.contentId = 'other-content';
    expect(() =>
      atomizeCanonicalContentV1({
        loaded: loadCanonicalContent(root, contentRef),
        parentGraph: wrongParent,
      }),
    ).toThrow(/PARENT_GRAPH_MISMATCH/u);
  });

  it('rejects non-canonical atom and edge order explicitly', () => {
    const graph = atomizeCanonicalContentV1({loaded: loadCanonicalContent(root, contentRef)});
    const atomsOutOfOrder = structuredClone(graph);
    [atomsOutOfOrder.atoms[0], atomsOutOfOrder.atoms[1]] = [
      atomsOutOfOrder.atoms[1]!,
      atomsOutOfOrder.atoms[0]!,
    ];
    const edgesOutOfOrder = structuredClone(graph);
    [edgesOutOfOrder.edges[0], edgesOutOfOrder.edges[1]] = [
      edgesOutOfOrder.edges[1]!,
      edgesOutOfOrder.edges[0]!,
    ];

    expect(() => validateContentAtomGraphV1(atomsOutOfOrder)).toThrow(/NON_CANONICAL_ORDER/u);
    expect(() => validateContentAtomGraphV1(edgesOutOfOrder)).toThrow(/NON_CANONICAL_ORDER/u);
  });

  it.each([
    {
      drift: 'claim',
      mutate: (graph: ContentAtomGraphV1) => {
        const claim = graph.atoms.find(({atomType}) => atomType === 'claim')!;
        if (claim.payload.kind !== 'claim') throw new Error('claim fixture missing');
        claim.payload.statement = `${claim.payload.statement} Deriva hostil.`;
      },
      error: /ATOM_PAYLOAD_HASH_STALE/u,
    },
    {
      drift: 'authority',
      mutate: (graph: ContentAtomGraphV1) => {
        const claim = graph.atoms.find(({atomType}) => atomType === 'claim')!;
        claim.evidenceBindings[0]!.authorityId = 'AUTH-HOSTILE-001';
      },
      error: /ATOM_REVISION_HASH_STALE/u,
    },
    {
      drift: 'locator',
      mutate: (graph: ContentAtomGraphV1) => {
        const claim = graph.atoms.find(({atomType}) => atomType === 'claim')!;
        const binding = claim.evidenceBindings[0]!;
        if (binding.locator.kind !== 'line_range') throw new Error('line locator fixture missing');
        binding.locator = {
          kind: 'line_range',
          startLine: binding.locator.startLine + 1,
          endLine: binding.locator.endLine + 1,
        };
      },
      error: /ATOM_REVISION_HASH_STALE/u,
    },
    {
      drift: 'fragment',
      mutate: (graph: ContentAtomGraphV1) => {
        const claim = graph.atoms.find(({atomType}) => atomType === 'claim')!;
        claim.evidenceBindings[0]!.fragmentSha256 = 'f'.repeat(64);
      },
      error: /ATOM_REVISION_HASH_STALE/u,
    },
    {
      drift: 'rights',
      mutate: (graph: ContentAtomGraphV1) => {
        const claim = graph.atoms.find(({atomType}) => atomType === 'claim')!;
        claim.declaredRights.restrictions = [
          ...claim.declaredRights.restrictions,
          'Restricción hostil no declarada por la fuente.',
        ];
      },
      error: /ATOM_REVISION_HASH_STALE/u,
    },
  ])('rejects stale $drift provenance independently', ({mutate, error}) => {
    const graph = structuredClone(
      atomizeCanonicalContentV1({loaded: loadCanonicalContent(root, contentRef)}),
    );
    mutate(graph);
    expect(() => validateContentAtomGraphV1(graph)).toThrow(error);
  });

  it('rejects a non-monotonic revision after a semantic edit', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const previous = atomizeCanonicalContentV1({loaded});
    const changed = derive(loaded, '0.1.1', (document) => {
      document.body.narrativeBeats[0]!.statement =
        'Método antes que herramientas: la velocidad necesita dirección.';
    });
    const current = atomizeCanonicalContentV1({loaded: changed, parentGraph: previous});
    const priorBeat = activeBeat(previous, 'thesis')!;
    const currentBeat = activeBeat(current, 'thesis')!;

    expect(currentBeat.revision).toBe(priorBeat.revision + 1);
    currentBeat.revision = priorBeat.revision;
    expect(() => validateContentAtomGraphV1(current)).toThrow(/ATOM_OUTPUT_HASH_STALE/u);
  });

  it('rejects hostile atomId recycling even when local payload hashes are recomputed', () => {
    const graph = structuredClone(
      atomizeCanonicalContentV1({loaded: loadCanonicalContent(root, contentRef)}),
    );
    const title = graph.atoms.find(({atomType}) => atomType === 'title')!;
    title.atomId = `ATM-${'0'.repeat(64)}`;
    title.payloadSha256 = hashCanonical({
      domain: 'content-atom-v1:payload:v1',
      atomId: title.atomId,
      atomClass: title.atomClass,
      atomType: title.atomType,
      payload: title.payload,
    });
    title.revisionSha256 = hashCanonical({
      domain: 'content-atom-v1:revision:v1',
      payloadSha256: title.payloadSha256,
      origin: title.origin,
      evidenceBindings: title.evidenceBindings,
      declaredRights: title.declaredRights,
      contextSha256: title.contextSha256,
    });
    graph.atoms.sort(({atomId: left}, {atomId: right}) => left.localeCompare(right));

    expect(() => validateContentAtomGraphV1(graph)).toThrow(/ATOM_ID_RECYCLED/u);
  });

  it('exposes stable machine-readable error codes', () => {
    const error = new AtomizationError('ATOM_IDENTITY_AMBIGUOUS', 'fixture');
    expect(error.code).toBe('ATOM_IDENTITY_AMBIGUOUS');
    expect(error.message).toBe('ATOM_IDENTITY_AMBIGUOUS: fixture');
  });

  it('rejects reuse of one receipt ID for different bytes', () => {
    const base = {
      receiptId: 'receipt.same.001',
      receiptSha256: 'a'.repeat(64),
    } as Parameters<typeof assertAtomizationReceiptReplayV1>[0];
    const changed = {
      receiptId: 'receipt.same.001',
      receiptSha256: 'b'.repeat(64),
    } as Parameters<typeof assertAtomizationReceiptReplayV1>[1];
    expect(() => assertAtomizationReceiptReplayV1(base, changed)).toThrow(/RECEIPT_ID_REUSED/u);
  });
});
