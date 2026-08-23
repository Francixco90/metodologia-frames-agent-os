import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import type {BrowserLog} from '@remotion/renderer';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import pivoteFixture from '../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {
  assertBrowserSnapshot,
  createOwnedTempRoot,
  type BrowserSnapshot,
  ensurePinnedChromium,
  PINNED_PLAYWRIGHT,
  sha256,
  verifyPinnedExecutable,
  withCleanup,
} from './method-explainer-diagram-browser-policy.ts';
const marker = '__DIAGRAM_BROWSER_PROOF__';
const poses = pivoteFixture.diagram.required_poses;
const frames = [
  poses.container_frame - 1,
  poses.container_frame,
  poses.components_settled_frame,
  pivoteFixture.diagram.edges[0]!.start_frame,
  poses.connectors_complete_frame,
  poses.closing_frame,
] as const;
const fail = (code: string): never => {
  throw new Error(code);
};
type FetchSession = {
  on(event: string, handler: (payload: unknown) => void): void;
  send(method: string, params?: unknown): Promise<unknown>;
};
type BrowserTarget = {createCDPSession(): Promise<FetchSession>; type(): string};
const installRequestPolicy = async (browser: Awaited<ReturnType<typeof openBrowser>>) => {
  const failures: string[] = [];
  const remote: string[] = [];
  const attached = new WeakSet<object>();
  const attach = async (target: BrowserTarget) => {
    if (target.type() !== 'page' || attached.has(target)) return;
    attached.add(target);
    const session = await target.createCDPSession();
    session.on('Runtime.exceptionThrown', (payload) =>
      failures.push(`PAGE_ERROR:${JSON.stringify(payload)}`),
    );
    session.on('Fetch.requestPaused', (payload) => {
      const event = payload as {request: {url: string}; requestId: string};
      const url = new URL(event.request.url);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (!local) remote.push(url.href);
      void session
        .send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
          ...(local ? {} : {errorReason: 'BlockedByClient'}),
          requestId: event.requestId,
        })
        .catch((error: unknown) => failures.push(String(error)));
    });
    await session.send('Runtime.enable');
    await session.send('Fetch.enable', {
      patterns: [{urlPattern: 'http://*'}, {urlPattern: 'https://*'}],
    });
  };
  const listener = (target: unknown) => {
    void attach(target as BrowserTarget).catch((error: unknown) => failures.push(String(error)));
  };
  browser.on('targetcreated', listener);
  await Promise.all(browser.targets().map((target) => attach(target)));
  return {failures, remote};
};
const render = async (
  browser: Awaited<ReturnType<typeof openBrowser>>,
  serveUrl: string,
  frame: number,
  output: string,
) => {
  const logs: BrowserLog[] = [];
  const runtime = {
    chromeMode: 'chrome-for-testing' as const,
    chromiumOptions: {gl: 'angle' as const},
    inputProps: {},
    logLevel: 'error' as const,
    onBrowserLog: (log: BrowserLog) => logs.push(log),
    puppeteerInstance: browser,
    serveUrl,
  };
  const composition = await selectComposition({
    ...runtime,
    id: 'MethodExplainerDiagramBrowserProof',
  });
  await renderStill({
    ...runtime,
    composition,
    frame,
    imageFormat: 'png',
    isProduction: false,
    output,
    overwrite: false,
  });
  const errors = logs.filter(({type}) => ['error', 'warning'].includes(type));
  if (errors.length) fail(`BROWSER_CONSOLE_ERROR:${errors.map(({text}) => text).join('|')}`);
  const matches = logs.map(({text}) => text).filter((text) => text.startsWith(marker));
  if (matches.length !== 1) fail('BROWSER_DOM_PROOF_ABSENT');
  return JSON.parse(matches[0]!.slice(marker.length)) as BrowserSnapshot;
};
export const runDiagramBrowserProbe = async () => {
  const owned = await createOwnedTempRoot();
  return withCleanup(async () => {
    const executable = await ensurePinnedChromium();
    const entryPoint = fileURLToPath(
      new URL(
        '../tests/fixtures/renderers/method-explainer-diagram-browser-entry.tsx',
        import.meta.url,
      ),
    );
    const serveUrl = await bundle({
      enableCaching: false,
      entryPoint,
      outDir: resolve(owned.root, 'bundle'),
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          alias: {...config.resolve?.alias, workflows: resolve('02_proceso/workflows')},
        },
      }),
    });
    const rebound = await verifyPinnedExecutable(executable.path);
    if (rebound.sha256 !== executable.sha256) fail('BROWSER_EXECUTABLE_BYTES_DRIFT');
    const browser = await openBrowser('chrome', {
      browserExecutable: executable.path,
      chromeMode: 'chrome-for-testing',
      chromiumOptions: {gl: 'angle'},
      logLevel: 'error',
    });
    return withCleanup(
      async () => {
        const requests = await installRequestPolicy(browser);
        const results = [];
        for (const frame of frames) {
          const runs = [];
          for (const candidate of ['A', 'B']) {
            const output = resolve(owned.root, `${frame}-${candidate}.png`);
            const snapshot = await render(browser, serveUrl, frame, output);
            assertBrowserSnapshot(snapshot);
            runs.push({
              domSha256: sha256(snapshot.html),
              imageSha256: sha256(await readFile(output)),
              snapshot,
              snapshotSha256: sha256(JSON.stringify(snapshot)),
            });
          }
          if (
            runs[0]!.snapshotSha256 !== runs[1]!.snapshotSha256 ||
            runs[0]!.imageSha256 !== runs[1]!.imageSha256
          )
            fail('BROWSER_PROOF_NON_DETERMINISTIC');
          results.push({
            domSha256: runs[0]!.domSha256,
            frame,
            imageSha256: runs[0]!.imageSha256,
            snapshot: runs[0]!.snapshot,
          });
        }
        if (requests.failures.length)
          fail(`BROWSER_REQUEST_GUARD_ERROR:${requests.failures.join('|')}`);
        if (requests.remote.length) fail(`BROWSER_REMOTE_REQUEST:${requests.remote.join('|')}`);
        return {
          browserExecutableSha256: executable.sha256,
          browserVersion: executable.version,
          coverageGap: 'BROWSER_BACKGROUND_AND_PRE_ATTACHMENT_TRAFFIC_NOT_OBSERVED',
          frames: results,
          playwrightRevision: PINNED_PLAYWRIGHT.revision,
          playwrightVersion: PINNED_PLAYWRIGHT.packageVersion,
          publicationAllowed: false,
          remoteHttpRequestsObserved: requests.remote,
          requestPolicy: 'CDP_HTTP_HTTPS_ATTACHED_PAGE_TARGETS_DENY',
          schemaVersion: 'method-explainer-diagram-browser-proof-v1',
          status: 'PASS',
        } as const;
      },
      () => browser.close({silent: true}),
    );
  }, owned.cleanup);
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runDiagramBrowserProbe()
    .then((report) => console.info(JSON.stringify(report, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
