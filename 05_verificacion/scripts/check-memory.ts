import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import YAML from 'yaml';
import {z} from 'zod';

const policySchema = z.strictObject({
  schema_version: z.literal(1),
  policy_id: z.literal('governed-memory-v1'),
  storage_model: z.literal('append-only-events'),
  portable_only: z.literal(true),
  allowed_record_types: z
    .array(z.enum(['evidence_summary', 'decision', 'accepted_learning', 'coverage_gap']))
    .length(4),
  required_fields: z
    .array(
      z.enum([
        'record_id',
        'artifact_id',
        'actor_id',
        'evidence_hashes',
        'recorded_at',
        'record_type',
      ]),
    )
    .length(6),
  forbidden_content: z
    .array(
      z.enum(['private_chain_of_thought', 'secret', 'pii', 'private_locator', 'ungrounded_claim']),
    )
    .length(5),
  promotion_policy: z.strictObject({
    accepted_learning_requires: z
      .array(z.enum(['verifier_id', 'guardian_verdict_ref', 'source_snapshot_id']))
      .length(3),
    unresolved_material_must_be: z.literal('coverage_gap'),
  }),
  retention: z.strictObject({
    mutation: z.literal('append_new_event'),
    overwrite: z.literal('forbidden'),
    delete: z.literal('forbidden'),
  }),
});

policySchema.parse(
  YAML.parse(readFileSync(resolve(process.cwd(), 'registries/memory/memory-policy.yml'), 'utf8')),
);
console.info(
  'PASS MEMORY POLICY: portable, append-only, sin chain-of-thought ni locators privados.',
);
