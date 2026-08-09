import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {relative, resolve} from 'node:path';

export class CareerConfirmationEvidenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CareerConfirmationEvidenceError';
  }
}

export const assertMaterialConfirmation = (input: {
  root: string;
  ref: string;
  sha256: string;
}): void => {
  const privateRoot = realpathSync(resolve(input.root, 'work/private'));
  const lexicalTarget = resolve(input.root, input.ref);
  const lexicalOffset = relative(resolve(input.root, 'work/private'), lexicalTarget);
  if (!lexicalOffset || lexicalOffset.startsWith('..')) {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_OUTSIDE_PRIVATE_RUNTIME');
  }
  let stat;
  try {
    stat = lstatSync(lexicalTarget);
  } catch {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_NOT_FOUND');
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_NOT_REGULAR_FILE');
  }
  const target = realpathSync(lexicalTarget);
  const offset = relative(privateRoot, target);
  if (!offset || offset.startsWith('..')) {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_REALPATH_ESCAPE');
  }
  const bytes = readFileSync(target);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== input.sha256) {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_HASH_MISMATCH');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_NOT_VISIBLE_UTF8');
  }
  if (!/[\p{L}\p{N}]/u.test(text)) {
    throw new CareerConfirmationEvidenceError('CONFIRMATION_EMPTY_OR_NOT_VISIBLE');
  }
};
