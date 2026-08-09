import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {dirname, resolve} from 'node:path';

const ARTIFACT_NAME = /^[a-z0-9][a-z0-9.-]{1,80}$/u;

const pathExists = (path: string): boolean => {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const assertContainedDirectory = (root: string, directory: string): void => {
  const realRoot = realpathSync(root);
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`EXP-RELEASE-OUTPUT: regular non-symlink parent required: ${directory}`);
  }
  const realDirectory = realpathSync(directory);
  if (realDirectory !== realRoot && !realDirectory.startsWith(`${realRoot}/`)) {
    throw new Error('EXP-RELEASE-OUTPUT: parent escapes repository');
  }
};

export const writeCapsuleAtomically = (
  root: string,
  output: string,
  artifacts: Record<string, string>,
): void => {
  const absoluteRoot = resolve(root);
  const absoluteOutput = resolve(output);
  if (absoluteOutput === absoluteRoot || !absoluteOutput.startsWith(`${absoluteRoot}/`)) {
    throw new Error('EXP-RELEASE-OUTPUT: destination must remain inside repository');
  }
  const parent = dirname(absoluteOutput);
  assertContainedDirectory(absoluteRoot, parent);
  if (pathExists(absoluteOutput)) {
    throw new Error('EXP-RELEASE-EXISTS: release destination already exists');
  }
  const staging = `${absoluteOutput}.staging`;
  const lock = `${absoluteOutput}.lock`;
  if (pathExists(staging)) throw new Error('EXP-RELEASE-STAGING: stale staging directory');
  let lockFd: number | undefined;
  let promoted = false;
  try {
    lockFd = openSync(lock, 'wx', 0o600);
    mkdirSync(staging, {mode: 0o700});
    for (const [name, value] of Object.entries(artifacts)) {
      if (name !== 'SHA256SUMS' && !ARTIFACT_NAME.test(name)) {
        throw new Error(`EXP-RELEASE-ARTIFACT: ${name}`);
      }
      writeFileSync(resolve(staging, name), value, {encoding: 'utf8', flag: 'wx', mode: 0o600});
    }
    if (pathExists(absoluteOutput)) throw new Error('EXP-RELEASE-EXISTS: concurrent writer won');
    renameSync(staging, absoluteOutput);
    promoted = true;
    const result = lstatSync(absoluteOutput);
    const realResult = realpathSync(absoluteOutput);
    if (
      !result.isDirectory() ||
      result.isSymbolicLink() ||
      !realResult.startsWith(`${realpathSync(absoluteRoot)}/`)
    ) {
      throw new Error('EXP-RELEASE-OUTPUT: promoted capsule failed containment');
    }
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, {recursive: true, force: true});
    if (promoted && existsSync(absoluteOutput)) rmSync(absoluteOutput, {recursive: true});
    throw error;
  } finally {
    if (lockFd !== undefined) {
      closeSync(lockFd);
      if (existsSync(lock)) unlinkSync(lock);
    }
  }
};
