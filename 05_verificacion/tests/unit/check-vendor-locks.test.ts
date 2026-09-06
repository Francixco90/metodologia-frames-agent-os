import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {afterEach, describe, expect, it} from 'vitest';

import {
  checkVendorLocks,
  loadVendorLocks,
  syncVendorPack,
} from '../../scripts/check-vendor-locks.ts';

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
const roots: string[] = [];
const put = (root: string, path: string, content: string): void => {
  mkdirSync(join(root, path, '..'), {recursive: true});
  writeFileSync(join(root, path), content);
};
const repository = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'frames-vendor-lock-'));
  roots.push(root);
  return root;
};
const upstream = (): string => {
  const repo = mkdtempSync(join(tmpdir(), 'frames-vendor-upstream-'));
  roots.push(repo);
  const git = (args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8'}).trim();
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'user.name', 'Vendor Test']);
  put(repo, 'skills/demo/SKILL.md', '# demo\n');
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'upstream']);
  return `${repo}|${git(['rev-parse', 'HEAD'])}`;
};
const lockFor = (root: string, repo: string, commit: string, hash: string): void =>
  put(
    root,
    '01_intencion/demo-pack/source-lock.json',
    JSON.stringify({
      schema_version: 'vendor-source-lock-v1',
      vendor_root: 'skills/vendor/demo-pack',
      vendor_root_hashes: {},
      vendors: [
        {
          destination: 'skills/vendor/demo-pack/demo/',
          source_repo: repo,
          source_commit: commit,
          source_path: 'skills/demo/',
          critical_file_hashes: {'SKILL.md': hash},
        },
      ],
    }),
  );

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, {recursive: true, force: true});
});

describe('vendor locks', () => {
  it('passes when a locked pack is absent and fails closed on drift once present', () => {
    const root = repository();
    lockFor(root, 'https://example.invalid/repo.git', 'a'.repeat(40), sha('# demo\n'));
    expect(loadVendorLocks(root).claims).toHaveLength(1);
    expect(checkVendorLocks(root)).toEqual({
      materialized: [],
      tracked: [],
      absent: ['demo-pack'],
      drift: [],
    });
    put(root, '03_artefactos/skills/vendor/demo-pack/demo/SKILL.md', '# demo\n');
    expect(checkVendorLocks(root).drift).toEqual([]);
    put(root, '03_artefactos/skills/vendor/demo-pack/demo/SKILL.md', '# tampered\n');
    expect(checkVendorLocks(root).drift).toEqual([
      '03_artefactos/skills/vendor/demo-pack/demo/SKILL.md',
    ]);
  });

  it('re-materializes a pack from its pinned upstream commit', () => {
    const root = repository();
    const [repo, commit] = upstream().split('|') as [string, string];
    lockFor(root, repo, commit, sha('# demo\n'));
    expect(syncVendorPack(root, 'demo-pack')).toBe(1);
    expect(
      readFileSync(join(root, '03_artefactos/skills/vendor/demo-pack/demo/SKILL.md'), 'utf8'),
    ).toBe('# demo\n');
    expect(checkVendorLocks(root)).toEqual({
      materialized: ['demo-pack'],
      tracked: [],
      absent: [],
      drift: [],
    });
    expect(() => syncVendorPack(root, 'unknown-pack')).toThrow(/VENDOR-SYNC001/u);
  });
});
