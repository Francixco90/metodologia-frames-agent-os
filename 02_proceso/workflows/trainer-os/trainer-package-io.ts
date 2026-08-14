import {existsSync, mkdirSync, realpathSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';

import {portableResolve} from './runtime-io.ts';

export const promotePackage = (
  runPath: string,
  files: ReadonlyArray<readonly [string, Uint8Array]>,
) => {
  const root = realpathSync(dirname(runPath));
  const finalRoot = portableResolve(runPath, 'package');
  const stage = portableResolve(runPath, '.trainer-package-stage');
  const backup = portableResolve(runPath, '.trainer-package-backup');
  if (existsSync(stage) || existsSync(backup)) throw new Error('TRAINER_PACKAGE_RESIDUAL_PATH');
  try {
    for (const [ref, bytes] of files) {
      const target = resolve(stage, ref.replace(/^package\//u, ''));
      mkdirSync(dirname(target), {recursive: true});
      writeFileSync(target, bytes);
    }
    if (existsSync(finalRoot)) renameSync(finalRoot, backup);
    renameSync(stage, finalRoot);
    rmSync(backup, {recursive: true, force: true});
  } catch (error) {
    rmSync(stage, {recursive: true, force: true});
    if (existsSync(backup) && !existsSync(finalRoot)) renameSync(backup, finalRoot);
    throw error;
  }
  if (relative(root, finalRoot).split(sep).join('/') !== 'package')
    throw new Error('TRAINER_PACKAGE_ROOT_DRIFT');
};
