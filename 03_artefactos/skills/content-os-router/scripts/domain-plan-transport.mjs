const ROUTE_SKILLS = {
  R6: 'content-os-router',
  R7: 'career-application-orchestrator',
  R8: 'frames-local-extension-foundry',
  R9: 'frames-harness-maintainer',
};
const BRIEF_KINDS = {
  R6: 'content-brief',
  R7: 'career-brief',
  R8: 'local-extension-brief',
  R9: 'maintenance-brief',
};

export const planFromDomain = (routeId, domain) => {
  const workflowPlan = domain.selected_stage_path ?? domain.stage_path ?? [];
  const activeStep = workflowPlan[0];
  if (!activeStep) throw new Error(`${routeId}-DISPATCH: domain adapter returned no active step`);
  return {
    routeId,
    workflowPlan,
    activeStep,
    skillBindings: [
      {stepId: activeStep, primarySkillId: ROUTE_SKILLS[routeId] ?? 'content-os-router'},
    ],
    briefPreview: {
      briefKind: BRIEF_KINDS[routeId] ?? 'content-brief',
      ...(domain.brief_ref ? {canonicalRef: domain.brief_ref} : {}),
      summary: `Brief ${routeId} preparado para revisión.`,
      materialized: false,
    },
    blockingGaps: domain.blocking_questions ?? [],
    recommendedNextAction:
      domain.blocking_questions?.[0] ?? 'Revisar y aprobar el brief antes de producir.',
    ghostOptions: ['Ver ruta', 'Ajustar brief'],
  };
};
