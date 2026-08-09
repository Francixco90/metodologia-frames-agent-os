import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {runFirstTurnGatewayV1, type GatewayRouteHandlerV1} from 'workflows/core/index.ts';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, {recursive: true, force: true});
});

const neverRoute = vi.fn<GatewayRouteHandlerV1>(() => {
  throw new Error('route handler must not run');
});
const handlers = {R6: neverRoute, R7: neverRoute};

describe('Frames first-turn classification', () => {
  it('greets with identity guidance, no route invocation and zero filesystem writes', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'frames-experience-greeting-'));
    directories.push(directory);
    const before = readdirSync(directory);

    const envelope = await runFirstTurnGatewayV1({prompt: '¡Hola!'}, handlers);

    expect(envelope).toMatchObject({
      interactionClass: 'ASSIST_ONLY',
      selectedRoute: null,
      writePolicy: 'NONE',
      effects: [],
      state: 'ASSISTING',
    });
    expect(envelope.recommendedNextAction).toMatch(/Crear.*Mejorar.*Planear.*Explorar/u);
    expect(neverRoute).not.toHaveBeenCalled();
    expect(readdirSync(directory)).toEqual(before);
  });

  it('fails closed when no route signal is sufficient', async () => {
    const envelope = await runFirstTurnGatewayV1({prompt: 'Necesito ayuda con algo'}, handlers);
    expect(envelope).toMatchObject({
      interactionClass: 'AMBIGUOUS',
      selectedRoute: 'R0',
      state: 'BLOCKED',
      writePolicy: 'NONE',
    });
    expect(envelope.blockingGaps).toHaveLength(1);
    expect(envelope.ghostOptions).toEqual(['Crear contenido', 'Carrera y empleo']);
  });

  it('surfaces an equal R6/R7 ambiguity instead of choosing silently', async () => {
    const envelope = await runFirstTurnGatewayV1(
      {prompt: 'Diseña un carrusel para presentar mi CV a una vacante'},
      handlers,
    );
    expect(envelope.interactionClass).toBe('AMBIGUOUS');
    expect(envelope.routeCandidates).toEqual([
      {routeId: 'R6', confidence: 0.5, reasonCodes: ['CONTENT_SIGNAL']},
      {routeId: 'R7', confidence: 0.5, reasonCodes: ['CAREER_SIGNAL']},
    ]);
    expect(neverRoute).not.toHaveBeenCalled();
  });

  it('resumes an explicitly bound candidate without repeating routing', async () => {
    const envelope = await runFirstTurnGatewayV1(
      {
        prompt: 'Continuar con lo anterior',
        resumeCandidate: {
          routeId: 'R7',
          activeStep: 'C06.render',
          summary: 'Terminar el CV aprobado.',
          briefPreview: {
            briefKind: 'application-brief',
            summary: 'CV para una vacante sintética.',
            materialized: true,
            canonicalRef: 'work/private/application-brief.md',
          },
        },
      },
      handlers,
    );
    expect(envelope).toMatchObject({
      interactionClass: 'RESUME_CANDIDATE',
      selectedRoute: 'R4',
      activeStep: 'C06.render',
      state: 'RESUMABLE',
      writePolicy: 'NONE',
    });
    expect(neverRoute).not.toHaveBeenCalled();
  });

  it('normalizes equivalent prompts into the same deterministic request hash', async () => {
    const first = await runFirstTurnGatewayV1({prompt: '¡Hóla!'}, handlers);
    const second = await runFirstTurnGatewayV1({prompt: 'hola'}, handlers);
    expect(first.requestHash).toBe(second.requestHash);
  });
});
