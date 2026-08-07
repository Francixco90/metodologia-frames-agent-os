import {z} from 'zod';

export const CommandEntrySchema = z.strictObject({
  gate: z.string().regex(/^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+)$/u, 'Expected a gate id (GNN or MW_*)'),
  label: z.string(),
  command: z.string().nullable(),
  allowed_tools: z.array(z.string()),
  write_set_globs: z.array(z.string()),
  idempotency: z.boolean(),
  danger_level: z.enum(['low', 'medium', 'high']),
  manual: z.boolean(),
  fail_closed: z.boolean().default(false),
  owner: z.string(),
});

export const CommandsManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  manifest_id: z.literal('commands-v1'),
  gates: z.array(CommandEntrySchema).min(1),
});

export type CommandsManifest = z.infer<typeof CommandsManifestSchema>;
export type CommandEntry = z.infer<typeof CommandEntrySchema>;
