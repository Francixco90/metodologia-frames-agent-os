import {extent} from 'd3-array';
import {hierarchy, tree} from 'd3-hierarchy';
import {interpolateNumber} from 'd3-interpolate';
import {scaleBand, scaleLinear} from 'd3-scale';
import {line} from 'd3-shape';
import {z} from 'zod';

import {hashCanonical} from 'core/evidence/hash.ts';

export const D3_ADAPTER_ID = 'd3-svg-geometry-v1' as const;
export const D3_ADAPTER_VERSION = '0.1.0' as const;

// prettier-ignore
const Text = z.string().trim().min(1).max(4_000).transform((value) => value.normalize('NFC'));
// prettier-ignore
const Id = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9:._-]{1,127}$/u).transform((value) => value.normalize('NFC'));
const Finite = z.number().finite();
// prettier-ignore
const Margins = z.strictObject({top: Finite.nonnegative(), right: Finite.nonnegative(), bottom: Finite.nonnegative(), left: Finite.nonnegative()});
// prettier-ignore
const GeometryBase = {schemaVersion: z.literal('d3-geometry-request-v1'), requestId: Id, width: Finite.positive(), height: Finite.positive(), margins: Margins, equivalentMessage: Text, nonColorCue: Text, fallback: z.literal('semantic_table')};
const AxisEntry = z.strictObject({id: Id, label: Text});
// prettier-ignore
const MatrixCell = z.strictObject({rowId: Id, columnId: Id, state: Text, label: Text, marker: Text});
// prettier-ignore
export const D3CategoricalMatrixRequestV1Schema = z.strictObject({...GeometryBase, kind: z.literal('categorical_matrix'), sourceAtomIds: z.array(Id).min(1), rows: z.array(AxisEntry).min(1), columns: z.array(AxisEntry).min(1), rowOrder: z.array(Id).min(1), columnOrder: z.array(Id).min(1), cells: z.array(MatrixCell).min(1)});
const Metric = z.strictObject({unit: Text, denominator: Text, period: Text, method: Text});
// prettier-ignore
export const D3QuantitativeSeriesRequestV1Schema = z.strictObject({...GeometryBase, kind: z.literal('quantitative_series'), claimId: Id, datasetRef: z.strictObject({ref: Text, sha256: z.string().regex(/^[a-f0-9]{64}$/u)}), metric: Metric, items: z.array(z.strictObject({id: Id, label: Text, value: Finite})).min(1), order: z.array(Id).min(1)});
// prettier-ignore
export const D3HierarchyRequestV1Schema = z.strictObject({schemaVersion: z.literal('d3-hierarchy-request-v1'), requestId: Id, width: Finite.positive(), height: Finite.positive(), margins: Margins, equivalentMessage: Text, nonColorCue: Text, sourceAtomIds: z.array(Id).min(1), fallback: z.literal('adjacency_list'), nodes: z.array(z.strictObject({id: Id, label: Text, parentId: Id.nullable(), order: Finite.int().nonnegative()})).min(1).max(64)});
// prettier-ignore
const GeometryChannel = z.strictObject({id: Id, label: Text, start: Finite, end: Finite, geometryUnit: z.enum(['degrees', 'px', 'ratio']), semanticRole: z.literal('geometry_only')});
// prettier-ignore
export const D3InterpolationRequestV1Schema = z.strictObject({schemaVersion: z.literal('d3-interpolation-request-v1'), requestId: Id, progress: Finite, equivalentMessage: Text, nonColorCue: Text, order: z.array(Id).min(1), channels: z.array(GeometryChannel).min(1)});

export type D3CategoricalMatrixRequestV1 = z.infer<typeof D3CategoricalMatrixRequestV1Schema>;
export type D3QuantitativeSeriesRequestV1 = z.infer<typeof D3QuantitativeSeriesRequestV1Schema>;
export type D3GeometryRequestV1 = D3CategoricalMatrixRequestV1 | D3QuantitativeSeriesRequestV1;
export type D3HierarchyRequestV1 = z.infer<typeof D3HierarchyRequestV1Schema>;
export type D3InterpolationRequestV1 = z.infer<typeof D3InterpolationRequestV1Schema>;
export type D3SemanticTableV1 = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export class D3AdapterError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'D3AdapterError';
  }
}

const fail = (code: string, message: string): never => {
  throw new D3AdapterError(code, message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasNonFinite = (value: unknown): boolean =>
  typeof value === 'number'
    ? !Number.isFinite(value)
    : Array.isArray(value)
      ? value.some(hasNonFinite)
      : isRecord(value)
        ? Object.values(value).some(hasNonFinite)
        : false;
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  if (hasNonFinite(value)) fail('NON_FINITE_VALUE', 'Request contains a non-finite number.');
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0]!;
  if (issue.code === 'unrecognized_keys') fail('UNKNOWN_FIELD', issue.message);
  return fail('INVALID_REQUEST', issue.message);
};
const rejectEmpty = (value: unknown, keys: readonly string[]): void => {
  if (!isRecord(value)) return;
  for (const key of keys) {
    if (Array.isArray(value[key]) && value[key].length === 0) {
      fail('DATASET_EMPTY', `${key} cannot be empty.`);
    }
  }
};
const rejectMissingMetric = (value: unknown): void => {
  if (!isRecord(value) || value.kind !== 'quantitative_series' || !isRecord(value.metric)) return;
  for (const key of ['unit', 'denominator', 'period', 'method']) {
    if (!(key in value.metric)) fail('METRIC_BINDING_MISSING', `metric.${key} is required.`);
  }
};
const unique = (values: readonly string[], path: string): void => {
  if (new Set(values).size !== values.length) fail('DUPLICATE_ID', `${path} contains duplicates.`);
};
const exactOrder = (ids: readonly string[], order: readonly string[], path: string): void => {
  unique(ids, `${path}.ids`);
  unique(order, `${path}.order`);
  const orderSet = new Set(order);
  if (ids.length !== order.length || ids.some((id) => !orderSet.has(id))) {
    fail('ORDER_MISMATCH', `${path} must enumerate every ID exactly once.`);
  }
};
const drawable = (width: number, height: number, margins: z.infer<typeof Margins>): void => {
  if (margins.left + margins.right >= width || margins.top + margins.bottom >= height) {
    fail('INVALID_REQUEST', 'Margins leave no drawable area.');
  }
};
const round3 = (value: number): number => {
  const rounded = Math.round((value + Number.EPSILON) * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const ordered = <T extends {id: string}>(items: readonly T[], order: readonly string[]): T[] => {
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((left, right) => rank.get(left.id)! - rank.get(right.id)!);
};
const warnings = (items: readonly {id: string; label: string}[]): string[] =>
  items
    .filter(({label}) => label.length > 48)
    .map(({id}) => `LABEL_BUDGET_EXCEEDED:${id}`)
    .sort();
const textProjection = (
  message: string,
  nonColorCue: string,
  rows: readonly (readonly string[])[],
): string =>
  [message, `Señal no cromática: ${nonColorCue}`, ...rows.map((row) => row.join(' | '))].join('\n');
const finalize = <T extends Record<string, unknown>>(unsigned: T): T & {outputSha256: string} => ({
  ...unsigned,
  outputSha256: hashCanonical(unsigned),
});

const buildMatrix = (value: unknown) => {
  rejectEmpty(value, ['sourceAtomIds', 'rows', 'columns', 'rowOrder', 'columnOrder', 'cells']);
  const request = parse(D3CategoricalMatrixRequestV1Schema, value);
  drawable(request.width, request.height, request.margins);
  unique(request.sourceAtomIds, 'sourceAtomIds');
  exactOrder(
    request.rows.map(({id}) => id),
    request.rowOrder,
    'rowOrder',
  );
  exactOrder(
    request.columns.map(({id}) => id),
    request.columnOrder,
    'columnOrder',
  );
  const rows = ordered(request.rows, request.rowOrder);
  const columns = ordered(request.columns, request.columnOrder);
  const rowRank = new Map(request.rowOrder.map((id, index) => [id, index]));
  const columnRank = new Map(request.columnOrder.map((id, index) => [id, index]));
  const cells = [...request.cells].sort(
    (left, right) =>
      rowRank.get(left.rowId)! - rowRank.get(right.rowId)! ||
      columnRank.get(left.columnId)! - columnRank.get(right.columnId)!,
  );
  const cellKeys = cells.map(({rowId, columnId}) => `${rowId}\u0000${columnId}`);
  unique(cellKeys, 'cells');
  if (cells.some(({rowId, columnId}) => !rowRank.has(rowId) || !columnRank.has(columnId))) {
    fail('UNKNOWN_ENDPOINT', 'A cell references an unknown row or column.');
  }
  if (cells.length !== rows.length * columns.length) {
    fail('CELL_MATRIX_INCOMPLETE', 'Every row/column pair requires exactly one cell.');
  }
  const normalized = {
    ...request,
    sourceAtomIds: [...request.sourceAtomIds].sort(),
    rows,
    columns,
    cells,
  };
  const x = scaleBand(request.columnOrder, [
    request.margins.left,
    request.width - request.margins.right,
  ])
    .paddingInner(0.08)
    .paddingOuter(0);
  const y = scaleBand(request.rowOrder, [
    request.margins.top,
    request.height - request.margins.bottom,
  ])
    .paddingInner(0.08)
    .paddingOuter(0);
  const rowLabels = new Map(rows.map(({id, label}) => [id, label]));
  const columnLabels = new Map(columns.map(({id, label}) => [id, label]));
  const table: D3SemanticTableV1 = {
    headers: ['row', 'column', 'state', 'label', 'marker'],
    rows: cells.map((cell) => [
      rowLabels.get(cell.rowId)!,
      columnLabels.get(cell.columnId)!,
      cell.state,
      cell.label,
      cell.marker,
    ]),
  };
  return finalize({
    schemaVersion: 'd3-geometry-result-v1' as const,
    adapterId: D3_ADAPTER_ID,
    adapterVersion: D3_ADAPTER_VERSION,
    requestId: request.requestId,
    kind: request.kind,
    inputSha256: hashCanonical(normalized),
    geometry: {
      kind: request.kind,
      cells: cells.map((cell) => ({
        ...cell,
        x: round3(x(cell.columnId)!),
        y: round3(y(cell.rowId)!),
        width: round3(x.bandwidth()),
        height: round3(y.bandwidth()),
      })),
    },
    semanticTable: table,
    equivalentText: textProjection(request.equivalentMessage, request.nonColorCue, table.rows),
    warnings: warnings([...rows, ...columns]),
    fallback: {
      kind: 'semantic_table' as const,
      reasonCode: 'D3_RENDERER_UNAVAILABLE' as const,
      table,
    },
  });
};

const buildSeries = (value: unknown) => {
  rejectEmpty(value, ['items', 'order']);
  rejectMissingMetric(value);
  const request = parse(D3QuantitativeSeriesRequestV1Schema, value);
  drawable(request.width, request.height, request.margins);
  if (
    request.datasetRef.ref.startsWith('/') ||
    request.datasetRef.ref.includes('\\') ||
    request.datasetRef.ref.split('/').includes('..') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(request.datasetRef.ref)
  ) {
    fail('UNSAFE_REFERENCE', 'datasetRef.ref must be repository-relative.');
  }
  exactOrder(
    request.items.map(({id}) => id),
    request.order,
    'order',
  );
  const items = ordered(request.items, request.order);
  const normalized = {...request, items};
  const [minimum, maximum] = extent(items, ({value: itemValue}) => itemValue);
  if (minimum === undefined || maximum === undefined) {
    return fail('DATASET_EMPTY', 'No comparable values.');
  }
  const domainMinimum = Math.min(minimum, 0);
  let domainMaximum = Math.max(maximum, 0);
  if (domainMinimum === 0 && domainMaximum === 0) domainMaximum = 1;
  const x = scaleBand(request.order, [request.margins.left, request.width - request.margins.right])
    .paddingInner(0.2)
    .paddingOuter(0);
  const y = scaleLinear(
    [domainMinimum, domainMaximum],
    [request.height - request.margins.bottom, request.margins.top],
  );
  const baselineY = round3(y(0));
  const path = line<{x: number; y: number}>()
    .x(({x: pointX}) => pointX)
    .y(({y: pointY}) => pointY)(
    items.map(({id, value: itemValue}) => ({
      x: round3(x(id)! + x.bandwidth() / 2),
      y: round3(y(itemValue)),
    })),
  );
  if (path === null) return fail('DATASET_EMPTY', 'A line path requires at least one item.');
  const table: D3SemanticTableV1 = {
    headers: ['id', 'label', 'value', 'unit', 'denominator', 'period', 'method'],
    rows: items.map(({id, label, value: itemValue}) => [
      id,
      label,
      String(itemValue),
      request.metric.unit,
      request.metric.denominator,
      request.metric.period,
      request.metric.method,
    ]),
  };
  const equivalentText = [
    request.equivalentMessage,
    `Señal no cromática: ${request.nonColorCue}`,
    `Claim: ${request.claimId}`,
    `Unidad: ${request.metric.unit}`,
    `Denominador: ${request.metric.denominator}`,
    `Periodo: ${request.metric.period}`,
    `Método: ${request.metric.method}`,
    ...items.map(({label, value: itemValue}) => `${label}: ${String(itemValue)}`),
  ].join('\n');
  return finalize({
    schemaVersion: 'd3-geometry-result-v1' as const,
    adapterId: D3_ADAPTER_ID,
    adapterVersion: D3_ADAPTER_VERSION,
    requestId: request.requestId,
    kind: request.kind,
    inputSha256: hashCanonical(normalized),
    geometry: {
      kind: request.kind,
      domain: [domainMinimum, domainMaximum] as const,
      baselineY,
      linePath: path,
      bars: items.map((item) => {
        const valueY = y(item.value);
        return {
          ...item,
          x: round3(x(item.id)!),
          y: round3(Math.min(valueY, y(0))),
          width: round3(x.bandwidth()),
          height: round3(Math.abs(valueY - y(0))),
        };
      }),
    },
    semanticTable: table,
    equivalentText,
    warnings: warnings(items),
    fallback: {
      kind: 'semantic_table' as const,
      reasonCode: 'D3_RENDERER_UNAVAILABLE' as const,
      table,
    },
  });
};

export const buildD3Geometry = (request: D3GeometryRequestV1) =>
  request.kind === 'categorical_matrix' ? buildMatrix(request) : buildSeries(request);
export type D3GeometryResultV1 = ReturnType<typeof buildD3Geometry>;

type HierarchyDatum = D3HierarchyRequestV1['nodes'][number] & {
  readonly children: readonly HierarchyDatum[];
};
export const buildD3HierarchyGeometry = (value: D3HierarchyRequestV1) => {
  rejectEmpty(value, ['sourceAtomIds', 'nodes']);
  const request = parse(D3HierarchyRequestV1Schema, value);
  drawable(request.width, request.height, request.margins);
  unique(request.sourceAtomIds, 'sourceAtomIds');
  unique(
    request.nodes.map(({id}) => id),
    'nodes',
  );
  const roots = request.nodes.filter(({parentId}) => parentId === null);
  if (roots.length !== 1) fail('TREE_ROOT_INVALID', 'Exactly one root is required.');
  const byId = new Map(request.nodes.map((node) => [node.id, node]));
  const orders = new Map<string, Set<number>>();
  for (const node of request.nodes) {
    if (node.parentId === null) continue;
    if (node.parentId === node.id) fail('TREE_CYCLE', `${node.id} cannot parent itself.`);
    if (!byId.has(node.parentId)) fail('TREE_PARENT_UNKNOWN', `${node.parentId} is unknown.`);
    const siblingOrders = orders.get(node.parentId) ?? new Set<number>();
    if (siblingOrders.has(node.order)) fail('TREE_ORDER_AMBIGUOUS', `Order ${node.order} repeats.`);
    siblingOrders.add(node.order);
    orders.set(node.parentId, siblingOrders);
  }
  const visited = new Map<string, 'active' | 'complete'>();
  const visit = (id: string): void => {
    if (visited.get(id) === 'active') fail('TREE_CYCLE', `Parent cycle includes ${id}.`);
    if (visited.get(id) === 'complete') return;
    visited.set(id, 'active');
    const parentId = byId.get(id)!.parentId;
    if (parentId !== null) visit(parentId);
    visited.set(id, 'complete');
  };
  for (const {id} of request.nodes) visit(id);
  const children = new Map<string, D3HierarchyRequestV1['nodes'][number][]>();
  for (const node of request.nodes) {
    if (node.parentId === null) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  const compare = (left: {id: string; order: number}, right: {id: string; order: number}) =>
    left.order - right.order || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  for (const list of children.values()) list.sort(compare);
  const nest = (id: string): HierarchyDatum => ({
    ...byId.get(id)!,
    children: (children.get(id) ?? []).map((node) => nest(node.id)),
  });
  const root = hierarchy<HierarchyDatum>(nest(roots[0]!.id), (node) => node.children).sort(
    (left, right) => compare(left.data, right.data),
  );
  const layout = tree<HierarchyDatum>().size([
    request.width - request.margins.left - request.margins.right,
    request.height - request.margins.top - request.margins.bottom,
  ])(root);
  const nodes = layout.descendants().map((node) => ({
    id: node.data.id,
    label: node.data.label,
    parentId: node.data.parentId,
    order: node.data.order,
    depth: node.depth,
    x: round3(request.margins.left + node.x),
    y: round3(request.margins.top + node.y),
  }));
  const geometryById = new Map(nodes.map((node) => [node.id, node]));
  const links = layout.links().map(({source, target}) => {
    const sourceNode = geometryById.get(source.data.id)!;
    const targetNode = geometryById.get(target.data.id)!;
    return {
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      sourceX: sourceNode.x,
      sourceY: sourceNode.y,
      targetX: targetNode.x,
      targetY: targetNode.y,
    };
  });
  const labels = new Map(nodes.map(({id, label}) => [id, label]));
  const table: D3SemanticTableV1 = {
    headers: ['id', 'label', 'parent', 'depth', 'order'],
    rows: nodes.map(({id, label, parentId, depth, order}) => [
      id,
      label,
      parentId === null ? 'ROOT' : labels.get(parentId)!,
      String(depth),
      String(order),
    ]),
  };
  const normalized = {
    ...request,
    sourceAtomIds: [...request.sourceAtomIds].sort(),
    nodes: nodes.map(({id, label, parentId, order}) => ({id, label, parentId, order})),
  };
  return finalize({
    schemaVersion: 'd3-hierarchy-result-v1' as const,
    adapterId: D3_ADAPTER_ID,
    adapterVersion: D3_ADAPTER_VERSION,
    requestId: request.requestId,
    inputSha256: hashCanonical(normalized),
    geometry: {kind: 'hierarchy_tree' as const, nodes, links},
    semanticTable: table,
    equivalentText: textProjection(request.equivalentMessage, request.nonColorCue, table.rows),
    warnings: warnings(nodes),
    fallback: {
      kind: 'adjacency_list' as const,
      reasonCode: 'D3_RENDERER_UNAVAILABLE' as const,
      table,
    },
  });
};
export type D3HierarchyResultV1 = ReturnType<typeof buildD3HierarchyGeometry>;

export const buildD3Interpolation = (value: D3InterpolationRequestV1) => {
  rejectEmpty(value, ['channels', 'order']);
  const request = parse(D3InterpolationRequestV1Schema, value);
  if (request.progress < 0 || request.progress > 1) {
    fail('INTERPOLATION_PROGRESS_INVALID', 'progress must be between zero and one.');
  }
  exactOrder(
    request.channels.map(({id}) => id),
    request.order,
    'order',
  );
  const channels = ordered(request.channels, request.order);
  const normalized = {...request, channels};
  const values = channels.map((channel) => ({
    id: channel.id,
    label: channel.label,
    value: round3(interpolateNumber(channel.start, channel.end)(request.progress)),
    geometryUnit: channel.geometryUnit,
    semanticRole: channel.semanticRole,
  }));
  const endpoint = request.progress < 0.5 ? ('start' as const) : ('end' as const);
  const equivalentText = [
    request.equivalentMessage,
    `Señal no cromática: ${request.nonColorCue}`,
    `Progreso geométrico explícito: ${String(request.progress)}`,
    ...values.map(
      ({label, value: itemValue, geometryUnit}) => `${label}: ${String(itemValue)} ${geometryUnit}`,
    ),
  ].join('\n');
  return finalize({
    schemaVersion: 'd3-interpolation-result-v1' as const,
    adapterId: D3_ADAPTER_ID,
    adapterVersion: D3_ADAPTER_VERSION,
    requestId: request.requestId,
    inputSha256: hashCanonical(normalized),
    progress: request.progress,
    clockMode: 'not_applicable' as const,
    values,
    equivalentText,
    fallback: {
      kind: 'snap_to_endpoint' as const,
      reasonCode: 'D3_RENDERER_UNAVAILABLE' as const,
      endpoint,
      values: channels.map((channel) => ({
        id: channel.id,
        value: endpoint === 'start' ? channel.start : channel.end,
      })),
    },
  });
};
export type D3InterpolationResultV1 = ReturnType<typeof buildD3Interpolation>;
