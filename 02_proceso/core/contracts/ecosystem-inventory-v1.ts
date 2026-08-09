import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

export const EcosystemInventoryKindV1Schema = z.enum([
  'AGENT',
  'SKILL',
  'ROUTE',
  'WORKFLOW',
  'TEMPLATE',
  'ASSET',
  'DELIVERABLE',
  'COMPONENT',
  'RENDERER',
  'ADAPTER',
  'GATE',
  'COMMAND',
  'SOURCE',
  'LOCAL_EXTENSION',
]);

export const EcosystemInventoryItemV1Schema = z.strictObject({
  kind: EcosystemInventoryKindV1Schema,
  id: z.string().trim().min(1).max(240),
  ref: RelativePathSchema,
  scope: z.enum(['CANONICAL', 'PROJECT_LOCAL', 'USER_LOCAL']),
  state: z.string().trim().min(1).max(80),
});

export const EcosystemInventoryV1Schema = z.strictObject({
  schemaVersion: z.literal('ecosystem-inventory-v1'),
  inventoryId: PortableIdSchema,
  scope: z.enum(['PUBLIC', 'LOCAL_COMBINED']),
  items: z.array(EcosystemInventoryItemV1Schema),
  sourceSha256: Sha256Schema,
});
export type EcosystemInventoryV1 = z.infer<typeof EcosystemInventoryV1Schema>;
