import {parse} from 'yaml';

import {sha256Bytes} from './common.ts';
import {
  descriptorMatchesRepositoryLockV1,
  rightsProjectionMatchesEntryV1,
  rightsProjectionMatchesManifestV1,
  selectedPathsProjectionMatchesManifestV1,
} from './coherence.ts';
import {
  PinnedRepositoryDescriptorV1Schema,
  PinnedRepositoryRightsProjectionV1Schema,
  PinnedRepositorySelectedPathsProjectionV1Schema,
} from './evidence-schemas.ts';
import {parsePinnedRepositoryManifestV1} from './manifest.ts';
import type {PinnedRepositorySourceEntryV2} from './repository-schemas.ts';

export type PinnedRepositoryEvidenceMapV2 = ReadonlyMap<string, Uint8Array>;

const parseYamlEvidence = (bytes: Uint8Array): unknown =>
  parse(new TextDecoder().decode(bytes)) as unknown;

export const auditPinnedRepositoryArtifactsV2 = (
  entry: PinnedRepositorySourceEntryV2,
  evidenceByPath: PinnedRepositoryEvidenceMapV2,
): string[] => {
  const errors: string[] = [];
  const lock = entry.repository_lock;
  const bindings = [
    lock.repository_descriptor,
    lock.selected_paths_manifest,
    lock.selected_paths_projection,
    lock.rights_authorization_projection,
  ] as const;
  for (const binding of bindings) {
    const bytes = evidenceByPath.get(binding.locator);
    if (bytes === undefined) {
      errors.push(`${entry.source_id}: missing physical evidence ${binding.locator}`);
    } else if (sha256Bytes(bytes) !== binding.sha256 || bytes.byteLength !== binding.bytes) {
      errors.push(`${entry.source_id}: physical evidence hash/bytes mismatch ${binding.locator}`);
    }
  }

  const descriptorBytes = evidenceByPath.get(lock.repository_descriptor.locator);
  if (descriptorBytes !== undefined) {
    const result = PinnedRepositoryDescriptorV1Schema.safeParse(parseYamlEvidence(descriptorBytes));
    if (!result.success) {
      errors.push(`${entry.source_id}: repository descriptor contract mismatch`);
    } else if (!descriptorMatchesRepositoryLockV1(result.data, entry)) {
      errors.push(`${entry.source_id}: repository descriptor does not match repository_lock`);
    }
  }

  const manifestBytes = evidenceByPath.get(lock.selected_paths_manifest.locator);
  const manifestRows =
    manifestBytes === undefined
      ? []
      : parsePinnedRepositoryManifestV1(entry.source_id, manifestBytes, errors);
  if (manifestRows.length !== lock.selected_paths_manifest.selected_path_count) {
    errors.push(`${entry.source_id}: manifest selected_path_count mismatch`);
  }

  const projectionBytes = evidenceByPath.get(lock.selected_paths_projection.locator);
  if (projectionBytes !== undefined) {
    const result = PinnedRepositorySelectedPathsProjectionV1Schema.safeParse(
      parseYamlEvidence(projectionBytes),
    );
    if (!result.success) {
      errors.push(`${entry.source_id}: selected-paths projection contract mismatch`);
    } else if (!selectedPathsProjectionMatchesManifestV1(result.data, entry, manifestRows)) {
      errors.push(`${entry.source_id}: selected-paths projection does not match manifest`);
    }
  }

  const rightsBytes = evidenceByPath.get(lock.rights_authorization_projection.locator);
  if (rightsBytes !== undefined) {
    const result = PinnedRepositoryRightsProjectionV1Schema.safeParse(
      parseYamlEvidence(rightsBytes),
    );
    if (!result.success) {
      errors.push(`${entry.source_id}: rights authorization projection contract mismatch`);
    } else {
      if (!rightsProjectionMatchesEntryV1(result.data, entry)) {
        errors.push(`${entry.source_id}: rights authorization projection scope mismatch`);
      }
      if (!rightsProjectionMatchesManifestV1(result.data, manifestRows)) {
        errors.push(`${entry.source_id}: tracked LICENSE SHA-256 does not match manifest row`);
      }
    }
  }
  return errors;
};
