import {z} from 'zod';

const portablePath = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('\\'), 'path must be portable')
  .refine(
    (value) => !value.split('/').some((segment) => segment === '..'),
    'path traversal is forbidden',
  );

const stringList = z.array(z.string().trim().min(1));

export const ContextSurfaceV1Schema = z
  .object({
    context_id: z.string().regex(/^CTX-[A-Z0-9-]+$/u),
    root: z.union([z.literal('.'), portablePath]),
    kind: z.enum([
      'root',
      'layer',
      'governance',
      'agent',
      'workflow',
      'registry',
      'verification',
      'adapter',
      'skill',
    ]),
    owner: z.enum([
      'lead',
      'repo',
      'sources',
      'core',
      'agents-committee',
      'content',
      'n8n',
      'qa',
      'governance',
      'skill-foundry',
    ]),
    applies_when: z.string().trim().min(1),
    authority_refs: z.array(portablePath).min(1),
    load_first: z.array(portablePath).min(1).max(3),
    load_on_demand: z.array(portablePath),
    defer: stringList,
    routes: stringList,
    workflows: stringList,
    primary_skills: stringList,
    tools: stringList,
    read_set: z.array(portablePath).min(1),
    write_policy: z
      .object({
        mode: z.enum(['read_only', 'owner_scoped', 'generated_only']),
        paths: z.array(portablePath),
      })
      .strict(),
    gates: stringList.min(1),
    stop_rules: stringList.min(1),
    privacy: z.enum(['public_only', 'private_after_route_lock']),
    children: z.array(z.string().regex(/^CTX-[A-Z0-9-]+$/u)),
    budget: z.object({target_lines: z.literal(80), hard_lines: z.literal(120)}).strict(),
  })
  .strict();

export const ContextSurfaceShardV1Schema = z
  .object({
    schema_version: z.literal('context-surface-shard-v1'),
    shard_id: z.string().regex(/^CTX-SHARD-[A-Z0-9-]+$/u),
    surfaces: z.array(ContextSurfaceV1Schema).min(1),
  })
  .strict();

export const ContextSurfaceRegistryV1Schema = z
  .object({
    schema_version: z.literal('context-surface-registry-v1'),
    manifest_id: z.literal('frames-public-context-v1'),
    source_of_truth: z.literal(true),
    projection_name: z.literal('context.md'),
    private_cabin: z.literal('work/private/CONTEXT.md'),
    expected_non_skill_projections: z.literal(55),
    expected_skill_projections: z.number().int().positive(),
    shards: z.array(portablePath).min(1),
    skill_shards: z.array(portablePath).default([]),
  })
  .strict();

export type ContextSurfaceV1 = z.infer<typeof ContextSurfaceV1Schema>;
export type ContextSurfaceRegistryV1 = z.infer<typeof ContextSurfaceRegistryV1Schema>;

export const contextProjectionPath = ({root}: ContextSurfaceV1): string =>
  root === '.' ? 'context.md' : `${root}/context.md`;
