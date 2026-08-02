import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

const root = process.cwd();

describe('Harness rename to metodologia-fremes-agent-os', () => {
  it('package.json name is metodologia-fremes-agent-os', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      name: string;
    };
    expect(pkg.name).toBe('metodologia-fremes-agent-os');
  });

  it('binding.json harness_id is metodologia-fremes-agent-os', () => {
    const binding = JSON.parse(
      readFileSync(
        resolve(root, 'docs/program/token-efficiency/fremes-agent-os-binding.json'),
        'utf8',
      ),
    ) as {harness_id: string};
    expect(binding.harness_id).toBe('metodologia-fremes-agent-os');
  });

  it('program_id is NOT renamed (governance identifier)', () => {
    const dag = readFileSync(resolve(root, 'docs/program/dag.yml'), 'utf8');
    expect(dag).toContain('program_id: metodologia-instagram-agent-os');
  });

  it('ledger_id is NOT renamed (closed baseline identifier)', () => {
    const ledger = readFileSync(resolve(root, 'docs/program/file-disposition-ledger.yml'), 'utf8');
    expect(ledger).toContain('ledger_id: instagram-agent-os-v2-baseline-disposition');
  });
});
