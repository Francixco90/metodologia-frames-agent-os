import {existsSync, lstatSync, readdirSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

const escapes = (root: string, candidate: string): boolean => {
  const relation = relative(root, candidate);
  return relation === '..' || relation.startsWith(`..${sep}`) || isAbsolute(relation);
};

const fail = (code: string, detail: string): never => {
  throw new Error(`${code}: ${detail}`);
};

export const assertNoExistingSymlinkComponents = (path: string): void => {
  const absolute = resolve(path);
  const parsedRoot = absolute.slice(0, absolute.indexOf(sep) + 1) || sep;
  const segments = absolute.slice(parsedRoot.length).split(sep).filter(Boolean);
  let cursor = parsedRoot;
  for (const segment of segments) {
    cursor = resolve(cursor, segment);
    if (!existsSync(cursor)) continue;
    if (lstatSync(cursor).isSymbolicLink()) fail('SYMLINK_FORBIDDEN', cursor);
  }
};

export const resolveExistingFile = (root: string, ref: string): string => {
  assertNoExistingSymlinkComponents(root);
  const rootReal = realpathSync(root);
  const candidate = resolve(rootReal, ref);
  if (escapes(rootReal, candidate)) fail('PATH_ESCAPE', ref);
  assertNoExistingSymlinkComponents(candidate);
  if (!existsSync(candidate)) fail('MISSING_INPUT', ref);
  const candidateReal = realpathSync(candidate);
  if (escapes(rootReal, candidateReal)) fail('PATH_ESCAPE', ref);
  if (!lstatSync(candidateReal).isFile()) fail('INPUT_NOT_FILE', ref);
  return candidateReal;
};

export const assertSafeOutputRoot = (outputRoot: string): void => {
  const absolute = resolve(outputRoot);
  if (absolute === sep || dirname(absolute) === absolute) fail('UNSAFE_OUTPUT_ROOT', outputRoot);
  assertNoExistingSymlinkComponents(absolute);
  if (existsSync(absolute) && !lstatSync(absolute).isDirectory()) {
    fail('OUTPUT_ROOT_NOT_DIRECTORY', outputRoot);
  }
};

export const assertNoSymlinksInTree = (root: string): void => {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, {recursive: true, withFileTypes: true})) {
    const path = resolve(entry.parentPath, entry.name);
    if (entry.isSymbolicLink() || lstatSync(path).isSymbolicLink()) {
      fail('SYMLINK_FORBIDDEN', path);
    }
  }
};

export const resolveOutputFile = (root: string, ref: string): string => {
  const rootReal = realpathSync(root);
  const candidate = resolve(rootReal, ref);
  if (escapes(rootReal, candidate)) fail('PATH_ESCAPE', ref);
  assertNoExistingSymlinkComponents(candidate);
  if (!existsSync(candidate)) fail('MISSING_OUTPUT', ref);
  const candidateReal = realpathSync(candidate);
  if (escapes(rootReal, candidateReal)) fail('PATH_ESCAPE', ref);
  if (!lstatSync(candidateReal).isFile()) fail('OUTPUT_NOT_FILE', ref);
  return candidateReal;
};
