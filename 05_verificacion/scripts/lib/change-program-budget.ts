// Hash-bound, branch-local exception for an explicitly partitioned change program. [CÓDIGO]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

import {z} from 'zod';

import {hashCanonical} from '../../../02_proceso/core/evidence/hash.ts';
import {readBudgetFile} from './file-budget-git.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const GitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const SafePathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.split('/').some((segment) => ['', '.', '..'].includes(segment)),
    'unsafe path',
  );
const limitsSchema = (maxFiles: number, maxLoc: number) =>
  z
    .object({
      targetFiles: z.number().int().positive().max(maxFiles),
      targetLoc: z.number().int().positive().max(maxLoc),
      hardFiles: z.number().int().positive().max(maxFiles),
      hardLoc: z.number().int().positive().max(maxLoc),
    })
    .strict()
    .refine(
      ({targetFiles, targetLoc, hardFiles, hardLoc}) =>
        targetFiles <= hardFiles && targetLoc <= hardLoc,
      'target exceeds hard limit',
    );
const PartitionLimitsSchema = limitsSchema(40, 5_000);
const ProgramLimitsSchema = limitsSchema(200, 20_000);
const PerFileLineCapSchema = z
  .object({
    path: SafePathSchema,
    surface: z.string().regex(/^[a-z0-9-]+$/u),
    baselineHardLines: z.number().int().positive().max(1_000),
    programHardLines: z.number().int().positive().max(1_000),
    rationale: z.string().trim().min(20),
  })
  .strict()
  .refine(
    ({baselineHardLines, programHardLines}) => programHardLines > baselineHardLines,
    'program line cap must exceed its bound baseline',
  );
const PartitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/u),
    paths: z.array(SafePathSchema).min(1).max(40),
    limits: PartitionLimitsSchema,
  })
  .strict()
  .refine(({paths}) => new Set(paths).size === paths.length, 'duplicate path in partition');
const ManifestSchema = z
  .object({
    schemaVersion: z.literal('change-budget-program-v1'),
    programId: z.string().regex(/^[a-z0-9-]+$/u),
    branch: z.string().regex(/^codex\/[a-z0-9][a-z0-9/_-]*$/u),
    baseCommit: GitCommitSchema,
    authority: z
      .object({
        mode: z.literal('LOCAL_SIMULATION'),
        planRef: SafePathSchema,
        planSha256: Sha256Schema,
      })
      .strict(),
    limits: ProgramLimitsSchema,
    partitions: z.array(PartitionSchema).min(1).max(12),
    perFileLineCaps: z.array(PerFileLineCapSchema).max(8),
    canonicalSha256: Sha256Schema,
  })
  .strict();

export type ChangeProgramManifestV1 = z.infer<typeof ManifestSchema>;
export type ChangeProgramFileLineCapV1 = z.infer<typeof PerFileLineCapSchema>;

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
export const computeChangeProgramSha256 = (
  manifest: Omit<ChangeProgramManifestV1, 'canonicalSha256'>,
): string => hashCanonical(manifest);

export interface ChangeProgramBudgetInput {
  root: string;
  manifestPath: string;
  branch: string;
  baseCommit: string;
  authoredPaths: readonly string[];
  locByPath: ReadonlyMap<string, number>;
}

export interface ChangeProgramBudgetResult {
  active: boolean;
  warnings: string[];
  errors: string[];
  perFileLineCaps: ChangeProgramFileLineCapV1[];
  programId?: string;
}

export const evaluateChangeProgramBudget = (
  input: ChangeProgramBudgetInput,
): ChangeProgramBudgetResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let manifest: ChangeProgramManifestV1;
  try {
    manifest = ManifestSchema.parse(
      JSON.parse(readBudgetFile(input.root, input.manifestPath).toString('utf8')),
    );
  } catch {
    return {
      active: false,
      warnings,
      errors: ['BUDGET-PROGRAM001 invalid change program manifest'],
      perFileLineCaps: [],
    };
  }
  const {canonicalSha256, ...payload} = manifest;
  if (computeChangeProgramSha256(payload) !== canonicalSha256)
    errors.push('BUDGET-PROGRAM002 manifest hash mismatch');
  try {
    if (
      sha256(readBudgetFile(input.root, manifest.authority.planRef)) !==
      manifest.authority.planSha256
    )
      errors.push('BUDGET-PROGRAM005 plan hash mismatch');
  } catch {
    errors.push('BUDGET-PROGRAM005 plan unavailable');
  }
  if (manifest.branch !== input.branch) {
    warnings.push(`BUDGET-PROGRAM-INACTIVE branch=${input.branch || 'DETACHED'}`);
    return {
      active: false,
      warnings,
      errors,
      perFileLineCaps: [],
      programId: manifest.programId,
    };
  }
  if (manifest.baseCommit !== input.baseCommit) errors.push('BUDGET-PROGRAM004 base mismatch');

  const declared = manifest.partitions.flatMap(({paths}) => paths);
  if (new Set(declared).size !== declared.length)
    errors.push('BUDGET-PROGRAM006 path declared by multiple partitions');
  const lineCapPaths = manifest.perFileLineCaps.map(({path}) => path);
  if (new Set(lineCapPaths).size !== lineCapPaths.length)
    errors.push('BUDGET-PROGRAM008 duplicate per-file line cap path');
  for (const path of lineCapPaths) {
    if (declared.filter((declaredPath) => declaredPath === path).length !== 1)
      errors.push(`BUDGET-PROGRAM009 line cap path is not uniquely partitioned: ${path}`);
  }
  const actual = [...input.authoredPaths].sort();
  const expected = [...declared].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    errors.push('BUDGET-PROGRAM007 authored path set drift');

  for (const partition of manifest.partitions) {
    const files = partition.paths.length;
    const loc = partition.paths.reduce((sum, path) => sum + (input.locByPath.get(path) ?? 0), 0);
    if (files > partition.limits.targetFiles || loc > partition.limits.targetLoc)
      warnings.push(`BUDGET-PROGRAM-TARGET ${partition.id} files=${files} loc=${loc}`);
    if (files > partition.limits.hardFiles || loc > partition.limits.hardLoc)
      errors.push(`BUDGET-PROGRAM-HARD ${partition.id} files=${files} loc=${loc}`);
  }
  const totalFiles = actual.length;
  const totalLoc = actual.reduce((sum, path) => sum + (input.locByPath.get(path) ?? 0), 0);
  if (totalFiles > manifest.limits.targetFiles || totalLoc > manifest.limits.targetLoc)
    warnings.push(`BUDGET-PROGRAM-TOTAL-TARGET files=${totalFiles} loc=${totalLoc}`);
  if (totalFiles > manifest.limits.hardFiles || totalLoc > manifest.limits.hardLoc)
    errors.push(`BUDGET-PROGRAM-TOTAL-HARD files=${totalFiles} loc=${totalLoc}`);
  if (errors.length === 0)
    warnings.push(`BUDGET-PROGRAM-ACTIVE ${manifest.programId} authority=LOCAL_SIMULATION`);
  const active = errors.length === 0;
  return {
    active,
    warnings,
    errors,
    perFileLineCaps: active ? manifest.perFileLineCaps : [],
    programId: manifest.programId,
  };
};

export const evaluateConfiguredChangeProgramBudget = (
  input: Omit<ChangeProgramBudgetInput, 'branch'>,
): ChangeProgramBudgetResult =>
  evaluateChangeProgramBudget({
    ...input,
    branch: execFileSync('git', ['branch', '--show-current'], {cwd: input.root})
      .toString('utf8')
      .trim(),
  });
