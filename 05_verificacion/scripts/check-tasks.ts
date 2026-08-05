// check-tasks.ts — validador versionado del task-contract (gate G_TASK).
// Recorre 04_estado/tasks/*/task.yaml, parsea via TaskContractSchema (Zod
// safeParse) y verifica invariantes de la máquina de estados de tareas.
// Salida: "PASS G_TASK: N tasks validas, M warnings." o líneas de error
// por tarea + exitCode=1. No auto-avanza ningún estado. [CÓDIGO]

import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {resolve, join} from 'node:path';
import YAML from 'yaml';

import {TaskContractSchema, type TaskContract} from '../../core/contracts/index.ts';
import {
  TaskWorkStateSchema,
  type TaskWorkState,
} from '../../core/contracts/index.ts';
import {taskOrder} from '../../core/state-machine/index.ts';

const root = process.cwd();
const tasksDir = resolve(root, '04_estado/tasks');

const errors: string[] = [];
const warnings: string[] = [];

interface LoadedTask {
  taskId: string;
  contract: TaskContract;
  dir: string;
}

/**
 * Lista los directorios de tarea que contienen un task.yaml.
 * Tolerante a directorio vacío o inexistente → devuelve []. [CÓDIGO]
 */
function listTaskDirs(): string[] {
  if (!existsSync(tasksDir)) return [];
  const entries = readdirSync(tasksDir).filter((f) => !f.startsWith('.'));
  const dirs: string[] = [];
  for (const entry of entries) {
    const full = join(tasksDir, entry);
    if (statSync(full).isDirectory() && existsSync(join(full, 'task.yaml'))) {
      dirs.push(full);
    }
  }
  return dirs;
}

const dirs = listTaskDirs();
const loaded: LoadedTask[] = [];

// --- G_TASK_01: cada 04_estado/tasks/*/task.yaml parsea via TaskContractSchema ---
for (const dir of dirs) {
  const filePath = join(dir, 'task.yaml');
  let raw: unknown;
  try {
    raw = YAML.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (err) {
    errors.push(`G_TASK_01: ${filePath}: YAML inválido — ${(err as Error).message}`);
    continue;
  }
  const parsed = TaskContractSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    errors.push(`G_TASK_01: ${filePath}: schema parse error — ${issues}`);
    continue;
  }
  loaded.push({taskId: parsed.data.task_id, contract: parsed.data, dir});
}

// Índice de ids cargados para validaciones cruzadas. [CÓDIGO]
const idsLoaded = new Set<string>(loaded.map((t) => t.taskId));
const seenIds = new Set<string>();

// --- Recorrido de invariantes por tarea ---
for (const {taskId, contract, dir} of loaded) {
  // --- G_TASK_03: ids duplicados (WARN, no fail per spec) ---
  if (seenIds.has(taskId)) {
    warnings.push(`G_TASK_03: task_id duplicado: ${taskId}`);
  }
  seenIds.add(taskId);

  // --- G_TASK_02: state válido (uno de 6) ---
  // Ya garantizado por TaskWorkStateSchema dentro de TaskContractSchema, pero
  // lo re-chequeamos explícitamente para emitir un error G_TASK_02 claro en
  // vez de un fallo genérico de schema. [CÓDIGO]
  const stateCheck = TaskWorkStateSchema.safeParse(contract.state);
  if (!stateCheck.success) {
    errors.push(
      `G_TASK_02: ${taskId}: state ilegal "${contract.state}" (esperado uno de ${taskOrder.join(', ')})`,
    );
  }

  // --- G_TASK_04: write_set no vacío ---
  // Garantizado por schema (min(1)); re-chequeo defensivo con mensaje claro.
  if (contract.write_set.length === 0) {
    errors.push(`G_TASK_04: ${taskId}: write_set vacío.`);
  }

  // --- G_TASK_05: validacion no vacía ---
  if (contract.validacion.trim().length === 0) {
    errors.push(`G_TASK_05: ${taskId}: validacion vacía.`);
  }

  // --- G_TASK_06: guardian → write_set debe ser guardian/-prefixed ---
  if (
    contract.responsable === 'guardian' &&
    contract.write_set.some((p) => !p.startsWith('guardian/'))
  ) {
    errors.push(
      `G_TASK_06: ${taskId}: responsable guardian con write_set no-prefijado guardian/ (may_remediate:false).`,
    );
  }

  // --- Invariante: spawned_subtasks referencian dirs de tarea existentes ---
  for (const sub of contract.spawned_subtasks) {
    if (!idsLoaded.has(sub)) {
      errors.push(
        `G_TASK: ${taskId}: spawned_subtask "${sub}" no corresponde a un task_id cargado.`,
      );
    }
  }

  // --- Invariante: parent_task_id (si presente) existe ---
  if (contract.parent_task_id !== null && !idsLoaded.has(contract.parent_task_id)) {
    errors.push(
      `G_TASK: ${taskId}: parent_task_id "${contract.parent_task_id}" no corresponde a un task_id cargado.`,
    );
  }

  // --- Invariante: evidence_tags values en el enum ---
  // Garantizado por schema; re-chequeo defensivo por si se relaja el schema.
  const allowedEvidence = ['CÓDIGO', 'CONFIG', 'DOC', 'INFERENCIA', 'SUPUESTO', 'coverage_gap'] as const;
  const allowedSet = new Set<string>(allowedEvidence);
  for (const [key, value] of Object.entries(contract.evidence_tags)) {
    if (!allowedSet.has(value)) {
      errors.push(
        `G_TASK: ${taskId}: evidence_tags["${key}"]="${value}" fuera del enum.`,
      );
    }
  }

  // --- WARN: inferred state mismatch ---
  // Una tarea en INTAKE no debería tener subtasks generados (contrato no
  // completado). Inferencia suave → warning, no fail. [INFERENCIA]
  if (contract.state === 'INTAKE' && contract.spawned_subtasks.length > 0) {
    warnings.push(
      `G_TASK: ${taskId}: state INTAKE con spawned_subtasks no vacío (infered mismatch).`,
    );
  }

  // --- WARN: parent menos avanzado que hijo (infered mismatch) ---
  if (contract.parent_task_id !== null && idsLoaded.has(contract.parent_task_id)) {
    const parent = loaded.find((t) => t.taskId === contract.parent_task_id);
    if (parent !== undefined) {
      const orderIdx = (s: TaskWorkState): number => taskOrder.indexOf(s);
      if (orderIdx(parent.contract.state) < orderIdx(contract.state)) {
        warnings.push(
          `G_TASK: ${taskId}: parent ${contract.parent_task_id} en state ${parent.contract.state} menos avanzado que hijo ${contract.state} (infered mismatch).`,
        );
      }
    }
  }

  // dir se conserva para futuras validaciones filesystem-bound. [SUPUESTO]
  void dir;
}

const total = loaded.length;
if (errors.length > 0) {
  for (const e of errors) console.error(`[FAIL] ${e}`);
  for (const w of warnings) console.warn(`[WARN] ${w}`);
  console.error(
    `FAIL G_TASK: ${total} tasks, ${errors.length} errores, ${warnings.length} warnings.`,
  );
  process.exitCode = 1;
} else {
  for (const w of warnings) console.warn(`[WARN] ${w}`);
  console.info(
    `PASS G_TASK: ${total} tasks validas, ${warnings.length} warnings.`,
  );
}