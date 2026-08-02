import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {SourceFreezeReceiptV1Schema} from '../core/contracts/index.ts';
import {
  atomizeCanonicalContentV1,
  buildAtomGraphInvalidationV1,
  buildAtomGraphLineageV1,
  buildAtomInvalidationSimulationV1,
  buildAtomizationReceiptV1,
  buildGraphBoundApprovalSimulationV1,
  buildSyntheticSourceReceiptV1,
  compareAtomGraphsV1,
} from '../workflows/content/atoms/index.ts';
import {
  loadCanonicalContent,
  parseCanonicalContentMarkdown,
} from '../workflows/content/markdown/parse-canonical-content.ts';
import {computeSourceFreezeReceiptSha256} from '../workflows/content/markdown/source-freeze.ts';

const root = process.cwd();
const contentRef = 'content/pilot-carousel-002/content.md';
const outputRef = 'content/pilot-carousel-002/generated';
const graphRef = `${outputRef}/atom-graph.json`;
const snapshotRef = `${outputRef}/lineage/atom-graph-0.1.0.json`;
const receiptRef = `${outputRef}/atomization-receipt.json`;
const lineageRef = `${outputRef}/atom-graph-lineage.json`;
const simulationRef = `${outputRef}/invalidation-demo.json`;
const simulatedApprovalRef = `${outputRef}/lineage/simulated-graph-approval.json`;
const sourceReceiptRef = `${outputRef}/source-freeze-receipt.json`;

const fromText = 'la velocidad no reemplaza la dirección';
const toText = 'la velocidad necesita dirección';

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const jsonBytes = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const compactJsonBytes = (value: unknown): string => `${JSON.stringify(value)}\n`;
const write = (ref: string, bytes: string): void => {
  const path = resolve(root, ref);
  mkdirSync(resolve(path, '..'), {recursive: true});
  writeFileSync(path, bytes);
};
const writeImmutable = (ref: string, bytes: string): void => {
  const path = resolve(root, ref);
  mkdirSync(resolve(path, '..'), {recursive: true});
  if (existsSync(path)) {
    const prior = readFileSync(path, 'utf8');
    if (prior !== bytes) {
      let tracked = true;
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', ref], {
          cwd: root,
          stdio: 'ignore',
        });
      } catch {
        tracked = false;
      }
      if (tracked) {
        throw new Error(`IMMUTABLE_HISTORY_CONFLICT: ${ref} already exists with different bytes.`);
      }
      writeFileSync(path, bytes);
    }
    return;
  }
  writeFileSync(path, bytes);
};

const loaded = loadCanonicalContent(root, contentRef);
const sourceReceiptRaw = readFileSync(resolve(root, sourceReceiptRef), 'utf8');
const sourceReceipt = SourceFreezeReceiptV1Schema.parse(JSON.parse(sourceReceiptRaw));
const {receiptSha256, ...unsignedSourceReceipt} = sourceReceipt;
if (computeSourceFreezeReceiptSha256(unsignedSourceReceipt) !== receiptSha256) {
  throw new Error('SOURCE_RECEIPT_DRIFT: H-01 source receipt self-hash is stale.');
}
if (
  sourceReceipt.contentId !== loaded.document.frontmatter.contentId ||
  sourceReceipt.contentVersion !== loaded.document.frontmatter.version ||
  sourceReceipt.contentRawSha256 !== loaded.document.rawSha256 ||
  sourceReceipt.contentSemanticSha256 !== loaded.document.semanticSha256
) {
  throw new Error('SOURCE_RECEIPT_DRIFT: H-01 receipt does not bind the current content document.');
}

const graph = atomizeCanonicalContentV1({loaded});
// The graph is generated, schema-validated and commonly read by machines. Compact canonical JSON
// keeps the repository under its hard line budget while the Markdown contract remains reviewable.
const graphBytes = compactJsonBytes(graph);
write(graphRef, graphBytes);
writeImmutable(snapshotRef, graphBytes);

const receipt = buildAtomizationReceiptV1({
  graph,
  graphRef,
  graphFileSha256: sha256(graphBytes),
  contentRef,
  sourceReceiptRef,
  sourceReceiptFileSha256: sha256(sourceReceiptRaw),
  sourceReceipt,
});
const receiptBytes = jsonBytes(receipt);
write(receiptRef, receiptBytes);

const approval = buildGraphBoundApprovalSimulationV1(graph);
const approvalBytes = jsonBytes(approval);
write(simulatedApprovalRef, approvalBytes);

const raw = readFileSync(resolve(root, contentRef), 'utf8');
const simulatedRaw = raw.replace('version: 0.1.0', 'version: 0.1.1').replace(fromText, toText);
if (simulatedRaw === raw || !simulatedRaw.includes('version: 0.1.1')) {
  throw new Error('INVALIDATION_FIXTURE_MISSING: expected version and phrase mutation.');
}
const simulatedDocument = parseCanonicalContentMarkdown(simulatedRaw);
const simulatedSourceReceipt = buildSyntheticSourceReceiptV1(sourceReceipt, {
  contentVersion: simulatedDocument.frontmatter.version,
  contentRawSha256: simulatedDocument.rawSha256,
  contentSemanticSha256: simulatedDocument.semanticSha256,
});
const simulatedGraph = atomizeCanonicalContentV1({
  loaded: {...loaded, document: simulatedDocument},
  parentGraph: graph,
});
const comparison = compareAtomGraphsV1(graph, simulatedGraph, [
  {approvalId: approval.approvalId, graphSha256: approval.graphSha256},
]);
const invalidation = buildAtomGraphInvalidationV1({
  previous: graph,
  current: simulatedGraph,
  comparison,
  invalidatedApprovalRef: {
    schemaVersion: 'hash-bound-ref-v1',
    ref: simulatedApprovalRef,
    sha256: sha256(approvalBytes),
  },
});
const simulation = buildAtomInvalidationSimulationV1({
  previous: graph,
  current: simulatedGraph,
  comparison,
  invalidation,
  syntheticSourceReceipt: simulatedSourceReceipt,
  fromText,
  toText,
});
write(simulationRef, jsonBytes(simulation));

const lineage = buildAtomGraphLineageV1({
  graph,
  receiptRef,
  receiptFileSha256: sha256(receiptBytes),
  invalidation,
});
write(lineageRef, jsonBytes(lineage));

console.info(
  `BUILT H-02: ${graph.contentId}@${graph.contentVersion} atoms=${receipt.atomCount} edges=${receipt.edgeCount} graph=${graph.graphSha256} simulation=${simulation.simulationSha256}`,
);
