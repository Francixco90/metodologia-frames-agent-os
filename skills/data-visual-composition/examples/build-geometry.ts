import {
  buildD3Geometry,
  type D3CategoricalMatrixRequestV1,
} from '../../../renderers/remotion/src/adapters/d3-adapter.ts';

const request = {
  schemaVersion: 'd3-geometry-request-v1',
  requestId: 'D3-EXAMPLE-001',
  kind: 'categorical_matrix',
  width: 320,
  height: 180,
  margins: {top: 12, right: 12, bottom: 12, left: 12},
  equivalentMessage: 'Una responsabilidad se compara contra una etapa.',
  nonColorCue: 'El estado conserva label y marker.',
  fallback: 'semantic_table',
  sourceAtomIds: ['ATM-example'],
  rows: [{id: 'row-agent', label: 'Agente'}],
  columns: [{id: 'col-decide', label: 'Decidir'}],
  rowOrder: ['row-agent'],
  columnOrder: ['col-decide'],
  cells: [
    {
      rowId: 'row-agent',
      columnId: 'col-decide',
      state: 'administra',
      label: 'Decisión',
      marker: 'A',
    },
  ],
} satisfies D3CategoricalMatrixRequestV1;

console.info(JSON.stringify(buildD3Geometry(request)));
