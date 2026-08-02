import {fork} from 'node:child_process';
import {createHash as digest} from 'node:crypto';
import {constants as fsConstants} from 'node:fs';
import {access, mkdir, readdir, readFile as read} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
const entry = resolve('tests/fixtures/renderers/h03-probe-entry.tsx');
const harness = fileURLToPath(import.meta.url);
const remotionPlatform = (): string => {
  switch (process.platform) {
    case 'darwin':
      return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    case 'linux':
      return process.arch === 'arm64' ? 'linux-arm64' : 'linux64';
    case 'win32':
      return 'win64';
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
};
const headlessShellExecutable = (platform: string): string => {
  const dir = resolve(
    `node_modules/.remotion/chrome-headless-shell/${platform}/chrome-headless-shell-${platform}`,
  );
  if (platform === 'win64') return resolve(dir, 'chrome-headless-shell.exe');
  if (platform === 'linux-arm64') return resolve(dir, 'headless_shell');
  return resolve(dir, 'chrome-headless-shell');
};
const defaultBrowser = headlessShellExecutable(remotionPlatform());
type Config = {browser: string; frame: number; output: string; serveUrl: string; workerId: string};
type Timing = {pid: number; startedAtMs: number; finishedAtMs: number; sha256: string};
type Result = Pick<Config, 'frame' | 'workerId' | 'output'> & Timing;
const sha = async (path: string) =>
  digest('sha256')
    .update(await read(path))
    .digest('hex');
const option = (name: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const worker = async () => {
  const config = JSON.parse(process.argv.at(-1) ?? '') as Config;
  const startedAtMs = Date.now();
  const runtime = {
    browserExecutable: config.browser,
    chromeMode: 'headless-shell' as const,
    chromiumOptions: {gl: 'angle' as const},
    inputProps: {},
    logLevel: 'error' as const,
    serveUrl: config.serveUrl,
  };
  const composition = await selectComposition({...runtime, id: 'H03RendererProbe'});
  await renderStill({
    ...runtime,
    composition,
    frame: config.frame,
    imageFormat: 'png',
    isProduction: false,
    output: config.output,
    overwrite: false,
  });
  process.send?.({
    frame: config.frame,
    workerId: config.workerId,
    output: basename(config.output),
    pid: process.pid,
    startedAtMs,
    finishedAtMs: Date.now(),
    sha256: await sha(config.output),
  } satisfies Result);
};
const runProcess = (config: Config) =>
  new Promise<Result>((accept, reject) => {
    const child = fork(harness, ['--worker', JSON.stringify(config)], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    child.once('message', (message) => accept(message as Result));
    child.once('error', reject);
    child.once('exit', (code) => code !== 0 && reject(new Error('WORKER_EXITED')));
  });
const parent = async () => {
  const requestedOutput = option('--output-dir');
  if (!requestedOutput) throw new Error('MISSING_OPTION: --output-dir');
  const outputDir = resolve(requestedOutput);
  const relation = relative(tmpdir(), outputDir);
  if (!relation || relation.startsWith('..')) throw new Error('OUTPUT_DIR_FORBIDDEN');
  await mkdir(outputDir, {recursive: true});
  if ((await readdir(outputDir)).length) throw new Error('OUTPUT_DIR_NOT_EMPTY');
  const browser = resolve(option('--browser-executable') ?? defaultBrowser);
  await access(browser, fsConstants.X_OK);
  const frame = Number(option('--frame') ?? 15);
  if (!Number.isInteger(frame) || frame < 0 || frame >= 30) throw new Error('FRAME_OUT_OF_RANGE');
  const serveUrl = await bundle({entryPoint: entry, outDir: resolve(outputDir, 'bundle')});
  const launch = (workerId: string) => {
    const output = resolve(outputDir, `render-${workerId}.png`);
    return runProcess({browser, frame, output, serveUrl, workerId});
  };
  const workers = await Promise.all(['A', 'B'].map(launch));
  const overlapMs =
    Math.min(...workers.map((item) => item.finishedAtMs)) -
    Math.max(...workers.map((item) => item.startedAtMs));
  const distinctPids = new Set(workers.map((item) => item.pid)).size === 2;
  const sameFrame = new Set(workers.map((item) => item.frame)).size === 1;
  const sameOutputHash = new Set(workers.map((item) => item.sha256)).size === 1;
  const passed = distinctPids && sameFrame && sameOutputHash && overlapMs > 0;
  const report = {
    schemaVersion: 'h03-render-probe-replay-v1',
    status: passed ? 'PASS' : 'FAIL',
    executionMode: 'LOCAL_EVALUATION_ONLY',
    publicationAllowed: false,
    remoteNetworkAllowed: false,
    compositionId: 'H03RendererProbe',
    frame,
    workers,
    concurrency: {distinctPids, overlapMs, sameFrame, sameOutputHash},
  };
  console.info(JSON.stringify(report, null, 2));
  if (!passed) throw new Error('H03_REPLAY_NON_DETERMINISTIC_OR_NOT_CONCURRENT');
};
(process.argv.includes('--worker') ? worker : parent)().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.disconnect?.();
  process.exitCode = 1;
});
