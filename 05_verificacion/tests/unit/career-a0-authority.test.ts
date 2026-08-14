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
  const skillRegistry = parse(
    read('04_estado/registries/skills/creation-v3-skill-registry.yml'),
  ) as {
    entries: Array<{skill_id: string; content_sha256: string; package_manifest_sha256: string}>;
    events: Array<{
      event_id: string;
      event_order: number;
      skill_id: string;
      from: string | null;
      to: string;
      content_sha256?: string;
      package_manifest_sha256?: string;
    }>;
  };
  const byGate = new Map(commands.gates.map((gate) => [gate.gate, gate]));
  const orchestrator = contextSurfaces.surfaces.find(
    ({context_id}) => context_id === 'CTX-SKILL-CAREER-ORCHESTRATOR',
  );

  it('executes both run-dependent gates as deterministic technical stops', () => {
    const gaps = new Map([
      ['CR_CAREER_EVIDENCE_READY', 'COVERAGE_GAP: CAREER_RUN_RECEIPT_REQUIRED'],
      ['CR_CV_COMPILED', 'COVERAGE_GAP: CAREER_COMPILE_RUN_RECEIPT_REQUIRED'],
    ]);
    for (const [id, gap] of gaps) {
      const gate = byGate.get(id);
      expect(gate).toMatchObject({
        command: '/usr/bin/false',
        manual: false,
        fail_closed: true,
        owner: 'qa',
      });
      expect(gate?.label).toContain(gap);
      const result = spawnSync(gate!.command!, ['ignored-hostile-arg'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          BASH_ENV: '/definitely-missing/career-hostile-bash-env',
          NODE_OPTIONS: '--require=/definitely-missing/career-hostile-node-options.cjs',
        },
        shell: false,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).not.toContain('PASS');
    }
    expect(router.manual_fail_closed_gates).not.toContain('CR_CAREER_EVIDENCE_READY');
    expect(contract).toContain('Hasta A2/A5');
    expect(contract).toMatch(/no decisiones\s+humanas/u);
    expect(contract).toMatch(/gate estático del\s+repositorio/u);
    expect(contract).toContain('`packageReady=true`');
    expect(contract).toContain('/usr/bin/false');
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

  it('keeps C09 blocked without overclaiming local preview authority', () => {
    expect(contract).toContain('coverage_gap: A1_C09_PACKAGE_APPROVAL_RECEIPT_REQUIRED');
    expect(contract).toContain('solo construye un preview local');
    expect(contract).toMatch(/no recibe, verifica ni sustituye la aprobación/u);
    const submission = read('02_proceso/workflows/career/_runner/submission.ts');
    expect(submission).not.toContain('CR_PACKAGE_APPROVED');
    expect(submission).toContain("next_gate: 'CR_SUBMISSION_AUTHORIZED'");
  });

  it('pins the append-only skill refresh event to the current hashes', () => {
    const entry = skillRegistry.entries.find(
      ({skill_id}) => skill_id === 'career-application-orchestrator',
    )!;
    const events = skillRegistry.events
      .filter(({skill_id}) => skill_id === entry.skill_id)
      .sort((left, right) => left.event_order - right.event_order);
    expect(events.map(({event_id}) => event_id)).toEqual(
      Array.from({length: 8}, (_, index) => `EVT-SKL-CAO-H03-00${index + 1}`),
    );
    expect(events.at(-1)).toMatchObject({
      event_order: 8,
      from: 'active',
      to: 'active',
      content_sha256: entry.content_sha256,
      package_manifest_sha256: entry.package_manifest_sha256,
    });
  });
});
