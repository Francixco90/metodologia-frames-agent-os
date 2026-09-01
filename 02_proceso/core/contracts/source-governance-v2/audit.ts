import {auditPinnedRepositoryArtifactsV2} from './artifact-audit.ts';
import {auditPinnedRepositoryReceiptsV2} from './receipt-audit.ts';
import type {PinnedRepositorySourceEntryV2} from './repository-schemas.ts';

export type PinnedRepositoryPhysicalRecordV2 = {
  path: string;
  bytes: Uint8Array;
};

export const auditPinnedRepositorySourceV2 = ({
  entry,
  evidence,
}: {
  entry: PinnedRepositorySourceEntryV2;
  evidence: readonly PinnedRepositoryPhysicalRecordV2[];
}): string[] => {
  const evidenceByPath = new Map(evidence.map((record) => [record.path, record.bytes]));
  return [
    ...auditPinnedRepositoryArtifactsV2(entry, evidenceByPath),
    ...auditPinnedRepositoryReceiptsV2(entry, evidenceByPath),
  ];
};
