import {resolveResumeCandidateV1} from '../../../../02_proceso/workflows/core/resume-lineage-resolver-v1.ts';
import {renderExperienceView} from '../../../../02_proceso/workflows/experience/render-experience-view.ts';

const CONTROL_FIELDS = new Set([
  'actor_id',
  'activeProjectId',
  'brief_sources',
  'completed_at',
  'completedAt',
  'decision_funnel',
  'decision_refs',
  'decision_selection',
  'intent_domain',
  'knownInputs',
  'output_directory_ref',
  'resumeCandidate',
  'resume_candidate',
  'resumeCandidateId',
  'resume_candidate_id',
  'sensitivity',
  'source_materials',
  'source_authority_receipts',
  'started_at',
  'startedAt',
  'stateRoot',
  'state_root',
  'workspaceRoot',
  'workspace_root',
]);

export const domainInputFor = (input) =>
  Object.fromEntries(Object.entries(input).filter(([key]) => !CONTROL_FIELDS.has(key)));

export const gatewayDecisionInput = (input) => ({
  decisionFunnel: input.decision_funnel,
  decisionSelection: input.decision_selection,
});

export const localDecisionInput = (input) => ({
  ...(input.decision_funnel && input.decision_selection
    ? {decision: {funnel: input.decision_funnel, selection: input.decision_selection}}
    : {}),
  ...(input.decision_refs ? {decisionRefs: input.decision_refs} : {}),
});

export const resolveResumeInput = (input) => {
  const stateRoot = input.state_root ?? input.stateRoot;
  const candidateId = input.resume_candidate_id ?? input.resumeCandidateId;
  if (!stateRoot || !candidateId) return undefined;
  const resolved = resolveResumeCandidateV1({stateRoot, candidateId});
  return {
    routeId: resolved.originRouteId,
    activeStep: resolved.activeStep,
    summary: resolved.summary,
    briefPreview: {
      briefKind: resolved.briefKind,
      summary: resolved.summary,
      materialized: true,
      canonicalRef: resolved.latestArtifact.ref,
    },
  };
};

export const renderTransportedExperience = (envelope, input) =>
  renderExperienceView(
    envelope,
    ['ROUTED', 'READY_FOR_BRIEF'].includes(envelope.state) ? input.decision_funnel : undefined,
    envelope.state === 'READY_FOR_BRIEF' ? input.decision_selection : undefined,
  );
