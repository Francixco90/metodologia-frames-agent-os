import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {resolve, sep} from 'node:path';

import {
  TransactionEffectReceiptV1Schema,
  failTransactionV1,
  type TransactionOutputV1,
} from '../contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {assertExactWriteSetV1} from './transaction-path-guard-v1.ts';
import {
  getStableRootV1,
  withStableRootCapabilityV1,
  type StableRootHooksV1,
} from './stable-root-capability-v1.ts';
import {transactionOutputsSha256V1} from './transaction-dag-v1.ts';

const sortedManifest = (outputs: readonly TransactionOutputV1[]): readonly TransactionOutputV1[] =>
  [...outputs].sort((left, right) => left.ref.localeCompare(right.ref, 'en'));

export const computeTransactionCandidateSha256V1 = (
  outputs: readonly TransactionOutputV1[],
): string => hashCanonical(sortedManifest(outputs));

export interface TransactionOutputVerificationV1 {
  readonly candidateSha256: string;
  readonly outputs: readonly TransactionOutputV1[];
}

const verifyFile = (
  root: ReturnType<typeof getStableRootV1>,
  output: TransactionOutputV1,
): void => {
  const path = resolve(root.realpath, output.ref);
  if (path !== root.realpath && !path.startsWith(`${root.realpath}${sep}`)) {
    return failTransactionV1('PATH_REJECTED', `Output escapes effect root: ${output.ref}`);
  }
  const before = lstatSync(path);
  if (
    before.isSymbolicLink() ||
    !before.isFile() ||
    before.nlink !== 1 ||
    before.dev !== root.dev
  ) {
    return failTransactionV1('BLOCKED_UNCERTAIN', `Output identity is unsafe: ${output.ref}`);
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    const bytes = readFileSync(fd);
    const afterOpen = fstatSync(fd);
    const afterPath = lstatSync(path);
    const stable =
      opened.isFile() &&
      opened.nlink === 1 &&
      opened.dev === before.dev &&
      opened.ino === before.ino &&
      opened.size === before.size &&
      afterOpen.dev === opened.dev &&
      afterOpen.ino === opened.ino &&
      afterOpen.size === opened.size &&
      afterOpen.mtimeMs === opened.mtimeMs &&
      afterOpen.ctimeMs === opened.ctimeMs &&
      afterPath.dev === opened.dev &&
      afterPath.ino === opened.ino &&
      afterPath.nlink === 1 &&
      afterPath.size === opened.size &&
      afterPath.mtimeMs === opened.mtimeMs &&
      afterPath.ctimeMs === opened.ctimeMs &&
      realpathSync(path) === path;
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (!stable || bytes.byteLength !== output.sizeBytes || digest !== output.sha256) {
      return failTransactionV1('BLOCKED_UNCERTAIN', `Output readback drifted: ${output.ref}`);
    }
  } finally {
    closeSync(fd);
  }
};

export const verifyTransactionEffectOutputsV1 = (
  raw: unknown,
  rootHooks: StableRootHooksV1 = {},
): TransactionOutputVerificationV1 => {
  const effect = TransactionEffectReceiptV1Schema.parse(raw);
  if (effect.state !== 'EFFECT_SUCCEEDED') {
    return failTransactionV1('CAUSAL_ORDER', 'Only EFFECT_SUCCEEDED has verifiable outputs.');
  }
  const refs = assertExactWriteSetV1(effect.outputs.map(({ref}) => ref));
  if (transactionOutputsSha256V1(refs) !== effect.outputsSha256) {
    return failTransactionV1('HASH_MISMATCH', 'Effect output references differ from binding.');
  }
  withStableRootCapabilityV1(
    effect.rootAuthority,
    (capability) => {
      const root = getStableRootV1(capability);
      for (const output of sortedManifest(effect.outputs)) verifyFile(root, output);
      getStableRootV1(capability);
    },
    rootHooks,
  );
  const candidateSha256 = computeTransactionCandidateSha256V1(effect.outputs);
  if (candidateSha256 !== effect.candidateSha256) {
    return failTransactionV1('HASH_MISMATCH', 'Effect candidate manifest digest mismatch.');
  }
  return Object.freeze({candidateSha256, outputs: Object.freeze(sortedManifest(effect.outputs))});
};
