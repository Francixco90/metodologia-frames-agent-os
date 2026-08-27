import type {GatewayRouteHandlerV1, GatewayRoutePlanV1} from '../core/gateway-route-outcome-v1.ts';

export type NotebooklmRouteProfileV1 = 'generic' | 'brand-content';

const genericBindings: GatewayRoutePlanV1['skillBindings'] = [
  {stepId: 'N00', primarySkillId: 'notebooklm-os-router'},
  {stepId: 'N02', primarySkillId: 'notebooklm-profile-compiler'},
  {stepId: 'N03', primarySkillId: 'notebooklm-source-curator'},
  {stepId: 'N07', primarySkillId: 'notebooklm-studio-director'},
  {
    stepId: 'N08',
    primarySkillId: 'notebooklm-artifact-verifier',
    verifierSkillId: 'notebooklm-sharing-guardian',
  },
];

const brandBindings: GatewayRoutePlanV1['skillBindings'] = [
  {stepId: 'N00', primarySkillId: 'notebooklm-os-router'},
  {stepId: 'N01', primarySkillId: 'notebooklm-brand-intake'},
  {stepId: 'N02', primarySkillId: 'notebooklm-profile-compiler'},
  {stepId: 'N03', primarySkillId: 'notebooklm-brand-kit-compiler'},
  {stepId: 'N04', primarySkillId: 'notebooklm-os-router'},
  {stepId: 'N05', primarySkillId: 'notebooklm-source-curator'},
  {stepId: 'N06', primarySkillId: 'notebooklm-brand-verifier'},
  {stepId: 'N07', primarySkillId: 'notebooklm-brand-content-director'},
  {
    stepId: 'N08',
    primarySkillId: 'notebooklm-artifact-verifier',
    verifierSkillId: 'notebooklm-brand-verifier',
  },
  {stepId: 'N09', primarySkillId: 'notebooklm-sharing-guardian'},
];

const buildRoute = (profile: NotebooklmRouteProfileV1): GatewayRoutePlanV1 => ({
  routeId: 'R10',
  workflowPlan: ['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09'],
  activeStep: 'N00',
  skillBindings: profile === 'brand-content' ? brandBindings : genericBindings,
  briefPreview: {
    briefKind: 'notebook-plan-v1',
    canonicalRef: '02_proceso/workflows/notebooklm-os/README.md',
    summary:
      profile === 'brand-content'
        ? 'Plan de marca N00-N09 sin mutación; perfil y efectos esperan gates separados.'
        : 'Plan N00-N09 sin mutación; creación, Studio, sync y sharing esperan sus gates.',
    materialized: false,
  },
  recommendedNextAction:
    profile === 'brand-content'
      ? 'Completar intake y evidencia antes de aprobar el perfil.'
      : 'Completar N00 y auditar en N01 antes de solicitar NLM_PLAN_APPROVED.',
});

const brandIntent = /\b(?:brand|branding|brand-ready|marca|voz de marca|contenido de marca)\b/iu;

/** Generic routing is the default; natural-language brand intent selects the explicit branch. */
export const routeNotebooklmV1 = (
  input?: Parameters<GatewayRouteHandlerV1>[0],
): GatewayRoutePlanV1 =>
  buildRoute(input !== undefined && brandIntent.test(input.prompt) ? 'brand-content' : 'generic');

export const routeBrandNotebooklmV1 = (): GatewayRoutePlanV1 => buildRoute('brand-content');
