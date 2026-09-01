import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {describe, expect, it} from 'vitest';

import {hashExperienceValue, type AssistanceEnvelopeV1} from 'core/contracts/index.ts';

type DispatchResult = {
  route_id: string;
  adapter_invoked: boolean;
  next_gate: string;
  domain_intent: null | {schema_version: string};
  experience_envelope: AssistanceEnvelopeV1;
  launch_probe: {
    schema_version: string;
    gateway_invoked: boolean;
    adapter_invoked: boolean;
    local_only: boolean;
    external_effects: boolean;
    route_id: string;
    envelope_hash: string;
  };
};

describe('productive first-turn launch probe', () => {
  it('proves gateway use for R6/R7/R10 and keeps their domain adapters causal', async () => {
    const {dispatchIntent} = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {dispatchIntent: (input: Record<string, unknown>) => DispatchResult};
    const results = [
      dispatchIntent({
        request: 'Crear una pieza',
        audience: 'equipos',
        outcome: 'informar',
        source: {type: 'text', authority: 'verified'},
      }),
      dispatchIntent({
        request: 'Crear CV',
        candidateId: 'CAND-SYNTHETIC',
        targetRole: 'Arquitectura',
        profileReady: true,
        evidenceReady: true,
      }),
      dispatchIntent({request: 'Audita NotebookLM OS', intent_domain: 'notebooklm'}),
    ];
    expect(results.map(({route_id}) => route_id)).toEqual(['R6', 'R7', 'R10']);
    expect(results.map(({domain_intent}) => domain_intent?.schema_version)).toEqual([
      'content-intent-v2',
      'career-intent-v1',
      'notebooklm-route-intent-v1',
    ]);
    for (const result of results) {
      expect(result.adapter_invoked).toBe(true);
      expect(result.launch_probe).toMatchObject({
        schema_version: 'frames-launch-probe-v1',
        gateway_invoked: true,
        adapter_invoked: true,
        local_only: true,
        external_effects: false,
        route_id: result.route_id,
      });
      expect(result.launch_probe.envelope_hash).toBe(
        hashExperienceValue(result.experience_envelope),
      );
    }
    expect(results[2]).toMatchObject({
      adapter: 'workflows/notebooklm-os/route-notebooklm-v1.ts',
      experience_envelope: {
        workflowPlan: ['N00', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09'],
      },
    });
  });

  it('routes resumptions through gateway R4 without invoking a domain adapter', async () => {
    const {dispatchIntent} = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {dispatchIntent: (input: Record<string, unknown>) => DispatchResult};
    const stateRoot = mkdtempSync(resolve(tmpdir(), 'frames-launch-resume-'));
    try {
      const material = (ref: string, content: string) => {
        const path = resolve(stateRoot, ref);
        mkdirSync(dirname(path), {recursive: true});
        writeFileSync(path, content, 'utf8');
        return {ref, sha256: createHash('sha256').update(content).digest('hex')};
      };
      const candidateId = 'CAND-SYNTHETIC';
      const draft = {
        schemaVersion: 'resume-lineage-record-v1',
        candidateId,
        originRouteId: 'R7',
        activeStep: 'C06.render',
        summary: 'Terminar el CV aprobado.',
        briefKind: 'application-brief',
        candidate: material('candidates/candidate.json', '{}\n'),
        latestArtifact: material('artifacts/application-brief.md', '# CV sintético\n'),
        receipt: material('receipts/invocation.json', '{}\n'),
      };
      const lineagePath = resolve(stateRoot, 'lineages', candidateId, 'resume.json');
      mkdirSync(dirname(lineagePath), {recursive: true});
      writeFileSync(
        lineagePath,
        `${JSON.stringify({...draft, canonicalSha256: hashExperienceValue(draft)})}\n`,
        'utf8',
      );
      const result = dispatchIntent({
        request: 'Continuar con lo anterior',
        state_root: stateRoot,
        resume_candidate_id: candidateId,
      });
      expect(result).toMatchObject({
        route_id: 'R4',
        adapter_invoked: false,
        domain_intent: null,
        experience_envelope: {interactionClass: 'RESUME_CANDIDATE', state: 'RESUMABLE'},
        launch_probe: {
          gateway_invoked: true,
          adapter_invoked: false,
          route_id: 'R4',
          external_effects: false,
        },
      });
    } finally {
      rmSync(stateRoot, {recursive: true, force: true});
    }
  });

  it('keeps unresolved R0 local, blocked and adapter-free', async () => {
    const {dispatchIntent} = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {dispatchIntent: (input: Record<string, unknown>) => DispatchResult};
    const result = dispatchIntent({request: 'Necesito ayuda'});
    expect(result).toMatchObject({
      route_id: 'R0',
      adapter_invoked: false,
      domain_intent: null,
      experience_envelope: {state: 'BLOCKED', effects: []},
      launch_probe: {gateway_invoked: true, adapter_invoked: false, external_effects: false},
    });
  });
});
