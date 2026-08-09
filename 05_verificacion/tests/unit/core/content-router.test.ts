import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {ContentIntentV2Schema} from 'workflows/multimedia/_schema/content-intent-v2.schema.ts';

const ROOT = process.cwd();
const ROUTER = resolve(ROOT, '03_artefactos/skills/content-os-router/scripts/route-content.mjs');
const temporaryDirs: string[] = [];

const route = (request: Record<string, unknown>) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'frames-content-router-'));
  temporaryDirs.push(directory);
  const input = resolve(directory, 'request.json');
  writeFileSync(input, `${JSON.stringify(request)}\n`, 'utf8');
  const stdout = execFileSync(process.execPath, [ROUTER, input], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return ContentIntentV2Schema.parse(JSON.parse(stdout) as unknown);
};

afterEach(() => {
  for (const directory of temporaryDirs.splice(0))
    rmSync(directory, {recursive: true, force: true});
});

describe('content-os-router ContentIntentV2', () => {
  it('routes a vague piece request through the minimum quality chain and asks at most three questions', () => {
    const result = route({request: 'Ayúdame a generar una pieza'});

    expect(result.decision).toBe('NEEDS_INPUT');
    expect(result.blocking_questions).toHaveLength(3);
    expect(result.selected_stage_path).toEqual(['P03', 'P05', 'P07', 'P08']);
    expect(result.next_gate).toBe('MW_BRIEF_APPROVED');
    expect(result.effect_class).toBe('local_reversible');
    expect(result.route_candidates[0]).toMatchObject({
      route_id: 'R6_CONTENT',
      reason_codes: ['NEW_PIECE'],
    });
  });

  it('keeps brief approval as the next campaign gate while distribution remains future work', () => {
    const result = route({
      request: 'Crear campaña de lanzamiento y preparar distribución',
      audience: 'Equipos de innovación',
      outcome: 'Solicitar una demostración',
      source: {type: 'document', ref: 'sources/launch.md', authority: 'verified'},
      brandReady: true,
      evidenceSufficient: false,
      assetsRequired: true,
      distributionRequested: true,
    });

    expect(result.decision).toBe('ROUTED');
    expect(result.selected_stage_path).toEqual([
      'P02',
      'P03',
      'P04',
      'P05',
      'P06',
      'P07',
      'P08',
      'P09',
    ]);
    expect(result.next_gate).toBe('MW_BRIEF_APPROVED');
    expect(result.next_gate).not.toBe('MW_DISTRIBUTION_AUTHORIZED');
    expect(result.route_candidates[0]?.reason_codes).toEqual(
      expect.arrayContaining([
        'NEW_PIECE',
        'EVIDENCE_INSUFFICIENT',
        'MULTI_PIECE',
        'ASSETS_REQUIRED',
        'DISTRIBUTION_REQUESTED',
      ]),
    );
  });

  it('uses the intervention route for an existing piece without restarting P03/P05', () => {
    const result = route({
      request: 'Ayúdame a corregir esta pieza existente',
      audience: 'Clientes actuales',
      outcome: 'Mejorar claridad',
      source: {type: 'document', ref: 'work/content/existing.html', authority: 'verified'},
    });

    expect(result.content_class).toBe('intervention');
    expect(result.selected_stage_path).toEqual(['P07', 'P08']);
    expect(result.next_gate).toBe('MW_EDIT_APPROVED');
    expect(result.route_candidates[0]?.reason_codes).toEqual(['EXISTING_PIECE']);
  });

  it('produces the same normalized decision for identical inputs', () => {
    const input = {
      request: 'Crear una pieza para LinkedIn',
      audience: 'Líderes de producto',
      outcome: 'Abrir conversación',
      source: {type: 'document', ref: 'sources/brief.md', authority: 'verified'},
      channels: ['linkedin'],
      constraints: ['sin publicación automática'],
    };
    expect(route(input)).toEqual(route(input));
  });
});
