import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {runSkillSystemCli} from '../../scripts/skills-system-cli.ts';

const root = process.cwd();

describe('Skill Systems project-local tools', () => {
  it('inspects the eight governed packages read-only', async () => {
    const result = await runSkillSystemCli('inspect', ['--check'], root);
    expect(result).toMatchObject({status: 'PASS'});
    expect(result.packages).toHaveLength(8);
  });

  it('keeps scaffold and package dry-run by default', async () => {
    const before = await readFile('02_proceso/workflows/skill-systems/skill-suite.yml', 'utf8');
    expect(await runSkillSystemCli('scaffold', [], root)).toMatchObject({
      mode: 'DRY_RUN',
      writes: [],
    });
    expect(await runSkillSystemCli('package', ['--check'], root)).toMatchObject({
      mode: 'DRY_RUN',
      candidate_count: 8,
      writes: [],
    });
    expect(await readFile('02_proceso/workflows/skill-systems/skill-suite.yml', 'utf8')).toBe(
      before,
    );
  });

  it('refuses mutation without gate and WorkOrder', async () => {
    await expect(runSkillSystemCli('scaffold', ['--apply'], root)).rejects.toThrow(
      'SSS_SCAFFOLD_GATE_AND_WORK_ORDER_REQUIRED',
    );
    await expect(runSkillSystemCli('package', ['--apply'], root)).rejects.toThrow(
      'SSS_PACKAGE_GATE_AND_WORK_ORDER_REQUIRED',
    );
  });

  it('rejects unsafe input references before reading', async () => {
    await expect(runSkillSystemCli('validate', ['--input', '/etc/passwd'], root)).rejects.toThrow(
      'SSS_INPUT_PATH001',
    );
  });

  it('validates a material contract supplied by relative ref', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'frames-sss-'));
    const ref = path.relative(root, path.join(dir, 'case.json'));
    await writeFile(path.join(dir, 'case.json'), JSON.stringify({schema_version: 'unsupported'}));
    await expect(runSkillSystemCli('validate', ['--input', ref], root)).rejects.toThrow(
      'SSS_INPUT_PATH001',
    );
  });

  it('smoke-evaluates without counting failed infrastructure', async () => {
    expect(await runSkillSystemCli('evaluate', ['--check'], root)).toMatchObject({
      denominator: 1,
      excluded_infrastructure: 1,
      verdict: 'PASS',
    });
  });
});
