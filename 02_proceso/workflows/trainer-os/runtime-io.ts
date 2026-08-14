import {createHash} from 'node:crypto';
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';

export const hashBytes = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashFile = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
let atomicSequence = 0;
export const atomicWrite = (path: string, value: string) => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.tmp-${process.pid}-${atomicSequence++}`;
  let descriptor: number | undefined;
  let created = false;
  let renamed = false;
  let opened: ReturnType<typeof fstatSync> | undefined;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    created = true;
    opened = fstatSync(descriptor);
    writeFileSync(descriptor, value);
    const named = lstatSync(temporary);
    if (
      !opened.isFile() ||
      !named.isFile() ||
      opened.nlink !== 1 ||
      named.nlink !== 1 ||
      opened.dev !== named.dev ||
      opened.ino !== named.ino
    )
      throw new Error('TRAINER_TEMP_IDENTITY_DRIFT');
    renameSync(temporary, path);
    renamed = true;
    const final = lstatSync(path);
    if (!final.isFile() || final.dev !== opened.dev || final.ino !== opened.ino)
      throw new Error('TRAINER_FINAL_IDENTITY_DRIFT');
    closeSync(descriptor);
    descriptor = undefined;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (created && !renamed && opened && existsSync(temporary)) {
      const residual = lstatSync(temporary);
      if (residual.isFile() && residual.dev === opened.dev && residual.ino === opened.ino)
        unlinkSync(temporary);
    }
    throw error;
  }
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
