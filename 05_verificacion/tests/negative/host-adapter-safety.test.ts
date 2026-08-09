import {existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {loadHostAdapterPackage} from '../../../03_artefactos/host-adapters/generate-host-adapters.ts';
import {runHostAdapterInstaller} from '../../scripts/lib/host-adapter-installer.ts';
import {packageSha256} from '../../scripts/lib/host-adapter-files.ts';

const sourceRoot = process.cwd();
const temporary: string[] = [];
const target = (): string => {
  const path = mkdtempSync(resolve(tmpdir(), 'frames-host-safety-'));
  temporary.push(path);
  return path;
};
afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true})),
);

describe('host adapter safety boundary', () => {
  it.each(['user', 'plugin'] as const)('blocks %s scope without writing', (scope) => {
    const targetRoot = target();
    const result = runHostAdapterInstaller({sourceRoot, targetRoot, scope});
    expect(result.status).toBe('BLOCKED');
    expect(existsSync(resolve(targetRoot, '03_artefactos/host-adapters/install-state.json'))).toBe(
      false,
    );
  });

  it('blocks apply without the exact package hash', () => {
    const targetRoot = target();
    const result = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'APPLY',
      confirmation: '0'.repeat(64),
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.changedRefs).toEqual([]);
  });

  it('refuses foreign content before changing any projection', () => {
    const targetRoot = target();
    const manifest = loadHostAdapterPackage(sourceRoot);
    const foreignRef = manifest.adapters[0]!.projectionRefs[0]!;
    mkdirSync(dirname(resolve(targetRoot, foreignRef)), {recursive: true});
    writeFileSync(resolve(targetRoot, foreignRef), 'foreign owner\n');
    const result = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'APPLY',
      confirmation: packageSha256(sourceRoot),
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.changedRefs).toEqual([]);
    expect(existsSync(resolve(targetRoot, '.gemini/commands/frames/assist.toml'))).toBe(false);
  });

  it('rejects a symlinked projection parent', () => {
    const targetRoot = target();
    const outside = target();
    mkdirSync(resolve(targetRoot, '.agents'), {recursive: true});
    symlinkSync(outside, resolve(targetRoot, '.agents/skills'));
    expect(() => runHostAdapterInstaller({sourceRoot, targetRoot})).toThrow(/symlink target/u);
  });
});
