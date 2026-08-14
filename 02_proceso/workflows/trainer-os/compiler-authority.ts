import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {TrainerEvidenceAuthorityReceiptSchema} from './adapter-contracts.ts';
import {canonicalJson, sha256} from './common.ts';
import {TrainerCompilerAuthorityFiles} from './compiler-contracts.ts';
import {hashFile} from './runtime-io.ts';
import {portableResolve, readJson} from './runtime-io.ts';

const source = fileURLToPath(import.meta.url);
export const EffectiveTrainerCompilerAuthorityFiles = [
  ...TrainerCompilerAuthorityFiles,
  'trainer-intake-v1.schema.ts',
] as const;
export const compilerTreeSha256 = () =>
  sha256(
    canonicalJson(
      EffectiveTrainerCompilerAuthorityFiles.map((name) => ({
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
type Binding = {ref: string; sha256: string};
export const resolveBoundRef = (runPath: string, binding: Binding) => {
  const path = portableResolve(runPath, binding.ref);
  if (hashFile(path) !== binding.sha256) throw new Error(`TRAINER_INPUT_HASH_DRIFT:${binding.ref}`);
  return path;
};
export const readBoundJson = (runPath: string, binding: Binding) =>
  readJson(resolveBoundRef(runPath, binding));
export const readEvidenceReceipts = (
  runPath: string,
  evidence: Array<{authorityReceipt: Binding}>,
) =>
  evidence.map(({authorityReceipt}) =>
    TrainerEvidenceAuthorityReceiptSchema.parse(readBoundJson(runPath, authorityReceipt)),
  );
export const privacyGate = (value: string) => {
  const inspected = value.replace(/https?:\/\//giu, '');
  if (
    /file:\/\/|~[\\/][^\s"'<>]+|\\\\[^\\\s"'<>]+\\[^\s"'<>]+|(?<![a-z0-9._<>-])\/(?!\/)[a-z0-9._-]+(?:\/[a-z0-9._-]+)*|[a-z]:[\\/][^\s"'<>]+|(?:private|privado|secret)s?(?:\/|\\)|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+\d{1,3}[ ./-]?)?(?:\(\d{2,4}\)[ ./-]?|\d{2,4}[ ./-])\d{3,4}[ ./-]?\d{3,4}|(?<![a-z0-9])\+?\d{10,13}(?![a-z0-9])/iu.test(
      inspected,
    )
  )
    throw new Error('TRAINER_PRIVATE_LOCATOR_OR_PII');
};

type Evidence = {evidenceId: string; source: {ref: string; sha256: string}; authority: string};
export const assertEvidenceAuthorized = (
  evidence: Evidence[],
  assets: Array<{ref: string; sha256: string}>,
  intakeSources: Array<{ref: string; sha256: string}>,
  receipts: Evidence[],
  forbiddenRefs: string[],
) => {
  for (const [index, item] of evidence.entries()) {
    const same = (candidate: {ref: string; sha256: string}) =>
      candidate.ref === item.source.ref && candidate.sha256 === item.source.sha256;
    const receipt = receipts[index];
    if (
      !assets.some(same) ||
      !intakeSources.some(same) ||
      forbiddenRefs.includes(item.source.ref) ||
      /^(?:dist|outputs|continuity)\//u.test(item.source.ref) ||
      !receipt ||
      receipt.evidenceId !== item.evidenceId ||
      !same(receipt.source) ||
      receipt.authority !== item.authority
    )
      throw new Error(`TRAINER_ADAPTER_EVIDENCE_NOT_AUTHORIZED:${item.evidenceId}`);
  }
};
