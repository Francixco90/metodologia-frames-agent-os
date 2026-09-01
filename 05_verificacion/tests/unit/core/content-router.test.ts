import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {hashExperienceValue} from 'core/contracts/index.ts';
import {ContentIntentV2Schema} from 'workflows/multimedia/_schema/content-intent-v2.schema.ts';

const ROOT = process.cwd();
const ROUTER = resolve(ROOT, '03_artefactos/skills/content-os-router/scripts/route-content.mjs');
const AUDITOR = resolve(ROOT, '03_artefactos/skills/content-os-router/scripts/route-audit.mjs');
const temporaryDirs: string[] = [];
const commercialAuthority = () => {
  const source = {
    source_id: 'source-commercial-proposal',
    ref: 'sources/proposal.md',
    sha256: 'a'.repeat(64),
    authority: 'user_assertion' as const,
    rights: 'restricted' as const,
  };
  const receiptDraft = {
    schemaVersion: 'brief-source-authority-receipt-v1' as const,
    receiptId: 'receipt-commercial-proposal',
    source,
    authorityMode: 'LOCAL_SIMULATION' as const,
    authorityActorId: 'LOCAL-USER-ASSERTION' as const,
    rightsBasis: 'user_supplied_for_local_brief' as const,
    allowedUseScope: 'local_internal_brief_only' as const,
    restrictions: ['no_external_distribution', 'no_claim_promotion'] as const,
    recordedAt: '2026-08-29T12:00:00.000Z',
  };
  return {
    source: {type: 'brief', ...source},
    sourceAuthorityReceipt: {...receiptDraft, canonicalSha256: hashExperienceValue(receiptDraft)},
  };
};

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
const audit = (intent: unknown): Record<string, unknown> => {
  const directory = mkdtempSync(resolve(tmpdir(), 'frames-content-audit-'));
  temporaryDirs.push(directory);
  const input = resolve(directory, 'intent.jsonl');
  const output = resolve(directory, 'audit');
  writeFileSync(input, `${JSON.stringify(intent)}\n`, 'utf8');
  execFileSync(process.execPath, [AUDITOR, input, '--out', output, '--strict'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(readFileSync(resolve(output, 'route-audit.json'), 'utf8')) as Record<
    string,
    unknown
  >;
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

  it.each(['propuesta comercial', 'commercial proposal', 'proposal deck'])(
    'routes %s through the exact governed commercial proposal profile',
    (request) => {
      const input = {
        request,
        audience: 'Comité comprador',
        outcome: 'Evaluar un piloto',
        ...commercialAuthority(),
        campaign: true,
        distributionRequested: true,
        assetsRequired: false,
      };
      const result = route(input);
      expect(result.content_class).toBe('commercial-proposal');
      expect(result.selected_stage_path).toEqual(['P01', 'P02', 'P03', 'P05', 'P06', 'P07']);
      expect(result.selected_stage_path).not.toEqual(expect.arrayContaining(['P04', 'P08', 'P09']));
      expect(result.route_candidates[0]?.reason_codes).toEqual(['COMMERCIAL_PROPOSAL']);
      expect(result.next_gate).toBe('MW_BRIEF_APPROVED');
      expect(audit(result)).toMatchObject({violations: [], routeBound: true});
      expect(route(input)).toEqual(result);
    },
  );

  it('prepends P00 only when commercial brand readiness is explicitly missing', () => {
    const result = route({
      request: 'propuesta comercial',
      brandReady: false,
      ...commercialAuthority(),
    });
    expect(result.selected_stage_path).toEqual(['P00', 'P01', 'P02', 'P03', 'P05', 'P06', 'P07']);
    expect(result.route_candidates[0]?.reason_codes).toEqual([
      'COMMERCIAL_PROPOSAL',
      'BRAND_REQUIRED',
    ]);
  });

  it('fails an unhashed commercial verified assertion closed to R0/insufficient', () => {
    const result = route({
      request: 'propuesta comercial',
      audience: 'Comité comprador',
      outcome: 'Evaluar un piloto',
      source: {ref: 'unhashed-reference', authority: 'verified'},
    });
    expect(result).toMatchObject({
      decision: 'NEEDS_INPUT',
      brief_sufficiency: 'insufficient',
      source_authority: 'unknown',
      sources: [],
      selected_stage_path: ['P01'],
    });
    expect(result.route_candidates[0]).toMatchObject({
      route_id: 'R0',
      reason_codes: ['COMMERCIAL_PROPOSAL', 'SOURCE_AUTHORITY_INSUFFICIENT'],
    });
  });
});
