import {mkdtempSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, dirname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {describe, expect, it} from 'vitest';

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
  const bin = mkdtempSync(resolve(tmpdir(), 'frames-node-only-'));
  symlinkSync(process.execPath, resolve(bin, process.platform === 'win32' ? 'node.exe' : 'node'));
  return [bin, dirname(process.execPath)].join(delimiter);
};

describe('creation skill media profiles', () => {
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
