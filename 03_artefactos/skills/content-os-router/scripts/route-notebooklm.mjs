import {routeNotebooklmV1} from '../../../../02_proceso/workflows/notebooklm-os/route-notebooklm-v1.ts';

export const routeNotebooklmIntent = () => {
  const plan = routeNotebooklmV1();
  return {
    plan,
    domainIntent: {
      schema_version: 'notebooklm-route-intent-v1',
      selected_stage_path: plan.workflowPlan,
      next_gate: 'NLM_PLAN_APPROVED',
    },
  };
};
