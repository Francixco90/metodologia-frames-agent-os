import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const tsc = resolve(root, 'node_modules/typescript/bin/tsc');
const config = resolve(
  root,
  'skills/remotion-video-production/examples/minimal-deterministic/tsconfig.json',
);

if (!existsSync(tsc)) {
  console.error(
    'TypeScript compiler ausente; ejecutar instalación con lockfile mediante el writer autorizado.',
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [tsc, '-p', config], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`${result.stdout}${result.stderr}`.trim());
    process.exitCode = 1;
  } else {
    console.info('PASS REMOTION EXAMPLE: ejemplo mínimo compilable con Zod 4 y Remotion 4.0.494.');
  }
}
