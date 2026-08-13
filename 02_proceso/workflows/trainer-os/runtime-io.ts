import {createHash} from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';

export const hashBytes = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashFile = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
export const atomicWrite = (path: string, value: string) => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, path);
};
export const writeJson = (path: string, value: unknown) =>
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
export const portableResolve = (runPath: string, ref: string): string => {
  if (
    ref.startsWith('/') ||
    ref.startsWith('./') ||
    ref.includes('\\') ||
    ref.includes('//') ||
    ref.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error(`TRAINER_PRIVATE_OR_UNSAFE_REF:${ref}`);
  const root = realpathSync(dirname(runPath));
  const target = resolve(root, ref);
  if (target === runPath) throw new Error(`TRAINER_REF_ALIASES_MANIFEST:${ref}`);
  const lexical = relative(root, target);
  if (lexical === '..' || lexical.startsWith(`..${sep}`) || lexical.startsWith(sep))
    throw new Error(`TRAINER_REF_ESCAPES_RUN_ROOT:${ref}`);
  let cursor = root;
  for (const component of lexical.split(sep)) {
    cursor = resolve(cursor, component);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink())
      throw new Error(`TRAINER_SYMLINK_REF_FORBIDDEN:${ref}`);
  }
  let existing = target;
  while (!existsSync(existing)) existing = dirname(existing);
  const resolved = realpathSync(existing);
  const resolvedRelative = relative(root, resolved);
  if (resolvedRelative === '..' || resolvedRelative.startsWith(`..${sep}`))
    throw new Error(`TRAINER_REF_ESCAPES_RUN_ROOT:${ref}`);
  return target;
};
