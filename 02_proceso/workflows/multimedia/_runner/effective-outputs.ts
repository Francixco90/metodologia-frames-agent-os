import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';

export const resolveEffectiveOutputs = (
  workflow: MultimediaWorkflow,
  selectedIds: readonly string[] | undefined,
): {passed: true; outputs: MultimediaWorkflow['outputs']} | {passed: false; detail: string} => {
  const conditional = workflow.outputs.some(({condition}) => condition !== undefined);
  if (conditional && selectedIds === undefined) {
    return {passed: false, detail: 'effective conditional output selection is absent'};
  }
  const ids =
    selectedIds ??
    workflow.outputs.filter(({required}) => required).map((item) => item.deliverable_id);
  const selected = new Set(ids);
  const known = new Set(workflow.outputs.map(({deliverable_id}) => deliverable_id));
  const required = workflow.outputs
    .filter(({required}) => required)
    .map(({deliverable_id}) => deliverable_id);
  if (
    selected.size !== ids.length ||
    ids.some((id) => !known.has(id)) ||
    required.some((id) => !selected.has(id))
  ) {
    return {
      passed: false,
      detail: 'effective outputs are duplicate, unknown or omit required output',
    };
  }
  return {
    passed: true,
    outputs: workflow.outputs.filter(({deliverable_id}) => selected.has(deliverable_id)),
  };
};
