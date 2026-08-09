import {mkdirSync, readFileSync, renameSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {
  HostAdapterInstallReceiptV1Schema,
  HostAdapterPackageV1Schema,
  type HostAdapterInstallReceiptV1,
} from '../../../02_proceso/core/contracts/host-adapter-package-v1.ts';
import {renderHostAdapterProjections} from '../../../03_artefactos/host-adapters/generate-host-adapters.ts';
import {
  atomicWrite,
  packageSha256,
  readOptional,
  safeTargetPath,
  safeTargetRoot,
  sha256,
} from './host-adapter-files.ts';

type Operation = 'PLAN' | 'APPLY' | 'VERIFY' | 'UNINSTALL';
type Scope = 'repository' | 'user' | 'plugin';
type InstallState = {
  packageId: string;
  packageSha256: string;
  files: Record<string, {installedSha256: string; backupRef?: string}>;
};
const MANIFEST_REF = '03_artefactos/host-adapters/host-adapter-package.json';
const STATE_REF = '03_artefactos/host-adapters/install-state.json';

const stateFor = (targetRoot: string): InstallState | null => {
  const value = readOptional(safeTargetPath(targetRoot, STATE_REF));
  return value ? (JSON.parse(value.toString('utf8')) as InstallState) : null;
};

const receipt = (
  operation: Operation,
  status: 'PASS' | 'BLOCKED',
  id: string,
  digest: string,
  scope: Scope,
  targetRoot: string,
  fields: Pick<HostAdapterInstallReceiptV1, 'changedRefs' | 'verifiedRefs' | 'restoredRefs'>,
): HostAdapterInstallReceiptV1 =>
  HostAdapterInstallReceiptV1Schema.parse({
    schemaVersion: 'host-adapter-install-receipt-v1',
    operation,
    status,
    packageId: id,
    packageSha256: digest,
    scope,
    targetRootSha256: sha256(targetRoot),
    ...fields,
    externalEffects: false,
    networkUsed: false,
  });

export const runHostAdapterInstaller = (input: {
  sourceRoot: string;
  targetRoot: string;
  operation?: Operation;
  scope?: Scope;
  confirmation?: string;
}): HostAdapterInstallReceiptV1 => {
  const operation = input.operation ?? 'PLAN';
  const scope = input.scope ?? 'repository';
  const targetRoot = safeTargetRoot(input.targetRoot);
  const manifest = HostAdapterPackageV1Schema.parse(
    JSON.parse(readFileSync(resolve(input.sourceRoot, MANIFEST_REF), 'utf8')),
  );
  const digest = packageSha256(input.sourceRoot);
  const projections = renderHostAdapterProjections(manifest);
  const blank = {
    changedRefs: [] as string[],
    verifiedRefs: [] as string[],
    restoredRefs: [] as string[],
  };
  if (scope !== manifest.allowedScope) {
    return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
  }
  if (operation !== 'PLAN' && input.confirmation !== digest) {
    return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
  }
  const state = stateFor(targetRoot);
  const plan = Object.entries(projections).map(([ref, expected]) => {
    const path = safeTargetPath(targetRoot, ref);
    const actual = readOptional(path);
    if (!actual) return {ref, path, expected, status: 'CREATE' as const};
    if (sha256(actual) === sha256(expected))
      return {ref, path, expected, status: 'CURRENT' as const};
    const prior = state?.files[ref];
    if (prior?.installedSha256 === sha256(actual))
      return {ref, path, expected, status: 'REPLACE' as const};
    return {ref, path, expected, status: 'FOREIGN' as const};
  });
  if (operation === 'VERIFY' || operation === 'PLAN') {
    const blocked =
      plan.some(({status}) => status === 'FOREIGN') ||
      (operation === 'VERIFY' && plan.some(({status}) => status !== 'CURRENT'));
    return receipt(
      operation,
      blocked ? 'BLOCKED' : 'PASS',
      manifest.packageId,
      digest,
      scope,
      targetRoot,
      {
        changedRefs: plan
          .filter(({status}) => status === 'CREATE' || status === 'REPLACE')
          .map(({ref}) => ref),
        verifiedRefs: plan.filter(({status}) => status === 'CURRENT').map(({ref}) => ref),
        restoredRefs: [],
      },
    );
  }
  if (operation === 'APPLY') {
    if (plan.some(({status}) => status === 'FOREIGN')) {
      return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
    }
    for (const item of plan.filter(({status}) => status === 'REPLACE')) {
      const backupRef = `03_artefactos/host-adapters/backups/${state!.packageSha256}/${item.ref}`;
      const backup = readOptional(safeTargetPath(targetRoot, backupRef));
      const actual = readFileSync(item.path);
      if (backup && sha256(backup) !== sha256(actual)) {
        return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
      }
    }
    const next: InstallState = {packageId: manifest.packageId, packageSha256: digest, files: {}};
    for (const item of plan) {
      let backupRef: string | undefined;
      if (item.status === 'REPLACE') {
        backupRef = `03_artefactos/host-adapters/backups/${state!.packageSha256}/${item.ref}`;
        const backupPath = safeTargetPath(targetRoot, backupRef);
        if (!readOptional(backupPath)) {
          mkdirSync(dirname(backupPath), {recursive: true});
          atomicWrite(backupPath, readFileSync(item.path, 'utf8'));
        }
      }
      if (item.status !== 'CURRENT') atomicWrite(item.path, item.expected);
      next.files[item.ref] = {
        installedSha256: sha256(item.expected),
        ...(backupRef ? {backupRef} : {}),
      };
    }
    if (state) {
      const oldState = safeTargetPath(targetRoot, STATE_REF);
      const stateBackup = safeTargetPath(
        targetRoot,
        `03_artefactos/host-adapters/backups/${state.packageSha256}/install-state.json`,
      );
      if (!readOptional(stateBackup)) atomicWrite(stateBackup, readFileSync(oldState, 'utf8'));
    }
    atomicWrite(safeTargetPath(targetRoot, STATE_REF), `${JSON.stringify(next, null, 2)}\n`);
    return receipt(operation, 'PASS', manifest.packageId, digest, scope, targetRoot, {
      changedRefs: plan.filter(({status}) => status !== 'CURRENT').map(({ref}) => ref),
      verifiedRefs: plan.filter(({status}) => status === 'CURRENT').map(({ref}) => ref),
      restoredRefs: [],
    });
  }
  if (!state || state.packageId !== manifest.packageId) {
    return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
  }
  for (const [ref, prior] of Object.entries(state.files)) {
    const actual = readOptional(safeTargetPath(targetRoot, ref));
    if (!actual || sha256(actual) !== prior.installedSha256) {
      return receipt(operation, 'BLOCKED', manifest.packageId, digest, scope, targetRoot, blank);
    }
  }
  const restoredRefs: string[] = [];
  for (const [ref, prior] of Object.entries(state.files)) {
    const path = safeTargetPath(targetRoot, ref);
    const archived = safeTargetPath(
      targetRoot,
      `03_artefactos/host-adapters/backups/uninstalled-${digest}/${ref}`,
    );
    mkdirSync(dirname(archived), {recursive: true});
    renameSync(path, archived);
    if (prior.backupRef) {
      renameSync(safeTargetPath(targetRoot, prior.backupRef), path);
      restoredRefs.push(ref);
    }
  }
  const statePath = safeTargetPath(targetRoot, STATE_REF);
  renameSync(
    statePath,
    safeTargetPath(
      targetRoot,
      `03_artefactos/host-adapters/backups/uninstalled-${digest}/install-state.json`,
    ),
  );
  return receipt(operation, 'PASS', manifest.packageId, digest, scope, targetRoot, {
    changedRefs: Object.keys(state.files),
    verifiedRefs: [],
    restoredRefs,
  });
};
