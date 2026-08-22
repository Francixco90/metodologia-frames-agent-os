import {createHash} from 'node:crypto';

import {parse} from 'yaml';

import {assertOpportunitySelectionV2} from '../../../core/contracts/opportunity-map-v2.ts';
import {CANONICAL_HUMAN_APPROVER_ACTOR_ID} from '../../../core/contracts/schemas.ts';
import type {OpportunityMaterialAuthorityV1} from './material-input-schema.ts';

type ProjectionMaterial = {markdown: string};
type AuthorityInput = {artifact: string; ref: string; sha256: string};
type LocalAuthorityFile = {bytes: Buffer; canonicalPath: string};
const digest = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

export function enforceOpportunityMaterialAuthority(input: {
  workflowId: string;
  requestHash: string;
  authority: OpportunityMaterialAuthorityV1 | undefined;
  materials: ReadonlyMap<string, ProjectionMaterial>;
  readLocal: (path: string) => LocalAuthorityFile;
  verifiedAt: string;
}): AuthorityInput[] {
  if (input.workflowId !== 'P02') {
    if (input.authority) throw new Error('MW-OPPORTUNITY-AUTHORITY001 only P02 may declare it');
    return [];
  }
  if (!input.authority) throw new Error('MW-OPPORTUNITY-AUTHORITY002 P02 authority is required');
  const projection = input.materials.get('opportunity-map-v1');
  if (!projection) throw new Error('MW-OPPORTUNITY-AUTHORITY003 V1 projection is required');

  const receipt = input.readLocal(input.authority.source_receipt_path);
  const material = input.readLocal(input.authority.source_material_path);
  const map = input.readLocal(input.authority.opportunity_map_path);
  const selection = input.readLocal(input.authority.opportunity_selection_path);
  const authorityFiles = [receipt, material, map, selection];
  if (new Set(authorityFiles.map(({canonicalPath}) => canonicalPath)).size !== 4) {
    throw new Error('MW-OPPORTUNITY-AUTHORITY005 canonical authority paths must be unique');
  }
  try {
    const verified = assertOpportunitySelectionV2(
      parse(map.bytes.toString('utf8')) as unknown,
      parse(selection.bytes.toString('utf8')) as unknown,
      {
        sourceReceipt: parse(receipt.bytes.toString('utf8')) as never,
        materialBytes: material.bytes,
        compatibilityProjectionBytes: Buffer.from(projection.markdown, 'utf8'),
      },
      input.verifiedAt,
    );
    if (
      verified.map.requestHash !== input.requestHash ||
      verified.selection.actorId !== CANONICAL_HUMAN_APPROVER_ACTOR_ID
    ) {
      throw new Error('active request or canonical human selector mismatch');
    }
  } catch (error) {
    throw new Error(`MW-OPPORTUNITY-AUTHORITY004 ${String(error)}`, {cause: error});
  }
  return [
    ['opportunity-source-receipt-v1', input.authority.source_receipt_path, receipt.bytes],
    ['opportunity-source-material-v1', input.authority.source_material_path, material.bytes],
    ['opportunity-map-v2', input.authority.opportunity_map_path, map.bytes],
    ['opportunity-selection-v2', input.authority.opportunity_selection_path, selection.bytes],
  ].map(([artifact, , bytes]) => ({
    artifact: String(artifact),
    ref: `runtime://opportunity/${String(artifact)}/${digest(bytes as Buffer)}`,
    sha256: digest(bytes as Buffer),
  }));
}
