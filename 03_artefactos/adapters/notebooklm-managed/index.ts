import type {
  NotebookPlanV1,
  NotebookProviderAdapter,
} from '../../../02_proceso/workflows/notebooklm-os/index.ts';

const REQUIRED_GATE: Partial<Record<NotebookPlanV1['operations'][number]['action'], string>> = {
  create: 'NLM_PLAN_APPROVED',
  configure: 'NLM_PLAN_APPROVED',
  curate: 'NLM_PLAN_APPROVED',
  sync: 'NLM_SYNC_APPROVED',
  studio: 'NLM_STUDIO_GENERATION_APPROVED',
  share: 'NLM_SHARE_AUTHORIZED',
  archive: 'NLM_DESTRUCTIVE_AUTHORIZED',
  delete: 'NLM_DESTRUCTIVE_AUTHORIZED',
};

export class NotebookLmManagedAdapter implements NotebookProviderAdapter {
  readonly adapterId = 'notebooklm-managed-v1' as const;
  constructor(readonly provider: 'notebooklm' | 'gemini-notebook') {}

  validatePlan(plan: NotebookPlanV1, approvals: readonly string[]) {
    const granted = new Set(approvals);
    const missingGates = [
      ...new Set(
        plan.operations.flatMap(({action, requiredGate}) => {
          const expected = REQUIRED_GATE[action];
          if (expected !== undefined && requiredGate !== expected) return [expected];
          return expected !== undefined && !granted.has(expected) ? [expected] : [];
        }),
      ),
    ].sort();
    return {allowed: missingGates.length === 0, missingGates};
  }
}
