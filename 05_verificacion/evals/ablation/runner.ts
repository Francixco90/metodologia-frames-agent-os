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

import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import YAML from 'yaml';

import {DETERMINISTIC_EPOCH as FIXED_TS} from '../../scripts/lib/deterministic-epoch.ts';

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
      task.write_set = ['04_estado/tasks/TASK-ablation-001/task.yaml', 'secrets/key.pem'];
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

function writeArtifactMarkers(harnessDir: string, excluded: Subsystem | null): void {
  mkdirSync(harnessDir, {recursive: true});
  for (const sub of ALL_SUBSYSTEMS) {
    if (sub === excluded) continue;
    writeFileSync(join(harnessDir, artifactMarkerFor(sub)), `${sub} artifact present\n`);
  }
}

/**
 * Run one ablation variant end-to-end: load config → build temp fixture →
 * degrade per variant → invoke fixed oracle → return result. [CÓDIGO]
 */
export function runVariant(variantId: string): VariantResult {
  const configPath = resolve(ABLATION_DIR, variantId, 'config.yml');
  const config: VariantConfig = loadVariantConfig(configPath);

  if (config.variant_id !== variantId) {
    throw new Error(`config variant_id mismatch: expected ${variantId}, got ${config.variant_id}`);
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

// ---------------------------------------------------------------------------
// Persisted run-results (plan A4): ablation-result-v1 records, idempotent by
// sha256(variant + oracle + inputs). Re-running a variant overwrites the
// same idempotency-key file rather than appending a new timestamped dir —
// the ablation is fully deterministic, so the result is too. [CONFIG]
// ---------------------------------------------------------------------------

const ABLATION_DIR = resolve(process.cwd(), '05_verificacion/evals/ablation');
const RESULTS_DIR = resolve(ABLATION_DIR, 'results');

export interface AblationResult {
  readonly schema_version: 'ablation-result-v1';
  readonly variant_id: string;
  readonly oracle_status: 'pass' | 'fail';
  readonly accepted: boolean;
  readonly reason: string;
  readonly excluded_subsystem: Subsystem | null;
  readonly n: number;
  readonly evidence_hashes: readonly string[];
  readonly ran_at: string;
  readonly idempotency_key: string;
  readonly append_only: true;
}

const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

const variantInputsHash = (variantId: string): string => {
  const configPath = resolve(ABLATION_DIR, variantId, 'config.yml');
  const config = readFileSync(configPath, 'utf8');
  const taskYaml = YAML.stringify(mutateTaskForVariant(BASE_TASK, variantId));
  return sha256(`${variantId}|oracle:ablation|${config}|${taskYaml}`);
};

const persistResult = (variantId: string, vr: VariantResult, config: VariantConfig): string => {
  const idempotencyKey = variantInputsHash(variantId);
  const dir = resolve(RESULTS_DIR, variantId);
  mkdirSync(dir, {recursive: true});
  const path = resolve(dir, `${idempotencyKey}.yml`);
  const record: AblationResult = {
    schema_version: 'ablation-result-v1',
    variant_id: variantId,
    oracle_status: vr.accepted ? 'pass' : 'fail',
    accepted: vr.accepted,
    reason: vr.reason,
    excluded_subsystem: config.excluded_subsystem,
    n: config.n,
    evidence_hashes: [idempotencyKey],
    ran_at: FIXED_TS,
    idempotency_key: idempotencyKey,
    append_only: true,
  };
  const lines: string[] = [
    `schema_version: ablation-result-v1`,
    `variant_id: ${variantId}`,
    `oracle_status: ${record.oracle_status}`,
    `accepted: ${record.accepted}`,
    `reason: ${JSON.stringify(record.reason)}`,
    `excluded_subsystem: ${record.excluded_subsystem ?? 'null'}`,
    `n: ${record.n}`,
    `evidence_hashes:`,
    `  - ${idempotencyKey}`,
    `ran_at: ${JSON.stringify(FIXED_TS)}`,
    `idempotency_key: ${idempotencyKey}`,
    `append_only: true`,
  ];
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  return path;
};

const VARIANTS = ['H0', 'H-I', 'H-T', 'H-E', 'H-S', 'H-F'] as const;

const runAll = (): void => {
  let pass = 0;
  let fail = 0;
  for (const v of VARIANTS) {
    const vr = runVariant(v);
    const configPath = resolve(ABLATION_DIR, v, 'config.yml');
    const config = loadVariantConfig(configPath);
    const path = persistResult(v, vr, config);
    const rel = path.split(sep).slice(-3).join(sep);
    const tag = vr.accepted ? 'PASS' : 'FAIL';
    console.info(`[${tag}] ${v} -> ${rel} (${vr.reason})`);
    if (vr.accepted) pass += 1;
    else fail += 1;
  }
  console.info(`ablation:run summary: pass=${pass} fail=${fail}`);
  if (fail > 0) process.exitCode = 1;
};

const report = (): void => {
  const rows: Array<{variant: string; status: string; accepted: boolean; reason: string}> = [];
  for (const v of VARIANTS) {
    const dir = resolve(RESULTS_DIR, v);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.yml'))
      .sort();
    if (files.length === 0) continue;
    const latest = files[files.length - 1];
    if (latest === undefined) continue;
    const parsed = YAML.parse(readFileSync(resolve(dir, latest), 'utf8')) as AblationResult;
    rows.push({
      variant: parsed.variant_id,
      status: parsed.oracle_status,
      accepted: parsed.accepted,
      reason: parsed.reason,
    });
  }
  const reportDir = resolve(process.cwd(), '05_verificacion/quality/reports');
  mkdirSync(reportDir, {recursive: true});
  const reportPath = resolve(reportDir, 'ablation-report.yml');
  const lines: string[] = [`schema_version: ablation-report-v1`, `variants:`];
  for (const r of rows) {
    lines.push(`  - variant_id: ${r.variant}`);
    lines.push(`    oracle_status: ${r.status}`);
    lines.push(`    accepted: ${r.accepted}`);
    lines.push(`    reason: ${JSON.stringify(r.reason)}`);
  }
  writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  console.info(
    `ablation:report -> ${reportPath.split(sep).slice(-3).join(sep)} (${rows.length} variants)`,
  );
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) {
  const mode = process.argv[2] ?? 'run';
  if (mode === 'report') report();
  else runAll();
}
