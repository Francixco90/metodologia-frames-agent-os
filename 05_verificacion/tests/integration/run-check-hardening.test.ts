import {mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {GateIdSchema} from '../../scripts/lib/commands-schema.ts';
import {CheckRunReceiptSchema} from '../../scripts/lib/check-run-receipt-schema.ts';

const ROOT = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const officialRoute = packageJson.scripts['task:run-check']!;
const repositoryReceipts = (): string[] =>
  readdirSync(resolve(ROOT, '04_estado/receipts/check-runs')).sort();

const temporaryProject = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'run-check-hardening-'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({private: true, scripts: {'check:toolchain': '/usr/bin/true'}}),
    'utf8',
  );
  symlinkSync(resolve(ROOT, 'scripts'), join(root, 'scripts'), 'dir');
  symlinkSync(resolve(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
};

const runOfficialRoute = (root: string, gate: string, hostileModule?: string) =>
  spawnSync(`${officialRoute} ${gate}`, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      BASH_ENV: '/dev/null',
      ENV: '/dev/null',
      NODE_OPTIONS: hostileModule ? `--require=${hostileModule}` : '',
    },
    shell: '/bin/sh',
  });

describe('task:run-check environment hardening', () => {
  it('sanitizes the runner before Node loads', () => {
    expect(officialRoute).toBe(
      '/usr/bin/env -u NODE_OPTIONS -u BASH_ENV -u ENV node --import tsx scripts/run-check.ts',
    );
  });

  it('records a technical failure under hostile env without writing the repository', () => {
    const root = temporaryProject();
    const receiptsBefore = repositoryReceipts();
    const hostileModule = join(root, 'hostile.cjs');
    writeFileSync(hostileModule, 'process.exit(0);\n', 'utf8');

    const result = runOfficialRoute(root, 'G09_VIDEO_OS', hostileModule);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain('PASS run-check');
    expect(result.stdout).toContain('RECORDED run-check');

    const receipt = CheckRunReceiptSchema.parse(
      parse(readFileSync(join(root, '04_estado/receipts/check-runs/C-001/receipt.yml'), 'utf8')),
    );
    expect(receipt).toMatchObject({gate: 'G09_VIDEO_OS', exit_code: 1, append_only: true});
    expect(repositoryReceipts()).toEqual(receiptsBefore);
  });

  it('preserves success, manual and unknown behavior', () => {
    const successRoot = temporaryProject();
    const success = runOfficialRoute(successRoot, 'G00');
    expect(success.status).toBe(0);
    expect(success.stdout).toContain('PASS run-check');

    for (const gate of ['G13', 'NOT_A_GATE']) {
      const root = temporaryProject();
      const result = runOfficialRoute(root, gate);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain(gate === 'G13' ? 'manual fail-closed' : 'no encontrado');
    }
  });

  it('shares the governed GateId authority with receipts', () => {
    expect(CheckRunReceiptSchema.shape.gate).toBe(GateIdSchema);
    for (const gate of [
      'G09_VIDEO_OS',
      'CR_CV_COMPILED',
      'MW_BRIEF_APPROVED',
      'VO_INTAKE_COMPLETE',
      'EXP_BRIEF_APPROVED',
      'LX_BRIEF_APPROVED',
      'HM_CHANGE_APPROVED',
      'SSS_CASE_READY',
      'DOCS_TRANSVERSAL_COMPLETE',
    ]) {
      expect(CheckRunReceiptSchema.shape.gate.parse(gate)).toBe(gate);
    }
  });
});
