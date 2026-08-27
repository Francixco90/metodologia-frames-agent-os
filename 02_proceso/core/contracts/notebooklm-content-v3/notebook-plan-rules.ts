import type {z} from 'zod';

import type {NotebookOperationSchema} from '../notebooklm-os-v1.ts';
import type {NotebookPlanV2BaseSchema} from './notebook-plan.ts';

type Plan = z.infer<typeof NotebookPlanV2BaseSchema>;
type Context = z.RefinementCtx;
type Action = z.infer<typeof NotebookOperationSchema>;

const gateByAction = new Map<Action, Plan['operations'][number]['requiredGate']>([
  ['create', 'NLM_PLAN_APPROVED'],
  ['configure', 'NLM_PLAN_APPROVED'],
  ['curate', 'NLM_PLAN_APPROVED'],
  ['sync', 'NLM_SYNC_APPROVED'],
  ['studio', 'NLM_STUDIO_GENERATION_APPROVED'],
  ['share', 'NLM_SHARE_AUTHORIZED'],
  ['delete', 'NLM_DESTRUCTIVE_AUTHORIZED'],
  ['archive', 'NLM_DESTRUCTIVE_AUTHORIZED'],
]);
const readOnlyActions = new Set<Action>(['audit', 'ground', 'verify']);

const validateOperations = (value: Plan, context: Context): void => {
  const operationIds = value.operations.map(({operationId: id}) => id);
  if (new Set(operationIds).size !== operationIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['operations'],
      message: 'operationId must be unique.',
    });
  }
  const planned = new Set(value.sourceIds);
  for (const [index, operation] of value.operations.entries()) {
    if (operation.sourceIds.some((id) => !planned.has(id))) {
      context.addIssue({
        code: 'custom',
        path: ['operations', index, 'sourceIds'],
        message: 'Operation sourceIds must exist in the plan sourceIds.',
      });
    }
    if (operation.effect === 'READ_ONLY') {
      if (!readOnlyActions.has(operation.action) || operation.requiredGate !== null) {
        context.addIssue({
          code: 'custom',
          path: ['operations', index],
          message: 'READ_ONLY permits only audit, ground, or verify with no gate.',
        });
      }
      continue;
    }
    if (readOnlyActions.has(operation.action)) {
      context.addIssue({
        code: 'custom',
        path: ['operations', index, 'effect'],
        message: 'audit, ground, and verify must remain READ_ONLY.',
      });
    }
    const expectedGate =
      operation.effect === 'DESTRUCTIVE'
        ? 'NLM_DESTRUCTIVE_AUTHORIZED'
        : gateByAction.get(operation.action);
    if (expectedGate !== undefined && operation.requiredGate !== expectedGate) {
      context.addIssue({
        code: 'custom',
        path: ['operations', index, 'requiredGate'],
        message: `${operation.action}/${operation.effect} requires ${expectedGate}.`,
      });
    } else if (operation.effect === 'EXTERNAL_MUTATION' && operation.requiredGate === null) {
      context.addIssue({
        code: 'custom',
        path: ['operations', index, 'requiredGate'],
        message: 'Every EXTERNAL_MUTATION requires an explicit gate.',
      });
    }
  }
};

const validateSourcePacks = (value: Plan, context: Context): void => {
  const planned = new Set(value.sourceIds);
  if (value.activeSourceIds.some((id) => !planned.has(id))) {
    context.addIssue({
      code: 'custom',
      path: ['activeSourceIds'],
      message: 'Every active source must exist in sourceIds.',
    });
  }
  const batchIds = value.sourcePacks.map(({batchId}) => batchId);
  if (new Set(batchIds).size !== batchIds.length) {
    context.addIssue({code: 'custom', path: ['sourcePacks'], message: 'batchId must be unique.'});
  }
  const batchedSources = value.sourcePacks.flatMap(({sourceIds}) => sourceIds);
  if (new Set(batchedSources).size !== batchedSources.length) {
    context.addIssue({
      code: 'custom',
      path: ['sourcePacks'],
      message: 'A source may occur in only one batch.',
    });
  }
  if (value.activeSourceIds.some((id) => !batchedSources.includes(id))) {
    context.addIssue({
      code: 'custom',
      path: ['sourcePacks'],
      message: 'Every active source must be assigned to a source-pack batch.',
    });
  }
  if (
    batchedSources.length !== value.sourceIds.length ||
    value.sourceIds.some((id) => !batchedSources.includes(id))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['sourcePacks'],
      message: 'Every planned source must appear exactly once across source-pack batches.',
    });
  }
};

export const validateNotebookPlanV2 = (value: Plan, context: Context): void => {
  if (new Set(value.sourceIds).size !== value.sourceIds.length) {
    context.addIssue({code: 'custom', path: ['sourceIds'], message: 'sourceIds must be unique.'});
  }
  validateOperations(value, context);
  validateSourcePacks(value, context);
};
