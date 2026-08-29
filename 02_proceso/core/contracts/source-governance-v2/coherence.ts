import type {z} from 'zod';

import {sameArray} from './common.ts';
import type {
  PinnedRepositoryDescriptorV1Schema,
  PinnedRepositoryRightsProjectionV1Schema,
  PinnedRepositorySelectedPathsProjectionV1Schema,
} from './evidence-schemas.ts';
import type {PinnedRepositoryManifestRowV1} from './manifest.ts';
import type {
  PinnedRepositoryReceiptBindingV2Schema,
  PinnedRepositoryTransitionReceiptV2,
} from './receipt-schemas.ts';
import type {PinnedRepositorySourceEntryV2} from './repository-schemas.ts';

export const descriptorMatchesRepositoryLockV1 = (
  descriptor: z.infer<typeof PinnedRepositoryDescriptorV1Schema>,
  entry: PinnedRepositorySourceEntryV2,
): boolean => {
  const lock = entry.repository_lock;
  return (
    descriptor.source_id === entry.source_id &&
    descriptor.repository.canonical_uri === lock.canonical_uri &&
    descriptor.repository.canonical_uri_sha256 === lock.canonical_uri_sha256 &&
    descriptor.repository.commit_sha1 === lock.commit_object_id &&
    descriptor.repository.tree_sha1 === lock.tree_object_id &&
    descriptor.repository.tree_listing_sha256 === lock.tree_listing_sha256 &&
    descriptor.repository.tracked_file_count === lock.tracked_file_count &&
    descriptor.source_archive.sha256 === lock.source_archive.sha256 &&
    descriptor.source_archive.bytes === lock.source_archive.bytes &&
    descriptor.selected_paths_manifest.locator === lock.selected_paths_manifest.locator &&
    descriptor.selected_paths_manifest.sha256 === lock.selected_paths_manifest.sha256 &&
    descriptor.selected_paths_manifest.bytes === lock.selected_paths_manifest.bytes &&
    descriptor.selected_paths_manifest.selected_path_count ===
      lock.selected_paths_manifest.selected_path_count &&
    descriptor.selected_paths_projection.locator === lock.selected_paths_projection.locator &&
    descriptor.selected_paths_projection.sha256 === lock.selected_paths_projection.sha256 &&
    descriptor.selected_paths_projection.bytes === lock.selected_paths_projection.bytes &&
    descriptor.rights_authorization_projection.locator ===
      lock.rights_authorization_projection.locator &&
    descriptor.rights_authorization_projection.sha256 ===
      lock.rights_authorization_projection.sha256 &&
    descriptor.rights_authorization_projection.bytes ===
      lock.rights_authorization_projection.bytes &&
    sameArray(descriptor.restrictions, entry.restrictions)
  );
};

export const selectedPathsProjectionMatchesManifestV1 = (
  projection: z.infer<typeof PinnedRepositorySelectedPathsProjectionV1Schema>,
  entry: PinnedRepositorySourceEntryV2,
  manifestRows: readonly PinnedRepositoryManifestRowV1[],
): boolean => {
  const projectionPaths = projection.selections.flatMap(({paths}) => paths);
  const manifestPaths = manifestRows.map(({path}) => path);
  return (
    projection.source_id === entry.source_id &&
    projection.manifest_contract.selected_path_count ===
      entry.repository_lock.selected_paths_manifest.selected_path_count &&
    sameArray([...projectionPaths].sort(), [...manifestPaths].sort()) &&
    new Set(projectionPaths).size === projectionPaths.length
  );
};

export const rightsProjectionMatchesEntryV1 = (
  projection: z.infer<typeof PinnedRepositoryRightsProjectionV1Schema>,
  entry: PinnedRepositorySourceEntryV2,
): boolean =>
  projection.source_id === entry.source_id &&
  projection.rights_verdict === entry.rights.rights_verdict &&
  projection.allowed_use_scope === entry.rights.allowed_use_scope &&
  sameArray(projection.restrictions, entry.restrictions);

export const rightsProjectionMatchesManifestV1 = (
  projection: z.infer<typeof PinnedRepositoryRightsProjectionV1Schema>,
  manifestRows: readonly PinnedRepositoryManifestRowV1[],
): boolean => {
  const observations = projection.observations;
  if (!observations.tracked_license_file_observed) return true;
  const licenseRows = manifestRows.filter(({path}) => path === 'LICENSE');
  return (
    licenseRows.length === 1 && licenseRows[0]?.sourceSha256 === observations.tracked_license_sha256
  );
};

export type PinnedRepositoryReceiptRecordV2 = {
  binding: z.infer<typeof PinnedRepositoryReceiptBindingV2Schema>;
  receipt: PinnedRepositoryTransitionReceiptV2;
};

export const receiptMatchesRepositoryLockV2 = (
  receipt: PinnedRepositoryTransitionReceiptV2,
  entry: PinnedRepositorySourceEntryV2,
): boolean => {
  const lock = entry.repository_lock;
  return (
    receipt.source_id === entry.source_id &&
    receipt.repository.canonical_uri === lock.canonical_uri &&
    receipt.repository.canonical_uri_sha256 === lock.canonical_uri_sha256 &&
    receipt.repository.commit_sha1 === lock.commit_object_id &&
    receipt.repository.tree_sha1 === lock.tree_object_id &&
    receipt.repository.tree_listing_sha256 === lock.tree_listing_sha256 &&
    receipt.repository.tracked_file_count === lock.tracked_file_count &&
    receipt.hashes.raw_sha256 === entry.hashes.raw_sha256 &&
    receipt.hash_semantics.raw_bytes === entry.hashes.raw_bytes &&
    receipt.evidence_projection.repository_descriptor === lock.repository_descriptor.locator &&
    receipt.evidence_projection.repository_descriptor_sha256 ===
      lock.repository_descriptor.sha256 &&
    receipt.evidence_projection.selected_paths_manifest_sha256 ===
      lock.selected_paths_manifest.sha256 &&
    receipt.evidence_projection.selected_paths_projection_sha256 ===
      lock.selected_paths_projection.sha256 &&
    receipt.evidence_projection.rights_authorization_projection_sha256 ===
      lock.rights_authorization_projection.sha256 &&
    receipt.rights.allowed_use_scope === entry.rights.allowed_use_scope &&
    receipt.rights.rights_verdict === entry.rights.rights_verdict &&
    receipt.authority.authority_class === entry.authority.authority_class &&
    sameArray(receipt.restrictions, entry.restrictions)
  );
};
