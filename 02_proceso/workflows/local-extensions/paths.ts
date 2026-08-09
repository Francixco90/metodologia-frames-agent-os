import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

const contained = (root: string, candidate: string): boolean => {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
};

export const physicalDirectory = (path: string, code: string): string => {
  const lexical = resolve(path);
  const stat = lstatSync(lexical);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(code);
  return realpathSync(lexical);
};

export const containedFile = (root: string, ref: string): string => {
  if (!ref || isAbsolute(ref) || ref.includes('\\') || ref.split('/').includes('..')) {
    throw new Error('LOCAL_EXTENSION_PATH_ESCAPE');
  }
  const physicalRoot = physicalDirectory(root, 'LOCAL_EXTENSION_UNSAFE_ROOT');
  const candidate = resolve(physicalRoot, ref);
  if (!contained(physicalRoot, candidate)) throw new Error('LOCAL_EXTENSION_PATH_ESCAPE');
  let cursor = physicalRoot;
  for (const part of relative(physicalRoot, candidate).split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error('LOCAL_EXTENSION_SYMLINK');
  }
  if (!lstatSync(candidate).isFile()) throw new Error('LOCAL_EXTENSION_NOT_FILE');
  const physical = realpathSync(candidate);
  if (!contained(physicalRoot, physical)) throw new Error('LOCAL_EXTENSION_PATH_ESCAPE');
  return physical;
};

export interface LocalExtensionRootsInput {
  repository_root: string;
  user_root?: string;
  user_binding?: string;
  env?: Readonly<Record<string, string | undefined>>;
}

const rootFromBinding = (binding: string): string => {
  const path = resolve(binding);
  if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) {
    throw new Error('LOCAL_EXTENSION_UNSAFE_BINDING');
  }
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!value || typeof value !== 'object' || !('root' in value) || typeof value.root !== 'string') {
    throw new Error('LOCAL_EXTENSION_INVALID_BINDING');
  }
  return value.root;
};

export const resolveLocalExtensionRoots = (
  input: LocalExtensionRootsInput,
): {project: string; user?: string} => {
  const repository = physicalDirectory(input.repository_root, 'LOCAL_EXTENSION_UNSAFE_REPOSITORY');
  const project = resolve(repository, '04_estado/local/extensions');
  const envRoot = input.env?.FRAMES_USER_EXTENSIONS_ROOT;
  const selectedUser =
    input.user_root ??
    envRoot ??
    (input.user_binding ? rootFromBinding(input.user_binding) : undefined);
  const result: {project: string; user?: string} = {project};
  if (selectedUser) {
    if (!isAbsolute(selectedUser)) throw new Error('LOCAL_EXTENSION_USER_ROOT_NOT_ABSOLUTE');
    result.user = resolve(selectedUser);
  }
  return result;
};

export const existingPhysicalRoot = (path: string): string | undefined =>
  existsSync(path) ? physicalDirectory(path, 'LOCAL_EXTENSION_UNSAFE_ROOT') : undefined;
