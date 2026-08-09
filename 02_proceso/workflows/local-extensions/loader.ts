import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {dirname, relative} from 'node:path';
import {parse as parseYaml} from 'yaml';

import {
  LocalExtensionManifestSchema,
  SandboxProbeSchema,
  type LocalExtensionDiscovery,
  type LocalExtensionManifest,
  type LocalExtensionRecord,
} from './contracts.ts';
import {applyDependencyBlocks, validatePackageContent} from './dependencies.ts';
import {
  containedFile,
  existingPhysicalRoot,
  resolveLocalExtensionRoots,
  type LocalExtensionRootsInput,
} from './paths.ts';

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const parseManifest = (path: string): unknown => {
  const text = readFileSync(path, 'utf8');
  return path.endsWith('.json') ? JSON.parse(text) : parseYaml(text);
};

const blocked = (root: string, ref: string, reasons: string[]): LocalExtensionRecord => ({
  extension_id: `blocked.extension.${sha256(`${root}\u0000${ref}`).slice(0, 12)}`,
  scope: 'UNKNOWN',
  source_root: root,
  manifest_ref: ref,
  state: 'BLOCKED',
  reason_codes: reasons,
});

const codeState = (
  root: string,
  manifestPath: string,
  manifest: LocalExtensionManifest,
  trustedRunners: Readonly<Record<string, string>>,
): {state: LocalExtensionRecord['state']; reason?: string} => {
  if (manifest.execution.mode !== 'code') return {state: 'ACTIVE_LOCAL'};
  try {
    const probePath = containedFile(root, manifest.execution.sandbox_probe);
    const probe = SandboxProbeSchema.parse(JSON.parse(readFileSync(probePath, 'utf8')));
    const digest = sha256(readFileSync(manifestPath));
    if (trustedRunners[probe.runner_id] !== probe.runner_sha256) {
      return {state: 'VALIDATED_NOT_RUNNABLE', reason: 'SANDBOX_RUNNER_UNTRUSTED'};
    }
    if (probe.extension_id !== manifest.extension_id || probe.manifest_sha256 !== digest) {
      return {state: 'VALIDATED_NOT_RUNNABLE', reason: 'SANDBOX_PROBE_STALE'};
    }
    for (const evidence of probe.evidence) {
      const evidencePath = containedFile(root, evidence.ref);
      if (sha256(readFileSync(evidencePath)) !== evidence.sha256) {
        return {state: 'VALIDATED_NOT_RUNNABLE', reason: 'SANDBOX_EVIDENCE_HASH_MISMATCH'};
      }
    }
    return {state: 'ACTIVE_LOCAL'};
  } catch {
    return {state: 'VALIDATED_NOT_RUNNABLE', reason: 'SANDBOX_PROBE_MISSING_OR_INVALID'};
  }
};

const loadOne = (
  root: string,
  ref: string,
  expectedScope: 'PROJECT_LOCAL' | 'USER_LOCAL',
  trustedRunners: Readonly<Record<string, string>>,
): LocalExtensionRecord => {
  try {
    const path = containedFile(root, ref);
    const packageRoot = dirname(path);
    const raw = readFileSync(path);
    const manifest = LocalExtensionManifestSchema.parse(parseManifest(path));
    const reasons = validatePackageContent(packageRoot, manifest);
    if (manifest.scope !== expectedScope) reasons.push('SCOPE_ROOT_MISMATCH');
    if (manifest.execution.mode === 'code') {
      const handler = manifest.execution.handler;
      if (!manifest.content.some((item) => item.ref === handler))
        reasons.push('HANDLER_NOT_HASHED');
    }
    let state: LocalExtensionRecord['state'] = 'BLOCKED';
    if (reasons.length === 0) {
      if (manifest.lifecycle === 'RETIRED') state = 'RETIRED';
      else if (manifest.lifecycle === 'DRAFT') state = 'DRAFT';
      else if (!manifest.enabled) state = 'VALIDATED';
      else {
        const evaluation = codeState(packageRoot, path, manifest, trustedRunners);
        state = evaluation.state;
        if (evaluation.reason) reasons.push(evaluation.reason);
      }
    }
    return {
      extension_id: manifest.extension_id,
      scope: expectedScope,
      source_root: packageRoot,
      manifest_ref: ref,
      manifest_sha256: sha256(raw),
      state,
      reason_codes: [...new Set(reasons)].sort(),
      manifest,
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.message.startsWith('LOCAL_EXTENSION_')
        ? error.message
        : 'INVALID_EXTENSION_MANIFEST';
    return blocked(root, ref, [reason]);
  }
};

const rootRecords = (
  root: string | undefined,
  scope: 'PROJECT_LOCAL' | 'USER_LOCAL',
  trustedRunners: Readonly<Record<string, string>>,
): LocalExtensionRecord[] => {
  if (!root) return [];
  return readdirSync(root, {recursive: true, withFileTypes: true})
    .filter(
      (entry) =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        ['extension.yml', 'extension.yaml', 'extension.json'].includes(entry.name),
    )
    .map((entry) => {
      const parentRef = relative(root, entry.parentPath);
      const ref = parentRef ? `${parentRef}/${entry.name}` : entry.name;
      return loadOne(root, ref, scope, trustedRunners);
    })
    .sort(
      (left, right) =>
        compareText(left.extension_id, right.extension_id) ||
        compareText(left.manifest_ref, right.manifest_ref),
    );
};

export interface DiscoverLocalExtensionsInput extends LocalExtensionRootsInput {
  canonical_ids?: readonly string[];
  trusted_sandbox_runners?: Readonly<Record<string, string>>;
}
export const discoverLocalExtensions = (
  input: DiscoverLocalExtensionsInput,
): LocalExtensionDiscovery => {
  const roots = resolveLocalExtensionRoots(input);
  const project = existingPhysicalRoot(roots.project);
  const user = roots.user ? existingPhysicalRoot(roots.user) : undefined;
  const trustedRunners = input.trusted_sandbox_runners ?? {};
  const records = [
    ...rootRecords(project, 'PROJECT_LOCAL', trustedRunners),
    ...rootRecords(user, 'USER_LOCAL', trustedRunners),
  ];
  const counts = new Map<string, number>();
  for (const record of records)
    counts.set(record.extension_id, (counts.get(record.extension_id) ?? 0) + 1);
  const canonical = new Set(input.canonical_ids ?? []);
  for (const record of records) {
    if ((counts.get(record.extension_id) ?? 0) > 1)
      record.reason_codes.push('DUPLICATE_EXTENSION_ID');
    if (canonical.has(record.extension_id)) record.reason_codes.push('CANONICAL_ID_COLLISION');
    if (record.reason_codes.some((reason) => !reason.startsWith('SANDBOX_'))) {
      record.state = 'BLOCKED';
    }
    record.reason_codes = [...new Set(record.reason_codes)].sort();
  }
  applyDependencyBlocks(records);
  return {
    schema_version: 'frames-local-extension-discovery-v1',
    project_root: roots.project,
    ...(roots.user ? {user_root: roots.user} : {}),
    records: records.sort(
      (left, right) =>
        compareText(left.extension_id, right.extension_id) || compareText(left.scope, right.scope),
    ),
  };
};
