import {cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {expect, it} from 'vitest';

import {technicalDefenseRunnerSha256V1} from 'workflows/local-extensions/executor-v1.ts';
import {SandboxProbeSchema} from 'workflows/local-extensions/index.ts';
import {makeCurrentTechnicalDefenseProbeFixture} from './technical-defense-runtime-probe.fixture.ts';

it('rebinds only an intact historical synthetic fixture and rejects source drift and symlinks', () => {
  const source = resolve(
    '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense',
  );
  const original = readFileSync(resolve(source, 'sandbox-probe.json'));
  const current = SandboxProbeSchema.parse(
    JSON.parse(makeCurrentTechnicalDefenseProbeFixture(source).toString('utf8')),
  );
  expect(current.runner_sha256).toBe(technicalDefenseRunnerSha256V1());
  for (const ref of ['sandbox-probe.json', 'extension.yml', 'handler.ts']) {
    const target = mkdtempSync(join(tmpdir(), 'frames-r8-fixture-drift-'));
    try {
      cpSync(source, target, {recursive: true});
      writeFileSync(
        resolve(target, ref),
        Buffer.concat([readFileSync(resolve(target, ref)), Buffer.from(' ')]),
      );
      expect(() => makeCurrentTechnicalDefenseProbeFixture(target)).toThrow(/binding drifted/u);
    } finally {
      rmSync(target, {recursive: true, force: true});
    }
  }
  const target = mkdtempSync(join(tmpdir(), 'frames-r8-fixture-symlink-'));
  try {
    cpSync(source, target, {recursive: true});
    rmSync(resolve(target, 'sandbox-probe.json'));
    symlinkSync(resolve(source, 'sandbox-probe.json'), resolve(target, 'sandbox-probe.json'));
    expect(() => makeCurrentTechnicalDefenseProbeFixture(target)).toThrow(/SYMLINK/u);
  } finally {
    rmSync(target, {recursive: true, force: true});
  }
  expect(readFileSync(resolve(source, 'sandbox-probe.json'))).toEqual(original);
});
