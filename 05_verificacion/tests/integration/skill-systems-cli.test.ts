import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {runSkillSystemCli} from '../../scripts/skills-system-cli.ts';

const root = process.cwd();

describe('Skill Systems project-local tools', () => {
  it('keeps package inventory UNKNOWN without a material Skill Case', async () => {
    const result = await runSkillSystemCli('inspect', ['--check'], root);
    expect(result).toMatchObject({status: 'UNKNOWN', coverage_gap: 'SKILL_SYSTEM_CASE_REQUIRED'});
    expect(result.packages).toHaveLength(8);
  });

  it('binds inspection to a material Skill Case', async () => {
    expect(
      await runSkillSystemCli(
        'inspect',
        ['--input', '05_verificacion/tests/fixtures/skill-systems/case.json'],
        root,
      ),
    ).toMatchObject({status: 'PASS', case_id: 'CASE-CLI-001'});
  });

  it('keeps scaffold and package dry-run by default', async () => {
    const before = await readFile('02_proceso/workflows/skill-systems/skill-suite.yml', 'utf8');
    expect(await runSkillSystemCli('scaffold', [], root)).toMatchObject({
      mode: 'DRY_RUN',
      writes: [],
    });
    expect(await runSkillSystemCli('package', ['--check'], root)).toMatchObject({
      status: 'UNKNOWN',
      mode: 'DRY_RUN',
      coverage_gap: 'MATERIAL_RELEASE_CAPSULE_REQUIRED',
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
    expect(
      await runSkillSystemCli(
        'validate',
        ['--input', '05_verificacion/tests/fixtures/skill-systems/case.json'],
        root,
      ),
    ).toMatchObject({status: 'PASS', validated_schema: 'skill-system-case-v1'});
    expect(await runSkillSystemCli('validate', ['--check'], root)).toMatchObject({
      status: 'UNKNOWN',
      checked_contracts: 0,
    });
    const dir = await mkdtemp(path.join(tmpdir(), 'frames-sss-'));
    const ref = path.relative(root, path.join(dir, 'case.json'));
    await writeFile(path.join(dir, 'case.json'), JSON.stringify({schema_version: 'unsupported'}));
    await expect(runSkillSystemCli('validate', ['--input', ref], root)).rejects.toThrow(
      'SSS_INPUT_PATH001',
    );
  });

  it('requires a material evaluation and excludes failed infrastructure', async () => {
    expect(await runSkillSystemCli('evaluate', ['--check'], root)).toMatchObject({
      denominator: 0,
      verdict: 'UNKNOWN',
      coverage_gap: 'MATERIAL_EVAL_RUN_REQUIRED',
    });
    expect(
      await runSkillSystemCli(
        'evaluate',
        ['--input', '05_verificacion/tests/fixtures/skill-systems/eval-run.json'],
        root,
      ),
    ).toMatchObject({
      denominator: 2,
      excluded_infrastructure: 1,
      verdict: 'PASS',
    });
  });

  it('fails closed at the process boundary when an automatic gate has no input', () => {
    for (const action of ['inspect', 'validate', 'evaluate', 'package']) {
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', '05_verificacion/scripts/skills-system-cli.ts', action, '--stdin'],
        {cwd: root, encoding: 'utf8', input: ''},
      );
      expect(result.status, `${action}: ${result.stderr}`).toBe(2);
      expect(result.stdout).toContain('UNKNOWN');
    }
  });
});
