/**
 * eval-result-v1 — schema for persisted eval run results. [CÓDIGO]
 *
 * Each generic-runner execution of an `oracle.ts` produces one
 * `eval-result-v1` record under `05_verificacion/evals/results/H-E0XX/{ISO}.yml`.
 * Append-only: a new ISO dir per run; never overwritten.
 */
import {z} from 'zod';

export const OracleCheckSchema = z.strictObject({
  name: z.string(),
  passed: z.boolean(),
  detail: z.string().optional(),
});

export const EvalResultSchema = z.strictObject({
  schema_version: z.literal('eval-result-v1'),
  hypothesis_id: z.string().regex(/^H-E[0-9]{3}$/u, 'Expected an eval id H-E0XX'),
  status: z.enum(['pass', 'fail', 'skipped']),
  oracle_checks: z.array(OracleCheckSchema).min(1),
  evidence_hashes: z.array(z.string().length(64)),
  ran_at: z.string(),
  runner_actor: z.literal('eval-generic-runner'),
  append_only: z.literal(true),
  notes: z.string().optional(),
});

export type EvalResult = z.infer<typeof EvalResultSchema>;
export type OracleCheck = z.infer<typeof OracleCheckSchema>;

export type OracleOutcome = {
  status: 'pass' | 'fail' | 'skipped';
  oracle_checks: OracleCheck[];
  evidence_hashes: string[];
  notes?: string;
};

export type Oracle = {
  hypothesis_id: string;
  run: () => OracleOutcome | Promise<OracleOutcome>;
};
