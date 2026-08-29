// Pure policy parsing, matching and metric-limit evaluation. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

export type RuleKind = 'authored' | 'generated' | 'exempt';

const positiveInteger = z.number().int().positive();
const positiveMultiplier = z.number().finite().positive();
const limitsSchema = z
  .object({
    max_words: positiveInteger.optional(),
    max_lines: positiveInteger.optional(),
    multiplier: positiveMultiplier.optional(),
  })
  .strict()
  .refine(
    ({max_words, max_lines, multiplier}) =>
      multiplier === undefined || (max_words === undefined && max_lines === undefined),
    'multiplier cannot be mixed with absolute limits',
  );
const stringsSchema = z
  .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
  .transform((value) => (typeof value === 'string' ? [value] : value));
const ruleSchema = z
  .object({
    surface: z.string().trim().min(1),
    kind: z.enum(['authored', 'generated', 'exempt']),
    match: stringsSchema.refine((value) => value.length > 0, 'match cannot be empty'),
    exclude: stringsSchema.optional().default([]),
    baseline: z.enum(['file-disposition', 'template']).optional(),
    target: limitsSchema,
    hard: limitsSchema,
    scope: z.enum(['all', 'changed']),
    mode: z.enum(['enforce', 'report']),
    changed_mode: z.enum(['enforce', 'report']),
    fallback: z.boolean().optional().default(false),
    rationale: z.string().trim().min(1),
  })
  .strict()
  .superRefine((rule, context) => {
    const issue = (message: string): void => context.addIssue({code: 'custom', message});
    const dimensions = ['max_words', 'max_lines', 'multiplier'] as const;
    if (
      rule.kind !== 'exempt' &&
      (Object.keys(rule.target).length === 0 || Object.keys(rule.hard).length === 0)
    ) {
      issue('non-exempt limits cannot be empty');
    }
    for (const dimension of dimensions) {
      const target = rule.target[dimension];
      const hard = rule.hard[dimension];
      if ((target === undefined) !== (hard === undefined)) issue(`incoherent ${dimension}`);
      if (target !== undefined && hard !== undefined && target > hard)
        issue(`target exceeds hard ${dimension}`);
    }
    const multiplierPair =
      rule.target.multiplier !== undefined && rule.hard.multiplier !== undefined;
    if ((rule.baseline !== undefined) !== multiplierPair)
      issue('baseline requires multiplier limits');
    if (rule.baseline === 'template' && rule.kind !== 'generated') {
      issue('template baseline requires generated kind');
    }
    if (rule.baseline === 'file-disposition' && rule.kind === 'generated') {
      issue('file-disposition baseline forbids generated kind');
    }
    if (
      rule.fallback &&
      (rule.kind === 'exempt' || rule.match.length !== 1 || rule.match[0] !== '**')
    ) {
      issue('fallback must be a non-exempt ** rule');
    }
  });
const prBudgetSchema = z
  .object({
    target_files: z.number().int().positive(),
    target_loc: z.number().int().positive(),
    hard_files: z.number().int().positive(),
    hard_loc: z.number().int().positive(),
  })
  .strict()
  .refine(
    ({target_files, target_loc, hard_files, hard_loc}) =>
      target_files <= hard_files && target_loc <= hard_loc,
    'PR target exceeds hard limit',
  );
const manifestPathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.split('/').some((segment) => ['', '.', '..'].includes(segment)),
    'invalid change program manifest path',
  );
const recordSchema = z.record(z.string(), z.unknown());
const rawSchema = z
  .object({
    schema_version: z.literal('file-budget-policy-v2'),
    defaults: recordSchema.optional().default({}),
    budgets: z.array(recordSchema),
    pr_budget: prBudgetSchema,
    change_program_manifest: manifestPathSchema.optional(),
  })
  .passthrough();

export type Limits = z.infer<typeof limitsSchema>;
export type BudgetRule = z.infer<typeof ruleSchema>;
export interface Policy {
  schema_version: 'file-budget-policy-v2';
  budgets: BudgetRule[];
  pr_budget: z.infer<typeof prBudgetSchema>;
  change_program_manifest?: string;
}

export const globToRe = (glob: string): RegExp => {
  const globstar = '\u0000G';
  const globstarSlash = '\u0000S';
  return new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/gu, '\\$&')
      .replace(/\*\*\//gu, globstarSlash)
      .replace(/\*\*/gu, globstar)
      .replace(/\*/gu, '[^/]*')
      .replaceAll(globstarSlash, '(?:.*/)?')
      .replaceAll(globstar, '.*')}$`,
    'u',
  );
};

export const loadPolicy = (root: string): Policy => {
  let raw: z.infer<typeof rawSchema>;
  try {
    raw = rawSchema.parse(
      parse(readFileSync(resolve(root, '02_proceso/governance/docs-budget-policy.yml'), 'utf8')),
    );
  } catch {
    throw new Error('BUDGET-POLICY001 invalid file-budget-policy-v2');
  }
  let budgets: BudgetRule[];
  try {
    budgets = raw.budgets.map((item) => ruleSchema.parse({...raw.defaults, ...item}));
  } catch {
    throw new Error('BUDGET-POLICY002 invalid budget rule');
  }
  if (new Set(budgets.map(({surface}) => surface)).size !== budgets.length) {
    throw new Error('BUDGET-POLICY003 duplicate surface');
  }
  for (const kind of ['authored', 'generated'] as const) {
    if (budgets.filter((rule) => rule.kind === kind && rule.fallback).length !== 1) {
      throw new Error(`BUDGET-POLICY004 requires one ${kind} fallback`);
    }
  }
  return {
    schema_version: raw.schema_version,
    budgets,
    pr_budget: raw.pr_budget,
    ...(raw.change_program_manifest ? {change_program_manifest: raw.change_program_manifest} : {}),
  };
};

const pathMatch = (rule: BudgetRule, path: string): boolean =>
  rule.match.some((glob) => globToRe(glob).test(path)) &&
  !rule.exclude.some((glob) => globToRe(glob).test(path));

export const effectiveRules = (
  rules: BudgetRule[],
  path: string,
  generated: boolean,
): BudgetRule[] => {
  const exemptions = rules.filter((rule) => rule.kind === 'exempt' && pathMatch(rule, path));
  if (exemptions.length > 0) return exemptions;
  const specifics = rules.filter(
    (rule) => rule.kind !== 'exempt' && !rule.fallback && pathMatch(rule, path),
  );
  if (specifics.length > 0) return specifics;
  const kind: RuleKind = generated ? 'generated' : 'authored';
  return rules.filter((rule) => rule.kind === kind && rule.fallback && pathMatch(rule, path));
};

export const exceeded = (actual: number, limit: number | undefined): boolean =>
  limit !== undefined && actual > limit;
