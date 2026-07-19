import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from '../../core/contracts/index.ts';

export const ApprovedRenderPackageSchema = z.strictObject({
  schemaVersion: z.literal('n8n-approved-render-package-v2'),
  artifactId: PortableIdSchema,
  artifactRef: RelativePathSchema,
  artifactHash: Sha256Schema,
  compositionId: PortableIdSchema,
  renderReceiptRef: RelativePathSchema,
  renderReceiptHash: Sha256Schema,
  inputPropsRef: RelativePathSchema,
  inputPropsHash: Sha256Schema,
  assetManifestRef: RelativePathSchema,
  assetManifestHash: Sha256Schema,
  idempotencyKey: z.string().min(16).max(256),
  approvalState: z.literal('HUMAN_APPROVED'),
  humanApproverActorId: z.literal('H01'),
  approvalReceiptId: PortableIdSchema,
  approvalReceiptRef: RelativePathSchema,
  approvalReceiptHash: Sha256Schema,
  callbackPolicyRef: RelativePathSchema,
  callbackPolicyHash: Sha256Schema,
  retryPolicyRef: RelativePathSchema,
  retryPolicyHash: Sha256Schema,
  killSwitchRef: RelativePathSchema,
  killSwitchHash: Sha256Schema,
  dryRun: z.literal(true),
});

export const N8nDryRunReceiptSchema = z.strictObject({
  schemaVersion: z.literal('n8n-dry-run-receipt-v1'),
  receiptId: PortableIdSchema,
  jobId: PortableIdSchema,
  idempotencyKey: z.string().min(16).max(256),
  status: z.enum(['dry-run-accepted', 'dry-run-replayed', 'rejected']),
  logRefs: z.array(RelativePathSchema),
  inputHash: Sha256Schema,
  outputHash: Sha256Schema,
  retryCount: z.number().int().nonnegative(),
  errorClass: z.string().nullable(),
  dryRun: z.literal(true),
});

export type ApprovedRenderPackage = z.infer<typeof ApprovedRenderPackageSchema>;
export type N8nDryRunReceipt = z.infer<typeof N8nDryRunReceiptSchema>;
