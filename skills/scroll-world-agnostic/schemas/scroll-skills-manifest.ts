/**
 * Zod schema for the scroll-skills orchestration manifest.
 * Validates the manifest at docs/scroll-skills/scroll-skills-manifest.json.
 */
import {z} from 'zod';

export const adapterContractSchema = z.object({
  method: z.string(),
  input: z.string(),
  output: z.string(),
  required: z.boolean(),
  replaceable: z.boolean(),
});

export const skillEntrySchema = z.object({
  skill_id: z.string(),
  role: z.string(),
  version: z.string(),
  description: z.string(),
  model_agnostic: z.literal(true),
  depends_on: z.array(z.string()),
  must_run_before: z.array(z.string()),
  source_derivations: z.array(
    z.object({
      source_repo: z.string(),
      source_commit: z.string().optional(),
      source_path: z.string().optional(),
      source_license: z.string(),
      derivation: z.string(),
    }),
  ),
  activation: z.string(),
  no_activation: z.string(),
  required_capabilities: z.array(z.string()),
  optional_capabilities: z.array(z.string()),
  fallbacks: z.array(z.string()),
  publication_authority: z.literal(false),
});

export const scrollSkillsManifestSchema = z.object({
  schema_version: z.literal(1),
  stack_id: z.string(),
  description: z.string(),
  model_agnostic: z.literal(true),
  lifecycle_state: z.string(),
  execution_order: z.array(z.string()).min(3),
  skills: z.array(skillEntrySchema).length(3),
  adapter_contracts: z.record(z.string(), adapterContractSchema),
  invariants: z.array(z.string()),
  forbidden: z.array(z.string()),
});

export type ScrollSkillsManifest = z.infer<typeof scrollSkillsManifestSchema>;
export type SkillEntry = z.infer<typeof skillEntrySchema>;
export type AdapterContract = z.infer<typeof adapterContractSchema>;
