import {createHash} from 'node:crypto';
import {chmod, lstat, mkdtemp, readFile, readdir, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {bundle} from '@remotion/bundler';
import {describe, expect, it} from 'vitest';

const treeDigest = async (root: string) => {
  const files = (await readdir(root, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(relative(root, file)).update(await readFile(file));
  return {files, sha256: hash.digest('hex')};
};

describe('method explainer browser-safe bundle', () => {
  it('bundles the real PIVOTE DiagramStage offline with deterministic bytes', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'metodologia-browser-safe-sha-'));
    await chmod(root, 0o700);
    try {
      const canonicalRoot = await realpath(root);
      const stat = await lstat(canonicalRoot);
      expect(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0).toBe(true);
      expect(relative(await realpath(tmpdir()), canonicalRoot).startsWith('..')).toBe(false);
      const entryPoint = fileURLToPath(
        new URL(
          '../../fixtures/renderers/method-explainer-browser-safe-entry.tsx',
          import.meta.url,
        ),
      );
      const run = (name: string) =>
        bundle({
          enableCaching: false,
          entryPoint,
          outDir: resolve(root, name),
          webpackOverride: (config) => ({
            ...config,
            resolve: {
              ...config.resolve,
              alias: {...config.resolve?.alias, workflows: resolve('02_proceso/workflows')},
            },
          }),
        });
      const [left, right] = await Promise.all([run('A'), run('B')]);
      const [a, b] = await Promise.all([treeDigest(left), treeDigest(right)]);
      expect(a.files.length).toBeGreaterThan(1);
      expect(a.sha256).toBe(b.sha256);
      const bundled = (await Promise.all(a.files.map((file) => readFile(file, 'utf8')))).join('\n');
      expect(bundled).toContain('MethodExplainerBrowserSafeSha');
      expect(bundled).not.toContain('node:crypto');
    } finally {
      await rm(root, {force: true, recursive: true});
    }
  }, 60_000);
});
