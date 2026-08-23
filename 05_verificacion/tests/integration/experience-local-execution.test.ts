import {mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {orchestrateLocalExperienceV1, runFirstTurnGatewayV1} from 'workflows/core/index.ts';

import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

type LocalDecision = {
  decision: string;
  request_hash: string;
  route_id: string;
  next_gate: string;
  adapter_invoked: boolean;
  domain_intent: null | Record<string, unknown>;
  experience_envelope: {state: string; effects: string[]};
  experience_view: {components: Array<{kind: string; data: Record<string, unknown>}>};
  command_view: null | {command: string; readOnly: boolean; effects: []};
  launch_probe: {local_only: boolean; external_effects: boolean};
  local_execution: {
    status: string;
    materialized: boolean;
    nextGate?: string;
    next_gate?: string;
    receiptRef?: string;
    receiptSha256?: string;
    brief?: null | {markdownRef: string; htmlRef: string};
  };
};

let dispatchIntentLocal: (
  input: Record<string, unknown>,
  options: {authorizedRoot: string},
) => Promise<LocalDecision>;
let dispatchIntent: (input: Record<string, unknown>) => LocalDecision;
const roots: string[] = [];
const timestamps = {
  started_at: '2026-08-09T12:00:00.000Z',
  completed_at: '2026-08-09T12:00:01.000Z',
};

beforeAll(async () => {
  const module = (await import(
    pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
  )) as {
    dispatchIntent: typeof dispatchIntent;
    dispatchIntentLocal: typeof dispatchIntentLocal;
  };
  dispatchIntent = module.dispatchIntent;
  dispatchIntentLocal = module.dispatchIntentLocal;
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

const workspace = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-local-experience-'));
  roots.push(root);
  return root;
};

const completeInputs = (route: 'R6' | 'R7', root: string): Record<string, unknown> =>
  route === 'R6'
    ? {
        request: 'Ayúdame a generar una pieza',
        intent_domain: 'content',
        audience: 'Líderes de producto',
        outcome: 'Comprender una decisión responsable',
        source: {type: 'brief', authority: 'verified', ref: 'source://synthetic'},
        workspace_root: root,
        output_directory_ref: 'work/private/experience/content',
        ...timestamps,
      }
    : {
        request: 'Créame un CV',
        intent_domain: 'career',
        candidateId: 'CAND-SYNTHETIC',
        targetRole: 'Data Engineering Lead',
        language: 'es',
        profileReady: true,
        evidenceReady: true,
        workspace_root: root,
        output_directory_ref: 'work/private/experience/career',
        ...timestamps,
      };

const selectedLocalInput = (
  root: string,
  aliasRefs = false,
  outputDirectoryRef = 'work/private/experience/content',
) => {
  const prompt = 'Ayúdame a generar una pieza';
  const handler = () => ({
    routeId: 'R6' as const,
    workflowPlan: ['P03'],
    activeStep: 'P03',
    skillBindings: [{stepId: 'P03', primarySkillId: 'content-os-creative'}],
    briefPreview: {briefKind: 'content-brief', summary: 'Brief sintético.', materialized: false},
    recommendedNextAction: 'Revisar y aprobar el brief.',
  });
  const requestHash = runFirstTurnGatewayV1({prompt}, {R6: handler, R7: handler}).requestHash;
  const decision = materializeDecisionFunnelFixture(requestHash);
  const envelope = runFirstTurnGatewayV1(
    {prompt, decisionFunnel: decision.funnel, decisionSelection: decision.selection},
    {R6: handler, R7: handler},
  );
  const funnelRef = 'evidence/decision-funnel.json';
  return {
    root,
    routeId: 'R6' as const,
    envelope,
    decision,
    decisionRefs: {
      funnel: {ref: funnelRef, sha256: decision.funnel.canonicalSha256},
      selection: {
        ref: aliasRefs ? 'evidence/./decision-funnel.json' : 'evidence/decision-selection.json',
        sha256: decision.selection.canonicalSha256,
      },
    },
    sourceMaterials: [],
    outputDirectoryRef,
    actorId: 'RT-04-EXPERIENCE',
    startedAt: timestamps.started_at,
    completedAt: timestamps.completed_at,
    domainIntent: {
      request: prompt,
      request_hash: requestHash,
      content_class: 'educational',
      audience: 'Líderes de producto',
      outcome: 'Comprender una decisión responsable',
      selected_stage_path: ['P03'],
      channels: ['web'],
      restrictions: [],
    },
  };
};

const selectedRouterInputs = (route: 'R6' | 'R7', root: string, selected = true) => {
  const base = completeInputs(route, root);
  const decision = materializeDecisionFunnelFixture(dispatchIntent(base).request_hash);
  return {
    ...base,
    decision_funnel: decision.funnel,
    ...(selected ? {decision_selection: decision.selection} : {}),
    decision_refs: {
      funnel: {ref: 'evidence/decision-funnel.json', sha256: decision.funnel.canonicalSha256},
      selection: {
        ref: 'evidence/decision-selection.json',
        sha256: decision.selection.canonicalSha256,
      },
    },
  };
};

describe('Frames local brief-first execution', () => {
  it('materializes only after a fully bound human selection', async () => {
    const root = workspace();
    const result = await orchestrateLocalExperienceV1(selectedLocalInput(root));
    expect(result).toMatchObject({status: 'AWAITING_APPROVAL', materialized: true});
    expect(readdirSync(resolve(root, 'work/private/experience/content'))).toEqual([
      'brief.html',
      'brief.md',
      'invocation-receipt.json',
    ]);
  });

  it('rejects aliased decision refs before creating an output directory', async () => {
    const root = workspace();
    const result = await orchestrateLocalExperienceV1(selectedLocalInput(root, true));
    expect(result).toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-DECISION-REF-ALIAS',
    });
    expect(readdirSync(root)).toEqual([]);
  });

  it('checks output containment after selection and before any material write', async () => {
    const root = workspace();
    const outside = workspace();
    mkdirSync(resolve(root, 'work/private/experience'), {recursive: true});
    symlinkSync(outside, resolve(root, 'work/private/experience/content'));
    const result = await orchestrateLocalExperienceV1(selectedLocalInput(root));
    expect(result).toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'FRAMES-OUTPUT-PATH002',
    });
    expect(readdirSync(outside)).toEqual([]);
  });

  it.each(['R6', 'R7'] as const)(
    'keeps %s routed and zero-write until a human selection arrives',
    async (route) => {
      const root = workspace();
      const result = await dispatchIntentLocal(selectedRouterInputs(route, root, false), {
        authorizedRoot: root,
      });
      expect(result).toMatchObject({
        route_id: route,
        decision: 'AWAITING_SELECTION',
        adapter_invoked: true,
        command_view: null,
        experience_envelope: {state: 'ROUTED', effects: []},
        launch_probe: {local_only: true, external_effects: false},
        local_execution: {
          status: 'NEEDS_INPUT',
          materialized: false,
        },
      });
      const options = result.experience_view.components.find(({kind}) => kind === 'DecisionGate')
        ?.data.options;
      expect(options).toHaveLength(2);
      expect(
        (options as Array<{rescuedContributions: unknown}>).every(({rescuedContributions}) =>
          Array.isArray(rescuedContributions),
        ),
      ).toBe(true);
      expect(result.domain_intent).not.toHaveProperty('decision_funnel');
      expect(result.domain_intent).not.toHaveProperty('decision_selection');
      expect(result.domain_intent).not.toHaveProperty('decision_refs');
      expect(readdirSync(root)).toEqual([]);
    },
  );

  it.each([
    ['R6', 'AWAITING_APPROVAL', true],
    ['R7', 'BLOCKED', false],
  ] as const)(
    'advances %s only after the router verifies the selected direction',
    async (route, status, materialized) => {
      const root = workspace();
      const result = await dispatchIntentLocal(selectedRouterInputs(route, root), {
        authorizedRoot: root,
      });
      expect(result).toMatchObject({
        route_id: route,
        decision: 'READY_FOR_BRIEF',
        experience_envelope: {state: 'READY_FOR_BRIEF', effects: ['READ_ONLY']},
        local_execution: {status, materialized},
      });
    },
  );

  it('rejects a forged selection before any public-router write', async () => {
    const root = workspace();
    const input = selectedRouterInputs('R6', root);
    input.decision_selection = {...input.decision_selection!, selectedOptionId: 'OPT-FORGED'};
    await expect(dispatchIntentLocal(input, {authorizedRoot: root})).resolves.toMatchObject({
      decision: 'NEEDS_INPUT',
      experience_envelope: {state: 'BLOCKED'},
      local_execution: {status: 'NEEDS_INPUT', materialized: false},
    });
    expect(readdirSync(root)).toEqual([]);
  });

  it.each([
    [
      'missing refs',
      'NEEDS_INPUT',
      (input: Record<string, unknown>): boolean => delete input.decision_refs,
    ],
    [
      'aliased refs',
      'BLOCKED',
      (input: Record<string, unknown>): boolean => {
        input.decision_refs = {
          ...(input.decision_refs as Record<string, unknown>),
          selection: {
            ref: 'evidence/./decision-selection.json',
            sha256: (input.decision_selection as {canonicalSha256: string}).canonicalSha256,
          },
        };
        return true;
      },
    ],
  ] as const)('rejects %s before any public-router write', async (_label, status, mutate) => {
    const root = workspace();
    const input = selectedRouterInputs('R6', root);
    mutate(input);
    const result = await dispatchIntentLocal(input, {authorizedRoot: root});
    expect(result.local_execution).toMatchObject({status, materialized: false});
    expect(readdirSync(root)).toEqual([]);
  });

  it('keeps an incomplete request at zero writes', async () => {
    const root = workspace();
    const result = await dispatchIntentLocal(
      {
        request: 'Ayúdame a generar una pieza',
        intent_domain: 'content',
        workspace_root: root,
        ...timestamps,
      },
      {authorizedRoot: root},
    );
    expect(result.local_execution).toMatchObject({status: 'NEEDS_INPUT', materialized: false});
    expect(readdirSync(root)).toEqual([]);
  });

  it.each([
    ['/menu', 'MENU'],
    ['/ruta Ayúdame a generar una pieza', 'ROUTE'],
  ] as const)(
    'keeps %s read-only even when execution inputs are complete',
    async (request, command) => {
      const root = workspace();
      const result = await dispatchIntentLocal(
        {...selectedRouterInputs('R6', root), request},
        {authorizedRoot: root},
      );
      expect(result.command_view).toMatchObject({command, readOnly: true, effects: []});
      expect(result.local_execution).toMatchObject({status: 'NEEDS_INPUT', materialized: false});
      expect(readdirSync(root)).toEqual([]);
    },
  );
});
