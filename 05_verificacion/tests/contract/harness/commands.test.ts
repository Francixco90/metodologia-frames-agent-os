import {describe, expect, it} from 'vitest';

import {CommandsManifestSchema} from '../../../scripts/lib/commands-schema.ts';
import {readRepositoryJson, readRepositoryYaml} from '../../fixtures/verifier/io.ts';

/**
 * Contract test: `05_verificacion/scripts/commands.yaml` parses against
 * `CommandsManifestSchema` and honours the fail-closed manual gates. [CONFIG]
 */
describe('commands.yaml contract', () => {
  const manifest = CommandsManifestSchema.parse(
    readRepositoryYaml('05_verificacion/scripts/commands.yaml'),
  );

  it('parses against CommandsManifestSchema (commands-v1)', () => {
    expect(manifest.manifest_id).toBe('commands-v1');
    expect(manifest.schema_version).toBe(1);
  });

  it('declares 71 gates including transaction, Guardian and existing domain boundaries', () => {
    expect(manifest.gates).toHaveLength(71);
    expect(manifest.gates.map(({gate}) => gate)).toEqual(
      expect.arrayContaining([
        'G09_VIDEO_OS',
        'VO_INTAKE_COMPLETE',
        'VO_DIRECTION_APPROVED',
        'VO_PRINCIPAL_VERIFIED',
        'VO_HANDOFF_APPROVED',
        'CR_CV_DESIGN_APPROVED',
        'G09_NOTEBOOKLM_OS',
        'NLM_PLAN_APPROVED',
        'NLM_SHARE_AUTHORIZED',
        'G08_TRANSACTION_KERNEL',
        'HM_GUARDIAN_VERDICT_RECORDED',
      ]),
    );
  });

  it('binds the Video OS gate to the durable fail-closed suite', () => {
    expect(manifest.gates.find(({gate}) => gate === 'G09_VIDEO_OS')).toMatchObject({
      command: 'pnpm verify:video-os',
      manual: false,
      fail_closed: true,
      owner: 'content',
    });
  });

  it('binds the PROJECT_LOCAL source overlay to the fail-closed transaction gate', () => {
    const gate = manifest.gates.find(({gate: gateId}) => gateId === 'G08_TRANSACTION_KERNEL');
    expect(gate).toMatchObject({manual: false, fail_closed: true, owner: 'core'});
    expect(gate?.command).toContain('05_verificacion/scripts/check-sources.ts --project-local');
    for (const capability of [
      'commercial-proposal-canary.test.ts',
      'technical-defense-local-extension-adversarial.test.ts',
    ]) {
      expect(gate?.command).toContain(capability);
    }
  });

  it('binds the Trainer runtime gate to its material adversarial suite', () => {
    expect(manifest.gates.find(({gate}) => gate === 'EXP_TRAINER_RUNTIME_VALIDATED')).toMatchObject(
      {
        command:
          'pnpm vitest run 05_verificacion/tests/integration/trainer-runtime.test.ts 05_verificacion/tests/unit/trainer-os-compiler-core.test.ts 05_verificacion/tests/unit/trainer-os-adapters.test.ts 05_verificacion/tests/unit/trainer-os-extended-adapters.test.ts 05_verificacion/tests/unit/trainer-os-masterclass-fixture.test.ts 05_verificacion/tests/unit/trainer-os-masterclass.test.ts 05_verificacion/tests/unit/trainer-os-package.test.ts 05_verificacion/tests/unit/trainer-os-benchmark.test.ts',
        manual: false,
        fail_closed: true,
        owner: 'content',
      },
    );
  });

  it('every gate id belongs to a governed gate family', () => {
    for (const gate of manifest.gates) {
      expect(gate.gate).toMatch(
        /^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+|CR_[A-Z_]+|VO_[A-Z_]+|EXP_[A-Z_]+|LX_[A-Z_]+|HM_[A-Z_]+|DOCS_[A-Z_]+|SSS_[A-Z_]+|NLM_[A-Z_]+)$/u,
      );
    }
  });

  it('keeps Experience execution checkable and both promotions manual fail-closed', () => {
    expect(manifest.gates.find(({gate}) => gate === 'G09_EXPERIENCE')).toMatchObject({
      command: 'node --import tsx scripts/check-experience-os.ts',
      manual: false,
      fail_closed: true,
      owner: 'content',
    });
    for (const id of ['EXP_BRIEF_APPROVED', 'EXP_RELEASE_APPROVED']) {
      expect(manifest.gates.find(({gate}) => gate === id)).toMatchObject({
        command: null,
        allowed_tools: [],
        write_set_globs: [],
        manual: true,
        fail_closed: true,
      });
    }
  });

  it('keeps human decisions manual and run-dependent gates as technical stops', () => {
    for (const id of [
      'CR_BRIEF_APPROVED',
      'CR_CV_DESIGN_APPROVED',
      'CR_CV_SPEC_APPROVED',
      'CR_PACKAGE_APPROVED',
      'CR_SUBMISSION_AUTHORIZED',
    ]) {
      const gate = manifest.gates.find((candidate) => candidate.gate === id);
      expect(gate).toMatchObject({
        command: null,
        allowed_tools: [],
        manual: true,
        fail_closed: true,
      });
    }
    for (const id of ['CR_CAREER_EVIDENCE_READY', 'CR_CV_COMPILED']) {
      expect(manifest.gates.find(({gate}) => gate === id)).toMatchObject({
        command: '/usr/bin/false',
        allowed_tools: ['Bash'],
        manual: false,
        fail_closed: true,
        owner: 'qa',
      });
      expect(manifest.gates.find(({gate}) => gate === id)?.label).toContain('COVERAGE_GAP:');
    }
    expect(manifest.gates.some(({gate}) => gate === 'CR_PACKAGE_QA')).toBe(false);
  });

  it('MW_* multimedia gates are manual, fail_closed and have command null', () => {
    const mw = [
      'MW_BRIEF_APPROVED',
      'MW_SPEC_APPROVED',
      'MW_ASSET_REVIEW',
      'MW_EDIT_APPROVED',
      'MW_DISTRIBUTION_AUTHORIZED',
    ];
    for (const id of mw) {
      const gate = manifest.gates.find((g) => g.gate === id);
      expect(gate).toBeDefined();
      expect(gate?.manual).toBe(true);
      expect(gate?.fail_closed).toBe(true);
      expect(gate?.command).toBeNull();
    }
  });

  it('makes brief approval a non-executable governance boundary before production', () => {
    const gate = manifest.gates.find((candidate) => candidate.gate === 'MW_BRIEF_APPROVED');

    expect(gate).toMatchObject({
      label: 'canonical brief approval before production',
      command: null,
      allowed_tools: [],
      write_set_globs: [],
      idempotency: true,
      danger_level: 'medium',
      manual: true,
      fail_closed: true,
      owner: 'governance',
    });
    const packageJson = readRepositoryJson('package.json') as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.trainer).toBe(
      'node --import tsx 02_proceso/workflows/trainer-os/runner.ts',
    );
  });

  it('G13-G17 are manual, fail_closed and have command null', () => {
    const manual = ['G13', 'G14', 'G15', 'G16', 'G17'];
    for (const id of manual) {
      const gate = manifest.gates.find((g) => g.gate === id);
      expect(gate).toBeDefined();
      expect(gate?.manual).toBe(true);
      expect(gate?.fail_closed).toBe(true);
      expect(gate?.command).toBeNull();
    }
  });

  it('non-manual gates have a non-null command', () => {
    for (const gate of manifest.gates) {
      if (!gate.manual) {
        expect(gate.command).not.toBeNull();
      }
    }
  });
});
