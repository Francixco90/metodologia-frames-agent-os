import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';

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
const digest = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
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

describe('Frames local brief-first execution', () => {
  it.each(['R6', 'R7'] as const)(
    'materializes the complete %s brief pair and receipt, then stops for approval',
    async (route) => {
      const root = workspace();
      const result = await dispatchIntentLocal(completeInputs(route, root), {authorizedRoot: root});
      expect(result).toMatchObject({
        route_id: route,
        next_gate: route === 'R6' ? 'MW_BRIEF_APPROVED' : 'CR_CAREER_EVIDENCE_READY',
        adapter_invoked: true,
        command_view: null,
        launch_probe: {local_only: true, external_effects: false},
        local_execution: {
          status: 'AWAITING_APPROVAL',
          materialized: true,
          nextGate: 'EXP_BRIEF_APPROVED',
        },
      });
      const execution = result.local_execution;
      const brief = execution.brief!;
      const markdownPath = resolve(root, brief.markdownRef);
      const htmlPath = resolve(root, brief.htmlRef);
      const receiptPath = resolve(root, execution.receiptRef!);
      expect([markdownPath, htmlPath, receiptPath].every(existsSync)).toBe(true);
      const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as {
        status: string;
        outputs: Array<{ref: string; sha256: string}>;
        evidence: Array<{ref: string; sha256: string}>;
      };
      expect(receipt.status).toBe('PASS');
      expect(receipt.outputs).toEqual([
        {ref: brief.markdownRef, sha256: digest(readFileSync(markdownPath))},
        {ref: brief.htmlRef, sha256: digest(readFileSync(htmlPath))},
      ]);
      expect(receipt.evidence).toEqual([receipt.outputs[0]]);
      expect(execution.receiptSha256).toBe(digest(readFileSync(receiptPath)));
      expect(
        readdirSync(
          resolve(root, `work/private/experience/${route === 'R6' ? 'content' : 'career'}`),
        ),
      ).toEqual(['brief.html', 'brief.md', 'invocation-receipt.json']);
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
