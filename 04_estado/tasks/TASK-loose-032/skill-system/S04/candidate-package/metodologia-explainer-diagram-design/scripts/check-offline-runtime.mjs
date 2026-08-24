import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, realpathSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertContainedCache, fail, repoRoot} from './check-core.mjs';

export const runtimeAttackCases = ['fake-path', 'local-tcp-sandbox'];

const sandboxExec = '/usr/bin/sandbox-exec';

export const assertOfflineCoverage = () => {
  if (process.platform !== 'darwin' || !existsSync(sandboxExec)) fail('CHECK_OFFLINE_COVERAGE_GAP');
  const sandboxInfo = statSync(sandboxExec);
  if (!sandboxInfo.isFile() || (sandboxInfo.mode & 0o111) === 0) fail('CHECK_OFFLINE_COVERAGE_GAP');
};

export const createOfflineRuntime = () => {
  const cacheRoot = realpathSync(mkdtempSync(join(realpathSync(tmpdir()), 'diagram-skill-check-')));
  const sandboxPath = cacheRoot.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const sandboxProfile = [
    '(version 1)',
    '(deny network*)',
    '(deny file-write*)',
    `(allow file-write* (subpath "${sandboxPath}"))`,
    '(allow default)',
  ].join('');
  const childEnv = {
    ...process.env,
    NODE_OPTIONS: '',
    PATH: join(cacheRoot, 'fake-path'),
    TEMP: cacheRoot,
    TMP: cacheRoot,
    TMPDIR: cacheRoot,
    XDG_CACHE_HOME: cacheRoot,
  };
  const runSandboxedNode = (args, options = {}) =>
    spawnSync(sandboxExec, ['-p', sandboxProfile, process.execPath, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: childEnv,
      maxBuffer: 8 * 1024 * 1024,
      ...options,
    });
  const runTsx = (script, input, args = []) => {
    const result = runSandboxedNode(
      [
        '--permission',
        '--allow-worker',
        '--no-warnings',
        '--allow-fs-read=*',
        `--allow-fs-write=${cacheRoot}`,
        '--import',
        'tsx',
        script,
        ...args,
      ],
      {input},
    );
    assertContainedCache(cacheRoot);
    return result;
  };
  const assertNetworkBlocked = () => {
    const result = runSandboxedNode([
      '--no-warnings',
      '-e',
      "const socket=require('node:net').connect({host:'127.0.0.1',port:1});socket.on('connect',()=>process.exit(3));socket.on('error',(error)=>{if(error.code==='EPERM'||error.code==='EACCES'){process.stdout.write('NETWORK_BLOCKED');process.exit(0)}process.exit(4)});",
    ]);
    if (result.status !== 0 || result.stdout !== 'NETWORK_BLOCKED')
      fail('CHECK_OFFLINE_SANDBOX_INEFFECTIVE');
  };
  return {
    assertCacheContained: () => assertContainedCache(cacheRoot),
    assertNetworkBlocked,
    cleanup: () => rmSync(cacheRoot, {recursive: true, force: true}),
    runTsx,
  };
};
