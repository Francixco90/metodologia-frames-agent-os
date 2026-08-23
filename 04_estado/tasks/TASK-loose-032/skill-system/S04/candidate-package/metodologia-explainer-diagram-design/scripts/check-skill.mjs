import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// prettier-ignore
import {closeSync, constants, existsSync, fstatSync, linkSync, lstatSync, mkdtempSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const schemaVersion = 'explainer-diagram-skill-check-v1';
const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsRoot, '..');
const repoRoot = resolve(packageRoot, '../../../../../../..');
const sandboxExec = '/usr/bin/sandbox-exec';
const sourcePins = new Map([
  ['check-worker.mjs', '7b350269eb9bd6110883049f4d57f8fb4f4cb820e54ef68b8dd8f602003b37ad'],
  ['check-core.mjs', 'fa8c38c69ea6f73f2839b264a65d011e0647d122819b8a01b38a183025876f50'],
  ['check-dependencies.mjs', '8620e31bc3aebb29dcd4a374a5e6def89252821c5405026094706f1442cfd79a'],
  ['check-materials.mjs', '5fcf3049fb8a7b9fa4deddce90ae3fe2dec2a3c6b59f9c8db66fb81c2bc42ad2'],
  ['check-offline-runtime.mjs', '2cf7d8350e190d29f81db5c4d89095f52787e7d04c5bfae1fc354755340bae39'],
  ['check-source-policy.mjs', '48b3a6d2a2f48ca7648488e14e09c1a711eccebdd0b31d7328d98e74694ec692'],
  ['check-source-security.mjs', '676a9033bd2024763b85d4be3a380041688b9dd91109636afbb7a7eda6d6a245'],
]);
const expectedSuccessBytes = 1372;
const expectedSuccessSha = '52d1fc2fb6456005dd5b749e6a73f57aa6feb5344da6bb117ea2f3634f2c754f';

class BootstrapError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const fail = (code) => {
  throw new BootstrapError(code);
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const walk = (root) =>
  readdirSync(root, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
const snapshot = () => {
  const root = realpathSync(packageRoot);
  return Object.fromEntries(
    walk(packageRoot)
      .sort()
      .map((file) => {
        const info = lstatSync(file);
        const canonical = realpathSync(file);
        const rel = relative(root, canonical);
        if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
          fail('CHECK_PACKAGE_RESOURCE_INVALID');
        return [relative(packageRoot, file), sha(readFileSync(file))];
      }),
  );
};
const capturePinnedSources = () => {
  const canonicalRoot = realpathSync(scriptsRoot);
  const captured = new Map();
  for (const [name, expected] of sourcePins) {
    const file = join(scriptsRoot, name);
    const pathInfo = lstatSync(file);
    if (!pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.nlink !== 1)
      fail('CHECK_CHECKER_MODULE_HASH_MISMATCH');
    const canonicalFile = realpathSync(file);
    if (realpathSync(dirname(file)) !== canonicalRoot || dirname(canonicalFile) !== canonicalRoot)
      fail('CHECK_CHECKER_MODULE_HASH_MISMATCH');
    if (basename(canonicalFile) !== name || !Number.isInteger(constants.O_NOFOLLOW))
      fail('CHECK_CHECKER_MODULE_HASH_MISMATCH');
    const descriptor = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = fstatSync(descriptor);
      if (before.dev !== pathInfo.dev || before.ino !== pathInfo.ino || before.nlink !== 1)
        fail('CHECK_CHECKER_MODULE_HASH_MISMATCH');
      const bytes = readFileSync(descriptor);
      const after = fstatSync(descriptor);
      if (
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        sha(bytes) !== expected
      )
        fail('CHECK_CHECKER_MODULE_HASH_MISMATCH');
      captured.set(pathToFileURL(canonicalFile).href, bytes.toString('base64'));
    } finally {
      closeSync(descriptor);
    }
  }
  return captured;
};
const assertOfflineCoverage = () => {
  if (process.platform !== 'darwin' || !existsSync(sandboxExec)) fail('CHECK_OFFLINE_COVERAGE_GAP');
  const info = statSync(sandboxExec);
  if (!info.isFile() || (info.mode & 0o111) === 0) fail('CHECK_OFFLINE_COVERAGE_GAP');
};
const parseWorkerError = (value) => {
  try {
    const parsed = JSON.parse(value);
    if (
      parsed.schema_version === schemaVersion &&
      parsed.status === 'BLOCKED' &&
      /^CHECK_[A-Z0-9_]+$/u.test(parsed.error_code)
    )
      return parsed.error_code;
  } catch {}
  return 'CHECK_WORKER_FAILURE';
};

const main = () => {
  const captured = capturePinnedSources();
  assertOfflineCoverage();
  const before = snapshot();
  const cacheRoot = realpathSync(mkdtempSync(join(realpathSync(tmpdir()), 'diagram-bootstrap-')));
  const attackRoot = realpathSync(mkdtempSync(join(realpathSync(tmpdir()), 'diagram-attacks-')));
  try {
    const sandboxPath = cacheRoot.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    const loaderPath = join(cacheRoot, 'verified-loader.mjs');
    writeFileSync(
      loaderPath,
      `const s=new Map(${JSON.stringify([...captured])});export async function load(u,c,n){const b=s.get(u);return b===undefined?n(u,c):{format:'module',shortCircuit:true,source:Buffer.from(b,'base64')}}`,
      {mode: 0o400},
    );
    writeFileSync(join(attackRoot, 'source.json'), '{}');
    linkSync(join(attackRoot, 'source.json'), join(attackRoot, 'linked.json'));
    symlinkSync('source.json', join(attackRoot, 'symbolic.json'));
    const profile = [
      '(version 1)',
      '(deny network*)',
      '(deny file-write*)',
      `(allow file-write* (subpath "${sandboxPath}"))`,
      '(allow default)',
    ].join('');
    const childEnv = {
      ...process.env,
      METODOLOGIA_OUTER_SANDBOX: 'verified',
      METODOLOGIA_REGULAR_ATTACK_ROOT: attackRoot,
      NODE_OPTIONS: '',
      PATH: join(cacheRoot, 'fake-path'),
      TEMP: cacheRoot,
      TMP: cacheRoot,
      TMPDIR: cacheRoot,
      XDG_CACHE_HOME: cacheRoot,
    };
    const runSandboxed = (args) =>
      spawnSync(sandboxExec, ['-p', profile, process.execPath, ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: childEnv,
        maxBuffer: 8 * 1024 * 1024,
      });
    const networkProbe = runSandboxed([
      '--no-warnings',
      '-e',
      "const s=require('node:net').connect({host:'127.0.0.1',port:1});s.on('connect',()=>process.exit(3));s.on('error',e=>{if(e.code==='EPERM'||e.code==='EACCES'){process.stdout.write('NETWORK_BLOCKED');process.exit(0)}process.exit(4)});",
    ]);
    if (networkProbe.status !== 0 || networkProbe.stdout !== 'NETWORK_BLOCKED')
      fail('CHECK_OFFLINE_SANDBOX_INEFFECTIVE');
    const worker = runSandboxed([
      '--permission',
      '--allow-child-process',
      '--allow-worker',
      '--no-warnings',
      '--allow-fs-read=*',
      `--allow-fs-write=${cacheRoot}`,
      '--experimental-loader',
      loaderPath,
      realpathSync(join(scriptsRoot, 'check-worker.mjs')),
    ]);
    if (JSON.stringify(before) !== JSON.stringify(snapshot())) fail('CHECK_UNEXPECTED_WRITE');
    if (
      worker.status !== 0 ||
      worker.stderr !== '' ||
      Buffer.byteLength(worker.stdout) !== expectedSuccessBytes ||
      sha(worker.stdout) !== expectedSuccessSha
    )
      fail(parseWorkerError(worker.stderr));
    process.stdout.write(worker.stdout);
  } finally {
    rmSync(cacheRoot, {recursive: true, force: true});
    rmSync(attackRoot, {recursive: true, force: true});
  }
};

try {
  main();
} catch (error) {
  const errorCode =
    error instanceof BootstrapError && /^CHECK_[A-Z0-9_]+$/u.test(error.code)
      ? error.code
      : 'CHECK_UNEXPECTED_FAILURE';
  process.stderr.write(
    `${JSON.stringify({schema_version: schemaVersion, status: 'BLOCKED', error_code: errorCode})}\n`,
  );
  process.exitCode = 2;
}
