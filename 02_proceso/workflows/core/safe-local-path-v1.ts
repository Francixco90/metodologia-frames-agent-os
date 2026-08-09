import {existsSync, lstatSync, mkdirSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

const contained = (root: string, candidate: string): boolean => {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
};

const safeRoot = (root: string, code: string): {lexical: string; physical: string} => {
  const resolved = resolve(root);
  const stat = lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${code} unsafe root`);
  return {lexical: resolved, physical: realpathSync(resolved)};
};

const rejectSymlinkSegments = (root: string, candidate: string, code: string): void => {
  const rel = relative(root, candidate);
  let cursor = root;
  for (const segment of rel.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, segment);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`${code} symlink path`);
  }
};

export const assertContainedInputFileV1 = (authorizedRoot: string, ref: string): string => {
  if (!ref || isAbsolute(ref) || ref.includes('\\')) throw new Error('FRAMES-ASSIST-PATH001');
  const root = safeRoot(authorizedRoot, 'FRAMES-ASSIST-PATH001');
  const candidate = resolve(root.lexical, ref);
  if (!contained(root.lexical, candidate)) throw new Error('FRAMES-ASSIST-PATH001');
  rejectSymlinkSegments(root.lexical, candidate, 'FRAMES-ASSIST-PATH002');
  const stat = lstatSync(candidate);
  if (!stat.isFile()) throw new Error('FRAMES-ASSIST-PATH003');
  const physical = realpathSync(candidate);
  if (!contained(root.physical, physical)) throw new Error('FRAMES-ASSIST-PATH001');
  return physical;
};

export const assertContainedWorkspaceV1 = (
  authorizedRoot: string,
  workspaceRoot: string,
): string => {
  const root = safeRoot(authorizedRoot, 'FRAMES-WORKSPACE-PATH001');
  const candidate = resolve(root.lexical, workspaceRoot);
  if (!contained(root.lexical, candidate)) throw new Error('FRAMES-WORKSPACE-PATH001');
  rejectSymlinkSegments(root.lexical, candidate, 'FRAMES-WORKSPACE-PATH002');
  const stat = lstatSync(candidate);
  if (!stat.isDirectory()) throw new Error('FRAMES-WORKSPACE-PATH003');
  const physical = realpathSync(candidate);
  if (!contained(root.physical, physical)) throw new Error('FRAMES-WORKSPACE-PATH001');
  return physical;
};

export const prepareContainedDirectoryV1 = (
  authorizedRoot: string,
  directoryRef: string,
): string => {
  if (!directoryRef || isAbsolute(directoryRef) || directoryRef.includes('\\')) {
    throw new Error('FRAMES-OUTPUT-PATH001');
  }
  const root = safeRoot(authorizedRoot, 'FRAMES-OUTPUT-PATH001');
  const candidate = resolve(root.lexical, directoryRef);
  if (!contained(root.lexical, candidate)) throw new Error('FRAMES-OUTPUT-PATH001');
  let cursor = root.lexical;
  for (const segment of relative(root.lexical, candidate).split(sep).filter(Boolean)) {
    cursor = resolve(cursor, segment);
    if (!existsSync(cursor)) mkdirSync(cursor);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error('FRAMES-OUTPUT-PATH002');
    if (!stat.isDirectory()) throw new Error('FRAMES-OUTPUT-PATH003');
  }
  const physical = realpathSync(candidate);
  if (!contained(root.physical, physical)) throw new Error('FRAMES-OUTPUT-PATH001');
  return physical;
};
