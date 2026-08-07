// oracle.ts — fixed deterministic oracle for the ablation harness (S15).
//
// Judges whether a task is "accepted" under a variant config:
//   1. task.yaml parses via TaskContractSchema (schema validity, incl. the
//      state superRefine: valid enum + ENTREGADO/G13-G17 fail-closed
//      invariant). [CÓDIGO]
//   2. For each NON-excluded SPEC subsystem, the corresponding harness
//      artifact marker is present in the fixture's `.harness/` dir. [CONFIG]
//
// The oracle is CONSTANT across all variants (SPEC §10: evaluator externo
// constante): the same judgeTask function runs for H0..H-F, parameterised
// only by which subsystem the variant excludes (so it knows which artifact
// markers it may waive). No Date.now, no Math.random — fully deterministic.
// [CÓDIGO]

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import YAML from 'yaml';

import {TaskContractSchema} from '../../../02_proceso/core/contracts/index.ts';

export type Subsystem = 'Instructions' | 'Tools' | 'Environment' | 'State' | 'Feedback';

export const ALL_SUBSYSTEMS: readonly Subsystem[] = [
  'Instructions',
  'Tools',
  'Environment',
  'State',
  'Feedback',
];

export interface VariantConfig {
  readonly variant_id: string;
  readonly excluded_subsystem: Subsystem | null;
  readonly description: string;
  readonly levers_disabled: readonly string[];
  readonly n: number;
  readonly oracle_ref: string;
  readonly benchmark_ref: string;
}

export interface JudgeResult {
  readonly accepted: boolean;
  readonly reason: string;
}

// SPEC subsystem → harness artifact marker file (sentinel written by the
// runner into the fixture's `.harness/` dir). The oracle checks presence of
// each non-excluded marker. [CONFIG]
const SUBSYSTEM_ARTIFACT: Readonly<Record<Subsystem, string>> = {
  Instructions: 'instructions.present',
  Tools: 'tools.present',
  Environment: 'environment.present',
  State: 'state.present',
  Feedback: 'feedback.present',
};

const HARNESS_DIR = '.harness';
const TASK_FILE = 'task.yaml';

export function artifactMarkerFor(sub: Subsystem): string {
  return SUBSYSTEM_ARTIFACT[sub];
}

export function loadVariantConfig(configPath: string): VariantConfig {
  const raw = YAML.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
  const excluded = raw.excluded_subsystem;
  return {
    variant_id: String(raw.variant_id),
    excluded_subsystem: excluded === null ? null : (excluded as Subsystem),
    description: String(raw.description),
    levers_disabled: Array.isArray(raw.levers_disabled) ? (raw.levers_disabled as string[]) : [],
    n: Number(raw.n),
    oracle_ref: String(raw.oracle_ref),
    benchmark_ref: String(raw.benchmark_ref),
  };
}

/**
 * Fixed oracle: judges task acceptance for a fixture under a variant config.
 * Same logic for every variant (H0..H-F). Deterministic. [CÓDIGO]
 */
export function judgeTask(taskDir: string, config: VariantConfig): JudgeResult {
  // 1. task.yaml must parse via TaskContractSchema. This subsumes state
  //    validity: the schema enum + the ENTREGADO/G13-G17 superRefine. [CÓDIGO]
  const taskPath = join(taskDir, TASK_FILE);
  if (!existsSync(taskPath)) {
    return {accepted: false, reason: `missing ${TASK_FILE} in ${taskDir}`};
  }
  let raw: unknown;
  try {
    raw = YAML.parse(readFileSync(taskPath, 'utf8')) as unknown;
  } catch (err) {
    return {
      accepted: false,
      reason: `YAML parse error: ${(err as Error).message}`,
    };
  }
  const parsed = TaskContractSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    return {accepted: false, reason: `schema: ${issues}`};
  }

  // 2. For each non-excluded subsystem, require the harness artifact marker.
  //    An excluded subsystem's marker is waived (degraded harness may omit
  //    it). [CONFIG]
  const harnessDir = join(taskDir, HARNESS_DIR);
  for (const sub of ALL_SUBSYSTEMS) {
    if (sub === config.excluded_subsystem) continue;
    const marker = artifactMarkerFor(sub);
    if (!existsSync(join(harnessDir, marker))) {
      return {
        accepted: false,
        reason: `missing artifact for non-excluded subsystem: ${sub}`,
      };
    }
  }

  return {
    accepted: true,
    reason: `task.yaml schema-valid; all non-excluded artifacts present (excluded: ${
      config.excluded_subsystem ?? 'none'
    })`,
  };
}
