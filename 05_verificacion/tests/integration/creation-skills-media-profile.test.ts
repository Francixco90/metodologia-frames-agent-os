import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, dirname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {describe, expect, it, vi} from 'vitest';

import {validateSkill, type Registry} from '../../scripts/creation-v3-checks.ts';

const root = process.cwd();
const transcriptChecker = resolve(
  root,
  'skills/content-os-transcript-intelligence/scripts/check-skill.mjs',
);
const videoChecker = resolve(root, 'skills/content-os-general-video/scripts/lib/check-suite.mjs');

const run = (checker: string, profile: 'ci-code-only' | 'local-full', path = process.env.PATH) =>
  spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: 'utf8',
    env: {...process.env, METODOLOGIA_TOOLCHAIN_PROFILE: profile, PATH: path},
  });

const nodeOnlyPath = () => {
  const bin = fs.mkdtempSync(resolve(tmpdir(), 'frames-node-only-'));
  fs.symlinkSync(
    process.execPath,
    resolve(bin, process.platform === 'win32' ? 'node.exe' : 'node'),
  );
  return [bin, dirname(process.execPath)].join(delimiter);
};

describe('creation skill media profiles', () => {
  it('Python validation preserves package bytes and rejects changed sources or checker failures', () => {
    const fixtureRoot = fs.mkdtempSync(resolve(tmpdir(), 'frames-python-check-'));
    const directory = resolve(fixtureRoot, 'skills/python-check-fixture');
    fs.mkdirSync(directory, {recursive: true});
    const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
    const packageDigest = () =>
      sha256(
        fs
          .readdirSync(directory, {recursive: true, encoding: 'utf8'})
          .filter((name) => fs.statSync(resolve(directory, name)).isFile())
          .sort()
          .map((name) => `${sha256(fs.readFileSync(resolve(directory, name)))}  ${name}`)
          .join('\n') + '\n',
      );
    const lineage = {
      skill_id: 'python-check-fixture',
      version: '0.1.0',
      lifecycle_state: 'candidate',
      execution_scope: 'local-evaluation',
      external_fragments_reused: false,
      publication_authority: false,
    };
    const skill = {
      id: 'python-check-fixture',
      registryState: 'candidate' as const,
      scope: lineage.execution_scope,
      executable: 'python3' as const,
      check: ['-Xpycache_prefix=', 'skills/python-check-fixture/check.py'],
    };
    const markdown = `---\nname: ${skill.id}\nversion: 0.1.0\nlifecycle_state: candidate\ndescription: This skill should be used when validating Python fixtures\n---\n`;
    fs.writeFileSync(resolve(directory, 'SKILL.md'), markdown);
    fs.writeFileSync(resolve(directory, 'LINEAGE.yml'), JSON.stringify(lineage));
    fs.writeFileSync(resolve(directory, 'own_module.py'), 'value = 1\n');
    const checker = resolve(directory, 'check.py');
    fs.writeFileSync(
      checker,
      'import own_module\nimport os\nassert os.environ["FRAME_FIXTURE_TOKEN"] == "keep"\n',
    );
    const before = packageDigest();
    const registry: Registry = {
      entries: [
        {
          ...lineage,
          current_state: lineage.lifecycle_state,
          content_sha256: sha256(markdown),
          package_manifest_sha256: before,
          lineage_ref: `skills/${skill.id}/LINEAGE.yml`,
          publication_authority: false,
        },
      ],
      events: [
        {skill_id: skill.id, event_order: 1, from: null, to: 'candidate', actor_id: 'fixture'},
      ],
    };
    vi.stubEnv('PYTHONDONTWRITEBYTECODE', '0');
    vi.stubEnv('FRAME_FIXTURE_TOKEN', 'keep');
    try {
      const ctx = {root: fixtureRoot, sha256, packageDigest};
      expect(validateSkill(skill, registry, ctx)).toEqual([]);
      expect(validateSkill(skill, registry, ctx)).toEqual([]);
      expect(packageDigest()).toBe(before);
      expect(fs.readdirSync(directory, {recursive: true})).not.toContain('__pycache__');
      fs.writeFileSync(resolve(directory, 'own_module.py'), 'value = 2\n');
      expect(validateSkill(skill, registry, ctx).join('\n')).toContain('SKL-H03-005');
      fs.writeFileSync(checker, 'raise RuntimeError("fixture rejection")\n');
      expect(validateSkill(skill, registry, ctx).join('\n')).toContain('SKL-H03-007');
    } finally {
      vi.unstubAllEnvs();
      fs.rmSync(fixtureRoot, {recursive: true, force: true});
    }
  });

  it.each([
    ['transcript intelligence', transcriptChecker],
    ['general video', videoChecker],
  ])(
    '%s passes code-only with an explicit media coverage gap',
    (_name, checker) => {
      const result = run(checker, 'ci-code-only', nodeOnlyPath());

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('PASS CODE-ONLY');
      expect(result.stdout).toContain('MEDIA COVERAGE GAP');
    },
    30_000,
  );

  it('general-video preserves the failed media command and never parses a missing receipt', () => {
    const result = run(videoChecker, 'local-full', nodeOnlyPath());

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('COSR-GV_CLI_RENDER');
    expect(result.stderr).not.toContain('render-receipt.json');
    expect(result.stderr).not.toContain('ENOENT: no such file or directory, open');
  });

  it('transcript local-full reports the missing decoder explicitly', () => {
    const result = run(transcriptChecker, 'local-full', nodeOnlyPath());

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('COSTI_AUDIO_TOOLCHAIN_UNAVAILABLE');
  });
});
