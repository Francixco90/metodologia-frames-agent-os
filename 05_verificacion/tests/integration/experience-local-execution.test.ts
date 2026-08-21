import {mkdtempSync, readdirSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {orchestrateLocalExperienceV1, runFirstTurnGatewayV1} from 'workflows/core/index.ts';

import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

type LocalDecision = {
  route_id: string;
  next_gate: string;
  adapter_invoked: boolean;
  experience_envelope: {state: string; effects: string[]};
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
const roots: string[] = [];
const timestamps = {
  started_at: '2026-08-09T12:00:00.000Z',
  completed_at: '2026-08-09T12:00:01.000Z',
};

beforeAll(async () => {
  const module = (await import(
    pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
  )) as {dispatchIntentLocal: typeof dispatchIntentLocal};
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
        ref: aliasRefs ? funnelRef : 'evidence/decision-selection.json',
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
    symlinkSync(outside, resolve(root, 'escape'));
    const result = await orchestrateLocalExperienceV1(
      selectedLocalInput(root, false, 'escape/generated'),
    );
    expect(result).toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-OUTPUT-NAMESPACE-DRIFT',
    });
    expect(readdirSync(outside)).toEqual([]);
  });

  it.each(['R6', 'R7'] as const)(
    'keeps %s at zero writes until the router carries a verified human selection',
    async (route) => {
      const root = workspace();
      const result = await dispatchIntentLocal(completeInputs(route, root), {authorizedRoot: root});
      expect(result).toMatchObject({
        route_id: route,
        adapter_invoked: true,
        command_view: null,
        launch_probe: {local_only: true, external_effects: false},
        local_execution: {
          status: 'NEEDS_INPUT',
          materialized: false,
        },
      });
      expect(readdirSync(root)).toEqual([]);
    },
  );

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
        {...completeInputs('R6', root), request},
        {authorizedRoot: root},
      );
      expect(result.command_view).toMatchObject({command, readOnly: true, effects: []});
      expect(result.local_execution).toMatchObject({status: 'NEEDS_INPUT', materialized: false});
      expect(readdirSync(root)).toEqual([]);
    },
  );
});
