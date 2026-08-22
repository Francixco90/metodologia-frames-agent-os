import {createHash} from 'node:crypto';

import {parse} from 'yaml';

import {assertOpportunitySelectionV2} from '../../../core/contracts/opportunity-map-v2.ts';
import type {OpportunityMaterialAuthorityV1} from './material-input-schema.ts';

type ProjectionMaterial = {markdown: string};
type AuthorityInput = {artifact: string; ref: string; sha256: string};
const digest = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

export function enforceOpportunityMaterialAuthority(input: {
  workflowId: string;
  authority: OpportunityMaterialAuthorityV1 | undefined;
  materials: ReadonlyMap<string, ProjectionMaterial>;
  readLocal: (path: string) => Buffer;
  verifiedAt: string;
}): AuthorityInput[] {
  if (input.workflowId !== 'P02') {
    if (input.authority) throw new Error('MW-OPPORTUNITY-AUTHORITY001 only P02 may declare it');
    return [];
  }
  if (!input.authority) throw new Error('MW-OPPORTUNITY-AUTHORITY002 P02 authority is required');
  const projection = input.materials.get('opportunity-map-v1');
  if (!projection) throw new Error('MW-OPPORTUNITY-AUTHORITY003 V1 projection is required');

  const receiptBytes = input.readLocal(input.authority.source_receipt_path);
  const materialBytes = input.readLocal(input.authority.source_material_path);
  const mapBytes = input.readLocal(input.authority.opportunity_map_path);
  const selectionBytes = input.readLocal(input.authority.opportunity_selection_path);
  try {
    assertOpportunitySelectionV2(
      parse(mapBytes.toString('utf8')) as unknown,
      parse(selectionBytes.toString('utf8')) as unknown,
      {
        sourceReceipt: parse(receiptBytes.toString('utf8')) as never,
        materialBytes,
        compatibilityProjectionBytes: Buffer.from(projection.markdown, 'utf8'),
      },
      input.verifiedAt,
    );
  } catch (error) {
    throw new Error(`MW-OPPORTUNITY-AUTHORITY004 ${String(error)}`, {cause: error});
  }
  return [
    ['opportunity-source-receipt-v1', input.authority.source_receipt_path, receiptBytes],
    ['opportunity-source-material-v1', input.authority.source_material_path, materialBytes],
    ['opportunity-map-v2', input.authority.opportunity_map_path, mapBytes],
    ['opportunity-selection-v2', input.authority.opportunity_selection_path, selectionBytes],
  ].map(([artifact, , bytes]) => ({
    artifact: String(artifact),
    ref: `runtime://opportunity/${String(artifact)}/${digest(bytes as Buffer)}`,
    sha256: digest(bytes as Buffer),
  }));
}
