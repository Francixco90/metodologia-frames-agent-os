import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse as parseYaml} from 'yaml';

import {
  buildD3HierarchyGeometry,
  buildD3Geometry,
  buildD3Interpolation,
  D3AdapterError,
  type D3GeometryRequestV1,
  type D3HierarchyRequestV1,
  type D3InterpolationRequestV1,
} from '../../../renderers/remotion/src/adapters/d3-adapter.ts';

const root = process.cwd();
const skillRoot = resolve(root, 'skills/data-visual-composition');
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(skillRoot, path), 'utf8'));
const sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');
const fail = (message: string): never => {
  throw new Error(message);
};
const stable = <Input, Output>(
  label: string,
  build: (value: Input) => Output,
  value: Input,
): Output => {
  const first = build(value);
  if (JSON.stringify(first) !== JSON.stringify(build(structuredClone(value)))) {
    fail(`D3 ${label} output is not byte-stable.`);
  }
  return first;
};

const matrix = readJson('fixtures/positive/categorical-matrix.json') as D3GeometryRequestV1;
const matrixFirst = stable('matrix', buildD3Geometry, matrix);
if (matrixFirst.semanticTable.rows.length !== 6 || matrixFirst.fallback.kind !== 'semantic_table') {
  fail('D3 matrix does not preserve all cells and its fallback.');
}

const datasetPath = resolve(skillRoot, 'fixtures/data/quantitative-values.json');
const datasetSha256 = sha256(readFileSync(datasetPath));
const series = readJson('fixtures/positive/quantitative-series.json') as D3GeometryRequestV1;
if (series.kind !== 'quantitative_series') throw new Error('Expected a quantitative fixture.');
if (series.datasetRef.sha256 !== datasetSha256) fail('Quantitative fixture dataset hash is stale.');
const seriesResult = stable('series', buildD3Geometry, series);
if (!seriesResult.equivalentText.includes('Denominador: cinco fixtures')) {
  fail('Quantitative equivalent text omits its denominator.');
}

const hierarchy = readJson('fixtures/positive/hierarchy-tree.json') as D3HierarchyRequestV1;
const hierarchyFirst = stable('hierarchy', buildD3HierarchyGeometry, hierarchy);
const interpolation = readJson('fixtures/positive/interpolation.json') as D3InterpolationRequestV1;
const interpolationFirst = stable('interpolation', buildD3Interpolation, interpolation);

// prettier-ignore
const hostileCases: ReadonlyArray<readonly [string, string, (value: unknown) => unknown]> = [
  ['fixtures/hostile/empty-series.json', 'DATASET_EMPTY', (value) => buildD3Geometry(value as D3GeometryRequestV1)],
  ['fixtures/hostile/missing-denominator.json', 'METRIC_BINDING_MISSING', (value) => buildD3Geometry(value as D3GeometryRequestV1)],
  ['fixtures/hostile/hierarchy-cycle.json', 'TREE_CYCLE', (value) => buildD3HierarchyGeometry(value as D3HierarchyRequestV1)],
  ['fixtures/hostile/interpolation-out-of-range.json', 'INTERPOLATION_PROGRESS_INVALID', (value) => buildD3Interpolation(value as D3InterpolationRequestV1)],
];
for (const [fixture, expectedCode, build] of hostileCases) {
  try {
    build(readJson(fixture));
    fail(`${fixture} did not fail closed.`);
  } catch (error) {
    if (!(error instanceof D3AdapterError) || error.code !== expectedCode) throw error;
  }
}

const adapterSource = readFileSync(
  resolve(root, 'renderers/remotion/src/adapters/d3-adapter.ts'),
  'utf8',
);
for (const prohibited of [
  "from 'd3-selection'",
  "from 'd3-transition'",
  'setTimeout(',
  'Math.random(',
  'fetch(',
  'document.',
  'window.',
]) {
  if (adapterSource.includes(prohibited)) fail(`Prohibited D3 adapter surface: ${prohibited}`);
}

const schema = readJson('schemas/d3-geometry-request-v1.schema.json') as Record<string, unknown>;
if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  fail('D3 request schema is absent or unsupported.');
}
const schemaRefs = (schema.oneOf as Array<{$ref?: string}> | undefined)?.map((entry) => entry.$ref);
// prettier-ignore
const expectedSchemaRefs = ['#/$defs/categoricalMatrix', '#/$defs/quantitativeSeries', '#/$defs/hierarchyTree', '#/$defs/interpolation'];
if (JSON.stringify(schemaRefs) !== JSON.stringify(expectedSchemaRefs)) {
  fail('D3 request schema must discriminate exactly four authored request types.');
}
const schemaDefs = schema.$defs as Record<string, Record<string, unknown>> | undefined;
for (const [definition, contract] of Object.entries(schemaDefs ?? {})) {
  if (contract.type === 'object' && contract.additionalProperties !== false) {
    fail(`D3 schema definition ${definition} must reject unknown fields.`);
  }
}
const interpolationSchema = schemaDefs?.interpolation?.properties as
  Record<string, Record<string, unknown>> | undefined;
if (interpolationSchema?.progress?.minimum !== 0 || interpolationSchema.progress.maximum !== 1) {
  fail('D3 interpolation schema must constrain progress to the closed [0,1] domain.');
}

type DependencyReceipt = {
  state?: string;
  clock_mode?: string;
  network_allowed?: boolean;
  publication_authority?: boolean;
  dependencies?: Array<{
    package?: string;
    version?: string;
    license?: string;
    license_sha256?: string;
  }>;
};

const receipt = parseYaml(
  readFileSync(resolve(skillRoot, 'receipts/d3-dependency-license.yml'), 'utf8'),
) as DependencyReceipt;
if (
  receipt.state !== 'verified_local' ||
  receipt.clock_mode !== 'not_applicable' ||
  receipt.network_allowed !== false ||
  receipt.publication_authority !== false
) {
  fail('D3 dependency receipt overstates its execution authority.');
}
for (const dependency of receipt.dependencies ?? []) {
  if (
    dependency.package === undefined ||
    dependency.version === undefined ||
    dependency.license !== 'ISC' ||
    dependency.license_sha256 === undefined
  ) {
    throw new Error('D3 dependency receipt contains an incomplete entry.');
  }
  const packageRoot = resolve(root, 'node_modules', dependency.package);
  const packageManifest = JSON.parse(
    readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
  ) as {version?: string; license?: string};
  if (packageManifest.version !== dependency.version || packageManifest.license !== 'ISC') {
    fail(`D3 dependency receipt is stale for ${dependency.package}.`);
  }
  if (sha256(readFileSync(resolve(packageRoot, 'LICENSE'))) !== dependency.license_sha256) {
    fail(`D3 license hash is stale for ${dependency.package}.`);
  }
}
if (receipt.dependencies?.length !== 5) fail('D3 dependency receipt must cover five modules.');

const skillMarkdown = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
if (
  !skillMarkdown.startsWith('---\nname: data-visual-composition\n') ||
  !skillMarkdown.includes('description: This skill should be used when') ||
  !skillMarkdown.includes('version: 0.1.0')
) {
  fail('Data visual composition skill metadata is invalid.');
}

console.info(
  `PASS DATA VISUAL COMPOSITION: matrix=${matrixFirst.outputSha256} series=${seriesResult.outputSha256} hierarchy=${hierarchyFirst.outputSha256} interpolation=${interpolationFirst.outputSha256}`,
);
