import {createHash} from 'node:crypto';
// prettier-ignore
import {lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, type Stats} from 'node:fs';
import {dirname, isAbsolute, resolve, sep} from 'node:path';
import {failTransactionV1, type TransactionOutputV1} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {getStableRootV1, type RootCapabilityV1} from './stable-root-capability-v1.ts';
export {readBoundTransactionFileV1} from './transaction-bound-file-v1.ts';
const RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const GLOB = /[*?[\]{}]/u;
export type TransactionSnapshotEntryV1 = Readonly<{
  kind: 'DIRECTORY' | 'FILE';
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  size: number;
  sha256: string | null;
}>;
export type TransactionSnapshotV1 = Readonly<Record<string, TransactionSnapshotEntryV1>>;
export const ensureTransactionDirectoryV1 = (path: string): void => {
  try {
    mkdirSync(path, {mode: 0o700});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isDirectory() || realpathSync(path) !== path) {
    failTransactionV1('LEDGER_INVALID', `Unsafe transaction directory: ${path}`);
  }
};
export const assertExactTransactionRefV1 = (ref: string): string => {
  if (
    ref.length === 0 ||
    ref.length > 512 ||
    ref !== ref.normalize('NFC') ||
    /\p{C}/u.test(ref) ||
    isAbsolute(ref) ||
    ref.startsWith('~') ||
    ref.startsWith('\\') ||
    ref.includes('\\') ||
    ref.includes('//') ||
    ref.endsWith('/') ||
    /^[a-z]:/iu.test(ref) ||
    /^[a-z][a-z0-9+.-]*:/iu.test(ref) ||
    ref.includes(':') ||
    GLOB.test(ref)
  ) {
    return failTransactionV1('PATH_REJECTED', `Non-portable exact path: ${ref}`);
  }
  const segments = ref.split('/');
  if (
    segments.some(
      (part) =>
        part === '' ||
        part === '.' ||
        part === '..' ||
        part.endsWith('.') ||
        part.endsWith(' ') ||
        RESERVED.test(part),
    )
  ) {
    return failTransactionV1('PATH_REJECTED', `Forbidden path segment: ${ref}`);
  }
  return ref;
};

export const assertExactWriteSetV1 = (refs: readonly string[]): readonly string[] => {
  const normalized = refs.map(assertExactTransactionRefV1);
  const exact = new Set<string>();
  const folded = new Set<string>();
  for (const ref of normalized) {
    const fold = ref.normalize('NFC').toLowerCase();
    if (exact.has(ref) || folded.has(fold)) {
      failTransactionV1('PATH_REJECTED', `Duplicate or casefold-alias path: ${ref}`);
    }
    exact.add(ref);
    folded.add(fold);
  }
  return Object.freeze([...normalized].sort());
};

const entry = (path: string, info: Stats): TransactionSnapshotEntryV1 => {
  if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
    return failTransactionV1('PATH_REJECTED', `Unsupported filesystem object: ${path}`);
  }
  if (info.isFile() && info.nlink !== 1) {
    return failTransactionV1('PATH_REJECTED', `Unexpected hardlink: ${path}`);
  }
  return Object.freeze({
    kind: info.isDirectory() ? 'DIRECTORY' : 'FILE',
    dev: info.dev,
    ino: info.ino,
    mode: info.mode,
    nlink: info.nlink,
    size: info.isFile() ? info.size : 0,
    sha256: info.isFile() ? createHash('sha256').update(readFileSync(path)).digest('hex') : null,
  });
};

export const captureTransactionSnapshotV1 = (
  capability: RootCapabilityV1,
): TransactionSnapshotV1 => {
  const root = getStableRootV1(capability);
  const result: Record<string, TransactionSnapshotEntryV1> = {};
  const folded = new Set<string>();
  const visit = (absolute: string, prefix: string): void => {
    for (const item of readdirSync(absolute, {withFileTypes: true}).sort((a, b) =>
      a.name.localeCompare(b.name, 'en'),
    )) {
      const ref = prefix === '' ? item.name : `${prefix}/${item.name}`;
      assertExactTransactionRefV1(ref);
      const fold = ref.toLowerCase();
      if (folded.has(fold)) failTransactionV1('PATH_REJECTED', `Filesystem alias: ${ref}`);
      folded.add(fold);
      const path = resolve(absolute, item.name);
      const info = lstatSync(path);
      if (info.dev !== root.dev || realpathSync(path) !== path) {
        failTransactionV1('ROOT_IDENTITY_DRIFT', `Filesystem boundary drift: ${ref}`);
      }
      result[ref] = entry(path, info);
      if (info.isDirectory()) visit(path, ref);
    }
  };
  visit(root.realpath, '');
  getStableRootV1(capability);
  return Object.freeze(result);
};

export const assertDeclaredParentsV1 = (
  capability: RootCapabilityV1,
  refs: readonly string[],
): void => {
  const root = getStableRootV1(capability);
  for (const ref of assertExactWriteSetV1(refs)) {
    const parent = resolve(root.realpath, dirname(ref));
    if (parent !== root.realpath && !parent.startsWith(`${root.realpath}${sep}`)) {
      failTransactionV1('PATH_REJECTED', `Parent escapes effect root: ${ref}`);
    }
    const info = lstatSync(parent);
    if (
      info.isSymbolicLink() ||
      !info.isDirectory() ||
      info.dev !== root.dev ||
      realpathSync(parent) !== parent
    ) {
      failTransactionV1('ROOT_IDENTITY_DRIFT', `Unsafe output parent: ${ref}`);
    }
  }
};

export const assertSnapshotCreatesOnlyV1 = (
  before: TransactionSnapshotV1,
  after: TransactionSnapshotV1,
  declaredRefs: readonly string[],
  expectedOutputs: readonly TransactionOutputV1[] = [],
): void => {
  const declared = new Set(assertExactWriteSetV1(declaredRefs));
  const expected = new Map(expectedOutputs.map((output) => [output.ref, output]));
  const added = Object.keys(after).filter((ref) => before[ref] === undefined);
  if (added.length !== declared.size || added.some((ref) => !declared.has(ref))) {
    failTransactionV1('BLOCKED_UNCERTAIN', 'Post-snapshot contains undeclared creations.');
  }
  for (const [ref, prior] of Object.entries(before)) {
    const current = after[ref];
    // prettier-ignore
    const sameDirectory = prior.kind === 'DIRECTORY' && current?.kind === 'DIRECTORY' && prior.dev === current.dev && prior.ino === current.ino && prior.mode === current.mode;
    // prettier-ignore
    const unchanged = current !== undefined && (prior.kind === 'DIRECTORY' ? sameDirectory : hashCanonical(prior) === hashCanonical(current));
    if (!unchanged) {
      failTransactionV1('BLOCKED_UNCERTAIN', `Pre-existing path changed: ${ref}`);
    }
  }
  for (const ref of added) {
    if (after[ref]?.kind !== 'FILE' || after[ref]?.nlink !== 1) {
      failTransactionV1('BLOCKED_UNCERTAIN', `Created target is not an isolated file: ${ref}`);
    }
    const output = expected.get(ref);
    if (
      expected.size > 0 &&
      (output === undefined ||
        after[ref]?.sha256 !== output.sha256 ||
        after[ref]?.size !== output.sizeBytes)
    )
      failTransactionV1('BLOCKED_UNCERTAIN', `Created target differs from writer readback: ${ref}`);
  }
};
