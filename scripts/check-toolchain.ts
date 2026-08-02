import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

type PackageManifest = {
  packageManager?: string;
  toolchain?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageManifest;
const errors: string[] = [];
const expected = manifest.toolchain ?? {};
const validationProfile = process.env.METODOLOGIA_TOOLCHAIN_PROFILE ?? 'local-full';
const tsconfig = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf8')) as {
  compilerOptions?: {skipLibCheck?: boolean};
};
const remotionTimerShim = readFileSync(resolve(process.cwd(), 'types/remotion-timer.d.ts'), 'utf8');
const installedZod = JSON.parse(
  readFileSync(resolve(process.cwd(), 'node_modules/zod/package.json'), 'utf8'),
) as {version?: string};
const installedPlaywright = JSON.parse(
  readFileSync(resolve(process.cwd(), 'node_modules/playwright/package.json'), 'utf8'),
) as {version?: string};

if (!['local-full', 'ci-code-only'].includes(validationProfile)) {
  errors.push(
    `METODOLOGIA_TOOLCHAIN_PROFILE inválido: ${validationProfile}; use local-full o ci-code-only`,
  );
}

if (process.version !== `v${expected.node}`) {
  errors.push(`Node: esperado v${expected.node}, observado ${process.version}`);
}

const pnpmVersion = execFileSync('pnpm', ['--version'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
}).trim();
if (pnpmVersion !== expected.pnpm) {
  errors.push(`pnpm: esperado ${expected.pnpm}, observado ${pnpmVersion}`);
}

let ffmpegLine = 'not-checked';
if (validationProfile === 'local-full') {
  ffmpegLine =
    execFileSync('ffmpeg', ['-version'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }).split('\n')[0] ?? '';
  if (!ffmpegLine.startsWith(`ffmpeg version ${expected.ffmpeg} `)) {
    errors.push(`FFmpeg: esperado ${expected.ffmpeg}, observado ${ffmpegLine}`);
  }
}

if (manifest.dependencies?.remotion !== expected.remotion) {
  errors.push(
    `Remotion: esperado ${expected.remotion}, package=${manifest.dependencies?.remotion ?? 'ausente'}`,
  );
}

if (manifest.dependencies?.zod !== expected.zod) {
  errors.push(`Zod: esperado ${expected.zod}, package=${manifest.dependencies?.zod ?? 'ausente'}`);
}
if (installedZod.version !== expected.zod) {
  errors.push(`Zod instalado: esperado ${expected.zod}, observado ${installedZod.version}`);
}
if (manifest.devDependencies?.playwright !== expected.playwright) {
  errors.push(
    `Playwright: esperado ${expected.playwright}, package=${manifest.devDependencies?.playwright ?? 'ausente'}`,
  );
}
if (installedPlaywright.version !== expected.playwright) {
  errors.push(
    `Playwright instalado: esperado ${expected.playwright}, observado ${installedPlaywright.version}`,
  );
}

const verifyDepsBeforeRun = execFileSync('pnpm', ['config', 'get', 'verify-deps-before-run'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
}).trim();
if (verifyDepsBeforeRun !== 'false') {
  errors.push(
    `pnpm verifyDepsBeforeRun debe ser false; observado ${verifyDepsBeforeRun || 'ausente'}`,
  );
}

if (tsconfig.compilerOptions?.skipLibCheck !== false) {
  errors.push('TypeScript: skipLibCheck debe permanecer en false');
}

if (!remotionTimerShim.includes('type Timer = ReturnType<typeof setTimeout>;')) {
  errors.push('Remotion: falta el shim mínimo y auditable para Timer');
}

for (const [name, version] of Object.entries({
  ...manifest.dependencies,
  ...manifest.devDependencies,
})) {
  if (/^[~^*]|[xX]|\|\||\s-\s/u.test(version)) {
    errors.push(`dependencia no exacta: ${name}@${version}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  if (validationProfile === 'ci-code-only') {
    console.info(
      `PASS CODE TOOLCHAIN: Node ${expected.node}, pnpm ${expected.pnpm}, Remotion ${expected.remotion}, Zod ${expected.zod}, Playwright ${expected.playwright}. MEDIA COVERAGE GAP: FFmpeg ${expected.ffmpeg} y renders se validan únicamente con el gate local-full.`,
    );
  } else {
    console.info(
      `PASS TOOLCHAIN: Node ${expected.node}, pnpm ${expected.pnpm}, Remotion ${expected.remotion}, Zod ${expected.zod}, Playwright ${expected.playwright}, FFmpeg ${expected.ffmpeg} (${ffmpegLine}).`,
    );
  }
}
