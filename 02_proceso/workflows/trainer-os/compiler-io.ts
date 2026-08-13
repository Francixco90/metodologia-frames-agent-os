import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';

import {hashFile, portableResolve} from './runtime-io.ts';

export const exactTree = (root: string, runPath: string) => {
  const visit = (directory: string): string[] =>
    readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`TRAINER_OUTPUT_SYMLINK:${entry.name}`);
      return entry.isDirectory() ? visit(path) : [path];
    });
  if (!existsSync(root)) throw new Error('TRAINER_OUTPUT_ROOT_MISSING');
  const base = realpathSync(dirname(runPath));
  return visit(root)
    .map((path) => ({ref: relative(base, path).split(sep).join('/'), sha256: hashFile(path)}))
    .sort((left, right) => left.ref.localeCompare(right.ref));
};

export const promoteTree = (
  runPath: string,
  files: ReadonlyArray<readonly [string, string | Uint8Array]>,
) => {
  const finalRoot = portableResolve(runPath, 'dist');
  const stage = portableResolve(runPath, '.trainer-stage');
  const backup = portableResolve(runPath, '.trainer-backup');
  if (existsSync(stage) || existsSync(backup)) throw new Error('TRAINER_RESIDUAL_PATH_PREEXISTS');
  try {
    for (const [ref, bytes] of files) {
      const destination = resolve(stage, ref.replace(/^dist\//u, ''));
      mkdirSync(dirname(destination), {recursive: true});
      writeFileSync(destination, bytes);
    }
    if (existsSync(finalRoot)) renameSync(finalRoot, backup);
    renameSync(stage, finalRoot);
    rmSync(backup, {recursive: true, force: true});
  } catch (error) {
    rmSync(stage, {recursive: true, force: true});
    if (existsSync(backup) && !existsSync(finalRoot)) renameSync(backup, finalRoot);
    throw error;
  }
};

export const assertCleanCompilerPaths = (runPath: string) => {
  for (const ref of ['.trainer-stage', '.trainer-backup'])
    if (existsSync(portableResolve(runPath, ref))) throw new Error(`TRAINER_RESIDUAL_PATH:${ref}`);
};
