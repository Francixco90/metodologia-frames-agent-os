import {z} from 'zod';

export const MarkdownClassSchema = z.enum([
  'authored_control',
  'workflow',
  'template',
  'skill',
  'generated',
  'vendor',
  'evidence',
  'historical',
]);

export const DocumentationDecisionSchema = z.enum([
  'KEEP',
  'REFACTOR',
  'SPLIT',
  'REGENERATE',
  'FREEZE',
]);

const FindingSchema = z.strictObject({
  code: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  detail: z.string().min(1),
});

const EvaluationSchema = z.strictObject({
  path: z.string().min(1),
  class: MarkdownClassSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  words: z.number().int().nonnegative(),
  lines: z.number().int().positive(),
  score: z.number().int().min(0).max(100),
  threshold: z.number().int().min(0).max(100),
  decision: DocumentationDecisionSchema,
  findings: z.array(FindingSchema),
});

export const DocumentationInventoryV1Schema = z.strictObject({
  schemaVersion: z.literal('documentation-inventory-v1'),
  repositoryTreeSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  totalMarkdown: z.number().int().positive(),
  auditedAuthored: z.number().int().positive(),
  classPaths: z.record(MarkdownClassSchema, z.array(z.string()).readonly()),
  evaluations: z.array(EvaluationSchema),
  summary: z.strictObject({
    keep: z.number().int().nonnegative(),
    refactor: z.number().int().nonnegative(),
    split: z.number().int().nonnegative(),
    regenerate: z.number().int().nonnegative(),
    freeze: z.number().int().nonnegative(),
  }),
});

export type DocumentationInventoryV1 = z.infer<typeof DocumentationInventoryV1Schema>;
