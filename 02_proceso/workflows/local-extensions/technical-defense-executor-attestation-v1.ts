import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

import type {
  LocalActivationReceiptV1,
  LocalExtensionRecord,
  TechnicalDefensePrivacyProvenanceSessionV1,
} from './contracts.ts';
import {LocalExtensionManifestSchema, SandboxProbeSchema} from './contracts.ts';
import {discoverLocalExtensions} from './loader.ts';
import {containedFile} from './paths.ts';
import {createLocalActivationReceipt} from './receipt.ts';
import {failTransactionV1} from '../../core/contracts/transaction-kernel-v1.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';
import type {MaterialSkillExecutionDraftV2} from '../core/material-skill-adapter-v2.ts';
import {
  TECHNICAL_DEFENSE_EXECUTION_MODULE_REFS_V1,
  TECHNICAL_DEFENSE_EXTENSION_ID,
} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const REPOSITORY_SOURCE_URL = new URL('../../../', import.meta.url);
// Deliberate transitive superset: kernel, adapter, loader/dependencies and bundle semantics.
const RUNTIME_TREE_REFS = [
  '02_proceso/core',
  '02_proceso/workflows/core',
  '02_proceso/workflows/local-extensions',
  '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense',
] as const;
// Resolution and dependency-lock inputs are executable authority, not ambient context.
const RUNTIME_CONFIG_REFS =
  '.npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json'.split(' ');
const BUNDLE_SOURCE_URL = new URL(`${RUNTIME_TREE_REFS[3]}/`, REPOSITORY_SOURCE_URL);

export const technicalDefenseRuntimeAttestationRefsV1 = (): readonly string[] =>
  [
    ...RUNTIME_CONFIG_REFS,
    ...RUNTIME_TREE_REFS.flatMap((treeRef) => {
      const root = fileURLToPath(new URL(`${treeRef}/`, REPOSITORY_SOURCE_URL));
      return readdirSync(root, {recursive: true, withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
        .map(
          (entry) =>
            `${treeRef}/${relative(root, join(entry.parentPath, entry.name)).replaceAll('\\', '/')}`,
        );
    }),
  ].sort();

export const hashTechnicalDefenseRuntimeInputsV1 = (read: (ref: string) => Uint8Array): string =>
  hashCanonical(
    technicalDefenseRuntimeAttestationRefsV1().map((ref) => ({ref, sha256: sha256(read(ref))})),
  );

export interface LocalExtensionExecutionInputV1 {
  readonly repositoryRoot: string;
  readonly record: LocalExtensionRecord;
  readonly activationReceipt: LocalActivationReceiptV1;
  readonly sandboxProbeBytes: Uint8Array;
  readonly caseBytes: Uint8Array;
  readonly caseSha256: string;
  readonly privacyProvenanceSession?: TechnicalDefensePrivacyProvenanceSessionV1;
  readonly execution: MaterialSkillExecutionDraftV2;
}

export interface LocalExtensionRunnerAuthorityV1 {
  readonly runnerId: 'frames.local-extension-executor-v1';
  readonly runnerSha256: string;
}

export const TECHNICAL_DEFENSE_MANIFEST_SHA256_V1 =
  '9aa291c9b3d933d47002bfdd46f73d9ad82d6eb5f345942a146d65e0f5bc0146';

export const technicalDefenseRunnerSha256V1 = (): string =>
  hashTechnicalDefenseRuntimeInputsV1((ref) =>
    readFileSync(fileURLToPath(new URL(ref, REPOSITORY_SOURCE_URL))),
  );

export const technicalDefenseAuthorizationV1 = (
  record: LocalExtensionRecord,
  receipt: LocalActivationReceiptV1,
  caseSha256: string,
  workOrderSha256: string,
  runnerAuthority: LocalExtensionRunnerAuthorityV1,
) => ({
  scope: 'PROJECT_LOCAL',
  extension_id: TECHNICAL_DEFENSE_EXTENSION_ID,
  manifest_sha256: record.manifest_sha256 ?? '',
  sandbox_probe_sha256: record.sandbox_probe_sha256 ?? '',
  activation_receipt_sha256: receipt.receipt_sha256,
  runner_id: runnerAuthority.runnerId,
  runner_sha256: runnerAuthority.runnerSha256,
  case_sha256: caseSha256,
  work_order_sha256: workOrderSha256,
  network: 'DENIED',
  execution_environment: 'LOCAL_SIMULATION',
});

const receiptPayload = (receipt: LocalActivationReceiptV1) =>
  Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'receipt_sha256'));
const parseProbe = (bytes: Uint8Array): unknown => {
  try {
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch {
    return failTransactionV1('CONTRACT_INVALID', 'Sandbox probe is not valid UTF-8 JSON.');
  }
};
const executionModulesAreAttested = (
  record: LocalExtensionRecord,
  content: readonly {ref: string; sha256: string}[],
): boolean =>
  TECHNICAL_DEFENSE_EXECUTION_MODULE_REFS_V1.every((ref) => {
    const declared = content.find((item) => item.ref === ref)?.sha256;
    if (!declared) return false;
    return (
      declared === sha256(readFileSync(fileURLToPath(new URL(ref, BUNDLE_SOURCE_URL)))) &&
      declared === sha256(readFileSync(containedFile(record.source_root, ref)))
    );
  });

export const validateTechnicalDefenseActivationV1 = (
  input: LocalExtensionExecutionInputV1,
  runnerAuthority: LocalExtensionRunnerAuthorityV1,
) => {
  if (
    runnerAuthority.runnerId !== 'frames.local-extension-executor-v1' ||
    runnerAuthority.runnerSha256 !== technicalDefenseRunnerSha256V1()
  )
    return failTransactionV1('AUTHORITY_DENIED', 'Local extension runner authority drifted.');
  const {record, activationReceipt: receipt} = input;
  const manifest = LocalExtensionManifestSchema.parse(record.manifest);
  const matches = discoverLocalExtensions({
    repository_root: input.repositoryRoot,
    trusted_sandbox_runners: {[runnerAuthority.runnerId]: runnerAuthority.runnerSha256},
  }).records.filter(({extension_id}) => extension_id === TECHNICAL_DEFENSE_EXTENSION_ID);
  const trusted = matches.length === 1 ? matches[0] : undefined;
  if (
    !trusted ||
    trusted.state !== 'ACTIVE_LOCAL' ||
    trusted.manifest_sha256 !== TECHNICAL_DEFENSE_MANIFEST_SHA256_V1 ||
    hashCanonical(trusted) !== hashCanonical(record) ||
    hashCanonical(createLocalActivationReceipt(trusted)) !== hashCanonical(receipt)
  )
    return failTransactionV1('AUTHORITY_DENIED', 'Trusted loader did not reproduce activation.');
  if (
    record.extension_id !== TECHNICAL_DEFENSE_EXTENSION_ID ||
    record.state !== 'ACTIVE_LOCAL' ||
    record.scope !== 'PROJECT_LOCAL' ||
    record.reason_codes.length > 0 ||
    record.manifest_sha256 !== TECHNICAL_DEFENSE_MANIFEST_SHA256_V1 ||
    !record.sandbox_probe_sha256 ||
    manifest.scope !== 'PROJECT_LOCAL' ||
    manifest.kind !== 'bundle' ||
    manifest.lifecycle !== 'READY' ||
    !manifest.enabled ||
    manifest.effect_class !== 'local_reversible' ||
    manifest.execution.mode !== 'code' ||
    manifest.execution.handler !== 'handler.ts' ||
    manifest.execution.sandbox_probe !== 'sandbox-probe.json' ||
    manifest.tools.length > 0 ||
    !executionModulesAreAttested(record, manifest.content)
  )
    return failTransactionV1('AUTHORITY_DENIED', 'Local extension module bytes drifted.');
  if (
    receipt.extension_id !== record.extension_id ||
    receipt.manifest_sha256 !== record.manifest_sha256 ||
    receipt.sandbox_probe_sha256 !== record.sandbox_probe_sha256 ||
    receipt.state !== 'ACTIVE_LOCAL' ||
    receipt.source_scope !== 'PROJECT_LOCAL' ||
    receipt.reason_codes.length > 0 ||
    receipt.receipt_sha256 !== hashCanonical(receiptPayload(receipt)) ||
    sha256(input.sandboxProbeBytes) !== record.sandbox_probe_sha256
  )
    return failTransactionV1('HASH_MISMATCH', 'Activation or sandbox binding drifted.');
  const probe = SandboxProbeSchema.parse(parseProbe(input.sandboxProbeBytes));
  if (
    probe.extension_id !== record.extension_id ||
    probe.manifest_sha256 !== record.manifest_sha256 ||
    probe.runner_id !== runnerAuthority.runnerId ||
    probe.runner_sha256 !== runnerAuthority.runnerSha256 ||
    probe.network !== 'DENIED'
  )
    return failTransactionV1('AUTHORITY_DENIED', 'Sandbox probe is stale or permits network.');
  if (sha256(input.caseBytes) !== input.caseSha256)
    return failTransactionV1('HASH_MISMATCH', 'Case bytes differ from the bound digest.');
  return manifest;
};
