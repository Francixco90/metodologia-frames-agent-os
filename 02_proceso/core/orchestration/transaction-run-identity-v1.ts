import {lstatSync, realpathSync} from 'node:fs';

import {failTransactionV1} from '../contracts/transaction-kernel-v1.ts';

type RunIdentityV1 = Readonly<{dev: number; ino: number}>;

const readRunIdentityV1 = (path: string): RunIdentityV1 => {
  try {
    const current = lstatSync(path);
    if (current.isSymbolicLink() || !current.isDirectory() || realpathSync(path) !== path) {
      return failTransactionV1('ROOT_IDENTITY_DRIFT', 'Transaction run identity drifted.');
    }
    return {dev: current.dev, ino: current.ino};
  } catch (error) {
    if (error instanceof Error && error.message.includes('Transaction run identity drifted')) {
      throw error;
    }
    return failTransactionV1('ROOT_IDENTITY_DRIFT', 'Transaction run identity cannot be read.');
  }
};

export class ActiveTransactionRunRegistryV1 {
  readonly #runs = new Map<string, RunIdentityV1>();

  public has(runId: string): boolean {
    return this.#runs.has(runId);
  }
  public begin(runId: string, path: string): void {
    if (this.#runs.has(runId)) {
      return failTransactionV1('LOCK_CONFLICT', 'Transaction run already active in this store.');
    }
    this.#runs.set(runId, readRunIdentityV1(path));
  }
  public assert(runId: string, path: string): void {
    const expected = this.#runs.get(runId);
    if (expected === undefined) return;
    const current = readRunIdentityV1(path);
    if (current.dev !== expected.dev || current.ino !== expected.ino) {
      return failTransactionV1('ROOT_IDENTITY_DRIFT', 'Transaction run identity drifted.');
    }
  }
  public end(runId: string): void {
    this.#runs.delete(runId);
  }
}
