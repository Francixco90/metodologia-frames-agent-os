import type {GatewayRoutePlanV1} from '../core/gateway-route-outcome-v1.ts';

export const routeNotebooklmV1 = (): GatewayRoutePlanV1 => ({
  routeId: 'R10',
  workflowPlan: ['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09'],
  activeStep: 'N00',
  skillBindings: [
    {stepId: 'N00', primarySkillId: 'notebooklm-os-router'},
    {stepId: 'N02', primarySkillId: 'notebooklm-profile-compiler'},
    {stepId: 'N03', primarySkillId: 'notebooklm-source-curator'},
    {stepId: 'N07', primarySkillId: 'notebooklm-studio-director'},
    {
      stepId: 'N08',
      primarySkillId: 'notebooklm-artifact-verifier',
      verifierSkillId: 'notebooklm-sharing-guardian',
    },
  ],
  briefPreview: {
    briefKind: 'notebook-plan-v1',
    canonicalRef: '02_proceso/workflows/notebooklm-os/README.md',
    summary: 'Plan N00-N09 sin mutación; creación, Studio, sync y sharing esperan sus gates.',
    materialized: false,
  },
  recommendedNextAction: 'Completar N00 y auditar en N01 antes de solicitar NLM_PLAN_APPROVED.',
});
