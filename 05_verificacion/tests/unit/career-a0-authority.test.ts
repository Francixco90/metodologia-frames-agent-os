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

  it('keeps every run decision manual and static compilation unable to prove a run', () => {
    expect(byGate.get('CR_CAREER_EVIDENCE_READY')).toMatchObject({
      command: null,
      manual: true,
      fail_closed: true,
    });
    expect(byGate.get('CR_CV_COMPILED')).toMatchObject({
      command: 'pnpm verify:career',
      manual: false,
      fail_closed: true,
    });
    expect(byGate.get('CR_CV_COMPILED')?.label).toContain('static harness baseline');
    expect(contract).toContain('no materializa ni verifica el receipt de un run');
    expect(contract).toContain('`packageReady=true`');
    expect(contract).toContain('no un boolean');
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
        'CR_CAREER_EVIDENCE_READY',
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
});
