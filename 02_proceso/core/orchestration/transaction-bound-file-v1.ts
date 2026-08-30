import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';

import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';

const MAX_DURABLE_READ_BYTES = 16 * 1024 * 1024;

export const readBoundTransactionFileV1 = (path: string): string => {
  const before = lstatSync(path);
  if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1) {
    return failTransactionV1('RECEIPT_INVALID', `Unsafe durable file: ${path}`);
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    if (opened.size > MAX_DURABLE_READ_BYTES) {
      return failTransactionV1('RECEIPT_INVALID', `Durable file exceeds read limit: ${path}`);
    }
    const raw = readFileSync(fd, 'utf8');
    const afterOpen = fstatSync(fd);
    const after = lstatSync(path);
    const stable =
      opened.isFile() &&
      opened.nlink === 1 &&
      opened.dev === before.dev &&
      opened.ino === before.ino &&
      opened.size === before.size &&
      opened.mtimeMs === before.mtimeMs &&
      opened.ctimeMs === before.ctimeMs &&
      afterOpen.dev === opened.dev &&
      afterOpen.ino === opened.ino &&
      afterOpen.size === opened.size &&
      afterOpen.mtimeMs === opened.mtimeMs &&
      afterOpen.ctimeMs === opened.ctimeMs &&
      after.dev === opened.dev &&
      after.ino === opened.ino &&
      after.nlink === 1 &&
      after.size === opened.size &&
      after.mtimeMs === opened.mtimeMs &&
      after.ctimeMs === opened.ctimeMs &&
      realpathSync(path) === path;
    if (!stable) {
      return failTransactionV1('RECEIPT_INVALID', `Durable file identity drift: ${path}`);
    }
    return raw;
  } finally {
    closeSync(fd);
  }
};
