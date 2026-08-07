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

  it('declares 32 gates', () => {
    expect(manifest.gates).toHaveLength(32);
  });

  it('every gate id matches ^G[0-9]{2}([A-Z_]+)?$/u or ^MW_[A-Z_]+$/u', () => {
    for (const gate of manifest.gates) {
      expect(gate.gate).toMatch(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u);
    }
  });

  it('MW_* multimedia gates are manual, fail_closed and have command null', () => {
    const mw = ['MW_SPEC_APPROVED', 'MW_ASSET_REVIEW', 'MW_EDIT_APPROVED', 'MW_DISTRIBUTION_AUTHORIZED'];
    for (const id of mw) {
      const gate = manifest.gates.find((g) => g.gate === id);
      expect(gate).toBeDefined();
      expect(gate?.manual).toBe(true);
      expect(gate?.fail_closed).toBe(true);
      expect(gate?.command).toBeNull();
    }
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