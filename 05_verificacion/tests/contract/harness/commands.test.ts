import {describe, expect, it} from 'vitest';

import {CommandsManifestSchema} from '../../../scripts/lib/commands-schema.ts';
import {readRepositoryYaml} from '../../fixtures/verifier/io.ts';

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

  it('declares 45 gates', () => {
    expect(manifest.gates).toHaveLength(45);
  });

  it('every gate id belongs to a governed gate family', () => {
    for (const gate of manifest.gates) {
      expect(gate.gate).toMatch(
        /^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+|CR_[A-Z_]+|EXP_[A-Z_]+|LX_[A-Z_]+|HM_[A-Z_]+|DOCS_[A-Z_]+)$/u,
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

  it('CR_* career decisions are manual and fail closed', () => {
    for (const id of ['CR_BRIEF_APPROVED', 'CR_PACKAGE_APPROVED', 'CR_SUBMISSION_AUTHORIZED']) {
      const gate = manifest.gates.find((candidate) => candidate.gate === id);
      expect(gate).toMatchObject({
        command: null,
        allowed_tools: [],
        manual: true,
        fail_closed: true,
      });
    }
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
