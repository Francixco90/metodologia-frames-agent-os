import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';
import {parse} from 'yaml';

import type {CareerEvidenceReadinessV1} from 'workflows/career/_schema/career-evidence-readiness-v1.schema.ts';
import {calculateEvidenceReadinessHash} from 'workflows/career/_runner/career-discovery.ts';
import {routeCareerIntent} from 'workflows/career/_runner/route-career.ts';

const ROOT = process.cwd();
const DISPATCHER = resolve(ROOT, '03_artefactos/skills/content-os-router/scripts/route-intent.mjs');
const temporaryDirs: string[] = [];
const readyEvidence = (candidateId: string, bank = 'a'.repeat(64)) => {
  const check = {passed: true, evidence_ids: ['EVIDENCE-SYNTHETIC-001'], accepted_gap_ids: []};
  const payload = {
    schema_version: 'career-evidence-readiness-v1',
    readiness_id: 'READINESS-SYNTHETIC-001',
    candidate_id: candidateId,
    evidence_bank_sha256: bank,
    candidate_packet_sha256: 'b'.repeat(64),
    checks: {
      identity_and_chronology: check,
      competency_evidence: check,
      recent_role_interventions: check,
      contradictions_resolved: check,
      role_family_selected: check,
      privacy_boundary: check,
      gaps_accepted: check,
    },
    blocking_gap_ids: [],
    status: 'READY',
    next_gate: 'CR_CAREER_EVIDENCE_READY',
  } satisfies Omit<CareerEvidenceReadinessV1, 'readiness_sha256'>;
  return {
    evidenceReadiness: {...payload, readiness_sha256: calculateEvidenceReadinessHash(payload)},
    evidenceBankSha256: bank,
  };
};
const blockedEvidence = (candidateId: string, bank = 'a'.repeat(64)) => {
  const ready = readyEvidence(candidateId, bank).evidenceReadiness;
  const {readiness_sha256: priorHash, ...readyPayload} = ready;
  expect(priorHash).toMatch(/^[a-f0-9]{64}$/u);
  const payload = {
    ...readyPayload,
    checks: {
      ...readyPayload.checks,
      competency_evidence: {
        passed: false,
        evidence_ids: [],
        accepted_gap_ids: [],
      },
    },
    blocking_gap_ids: ['GAP-BLOCKING-001'],
    status: 'BLOCKED',
  } satisfies Omit<CareerEvidenceReadinessV1, 'readiness_sha256'>;
  return {
    evidenceReadiness: {...payload, readiness_sha256: calculateEvidenceReadinessHash(payload)},
    evidenceBankSha256: bank,
  };
};
const dispatch = (request: Record<string, unknown>) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'frames-intent-dispatch-'));
  temporaryDirs.push(directory);
  const input = resolve(directory, 'request.json');
  writeFileSync(input, `${JSON.stringify(request)}\n`, 'utf8');
  return JSON.parse(
    execFileSync(process.execPath, [DISPATCHER, input], {cwd: ROOT, encoding: 'utf8'}),
  ) as {
    route_id: 'R0' | 'R6' | 'R7';
    adapter: string | null;
    next_gate: string;
    decision: 'NEEDS_INPUT' | 'ROUTED';
    request_hash: string;
  };
};

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) {
    rmSync(directory, {recursive: true, force: true});
  }
});

describe('R7 Career intent router', () => {
  it('routes a vague CV request through the minimum quality path with at most three questions', () => {
    const result = routeCareerIntent({request: 'Créame un CV en HTML'});

    expect(result.intent_class).toBe('general_cv');
    expect(result.decision).toBe('NEEDS_INPUT');
    expect(result.blocking_questions.length).toBeLessThanOrEqual(3);
    expect(result.selected_stage_path).toEqual(['C00', 'C01', 'C02', 'C06', 'C08']);
    expect(result.next_gate).toBe('CR_BRIEF_APPROVED');
    expect(result.effect_class).toBe('local_reversible');
  });

  it('does not repeat resolved questions for a complete targeted CV request', () => {
    const result = routeCareerIntent({
      request: 'Adapta mi CV a esta vacante',
      candidateId: 'CAND-SYNTHETIC-001',
      targetRole: 'Product Operations Lead',
      jobRef: 'work/private/jobs/job-001.md',
      profileReady: true,
      ...readyEvidence('CAND-SYNTHETIC-001'),
      jobValidated: true,
    });

    expect(result).toMatchObject({
      intent_class: 'targeted_cv',
      decision: 'ROUTED',
      blocking_questions: [],
      selected_stage_path: ['C05', 'C06', 'C08'],
      next_gate: 'CR_BRIEF_APPROVED',
    });
  });

  it('selects all required specialists for a complete application request', () => {
    const result = routeCareerIntent({
      request: 'Busca vacantes y ayúdame a postular',
      candidateId: 'CAND-SYNTHETIC-001',
      targetRole: 'Product Operations Lead',
      profileReady: true,
      ...readyEvidence('CAND-SYNTHETIC-001'),
    });

    expect(result.intent_class).toBe('full_application');
    expect(result.selected_stage_path).toEqual([
      'C02',
      'C03',
      'C04',
      'C05',
      'C06',
      'C07',
      'C08',
      'C09',
    ]);
    expect(result.reason_codes).toContain('SUBMISSION_STOP_REQUIRED');
    expect(result.effect_class).toBe('external_reversible');
  });

  it('routes a ready follow-up directly to C09 without claiming submission', () => {
    const result = routeCareerIntent({
      request: 'Continúa el seguimiento de mi postulación',
      candidateId: 'CAND-SYNTHETIC-001',
      applicationId: 'APP-SYNTHETIC-001',
      targetRole: 'Product Operations Lead',
      profileReady: true,
      ...readyEvidence('CAND-SYNTHETIC-001'),
      packageReady: true,
    });

    expect(result).toMatchObject({
      intent_class: 'follow_up',
      decision: 'ROUTED',
      selected_stage_path: ['C09'],
      next_gate: 'CR_PACKAGE_APPROVED',
    });
    expect(result.reason_codes).toContain('SUBMISSION_STOP_REQUIRED');
  });

  it('normalizes identical requests and stable-sorts deduplicated context', () => {
    const input = {
      request: '  Créame   un CV  ',
      candidateId: 'CAND-SYNTHETIC-001',
      targetRole: 'Product Lead',
      sourceRefs: ['sources/z.md', 'sources/a.md', 'sources/z.md'],
      constraints: ['ATS', 'dos páginas', 'ATS'],
      profileReady: true,
      ...readyEvidence('CAND-SYNTHETIC-001'),
    };
    const first = routeCareerIntent(input);
    const second = routeCareerIntent(input);

    expect(first).toEqual(second);
    expect(first.request).toBe('Créame un CV');
    expect(first.sources).toEqual(['sources/a.md', 'sources/z.md']);
    expect(first.constraints).toEqual(['ATS', 'dos páginas']);
    expect(first.request_hash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('keeps content-os-router as the single dispatcher for R6 and R7', () => {
    expect(dispatch({request: 'Ayúdame a crear una pieza para una campaña'})).toMatchObject({
      route_id: 'R6',
      adapter: 'content-os-router/scripts/route-content.mjs',
      next_gate: 'MW_BRIEF_APPROVED',
      decision: 'NEEDS_INPUT',
    });
    expect(dispatch({request: 'Créame un CV ATS en HTML'})).toMatchObject({
      route_id: 'R7',
      adapter: 'career-application-orchestrator/scripts/route-career.mjs',
      next_gate: 'CR_BRIEF_APPROVED',
      decision: 'NEEDS_INPUT',
    });
  });

  it('does not trust a readiness boolean and rejects stale or mismatched receipts', () => {
    const base = {
      request: 'Crear un CV general',
      candidateId: 'CAND-SYNTHETIC-001',
      targetRole: 'Program Lead',
      profileReady: true,
    };
    const unverified = routeCareerIntent({...base, evidenceReady: true});
    expect(unverified.selected_stage_path).toContain('C01');
    expect(unverified.selected_stage_path.indexOf('C01')).toBeLessThan(
      unverified.selected_stage_path.indexOf('C02'),
    );
    expect(unverified.next_gate).toBe('CR_CAREER_EVIDENCE_READY');
    expect(unverified.reason_codes).toContain('EVIDENCE_READINESS_UNVERIFIED');

    const valid = readyEvidence(base.candidateId);
    expect(() => routeCareerIntent({...base, ...blockedEvidence(base.candidateId)})).toThrow(
      'CAREER-EVIDENCE-READINESS-BINDING',
    );
    expect(() =>
      routeCareerIntent({...base, ...valid, evidenceBankSha256: 'c'.repeat(64)}),
    ).toThrow('CAREER-EVIDENCE-READINESS-BINDING');
    expect(() => routeCareerIntent({...base, ...readyEvidence('CAND-SYNTHETIC-OTHER')})).toThrow(
      'CAREER-EVIDENCE-READINESS-BINDING',
    );
    expect(() =>
      routeCareerIntent({
        ...base,
        ...valid,
        evidenceReadiness: {...valid.evidenceReadiness, readiness_sha256: 'd'.repeat(64)},
      }),
    ).toThrow('career evidence readiness hash mismatch');
  });

  it.each(['Crea una pieza para presentar mi candidatura', 'Necesito ayuda con algo profesional'])(
    'fails closed to R0 for a mixed or unresolved request: %s',
    (request) => {
      expect(dispatch({request})).toMatchObject({
        route_id: 'R0',
        adapter: null,
        next_gate: 'R0',
        decision: 'NEEDS_INPUT',
      });
    },
  );

  it('returns the same dispatch decision and digest for normalized identical input', () => {
    expect(dispatch({request: '  Crear   mi CV  '})).toEqual(dispatch({request: 'Crear mi CV'}));
  });

  it('keeps every R7 schema, skill adapter and executable gate command resolvable', () => {
    const manifest = parse(
      readFileSync(resolve(ROOT, '02_proceso/governance/router.yml'), 'utf8'),
    ) as {
      routes: Array<{id: string; reads: string[]}>;
      gate_commands: Record<string, string>;
    };
    const route = manifest.routes.find(({id}) => id === 'R7');
    expect(route).toBeDefined();
    for (const reference of route!.reads) {
      expect(existsSync(resolve(ROOT, reference)), `R7 read reference ${reference}`).toBe(true);
    }
    expect(existsSync(DISPATCHER), 'single dispatcher').toBe(true);
    expect(
      existsSync(
        resolve(
          ROOT,
          '03_artefactos/skills/career-application-orchestrator/scripts/route-career.mjs',
        ),
      ),
      'R7 dispatcher adapter',
    ).toBe(true);

    const command = manifest.gate_commands.G09_CAREER_career_contracts;
    expect(command).toBeTypeOf('string');
    if (!command) throw new Error('Career gate command missing');
    const script = command.match(/(?:^|\s)([^\s]+\.ts)(?:\s|$)/u)?.[1];
    expect(script, 'career command must name a TypeScript verifier').toBeDefined();
    expect(existsSync(resolve(ROOT, script!)), `career verifier ${script}`).toBe(true);
  });
});
