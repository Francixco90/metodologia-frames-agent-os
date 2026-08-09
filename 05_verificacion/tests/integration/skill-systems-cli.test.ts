import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
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
    expect(result.packages).toHaveLength(9);
  });

  it('binds inspection to a material Skill Case', async () => {
    expect(
      await runSkillSystemCli(
        'inspect',
        ['--input', '05_verificacion/tests/fixtures/skill-systems/case-gate.json'],
        root,
      ),
    ).toMatchObject({status: 'PASS', case_id: 'CASE-CLI-001'});
    const bundle = JSON.parse(
      readFileSync('05_verificacion/tests/fixtures/skill-systems/case-gate.json', 'utf8'),
    ) as {source_refs: {ref: string; sha256: string}[]};
    bundle.source_refs[0]!.ref = 'does/not/exist.yml';
    const dir = await mkdtemp(path.join(root, 'work/private/sss-case-'));
    const inputRef = path.relative(root, path.join(dir, 'bundle.json'));
    await writeFile(path.join(dir, 'bundle.json'), JSON.stringify(bundle));
    await expect(runSkillSystemCli('inspect', ['--input', inputRef], root)).rejects.toThrow();
    await rm(dir, {recursive: true});
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

  it('uses gate-specific architecture and static bundles', async () => {
    expect(
      await runSkillSystemCli(
        'validate',
        [
          '--gate',
          'architecture',
          '--input',
          '05_verificacion/tests/fixtures/skill-systems/architecture-gate.json',
        ],
        root,
      ),
    ).toMatchObject({status: 'PASS', map_id: 'MAP-CLI-001', decision_id: 'DEC-CLI-001'});
    expect(
      await runSkillSystemCli(
        'validate',
        [
          '--gate',
          'static',
          '--input',
          '05_verificacion/tests/fixtures/skill-systems/static-gate.json',
        ],
        root,
      ),
    ).toMatchObject({status: 'PASS', component_ids: ['COMP-CLI-001']});
    await expect(
      runSkillSystemCli(
        'validate',
        [
          '--gate',
          'architecture',
          '--input',
          '05_verificacion/tests/fixtures/skill-systems/case.json',
        ],
        root,
      ),
    ).rejects.toThrow();
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
    const run = JSON.parse(
      readFileSync('05_verificacion/tests/fixtures/skill-systems/eval-run.json', 'utf8'),
    ) as {cases: {evidence_refs: {ref: string; sha256: string}[]}[]};
    run.cases[0]!.evidence_refs[0]!.ref = 'does/not/exist.json';
    const dir = await mkdtemp(path.join(root, 'work/private/sss-eval-'));
    const inputRef = path.relative(root, path.join(dir, 'run.json'));
    await writeFile(path.join(dir, 'run.json'), JSON.stringify(run));
    await expect(runSkillSystemCli('evaluate', ['--input', inputRef], root)).rejects.toThrow();
    await rm(dir, {recursive: true});
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

  it('returns a non-zero process result for insufficient material coverage', () => {
    const run = JSON.parse(
      readFileSync('05_verificacion/tests/fixtures/skill-systems/eval-run.json', 'utf8'),
    ) as Record<string, unknown>;
    run.coverage_policy = {minimum_eligible_cases: 3, maximum_infrastructure_failure_ratio: 0.34};
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '05_verificacion/scripts/skills-system-cli.ts', 'evaluate', '--stdin'],
      {cwd: root, encoding: 'utf8', input: JSON.stringify(run)},
    );
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('UNKNOWN');
  });
});
