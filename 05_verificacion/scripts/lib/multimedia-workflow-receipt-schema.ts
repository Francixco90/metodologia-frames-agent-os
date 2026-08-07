/**
 * Zod schema for a multimedia-workflow receipt.
 *
 * Family: `04_estado/receipts/workflows/{WF-ID}/{ISO-timestamp}.yml`.
 * Schema: `multimedia-workflow-receipt-v1` (append-only).
 *
 * Emitted by each multimedia workflow's `build.ts` runner (P00–P09) after a
 * stage execution, recording the work-product state transition, the gate the
 * runner stopped at, and hashes of the consumed/produced artifacts. The runner
 * never advances past a manual fail-closed gate (G13–G17, MW_DISTRIBUTION_AUTHORIZED)
 * — `human_approved` is always false on emission. [CONFIG]
 *
 * Conventions mirror `02_proceso/core/contracts/primitives.ts`:
 *   - sha256 digests are lowercase 64-hex.
 *   - timestamps are ISO 8601 with offset.
 *   - relative paths only (no absolutes in versioned contracts).
 */
import {z} from 'zod';

export const MultimediaWorkflowReceiptSchema = z.strictObject({
  schema_version: z.literal('multimedia-workflow-receipt-v1'),
  workflow_id: z.enum(['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']),
  command: z.string().min(1),
  mode: z.string().min(1),
  inputs: z.array(
    z.strictObject({
      artifact: z.string().min(1),
      ref: z.string().min(1).max(512),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u, 'Expected a lowercase SHA-256 digest'),
    }),
  ),
  outputs: z.array(
    z.strictObject({
      artifact: z.string().min(1),
      ref: z.string().min(1).max(512),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u, 'Expected a lowercase SHA-256 digest'),
      required: z.boolean(),
    }),
  ),
  work_product_state_from: z.string().min(1),
  work_product_state_to: z.string().min(1),
  gate: z.string().regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u),
  actor: z.string().min(1),
  ran_at: z.iso.datetime({offset: true}),
  append_only: z.literal(true),
  human_approved: z.literal(false),
  coverage_gaps: z.array(z.string().min(1)).default([]),
});

export type MultimediaWorkflowReceipt = z.infer<typeof MultimediaWorkflowReceiptSchema>;
