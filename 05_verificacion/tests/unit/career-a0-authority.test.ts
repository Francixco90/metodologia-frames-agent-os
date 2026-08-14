import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

const ROOT = process.cwd();
const read = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8');

describe('Career A0 authority remains receipt-bound', () => {
  const contract = read('01_intencion/career/career-os-operating-contract-v2.md');
  const commands = parse(read('05_verificacion/scripts/commands.yaml')) as {
    gates: Array<{
      gate: string;
      label: string;
      command: string | null;
      manual: boolean;
      fail_closed: boolean;
      owner: string;
    }>;
  };
  const router = parse(read('02_proceso/governance/router.yml')) as {
    manual_fail_closed_gates: string[];
  };
  const contextSurfaces = parse(read('02_proceso/governance/context-surfaces/skills.yml')) as {
    surfaces: Array<{context_id: string; gates?: string[]; stop_rules?: string[]}>;
  };
  const byGate = new Map(commands.gates.map((gate) => [gate.gate, gate]));
  const orchestrator = contextSurfaces.surfaces.find(
    ({context_id}) => context_id === 'CTX-SKILL-CAREER-ORCHESTRATOR',
  );

  it('executes both run-dependent gates as deterministic technical stops', () => {
    for (const id of ['CR_CAREER_EVIDENCE_READY', 'CR_CV_COMPILED']) {
      const gate = byGate.get(id);
      expect(gate).toMatchObject({manual: false, fail_closed: true, owner: 'qa'});
      expect(gate?.command).not.toContain('pnpm verify:career');
      const result = spawnSync(gate!.command!, {cwd: ROOT, encoding: 'utf8', shell: true});
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('COVERAGE_GAP:');
      expect(result.stderr).not.toContain('PASS');
    }
    expect(byGate.get('CR_CAREER_EVIDENCE_READY')?.command).toContain(
      'COVERAGE_GAP: CAREER_RUN_RECEIPT_REQUIRED',
    );
    expect(router.manual_fail_closed_gates).not.toContain('CR_CAREER_EVIDENCE_READY');
    expect(contract).toContain('Hasta A2/A5');
    expect(contract).toMatch(/no decisiones\s+humanas/u);
    expect(contract).toMatch(/gate estático del\s+repositorio/u);
    expect(contract).toContain('`packageReady=true`');
    expect(contract).toContain('Ningún boolean');
  });

  it('models package QA as an unimplemented legacy stop, not an executable gate', () => {
    expect(read('03_artefactos/skills/evidence-first-cv/SKILL.md')).toContain('CR_PACKAGE_QA');
    expect(byGate.has('CR_PACKAGE_QA')).toBe(false);
    expect(router.manual_fail_closed_gates).not.toContain('CR_PACKAGE_QA');
    expect(orchestrator?.gates).not.toContain('CR_PACKAGE_QA');
    expect(orchestrator?.stop_rules?.join(' ')).toContain('A1_PACKAGE_QA_REFS_REQUIRED');
    expect(contract).toContain('coverage_gap: A1_PACKAGE_QA_REFS_REQUIRED');
    expect(contract).toContain('nunca puede emitir `PASS`');
  });

  it('keeps human and Guardian boundaries explicit while exposing the three routes', () => {
    expect(byGate.get('G14')).toMatchObject({manual: true, owner: 'guardian'});
    expect(router.manual_fail_closed_gates).toEqual(
      expect.arrayContaining([
        'CR_CV_DESIGN_APPROVED',
        'CR_CV_SPEC_APPROVED',
        'CR_PACKAGE_APPROVED',
        'CR_SUBMISSION_AUTHORIZED',
      ]),
    );
    const guide = read('01_intencion/guides/career.md');
    expect(guide).toContain('### ATS rápida');
    expect(guide).toContain('### Ejecutiva');
    expect(guide).toContain('### Dirigida a una vacante');
    expect(read('01_intencion/career/cv-spec-first-contract-v1.md')).toMatch(
      /^# Contrato operativo CV Spec-First v1\n\n> \*\*COMPATIBILITY-ONLY\./u,
    );
  });

  it('describes the two-stage C09 boundary without changing its runtime', () => {
    expect(contract).toContain('Sin receipt material de package approval');
    expect(contract).toContain('C09 puede crear su preview');
    expect(contract).toMatch(/se detiene\s+en `CR_SUBMISSION_AUTHORIZED`/u);
  });
});
