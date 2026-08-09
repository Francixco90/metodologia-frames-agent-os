import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  renderHostAdapterProjections,
  loadHostAdapterPackage,
} from '../../../03_artefactos/host-adapters/generate-host-adapters.ts';
import {runHostAdapterInstaller} from '../../scripts/lib/host-adapter-installer.ts';
import {packageSha256} from '../../scripts/lib/host-adapter-files.ts';

const sourceRoot = process.cwd();
const temporary: string[] = [];
const target = (): string => {
  const path = mkdtempSync(resolve(tmpdir(), 'frames-host-adapter-'));
  temporary.push(path);
  return path;
};
afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true})),
);

describe('repository host adapter installation', () => {
  it('plans without writes, applies with confirmation, verifies and uninstalls recoverably', () => {
    const targetRoot = target();
    const digest = packageSha256(sourceRoot);
    const projections = renderHostAdapterProjections(loadHostAdapterPackage(sourceRoot));
    const plan = runHostAdapterInstaller({sourceRoot, targetRoot});
    expect(plan).toMatchObject({operation: 'PLAN', status: 'PASS'});
    expect(plan.changedRefs).toHaveLength(5);
    for (const ref of Object.keys(projections))
      expect(existsSync(resolve(targetRoot, ref))).toBe(false);

    const applied = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'APPLY',
      confirmation: digest,
    });
    expect(applied.status).toBe('PASS');
    expect(applied.changedRefs).toHaveLength(5);
    for (const [ref, expected] of Object.entries(projections)) {
      expect(readFileSync(resolve(targetRoot, ref), 'utf8')).toBe(expected);
    }

    const verified = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'VERIFY',
      confirmation: digest,
    });
    expect(verified).toMatchObject({status: 'PASS', changedRefs: []});
    expect(verified.verifiedRefs).toHaveLength(5);

    const repeated = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'APPLY',
      confirmation: digest,
    });
    expect(repeated).toMatchObject({status: 'PASS', changedRefs: []});

    const removed = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'UNINSTALL',
      confirmation: digest,
    });
    expect(removed).toMatchObject({status: 'PASS', restoredRefs: []});
    for (const ref of Object.keys(projections))
      expect(existsSync(resolve(targetRoot, ref))).toBe(false);
    expect(existsSync(resolve(targetRoot, '03_artefactos/host-adapters/backups'))).toBe(true);
  });

  it('backs up and restores a recognized previous installation', () => {
    const targetRoot = target();
    const digest = packageSha256(sourceRoot);
    const projections = renderHostAdapterProjections(loadHostAdapterPackage(sourceRoot));
    const [firstRef] = Object.keys(projections);
    const previous = 'previous governed adapter\n';
    mkdirSync(dirname(resolve(targetRoot, firstRef!)), {recursive: true});
    writeFileSync(resolve(targetRoot, firstRef!), previous);
    const stateRef = resolve(targetRoot, '03_artefactos/host-adapters/install-state.json');
    mkdirSync(dirname(stateRef), {recursive: true});
    const priorDigest = 'd'.repeat(64);
    writeFileSync(
      stateRef,
      `${JSON.stringify({packageId: 'frames-assist-host-adapters', packageSha256: priorDigest, files: {[firstRef!]: {installedSha256: packageSha256For(previous)}}}, null, 2)}\n`,
    );
    const applied = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'APPLY',
      confirmation: digest,
    });
    expect(applied.status).toBe('PASS');
    const removed = runHostAdapterInstaller({
      sourceRoot,
      targetRoot,
      operation: 'UNINSTALL',
      confirmation: digest,
    });
    expect(removed.restoredRefs).toContain(firstRef);
    expect(readFileSync(resolve(targetRoot, firstRef!), 'utf8')).toBe(previous);
  });
});

const packageSha256For = (value: string): string => {
  return createHash('sha256').update(value).digest('hex');
};
