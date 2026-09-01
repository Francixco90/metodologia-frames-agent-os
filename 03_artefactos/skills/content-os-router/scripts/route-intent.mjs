#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {hashExperienceValue} from '../../../../02_proceso/core/contracts/experience-normalization.ts';
import {renderExperienceMenuV1, renderExperienceRouteV1} from '../../../../02_proceso/workflows/core/experience-command-view-v1.ts';
import {runFirstTurnGatewayV1} from '../../../../02_proceso/workflows/core/first-turn-gateway-v1.ts';
import {orchestrateLocalExperienceV1} from '../../../../02_proceso/workflows/core/local-experience-orchestrator-v1.ts';
import {assertContainedWorkspaceV1} from '../../../../02_proceso/workflows/core/safe-local-path-v1.ts';
import {routeLocalExtensionIntent} from '../../../../02_proceso/workflows/local-extensions/intent-router.ts';
import {routeMaintenanceIntent} from '../../../../02_proceso/workflows/maintenance/index.ts';
import {routeCareerIntent} from '../../career-application-orchestrator/scripts/route-career.mjs';
import {
  domainInputFor,
  gatewayDecisionInput,
  localDecisionInput,
  resolveResumeInput,
  renderTransportedExperience,
} from './decision-transport.mjs';
import {planFromDomain} from './domain-plan-transport.mjs';
import {routeNotebooklmIntent} from './route-notebooklm.mjs';
import {routeContentIntent} from './route-content.mjs';
const normalize = (value) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
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
    resume = resolveResumeInput(input);
  } catch {
    resumeError = 'RESUME_LINEAGE_UNVERIFIED';
  }
  const envelope = runFirstTurnGatewayV1({
    prompt: request,
    sensitivity: input.sensitivity ?? 'UNKNOWN',
    knownInputs: Array.isArray(input.knownInputs) ? input.knownInputs : [],
    activeProjectId: input.activeProjectId,
    ...gatewayDecisionInput(input),
    explicitRoute:
      normalize(input.intent_domain).toLowerCase() === 'content'
        ? 'R6'
        : normalize(input.intent_domain).toLowerCase() === 'career' ? 'R7'
          : normalize(input.intent_domain).toLowerCase() === 'local-extension' ? 'R8'
            : normalize(input.intent_domain).toLowerCase() === 'maintenance' ? 'R9'
              : normalize(input.intent_domain).toLowerCase() === 'notebooklm' ? 'R10' : undefined,
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
    R10: () => {
      const routed = routeNotebooklmIntent();
      domainIntent = routed.domainIntent;
      return routed.plan;
    },
  });
  const routeId = envelope.selectedRoute ?? 'R0';
  const adapterInvoked = domainIntent !== null && ['R6', 'R7', 'R8', 'R9', 'R10'].includes(routeId);
  const adapter = routeId === 'R7'
    ? 'career-application-orchestrator/scripts/route-career.mjs'
    : routeId === 'R6' ? 'content-os-router/scripts/route-content.mjs'
      : routeId === 'R8' ? 'workflows/local-extensions/intent-router.ts'
        : routeId === 'R9' ? 'workflows/maintenance/route-maintenance-v1.ts'
          : routeId === 'R10' ? 'workflows/notebooklm-os/route-notebooklm-v1.ts' : null;
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
    experience_envelope: envelope,
    experience_view: renderTransportedExperience(envelope, input),
    command_view: commandView, resume_error: resumeError,
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
    ...(decision.route_id === 'R6'
      ? {
          briefSources: Array.isArray(input.brief_sources) ? input.brief_sources : [],
          sourceAuthorityReceipts: Array.isArray(input.source_authority_receipts)
            ? input.source_authority_receipts : [],
        }
      : {}),
    ...localDecisionInput(input),
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
