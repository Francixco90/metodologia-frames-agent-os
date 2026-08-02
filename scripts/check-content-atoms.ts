import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {
  AtomGraphLineageV1Schema,
  AtomInvalidationSimulationV1Schema,
  AtomizationReceiptV1Schema,
  ContentAtomGraphV1Schema,
  GraphBoundApprovalSimulationV1Schema,
  SourceFreezeReceiptV1Schema,
} from '../core/contracts/index.ts';
import {hashCanonical} from '../core/evidence/hash.ts';
import {
  atomizeCanonicalContentV1,
  buildSyntheticSourceReceiptV1,
  compareAtomGraphsV1,
  computeAtomizationReceiptSha256,
  validateContentAtomGraphV1,
} from '../workflows/content/atoms/index.ts';
import {
  loadCanonicalContent,
  parseCanonicalContentMarkdown,
} from '../workflows/content/markdown/parse-canonical-content.ts';
import {computeSourceFreezeReceiptSha256} from '../workflows/content/markdown/source-freeze.ts';
import {H02_LOCK_SHA256, verifyApprovedH03LockSuccession} from './lib/h03-lock-succession.mjs';

const root = process.cwd();
const generated = 'content/pilot-carousel-002/generated';
const refs = {
  content: 'content/pilot-carousel-002/content.md',
  canonical: `${generated}/canonical-content-document.json`,
  sourceReceipt: `${generated}/source-freeze-receipt.json`,
  graph: `${generated}/atom-graph.json`,
  snapshot: `${generated}/lineage/atom-graph-0.1.0.json`,
  receipt: `${generated}/atomization-receipt.json`,
  lineage: `${generated}/atom-graph-lineage.json`,
  simulation: `${generated}/invalidation-demo.json`,
  approval: `${generated}/lineage/simulated-graph-approval.json`,
} as const;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const read = (ref: string): string => readFileSync(resolve(root, ref), 'utf8');
const fail = (message: string): never => {
  throw new Error(`verify:atoms: ${message}`);
};
const expect = (condition: boolean, message: string): void => {
  if (!condition) fail(message);
};
const filesBelow = (directory: string): string[] =>
  readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : statSync(path).isFile() ? [path] : [];
    })
    .sort();
const treeDigest = (ref: string): string => {
  const ledger = filesBelow(resolve(root, ref))
    .map((path) => `${sha256(readFileSync(path))}  ${relative(root, path).replaceAll('\\', '/')}\n`)
    .join('');
  return sha256(ledger);
};

const loaded = loadCanonicalContent(root, refs.content);
const graphRaw = read(refs.graph);
const snapshotRaw = read(refs.snapshot);
const receiptRaw = read(refs.receipt);
const lineageRaw = read(refs.lineage);
const simulationRaw = read(refs.simulation);
const approvalRaw = read(refs.approval);
const sourceReceiptRaw = read(refs.sourceReceipt);

const graph = ContentAtomGraphV1Schema.parse(JSON.parse(graphRaw));
const receipt = AtomizationReceiptV1Schema.parse(JSON.parse(receiptRaw));
const lineage = AtomGraphLineageV1Schema.parse(JSON.parse(lineageRaw));
const simulation = AtomInvalidationSimulationV1Schema.parse(JSON.parse(simulationRaw));
const approval = GraphBoundApprovalSimulationV1Schema.parse(JSON.parse(approvalRaw));
const sourceReceipt = SourceFreezeReceiptV1Schema.parse(JSON.parse(sourceReceiptRaw));

validateContentAtomGraphV1(graph);
const rebuilt = atomizeCanonicalContentV1({loaded});
expect(JSON.stringify(rebuilt) === JSON.stringify(graph), 'fresh rebuild differs from projection');
expect(graphRaw === snapshotRaw, 'current graph and immutable 0.1.0 snapshot differ');

const active = graph.atoms.filter(({status}) => status === 'active');
const classCounts = Object.fromEntries(
  ['narrative', 'visual', 'temporal', 'delivery'].map((atomClass) => [
    atomClass,
    active.filter((atom) => atom.atomClass === atomClass).length,
  ]),
);
expect(active.length === 39, `expected 39 active atoms, received ${active.length}`);
expect(graph.edges.length === 50, `expected 50 edges, received ${graph.edges.length}`);
expect(
  JSON.stringify(classCounts) ===
    JSON.stringify({narrative: 23, visual: 11, temporal: 1, delivery: 4}),
  `unexpected atom class distribution ${JSON.stringify(classCounts)}`,
);
expect(
  graph.edges.filter(({propagationPolicy}) => propagationPolicy === 'hard').length === 37,
  'expected 37 hard edges',
);
expect(
  graph.edges.filter(({propagationPolicy}) => propagationPolicy === 'topology_only').length === 13,
  'expected 13 topology-only edges',
);
expect(
  graph.edges.filter(({kind}) => kind === 'sequences').length === 8 &&
    graph.edges.filter(({kind}) => kind === 'accessibility_orders').length === 5,
  'expected 8 sequence and 5 accessibility-order edges',
);

const qualifiedClaim = active.find(
  (atom) => atom.payload.kind === 'claim' && atom.payload.claimId === 'CLM-PILOT2-EVIDENCE-001',
);
expect(
  qualifiedClaim?.effectiveRights.state === 'qualified_internal_derivation',
  'qualified claim was promoted or blocked incorrectly',
);
const capabilities = active.filter(({atomType}) => atomType === 'planned_capability');
expect(capabilities.length === 5, 'expected five planned capability atoms');
expect(
  capabilities.every(({effectiveRights}) => effectiveRights.state === 'planned_only'),
  'a planned capability was promoted to available',
);

expect(
  sha256(read(refs.content)) === 'b53aa138b8406ebfdcbe6032a646239ec93384561b6a45a74986c62bb75a1382',
  'H-01 content.md changed',
);
expect(
  sha256(read(refs.canonical)) ===
    '051cf409c8cc2146fefa9c629a34c2135264a4d7f85e9745a634fea1675cd6d1',
  'H-01 canonical projection changed',
);
expect(
  sha256(sourceReceiptRaw) === '73942f3d682a232c9cd5c26b87a6912f5f9907fd99ca43a97465f1a28df0ffb7',
  'H-01 source receipt changed',
);
const {receiptSha256: sourceReceiptSha256, ...unsignedSourceReceipt} = sourceReceipt;
expect(
  sourceReceiptSha256 === computeSourceFreezeReceiptSha256(unsignedSourceReceipt),
  'H-01 source receipt self-hash is stale',
);

expect(receipt.atomCount === 39 && receipt.edgeCount === 50, 'receipt counts differ from fixture');
expect(receipt.graphSha256 === graph.graphSha256, 'receipt graph hash differs');
expect(receipt.graphRef.sha256 === sha256(graphRaw), 'receipt graph file binding differs');
expect(
  receipt.sourceFreezeReceiptRef.sha256 === sha256(sourceReceiptRaw),
  'receipt H-01 binding differs',
);
const {receiptSha256: atomReceiptSha256, ...unsignedReceipt} = receipt;
expect(
  atomReceiptSha256 === computeAtomizationReceiptSha256(unsignedReceipt),
  'atomization receipt self-hash is stale',
);

const {lineageSha256, ...unsignedLineage} = lineage;
expect(
  lineageSha256 ===
    hashCanonical({domain: 'atom-graph-lineage-v1:integrity:v1', lineage: unsignedLineage}),
  'lineage self-hash is stale',
);
expect(lineage.currentGraphSha256 === graph.graphSha256, 'lineage current graph differs');
expect(
  lineage.entries[0]?.atomizationReceiptRef.sha256 === sha256(receiptRaw),
  'lineage receipt file binding differs',
);

const originalRaw = read(refs.content);
const simulatedRaw = originalRaw
  .replace('version: 0.1.0', 'version: 0.1.1')
  .replace('la velocidad no reemplaza la dirección', 'la velocidad necesita dirección');
const simulatedDocument = parseCanonicalContentMarkdown(simulatedRaw);
const syntheticReceipt = buildSyntheticSourceReceiptV1(sourceReceipt, {
  contentVersion: simulatedDocument.frontmatter.version,
  contentRawSha256: simulatedDocument.rawSha256,
  contentSemanticSha256: simulatedDocument.semanticSha256,
});
const simulatedGraph = atomizeCanonicalContentV1({
  loaded: {...loaded, document: simulatedDocument},
  parentGraph: graph,
});
const comparison = compareAtomGraphsV1(graph, simulatedGraph, [approval]);
expect(comparison.changedAtomIds.length === 1, 'simulation must change one atom');
expect(comparison.unchangedAtomIds.length === 38, 'simulation must preserve 38 atoms');
expect(comparison.newAtomIds.length === 0, 'phrase edit must not create an atom');
expect(comparison.removedAtomIds.length === 0, 'phrase edit must not tombstone an atom');
expect(comparison.staleApprovalIds[0] === approval.approvalId, 'approval did not become stale');
expect(
  simulation.priorBeatAtomId === simulation.currentBeatAtomId &&
    simulation.invalidation.changedAtomIds[0] === simulation.priorBeatAtomId,
  'phrase edit did not preserve beat identity',
);
expect(
  simulation.simulatedSourceReceipt.receiptSha256 === syntheticReceipt.receiptSha256 &&
    simulation.simulatedSourceReceipt.receiptId !== sourceReceipt.receiptId,
  'simulation did not use a unique rehashed source receipt',
);
const {invalidationSha256, ...unsignedInvalidation} = simulation.invalidation;
expect(
  invalidationSha256 ===
    hashCanonical({
      domain: 'atom-graph-invalidation-v1:integrity:v1',
      invalidation: unsignedInvalidation,
    }),
  'invalidation self-hash is stale',
);
const {simulationSha256, ...unsignedSimulation} = simulation;
expect(
  simulationSha256 ===
    hashCanonical({
      domain: 'atom-invalidation-simulation-v1:integrity:v1',
      simulation: unsignedSimulation,
    }),
  'simulation self-hash is stale',
);
expect(
  simulation.invalidation.invalidatedApprovalRefs[0]?.sha256 === sha256(approvalRaw),
  'simulation approval file binding differs',
);

const currentLockSha256 = sha256(read('pnpm-lock.yaml'));
if (currentLockSha256 !== H02_LOCK_SHA256) verifyApprovedH03LockSuccession(root);
expect(
  treeDigest('adapters/n8n') === '3a27f59814a35ce5e0d87aee1a1d5e9645db288c2cbac87b59b6aabd5ffd174d',
  'n8n adapter tree changed',
);
expect(
  treeDigest('projects/pilot-carousel-001') ===
    'd9b76dde1a73524ba15d7efb0e0530adfacbd032f1480a00f9250b6bc77ebb78',
  'pilot-carousel-001 changed',
);
expect(
  treeDigest('projects/vs-001-source-to-campaign') ===
    '4451cb1829b9c2d5f8cafb7eb77787ee0884fb9f08a42230efe84028225f61f4',
  'VS-001 changed',
);

console.info(
  `verify:atoms PASS graph=${graph.graphSha256} active=${active.length} edges=${graph.edges.length} selective=1/38`,
);
