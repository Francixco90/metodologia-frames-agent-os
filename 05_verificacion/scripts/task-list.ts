// task-list.ts — CLI: `pnpm task:list`.
//
// Regenerates TASK.md as a DERIVED index (gitignored) from the set of
// 04_estado/tasks/*/task.yaml contracts. TASK.md is NOT a source of truth;
// the per-task task.yaml files are. This script is the only writer of
// TASK.md. [CONFIG]
//
// Layout of the regenerated TASK.md:
//   1. Header + provenance note.
//   2. One section per work-state (INTAKE, ESPECIFICADO, COMPILADO, EVALUADO,
//      ENTREGADO, BLOQUEADO) — only states with tasks are emitted.
//      Table: id | objetivo (truncated) | gate_target | owner | updated_at
//   3. Carry-forward prose blocks from the prior TASK.md (read first):
//      - "## TASK-TAX-001 — estado migración cardinal NN_slug" (verbatim)
//      - "## Plantilla de task-contract (por tarea ejecutable)" (verbatim)
//   4. Footer: "Generado por 'pnpm task:list' ...".
//
// Determinism: no Date.now()/new Date(). The generated_at is omitted on
// purpose — the index is reproducible from the task.yaml set. [CÓDIGO]

import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import YAML from 'yaml';

import {
  TaskContractSchema,
  type TaskContract,
  type TaskWorkState,
} from '../../core/contracts/index.ts';
import {taskOrder} from '../../core/state-machine/index.ts';

const root = process.cwd();
const TASKS_DIR = resolve(root, '04_estado/tasks');
const TASK_MD = resolve(root, 'TASK.md');

const STATE_ORDER: readonly TaskWorkState[] = taskOrder; // INTAKE..ENTREGADO,BLOQUEADO

interface LoadedTask {
  taskId: string;
  contract: TaskContract;
}

/** List task dirs that contain a task.yaml. Tolerates missing/empty dir. */
function listTaskDirs(): string[] {
  if (!existsSync(TASKS_DIR)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(TASKS_DIR)) {
    if (entry.startsWith('.')) continue;
    const full = join(TASKS_DIR, entry);
    if (statSync(full).isDirectory() && existsSync(join(full, 'task.yaml'))) {
      out.push(full);
    }
  }
  return out;
}

/** Load + schema-parse every task.yaml. Invalid contracts are skipped with a
 *  console.warn so the index still regenerates from the valid set. [CÓDIGO] */
function loadTasks(): LoadedTask[] {
  const dirs = listTaskDirs();
  const loaded: LoadedTask[] = [];
  for (const dir of dirs) {
    const filePath = join(dir, 'task.yaml');
    let raw: unknown;
    try {
      raw = YAML.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch (err) {
      console.warn(`[WARN] task-list: ${filePath}: YAML inválido — ${(err as Error).message}`);
      continue;
    }
    const parsed = TaskContractSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      console.warn(`[WARN] task-list: ${filePath}: schema — ${issues}`);
      continue;
    }
    loaded.push({taskId: parsed.data.task_id, contract: parsed.data});
  }
  return loaded;
}

/** Truncate a string for table display. */
function trunc(s: string, max: number): string {
  const flat = s.replace(/\s+/gu, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

/** Render a state section with its task table. */
function renderState(state: TaskWorkState, tasks: LoadedTask[]): string {
  if (tasks.length === 0) return '';
  const sorted = [...tasks].sort((a, b) => a.taskId.localeCompare(b.taskId));
  const lines: string[] = [];
  lines.push(`## ${state}`);
  lines.push('');
  lines.push('| id | objetivo | gate_target | owner | updated_at |');
  lines.push('|---|---|---|---|---|');
  for (const {taskId, contract} of sorted) {
    const objetivo = trunc(contract.objetivo, 80);
    const gate = contract.gate_target ?? '—';
    const owner = contract.responsable;
    const updated = contract.updated_at;
    lines.push(`| ${taskId} | ${objetivo} | ${gate} | ${owner} | ${updated} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Split TASK.md into top-level (`## `) sections, preserving body verbatim. */
function splitSections(content: string): {header: string; body: string}[] {
  const lines = content.split('\n');
  const sections: {header: string; body: string}[] = [];
  let current: {header: string; body: string} | null = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current !== null) sections.push(current);
      current = {header: line.slice(3).trim(), body: ''};
    } else if (current !== null) {
      current.body += `${line}\n`;
    }
  }
  if (current !== null) sections.push(current);
  return sections;
}

/**
 * Carry-forward blocks from the prior TASK.md (if present), returned as
 * ready-to-emit markdown sections (header + body), verbatim. [CÓDIGO]
 *
 *   - "## TASK-TAX-001 — estado migración cardinal NN_slug" — migration status
 *   - "## Plantilla de task-contract (por tarea ejecutable)" — contract template
 */
function carryForward(content: string | null): string {
  if (content === null) return '';
  const sections = splitSections(content);
  const picks: string[] = [];
  for (const sec of sections) {
    const h = sec.header;
    if (h.startsWith('TASK-TAX-001') || h.toLowerCase().startsWith('plantilla de task-contract')) {
      picks.push(`## ${h}\n${sec.body.trimEnd()}\n`);
    }
  }
  return picks.join('\n');
}

const FOOTER =
  "_Generado por 'pnpm task:list' — fuente de verdad: '04_estado/tasks/*/task.yaml'. No editar a mano._";

function main(): void {
  const loaded = loadTasks();

  // Group by state. [CÓDIGO]
  const byState = new Map<TaskWorkState, LoadedTask[]>();
  for (const t of loaded) {
    const list = byState.get(t.contract.state) ?? [];
    list.push(t);
    byState.set(t.contract.state, list);
  }

  // Read prior TASK.md for carry-forward (best-effort; missing is fine). [CONFIG]
  const prior = existsSync(TASK_MD) ? readFileSync(TASK_MD, 'utf8') : null;

  const parts: string[] = [];
  parts.push('# TASK.md — cola de tareas (local, gitignored, derived index)');
  parts.push('');
  parts.push(
    'Índice derivado de `04_estado/tasks/*/task.yaml`. Una tarea = un task-contract. [CONFIG]',
  );
  parts.push(
    'No editar a mano — regenerar con `pnpm task:list`. Sección de plantilla y bloque de migración TASK-TAX-001 se preservan verbatim.',
  );
  parts.push('');

  for (const state of STATE_ORDER) {
    const section = renderState(state, byState.get(state) ?? []);
    if (section.length > 0) {
      parts.push(section);
    }
  }

  const cf = carryForward(prior);
  if (cf.length > 0) {
    parts.push(cf);
  }

  parts.push('---');
  parts.push('');
  parts.push(FOOTER);
  parts.push('');

  const output = parts.join('\n');
  writeFileSync(TASK_MD, output, 'utf8');

  const counts = STATE_ORDER.map((s) => `${s}:${byState.get(s)?.length ?? 0}`).join(' ');
  console.info(`PASS task-list: ${loaded.length} tasks indexados (${counts}).`);
}

main();
