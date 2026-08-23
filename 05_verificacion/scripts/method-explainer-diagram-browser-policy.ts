import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, constants} from 'node:fs';
import {access, chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import {homedir, tmpdir} from 'node:os';
import {dirname, relative, resolve} from 'node:path';
import {createRequire} from 'node:module';
import pivoteFixture from '../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {canonicalJsonSha256} from '../../02_proceso/core/canonical-json-sha256.ts';
export const PINNED_PLAYWRIGHT = {
  browserVersion: '149.0.7827.55',
  executableLabel: 'Google Chrome for Testing',
  packageVersion: '1.61.1',
  revision: '1228',
} as const;
export type BrowserSnapshot = {
  edges: (string | undefined)[];
  frame: number;
  guardCount: number;
  html: string;
  nodes: {client: number[]; id?: string; rect: number[]; scroll: number[]; text: string | null}[];
  pose: string;
  resources: string[];
  rootBinding?: string;
  rootRect: number[];
};
type Stat = {isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean; mode: number};
type VerifyDeps = {
  access(path: string, mode: number): Promise<void>;
  hash(path: string): Promise<string>;
  lstat(path: string): Promise<Stat>;
  realpath(path: string): Promise<string>;
  version(path: string): string;
};
const require = createRequire(import.meta.url);
const playwrightPackage = require.resolve('playwright/package.json');
const playwrightRoot = dirname(playwrightPackage);
const manifestPath = resolve(playwrightRoot, '..', 'playwright-core', 'browsers.json');
const cacheRoot = resolve(
  homedir(),
  '.cache/metodologia/playwright',
  PINNED_PLAYWRIGHT.packageVersion,
);
const fail = (code: string): never => {
  throw new Error(code);
};
export const sha256 = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex');
export const hashFile = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
};
const verifyDefaults: VerifyDeps = {
  access,
  hash: hashFile,
  lstat,
  realpath,
  version: (path) =>
    execFileSync(path, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    }).trim(),
};
export const assertPinnedManifest = (
  packageVersion: string,
  manifest: {browsers?: {browserVersion?: string; name?: string; revision?: string}[]},
): void => {
  const chromium = manifest.browsers?.find(({name}) => name === 'chromium');
  if (
    packageVersion !== PINNED_PLAYWRIGHT.packageVersion ||
    chromium?.revision !== PINNED_PLAYWRIGHT.revision ||
    chromium.browserVersion !== PINNED_PLAYWRIGHT.browserVersion
  )
    fail('BROWSER_PLAYWRIGHT_MANIFEST_DRIFT');
};
export const verifyPinnedExecutable = async (path: string, deps: VerifyDeps = verifyDefaults) => {
  const source = await deps.lstat(path);
  if (source.isSymbolicLink()) fail('BROWSER_EXECUTABLE_SYMLINK');
  const canonical = await deps.realpath(path);
  const stat = await deps.lstat(canonical);
  if (canonical !== path || !stat.isFile() || stat.isSymbolicLink())
    fail('BROWSER_EXECUTABLE_UNSAFE');
  await deps.access(canonical, constants.X_OK);
  const version = deps.version(canonical);
  if (`${PINNED_PLAYWRIGHT.executableLabel} ${PINNED_PLAYWRIGHT.browserVersion}` !== version)
    fail('BROWSER_EXECUTABLE_VERSION_DRIFT');
  const bytesSha256 = await deps.hash(canonical);
  if (!/^[a-f0-9]{64}$/u.test(bytesSha256)) fail('BROWSER_EXECUTABLE_HASH_INVALID');
  return {path: canonical, sha256: bytesSha256, version};
};
export const ensurePinnedChromium = async () => {
  const packageJson = JSON.parse(await readFile(playwrightPackage, 'utf8')) as {version?: string};
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Parameters<
    typeof assertPinnedManifest
  >[1];
  assertPinnedManifest(packageJson.version ?? '', manifest);
  await mkdir(cacheRoot, {mode: 0o700, recursive: true});
  await chmod(cacheRoot, 0o700);
  const sourceCache = await lstat(cacheRoot);
  const canonicalCache = await realpath(cacheRoot);
  const canonicalProject = await realpath(process.cwd());
  const cacheStat = await lstat(canonicalCache);
  if (
    !relative(canonicalProject, canonicalCache).startsWith('..') ||
    sourceCache.isSymbolicLink() ||
    !cacheStat.isDirectory() ||
    cacheStat.isSymbolicLink() ||
    (cacheStat.mode & 0o077) !== 0
  )
    fail('BROWSER_CACHE_ROOT_UNSAFE');
  process.env.PLAYWRIGHT_BROWSERS_PATH = canonicalCache;
  const {chromium} = await import('playwright');
  let executable = chromium.executablePath();
  try {
    await access(executable, constants.X_OK);
  } catch {
    execFileSync(
      process.execPath,
      [resolve(playwrightRoot, 'cli.js'), 'install', 'chromium', '--no-shell', '--no-progress'],
      {env: {...process.env, PLAYWRIGHT_BROWSERS_PATH: canonicalCache}, stdio: 'inherit'},
    );
    executable = chromium.executablePath();
  }
  return verifyPinnedExecutable(executable);
};
export const withCleanup = async <T>(run: () => Promise<T>, cleanup: () => Promise<void>) => {
  let outcome: {error: unknown; ok: false} | {ok: true; value: T};
  try {
    outcome = {ok: true, value: await run()};
  } catch (error) {
    outcome = {error, ok: false};
  }
  try {
    await cleanup();
  } catch (error) {
    if (outcome.ok) outcome = {error, ok: false};
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
};
export const createOwnedTempRoot = async () => {
  const parent = await realpath(tmpdir());
  const root = await realpath(await mkdtemp(resolve(parent, 'metodologia-diagram-browser-')));
  await chmod(root, 0o700);
  const stat = await lstat(root);
  const relation = relative(parent, root);
  const safe =
    relation && !relation.startsWith('..') && stat.isDirectory() && !stat.isSymbolicLink();
  if (!safe || (stat.mode & 0o077) !== 0) {
    await rm(root, {force: true, recursive: true});
    fail('BROWSER_TEMP_ROOT_UNSAFE');
  }
  let cleaned = false;
  return {
    root,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      const current = await lstat(root);
      if (current.isSymbolicLink() || !current.isDirectory()) fail('BROWSER_TEMP_ROOT_CHANGED');
      await rm(root, {force: true, recursive: true});
    },
  };
};
export const assertBrowserSnapshot = (snapshot: BrowserSnapshot): void => {
  const diagram = pivoteFixture.diagram;
  const expectedBinding = `${canonicalJsonSha256(diagram)}:${diagram.spec_sha256}:${diagram.beat_budget_sha256}`;
  const expectedEdges = diagram.edges
    .filter(({start_frame}) => snapshot.frame >= start_frame)
    .map(({id}) => id)
    .sort();
  if (snapshot.resources.length) fail('BROWSER_REMOTE_REQUEST');
  if (snapshot.rootBinding !== expectedBinding) fail('BROWSER_ROOT_BINDING_MISMATCH');
  if (snapshot.guardCount !== 1) fail('BROWSER_LAYOUT_GUARD_ABSENT');
  if (snapshot.rootRect.join() !== '0,0,1080,1920') fail('BROWSER_ROOT_GEOMETRY_MISMATCH');
  if (snapshot.nodes.some(({client, scroll}) => scroll[0]! > client[0]! || scroll[1]! > client[1]!))
    fail('BROWSER_NODE_OVERFLOW');
  const safeZone = diagram.stage.safe_zone;
  if (
    snapshot.nodes.some(({rect: [x = 0, y = 0, width = 0, height = 0]}) =>
      [
        x < safeZone.x * 1080,
        y < safeZone.y * 1920,
        x + width > (safeZone.x + safeZone.width) * 1080,
        y + height > (safeZone.y + safeZone.height) * 1920,
      ].some(Boolean),
    )
  )
    fail('BROWSER_SAFE_ZONE_VIOLATION');
  const ids = (values: readonly {id?: string}[]) =>
    values
      .map(({id}) => id)
      .sort()
      .join();
  if (ids(snapshot.nodes) !== ids(diagram.nodes)) fail('BROWSER_NODE_MISSING');
  if ([...snapshot.edges].sort().join() !== expectedEdges.join()) fail('BROWSER_EDGE_MISSING');
};
