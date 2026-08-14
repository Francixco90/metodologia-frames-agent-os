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
      next_gate: 'CR_SUBMISSION_AUTHORIZED',
    });
    expect(result.reason_codes).toContain('SUBMISSION_STOP_REQUIRED');
  });

  it('does not request submission authorization without an exact ready package', () => {
    const result = routeCareerIntent({
      request: 'Continúa el seguimiento de mi postulación',
      candidateId: 'CAND-SYNTHETIC-001',
      applicationId: 'APP-SYNTHETIC-001',
      targetRole: 'Product Operations Lead',
      profileReady: true,
    });

    expect(result.selected_stage_path).toEqual(['C09']);
    expect(result.next_gate).toBe('CR_PACKAGE_APPROVED');
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

  it('reads A0 authority fail-closed and rejects invented package QA authority', () => {
    const contract = readFileSync(
      resolve(ROOT, '01_intencion/career/career-os-operating-contract-v2.md'),
      'utf8',
    );
    const guide = readFileSync(resolve(ROOT, '01_intencion/guides/career.md'), 'utf8');
    const legacy = readFileSync(
      resolve(ROOT, '01_intencion/career/cv-spec-first-contract-v1.md'),
      'utf8',
    );
    const commands = parse(
      readFileSync(resolve(ROOT, '05_verificacion/scripts/commands.yaml'), 'utf8'),
    ) as {
      gates: Array<{gate: string; command: string | null; manual: boolean; fail_closed: boolean}>;
    };
    const router = parse(
      readFileSync(resolve(ROOT, '02_proceso/governance/router.yml'), 'utf8'),
    ) as {manual_fail_closed_gates: string[]};
    const contextSurfaces = parse(
      readFileSync(resolve(ROOT, '02_proceso/governance/context-surfaces/skills.yml'), 'utf8'),
    ) as {surfaces: Array<{context_id: string; gates?: string[]}>};
    const byGate = new Map(commands.gates.map((gate) => [gate.gate, gate]));
    const orchestratorContext = contextSurfaces.surfaces.find(
      ({context_id}) => context_id === 'CTX-SKILL-CAREER-ORCHESTRATOR',
    );

    expect(contract).toContain('coverage_gap: A1_MATERIAL_MIGRATION_REQUIRED');
    expect(contract).toContain('`CR_PACKAGE_QA` no está activo en A0');
    expect(guide).toContain('### ATS rápida');
    expect(guide).toContain('### Ejecutiva');
    expect(guide).toContain('### Dirigida a una vacante');
    expect(legacy).toMatch(/^# Contrato operativo CV Spec-First v1\n\n> \*\*COMPATIBILITY-ONLY\./u);
    expect(byGate.has('CR_PACKAGE_QA')).toBe(false);
    expect(byGate.get('CR_CAREER_EVIDENCE_READY')).toMatchObject({
      command: 'node 03_artefactos/skills/career-evidence-interviewer/scripts/check-skill.mjs',
      manual: false,
      fail_closed: true,
    });
    expect(byGate.get('CR_CV_COMPILED')).toMatchObject({
      command: 'node 03_artefactos/skills/evidence-first-cv/scripts/check-skill.mjs',
      manual: false,
      fail_closed: true,
    });
    expect(byGate.get('CR_CV_DESIGN_APPROVED')).toMatchObject({
      command: null,
      manual: true,
      fail_closed: true,
    });
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining([
        'CR_BRIEF_APPROVED',
        'CR_CV_DESIGN_APPROVED',
        'CR_CV_SPEC_APPROVED',
        'CR_PACKAGE_APPROVED',
        'CR_SUBMISSION_AUTHORIZED',
      ]),
    );
    expect(router.manual_fail_closed_gates).not.toContain('CR_PACKAGE_QA');
    expect(router.manual_fail_closed_gates).not.toContain('CR_CAREER_EVIDENCE_READY');
    expect(router.manual_fail_closed_gates).not.toContain('CR_CV_COMPILED');
    expect(orchestratorContext?.gates).toEqual(
      expect.arrayContaining(['CR_CV_DESIGN_APPROVED', 'CR_CV_COMPILED', 'CR_PACKAGE_APPROVED']),
    );
    expect(orchestratorContext?.gates).not.toContain('CR_PACKAGE_QA');
  });
});
