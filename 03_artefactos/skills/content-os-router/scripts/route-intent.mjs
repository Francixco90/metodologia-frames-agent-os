#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {hashExperienceValue} from '../../../../02_proceso/core/contracts/index.ts';
import {
  orchestrateLocalExperienceV1,
  renderExperienceMenuV1,
  renderExperienceRouteV1,
  resolveResumeCandidateV1,
  runFirstTurnGatewayV1,
} from '../../../../02_proceso/workflows/core/index.ts';
import {assertContainedWorkspaceV1} from '../../../../02_proceso/workflows/core/safe-local-path-v1.ts';
import {routeLocalExtensionIntent} from '../../../../02_proceso/workflows/local-extensions/index.ts';
import {routeMaintenanceIntent} from '../../../../02_proceso/workflows/maintenance/index.ts';
import {routeCareerIntent} from '../../career-application-orchestrator/scripts/route-career.mjs';
import {routeContentIntent} from './route-content.mjs';
const normalize = (value) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
const CONTROL_FIELDS = new Set([
  'actor_id', 'activeProjectId', 'completed_at', 'completedAt', 'intent_domain', 'knownInputs',
  'output_directory_ref', 'resumeCandidate', 'resume_candidate', 'resumeCandidateId',
  'resume_candidate_id', 'sensitivity', 'source_materials', 'started_at', 'startedAt',
  'stateRoot', 'state_root', 'workspaceRoot', 'workspace_root',
]);
const domainInputFor = (input) => Object.fromEntries(
  Object.entries(input).filter(([key]) => !CONTROL_FIELDS.has(key)),
);
const resolveResume = (input) => {
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
const planFromDomain = (routeId, domain) => {
  const workflowPlan = domain.selected_stage_path ?? domain.stage_path ?? [];
  const activeStep = workflowPlan[0];
  if (!activeStep) throw new Error(`${routeId}-DISPATCH: domain adapter returned no active step`);
  return {
    routeId,
    workflowPlan,
    activeStep,
    skillBindings: [{
      stepId: activeStep,
      primarySkillId:
        routeId === 'R7' ? 'career-application-orchestrator'
          : routeId === 'R8' ? 'frames-local-extension-foundry'
            : routeId === 'R9' ? 'frames-harness-maintainer' : 'content-os-router',
    }],
    briefPreview: {
      briefKind:
        routeId === 'R7' ? 'career-brief'
          : routeId === 'R8' ? 'local-extension-brief'
            : routeId === 'R9' ? 'maintenance-brief' : 'content-brief',
      ...(domain.brief_ref ? {canonicalRef: domain.brief_ref} : {}),
      summary: `Brief ${routeId} preparado para revisión.`,
      materialized: false,
    },
    blockingGaps: domain.blocking_questions ?? [],
    recommendedNextAction: domain.blocking_questions?.[0] ?? 'Revisar y aprobar el brief antes de producir.',
    ghostOptions: ['Ver ruta', 'Ajustar brief'],
  };
};
export const dispatchIntent = (input) => {
  const rawRequest = normalize(input.request);
  if (!rawRequest) throw new Error('INTENT-DISPATCH-001 request is required');
  const routeCommand = rawRequest === '/ruta' || rawRequest.startsWith('/ruta ');
  const menuCommand = rawRequest === '/menu';
  const request = routeCommand ? normalize(rawRequest.slice(5)) || 'Necesito ayuda' : rawRequest;
  const domainInput = domainInputFor(input);
  let domainIntent = null;
  let resume;
  let resumeError = null;
  try {
    resume = resolveResume(input);
  } catch {
    resumeError = 'RESUME_LINEAGE_UNVERIFIED';
  }
  const envelope = runFirstTurnGatewayV1({
    prompt: request,
    sensitivity: input.sensitivity ?? 'UNKNOWN',
    knownInputs: Array.isArray(input.knownInputs) ? input.knownInputs : [],
    activeProjectId: input.activeProjectId,
    explicitRoute:
      normalize(input.intent_domain).toLowerCase() === 'content'
        ? 'R6'
        : normalize(input.intent_domain).toLowerCase() === 'career' ? 'R7'
          : normalize(input.intent_domain).toLowerCase() === 'local-extension' ? 'R8'
            : normalize(input.intent_domain).toLowerCase() === 'maintenance' ? 'R9' : undefined,
    resumeCandidate: resume,
  }, {
    R6: () => {
      domainIntent = routeContentIntent({...domainInput, request});
      return planFromDomain('R6', domainIntent);
    },
    R7: () => {
      domainIntent = routeCareerIntent({...domainInput, request});
      return planFromDomain('R7', domainIntent);
    },
    R8: () => {
      domainIntent = routeLocalExtensionIntent({...domainInput, request});
      return planFromDomain('R8', domainIntent);
    },
    R9: () => {
      domainIntent = routeMaintenanceIntent({...domainInput, request});
      return planFromDomain('R9', domainIntent);
    },
  });
  const routeId = envelope.selectedRoute ?? 'R0';
  const adapterInvoked = domainIntent !== null && ['R6', 'R7', 'R8', 'R9'].includes(routeId);
  const adapter = routeId === 'R7'
    ? 'career-application-orchestrator/scripts/route-career.mjs'
    : routeId === 'R6' ? 'content-os-router/scripts/route-content.mjs'
      : routeId === 'R8' ? 'workflows/local-extensions/intent-router.ts'
        : routeId === 'R9' ? 'workflows/maintenance/route-maintenance-v1.ts' : null;
  const decision = {
    ASSISTING: 'ASSIST_ONLY', ROUTED: 'AWAITING_SELECTION',
    READY_FOR_BRIEF: 'READY_FOR_BRIEF', RESUMABLE: 'ROUTED', BLOCKED: 'NEEDS_INPUT',
  }[envelope.state];
  const nextGate = ['ROUTED', 'BLOCKED'].includes(envelope.state)
    ? null : domainIntent?.next_gate ?? routeId;
  const coverageGap = envelope.state === 'BLOCKED'
    ? envelope.blockingGaps.join(' | ') || 'EXPERIENCE-ENVELOPE-BLOCKED'
    : null;
  const commandView = menuCommand
    ? renderExperienceMenuV1()
    : routeCommand ? renderExperienceRouteV1(envelope, nextGate ?? decision) : null;
  return {
    schema_version: 'frames-route-decision-v1', request_hash: envelope.requestHash,
    route_id: routeId, adapter, next_gate: nextGate, decision, coverage_gap: coverageGap,
    adapter_invoked: adapterInvoked, domain_intent: domainIntent,
    experience_envelope: envelope, command_view: commandView, resume_error: resumeError,
    launch_probe: {
      schema_version: 'frames-launch-probe-v1', gateway_invoked: true,
      adapter_invoked: adapterInvoked, local_only: true, external_effects: false,
      route_id: routeId, envelope_hash: hashExperienceValue(envelope),
    },
  };
};
export const routeIntent = (input) => dispatchIntent(input);
export const dispatchIntentLocal = async (input, {authorizedRoot} = {}) => {
  const decision = dispatchIntent(input);
  if (decision.command_view || !decision.domain_intent || decision.experience_envelope.state !== 'READY_FOR_BRIEF') {
    return {...decision, local_execution: {
      status: 'NEEDS_INPUT', materialized: false, next_gate: decision.next_gate,
      coverage_gap: decision.coverage_gap,
    }};
  }
  if (decision.route_id === 'R8' || decision.route_id === 'R9') {
    return {...decision, local_execution: {
      status: 'AWAITING_APPROVAL', materialized: false,
      next_gate: decision.route_id === 'R8' ? 'LX_BRIEF_APPROVED' : 'HM_CHANGE_APPROVED',
      coverage_gap: null,
    }};
  }
  const root = input.workspace_root ?? input.workspaceRoot;
  const startedAt = input.started_at ?? input.startedAt;
  const completedAt = input.completed_at ?? input.completedAt;
  if (!root || !startedAt || !completedAt) return {...decision, local_execution: {
    status: 'BLOCKED', materialized: false, next_gate: 'EXP_BRIEF_APPROVED',
    coverage_gap: 'Explicit workspace root and invocation timestamps are required.',
  }};
  if (!authorizedRoot) return {...decision, local_execution: {
    status: 'BLOCKED', materialized: false, next_gate: 'EXP_BRIEF_APPROVED',
    coverage_gap: 'An authorized workspace boundary is required.',
  }};
  let safeRoot;
  try {
    safeRoot = assertContainedWorkspaceV1(authorizedRoot, root);
  } catch (error) {
    return {...decision, local_execution: {
      status: 'BLOCKED', materialized: false, next_gate: 'EXP_BRIEF_APPROVED',
      coverage_gap: error instanceof Error ? error.message : 'FRAMES-WORKSPACE-PATH001',
    }};
  }
  if (decision.route_id !== 'R6' && decision.route_id !== 'R7') return decision;
  const localExecution = await orchestrateLocalExperienceV1({
    root: safeRoot, routeId: decision.route_id, envelope: decision.experience_envelope,
    domainIntent: decision.route_id === 'R6' ? decision.domain_intent : domainInputFor(input),
    sourceMaterials: Array.isArray(input.source_materials) ? input.source_materials : [],
    ...(input.output_directory_ref ? {outputDirectoryRef: input.output_directory_ref} : {}),
    actorId: input.actor_id ?? 'RT-04-EXPERIENCE', startedAt, completedAt,
  });
  return {...decision, local_execution: localExecution};
};
if (process.argv[1]?.endsWith('route-intent.mjs')) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: route-intent.mjs <request.json>');
  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  process.stdout.write(`${JSON.stringify(await dispatchIntentLocal(input, {authorizedRoot: process.cwd()}), null, 2)}\n`);
}
