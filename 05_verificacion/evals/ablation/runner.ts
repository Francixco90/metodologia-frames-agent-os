// runner.ts — ablation harness runner (S15).
//
// Loads a variant config (H0..H-F), sets up a temp task fixture, simulates the
// variant by (a) mutating the task.yaml to reflect the degraded harness's
// output for the excluded subsystem and (b) toggling which harness artifact
// markers are "present", then invokes the fixed oracle. Returns the result.
// Deterministic: fixed timestamps, no Date.now / Math.random. [CÓDIGO]
//
// DESIGN (SPEC §10): excluding a subsystem DEGRADES the task contract in a
// variant-specific way. The fixed oracle judges the contract SHAPE — it does
// not attribute causality. Some exclusions produce schema-invalid contracts
// (rejected by the oracle); others produce schema-valid but semantically
// degraded contracts (accepted by the shape oracle). The metric is
// "tasa de tareas aceptadas por oracle fijo" across variants. [DOC]

import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import YAML from 'yaml';

import {
  ALL_SUBSYSTEMS,
  artifactMarkerFor,
  type JudgeResult,
  type Subsystem,
  type VariantConfig,
  judgeTask,
  loadVariantConfig,
} from './oracle.ts';

export interface VariantResult {
  readonly variant_id: string;
  readonly accepted: boolean;
  readonly reason: string;
}

const FIXED_TS = '2026-08-01T00:00:00+00:00';
const HARNESS_DIR = '.harness';

// Base valid task.yaml (H0 shape). Variant mutations applied on top. [CONFIG]
const BASE_TASK: Readonly<Record<string, unknown>> = {
  schema_version: 'task-contract-v1',
  task_id: 'TASK-ablation-001',
  project_id: null,
  objetivo: 'Ablation benchmark task',
  repo: 'metodologia-frames-agent-os',
  responsable: 'lead',
  inputs: ['04_estado/tasks/TASK-loose-001/task.yaml'],
  write_set: ['04_estado/tasks/TASK-ablation-001/task.yaml'],
  no_objetivos: [],
  done: 'Ablation benchmark done',
  validacion: 'oracle accepts schema-valid task',
  gaps: [],
  state: 'INTAKE',
  created_from_route: 'R3-LOOSE',
  gate_target: null,
  spawned_subtasks: [],
  parent_task_id: null,
  evidence_tags: {ablation: 'DOC'},
  created_at: FIXED_TS,
  updated_at: FIXED_TS,
};

/**
 * Variant-specific task.yaml degradation reflecting the excluded subsystem.
 * Each mutation models what a harness with that subsystem removed would
 * produce. [CONFIG]
 */
function mutateTaskForVariant(
  base: Readonly<Record<string, unknown>>,
  variantId: string,
): Record<string, unknown> {
  const task: Record<string, unknown> = {...base};
  switch (variantId) {
    case 'H0':
      // Baseline: full harness, no degradation. [CONFIG]
      break;
    case 'H-I':
      // Instructions excluded → no done definition. Empty `done` violates
      // TaskContractSchema min(1). [CONFIG]
      task.done = '';
      break;
    case 'H-T':
      // Tools excluded → no tool-boundary enforcement. write_set gains an
      // out-of-allowlist path (`secrets/key.pem`). Schema-valid relative path;
      // the fixed shape oracle accepts (allowlist enforcement is H-E008's
      // domain, not this oracle's). [CONFIG]
      task.write_set = [
        '04_estado/tasks/TASK-ablation-001/task.yaml',
        'secrets/key.pem',
      ];
      break;
    case 'H-E':
      // Environment excluded → no layout validation. inputs reference a
      // non-existent path. Schema-valid relative path; oracle accepts. [CONFIG]
      task.inputs = ['missing/env-file.md'];
      break;
    case 'H-S':
      // State excluded → no state enforcement. Illegal auto-ENTREGADO to a
      // manual fail-closed gate (G15). TaskContractSchema superRefine rejects.
      // [CONFIG]
      task.state = 'ENTREGADO';
      task.gate_target = 'G15';
      break;
    case 'H-F':
      // Feedback excluded → no verification criterion. Empty `validacion`
      // violates TaskContractSchema min(1). [CONFIG]
      task.validacion = '';
      break;
    default:
      throw new Error(`unknown variant_id: ${variantId}`);
  }
  return task;
}

function writeTaskYaml(taskDir: string, task: Record<string, unknown>): void {
  writeFileSync(join(taskDir, 'task.yaml'), YAML.stringify(task));
}

function writeArtifactMarkers(
  harnessDir: string,
  excluded: Subsystem | null,
): void {
  mkdirSync(harnessDir, {recursive: true});
  for (const sub of ALL_SUBSYSTEMS) {
    if (sub === excluded) continue;
    writeFileSync(
      join(harnessDir, artifactMarkerFor(sub)),
      `${sub} artifact present\n`,
    );
  }
}

/**
 * Run one ablation variant end-to-end: load config → build temp fixture →
 * degrade per variant → invoke fixed oracle → return result. [CÓDIGO]
 */
export function runVariant(variantId: string): VariantResult {
  const configPath = resolve(__dirname, variantId, 'config.yml');
  const config: VariantConfig = loadVariantConfig(configPath);

  if (config.variant_id !== variantId) {
    throw new Error(
      `config variant_id mismatch: expected ${variantId}, got ${config.variant_id}`,
    );
  }

  const root = mkdtempSync(join(tmpdir(), `ablation-${variantId}-`));
  try {
    const task = mutateTaskForVariant(BASE_TASK, variantId);
    writeTaskYaml(root, task);
    writeArtifactMarkers(join(root, HARNESS_DIR), config.excluded_subsystem);

    const result: JudgeResult = judgeTask(root, config);
    return {
      variant_id: variantId,
      accepted: result.accepted,
      reason: result.reason,
    };
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}