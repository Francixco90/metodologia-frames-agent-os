/**
 * Zod schema for a check-run receipt emitted by `run-check.ts`.
 *
 * Family: `04_estado/receipts/check-runs/C-NNN/receipt.yml`.
 * Schema: `check-run-receipt-v1` (append-only by ADR 008).
 *
 * Conventions mirror `02_proceso/core/contracts/primitives.ts`:
 *   - sha256 digests are lowercase 64-hex (`Sha256Schema`).
 *   - timestamps are ISO 8601 with offset (`TimestampSchema`).
 *   - gate ids follow the same regex as `CommandEntrySchema.gate`.
 */
import {z} from 'zod';

import {GateIdSchema} from './commands-schema.js';

export const CheckRunReceiptSchema = z.strictObject({
  schema_version: z.literal('check-run-receipt-v1'),
  receipt_id: z.string().regex(/^C-[0-9]{3}$/u, 'Expected a check-run receipt id of form C-NNN'),
  gate: GateIdSchema,
  command: z.string(),
  exit_code: z.number().int(),
  stdout_sha256: z.string().regex(/^[a-f0-9]{64}$/u, 'Expected a lowercase SHA-256 digest'),
  stderr_sha256: z.string().regex(/^[a-f0-9]{64}$/u, 'Expected a lowercase SHA-256 digest'),
  duration_ms: z.number().int().nonnegative(),
  ran_at: z.iso.datetime({offset: true}),
  append_only: z.literal(true),
  runner_actor: z.string().min(1),
  /**
   * Optional. When set, this run is a re-execution of a prior receipt.
   * Append-only is preserved (no dedup); the field records the prior
   * `receipt_id` for traceability.
   */
  duplicate_of: z
    .string()
    .regex(/^C-[0-9]{3}$/u)
    .optional(),
});

export type CheckRunReceipt = z.infer<typeof CheckRunReceiptSchema>;
