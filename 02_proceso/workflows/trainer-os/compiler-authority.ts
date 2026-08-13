import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson, sha256} from './common.ts';
import {TrainerCompilerAuthorityFiles} from './compiler-contracts.ts';
import {hashFile} from './runtime-io.ts';

const source = fileURLToPath(import.meta.url);
export const compilerTreeSha256 = () =>
  sha256(
    canonicalJson(
      TrainerCompilerAuthorityFiles.map((name) => ({
        name,
        sha256: hashFile(resolve(dirname(source), name)),
      })),
    ),
  );
export const lockContextSha256 = (lock: Record<string, unknown>) => {
  const projection = structuredClone(lock);
  delete projection.designLockSha256;
  delete projection.decisionReceipt;
  return sha256(canonicalJson(projection));
};
export const privacyGate = (value: string) => {
  if (
    /file:\/\/|\/Users\/|(?:private|privado|secret)s?(?:\/|\\)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(
      value,
    )
  )
    throw new Error('TRAINER_PRIVATE_LOCATOR_OR_PII');
};
