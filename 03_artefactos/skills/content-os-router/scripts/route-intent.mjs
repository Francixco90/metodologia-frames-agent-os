#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {hashExperienceValue} from '../../../../02_proceso/core/contracts/index.ts';
import {runFirstTurnGatewayV1} from '../../../../02_proceso/workflows/core/index.ts';
import {routeCareerIntent} from '../../career-application-orchestrator/scripts/route-career.mjs';
import {routeContentIntent} from './route-content.mjs';

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ');

const resumeCandidate = (input) => {
  const value = input.resumeCandidate ?? input.resume_candidate;
  if (!value) return undefined;
  return {
    routeId: value.routeId ?? value.route_id ?? 'R0',
    activeStep: value.activeStep ?? value.active_step,
    summary: value.summary,
    briefPreview: value.briefPreview ?? value.brief_preview,
  };
};

const planFromDomain = (routeId, domain) => {
  const workflowPlan = domain.selected_stage_path ?? [];
  const activeStep = workflowPlan[0];
  if (!activeStep) throw new Error(`${routeId}-DISPATCH: domain adapter returned no active step`);
  return {
    routeId,
    workflowPlan,
    activeStep,
    skillBindings: [
      {
        stepId: activeStep,
        primarySkillId: routeId === 'R7' ? 'career-application-orchestrator' : 'content-os-router',
      },
    ],
    briefPreview: {
      briefKind: routeId === 'R7' ? 'career-brief' : 'content-brief',
      ...(domain.brief_ref ? {canonicalRef: domain.brief_ref} : {}),
      summary: `Brief ${routeId} preparado para revisión.`,
      materialized: false,
    },
    blockingGaps: domain.blocking_questions ?? [],
    recommendedNextAction:
      (domain.blocking_questions?.length ?? 0) > 0
        ? domain.blocking_questions[0]
        : 'Revisar y aprobar el brief antes de producir.',
    ghostOptions: ['Ver ruta', 'Ajustar brief'],
  };
};

export const dispatchIntent = (input) => {
  const request = normalize(input.request);
  if (!request) throw new Error('INTENT-DISPATCH-001 request is required');
  let domainIntent = null;
  const envelope = runFirstTurnGatewayV1(
    {
      prompt: request,
      sensitivity: input.sensitivity ?? 'UNKNOWN',
      knownInputs: Array.isArray(input.knownInputs) ? input.knownInputs : [],
      activeProjectId: input.activeProjectId,
      explicitRoute:
        normalize(input.intent_domain).toLowerCase() === 'content'
          ? 'R6'
          : normalize(input.intent_domain).toLowerCase() === 'career'
            ? 'R7'
            : undefined,
      resumeCandidate: resumeCandidate(input),
    },
    {
      R6: () => {
        domainIntent = routeContentIntent({...input, request});
        return planFromDomain('R6', domainIntent);
      },
      R7: () => {
        domainIntent = routeCareerIntent({...input, request});
        return planFromDomain('R7', domainIntent);
      },
    },
  );
  const routeId = envelope.selectedRoute ?? 'R0';
  const adapterInvoked = domainIntent !== null && (routeId === 'R6' || routeId === 'R7');
  const adapter =
    routeId === 'R7'
      ? 'career-application-orchestrator/scripts/route-career.mjs'
      : routeId === 'R6'
        ? 'content-os-router/scripts/route-content.mjs'
        : null;
  const nextGate = domainIntent?.next_gate ?? routeId;
  const decision = domainIntent?.decision ?? (envelope.interactionClass === 'ASSIST_ONLY' ? 'ASSIST_ONLY' : envelope.state === 'RESUMABLE' ? 'ROUTED' : 'NEEDS_INPUT');
  return {
    schema_version: 'frames-route-decision-v1',
    request_hash: envelope.requestHash,
    route_id: routeId,
    adapter,
    next_gate: nextGate,
    decision,
    adapter_invoked: adapterInvoked,
    domain_intent: domainIntent,
    experience_envelope: envelope,
    launch_probe: {
      schema_version: 'frames-launch-probe-v1',
      gateway_invoked: true,
      adapter_invoked: adapterInvoked,
      local_only: true,
      external_effects: false,
      route_id: routeId,
      envelope_hash: hashExperienceValue(envelope),
    },
  };
};

export const routeIntent = (input) => dispatchIntent(input);

const invoked = process.argv[1]?.endsWith('route-intent.mjs');
if (invoked) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: route-intent.mjs <request.json>');
  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  process.stdout.write(`${JSON.stringify(dispatchIntent(input), null, 2)}\n`);
}
