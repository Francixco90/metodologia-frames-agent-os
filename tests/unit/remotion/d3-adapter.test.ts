import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  buildD3Geometry,
  buildD3HierarchyGeometry,
  buildD3Interpolation,
  D3AdapterError,
  type D3CategoricalMatrixRequestV1,
  type D3GeometryRequestV1,
  type D3HierarchyRequestV1,
  type D3InterpolationRequestV1,
  type D3QuantitativeSeriesRequestV1,
} from '../../../renderers/remotion/src/adapters/d3-adapter.ts';

const fixtureRoot = resolve(process.cwd(), 'skills/data-visual-composition/fixtures');
const load = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(fixtureRoot, path), 'utf8')) as T;

const matrix = load<D3CategoricalMatrixRequestV1>('positive/categorical-matrix.json');
const series = load<D3QuantitativeSeriesRequestV1>('positive/quantitative-series.json');
const hierarchyTree = load<D3HierarchyRequestV1>('positive/hierarchy-tree.json');
const interpolation = load<D3InterpolationRequestV1>('positive/interpolation.json');

const expectAdapterCode = (run: () => unknown, code: string): void => {
  try {
    run();
    throw new Error('Expected D3 adapter to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(D3AdapterError);
    expect((error as D3AdapterError).code).toBe(code);
  }
};

const expectCode = (request: D3GeometryRequestV1, code: string): void =>
  expectAdapterCode(() => buildD3Geometry(request), code);

describe('deterministic D3/SVG adapter', () => {
  it('normalizes a categorical matrix by authored orders and emits the same semantic fallback', () => {
    const shuffled: D3CategoricalMatrixRequestV1 = {
      ...matrix,
      rows: [...matrix.rows].reverse(),
      columns: [...matrix.columns].reverse(),
      cells: [...matrix.cells].reverse(),
    };

    const first = buildD3Geometry(matrix);
    const second = buildD3Geometry(shuffled);

    expect(second).toEqual(first);
    expect(first.semanticTable.rows).toHaveLength(6);
    expect(first.semanticTable.rows[0]).toEqual([
      'Agente',
      'Decidir',
      'administra',
      'Decisión',
      'A',
    ]);
    expect(first.fallback.table).toEqual(first.semanticTable);
    expect(first.outputSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('preserves quantitative semantics, a zero baseline, negatives, ties and the outlier', () => {
    const result = buildD3Geometry(series);

    expect(result.geometry.kind).toBe('quantitative_series');
    if (result.geometry.kind !== 'quantitative_series') throw new Error('Unexpected geometry.');
    expect(result.geometry.domain).toEqual([-2, 25]);
    expect(result.geometry.bars.map(({value}) => value)).toEqual([-2, 0, 4, 4, 25]);
    expect(result.geometry.linePath).toMatch(/^M/u);
    expect(result.equivalentText).toContain('Unidad: casos');
    expect(result.equivalentText).toContain('Denominador: cinco fixtures');
    expect(result.equivalentText).toContain('Periodo: fixture estático H-03');
    expect(result.equivalentText).toContain('Método: valores first-party');
  });

  it('keeps long copy intact and reports a deterministic layout warning', () => {
    const longLabel = 'Etiqueta extensa que debe preservarse completa para recomposición posterior';
    const request: D3QuantitativeSeriesRequestV1 = {
      ...series,
      items: series.items.map((item, index) => (index === 0 ? {...item, label: longLabel} : item)),
    };
    const result = buildD3Geometry(request);

    expect(result.warnings).toContain('LABEL_BUDGET_EXCEEDED:tie-b');
    expect(result.equivalentText).toContain(longLabel);
  });

  it('fails closed for empty data, missing metrics, non-finite values and incomplete order', () => {
    expectCode(load('hostile/empty-series.json'), 'DATASET_EMPTY');
    expectCode(load('hostile/missing-denominator.json'), 'METRIC_BINDING_MISSING');

    const nonFinite: D3QuantitativeSeriesRequestV1 = {
      ...series,
      items: series.items.map((item, index) =>
        index === 0 ? {...item, value: Number.POSITIVE_INFINITY} : item,
      ),
    };
    expectCode(nonFinite, 'NON_FINITE_VALUE');

    const incompleteOrder: D3QuantitativeSeriesRequestV1 = {
      ...series,
      order: series.order.slice(0, -1),
    };
    expectCode(incompleteOrder, 'ORDER_MISMATCH');
  });

  it('rejects unsafe locators and unknown fields instead of ignoring them', () => {
    const unsafe: D3QuantitativeSeriesRequestV1 = {
      ...series,
      datasetRef: {...series.datasetRef, ref: 'https://example.com/data.json'},
    };
    expectCode(unsafe, 'UNSAFE_REFERENCE');

    const unknown = {...series, surprise: true} as unknown as D3QuantitativeSeriesRequestV1;
    expectCode(unknown, 'UNKNOWN_FIELD');
  });

  it('uses d3-hierarchy for a stable tree with an equivalent adjacency fallback', () => {
    const shuffled: D3HierarchyRequestV1 = {
      ...hierarchyTree,
      nodes: [...hierarchyTree.nodes].reverse(),
    };

    const first = buildD3HierarchyGeometry(hierarchyTree);
    const second = buildD3HierarchyGeometry(shuffled);

    expect(second).toEqual(first);
    expect(first.geometry.nodes.map(({id}) => id)).toEqual([
      'method',
      'agents',
      'workflows',
      'guardian',
      'plugins',
    ]);
    expect(first.geometry.links).toHaveLength(4);
    expect(first.semanticTable.rows).toContainEqual(['guardian', 'Guardian', 'Agentes', '2', '0']);
    expect(first.fallback.table).toEqual(first.semanticTable);
    expect(first.equivalentText).toContain('Guardian | Agentes | 2 | 0');
    expect(first.outputSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('rejects hierarchy cycles and ambiguous sibling order before layout', () => {
    const cycle = load<D3HierarchyRequestV1>('hostile/hierarchy-cycle.json');
    expectAdapterCode(() => buildD3HierarchyGeometry(cycle), 'TREE_CYCLE');

    const ambiguous: D3HierarchyRequestV1 = {
      ...hierarchyTree,
      nodes: hierarchyTree.nodes.map((node) =>
        node.id === 'workflows' ? {...node, order: 0} : node,
      ),
    };
    expectAdapterCode(() => buildD3HierarchyGeometry(ambiguous), 'TREE_ORDER_AMBIGUOUS');
  });

  it('uses d3-interpolate with explicit progress and no implicit clock', () => {
    const shuffled: D3InterpolationRequestV1 = {
      ...interpolation,
      channels: [...interpolation.channels].reverse(),
    };

    const first = buildD3Interpolation(interpolation);
    const second = buildD3Interpolation(shuffled);

    expect(second).toEqual(first);
    expect(first.clockMode).toBe('not_applicable');
    expect(first.values).toEqual([
      {
        id: 'position-x',
        label: 'Posición X',
        value: 25,
        geometryUnit: 'px',
        semanticRole: 'geometry_only',
      },
      {
        id: 'rotation-z',
        label: 'Rotación Z',
        value: -45,
        geometryUnit: 'degrees',
        semanticRole: 'geometry_only',
      },
    ]);
    expect(first.fallback.endpoint).toBe('start');
    expect(first.equivalentText).toContain('Progreso geométrico explícito: 0.25');
    expect(first.outputSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('rejects interpolation outside the explicit progress domain', () => {
    const invalid = load<D3InterpolationRequestV1>('hostile/interpolation-out-of-range.json');
    expectAdapterCode(() => buildD3Interpolation(invalid), 'INTERPOLATION_PROGRESS_INVALID');
  });

  it('contains no DOM, network, timer, random or transition surface', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'renderers/remotion/src/adapters/d3-adapter.ts'),
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
      expect(source).not.toContain(prohibited);
    }
    expect(source).toContain("from 'd3-hierarchy'");
    expect(source).toContain("from 'd3-interpolate'");
  });
});
