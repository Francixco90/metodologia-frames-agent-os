// backfill-tasks.ts — CLI: `pnpm task:backfill`.
//
// Migrates the flat TASK.md cola into 04_estado/tasks/{id}/task.yaml files
// (one per unique historical task). Each backfilled task is a LOOSE task
// (project_id: null) — historical repo-tasks are not bound to a project.
//
// State inference (section → state):
//   "Próximas tareas" -> INTAKE
//   "En progreso"     -> COMPILADO  (or ESPECIFICADO if no receipt ref)
//   "Hechas"          -> ENTREGADO
//   "Bloqueadas"      -> BLOQUEADO
//
// Dedup: duplicate ids (e.g. TASK-0024 twice) -> ONE task.yaml.
// Non-numeric ids (TASK-TAX-001 etc.) -> minted as TASK-loose-{NNN} with
// meta.original_id recording the legacy id.
//
// Determinism: created_at/updated_at use a fixed ISO (NO Date.now()/new Date()).
// The counter (04_estado/registries/tasks/task-counter.yml) is bumped
// append-only for each mint and written atomically. [CONFIG]
//
// CLI: `pnpm task:backfill` (or `node --import tsx 05_verificacion/scripts/backfill-tasks.ts`).

import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import YAML from 'yaml';

import {TaskContractSchema, type TaskContract} from '../../core/contracts/index.ts';
import {
  mintTaskId,
  type TaskCounter,
  bumpCounter,
} from './lib/mint-task-id.ts';
import {BACKFILL_EPOCH as BACKFILL_TIMESTAMP} from './lib/deterministic-epoch.ts';

const root = process.cwd();
const TASK_MD = resolve(root, 'TASK.md');
const TASKS_DIR = resolve(root, '04_estado/tasks');
const COUNTER_PATH = resolve(root, '04_estado/registries/tasks/task-counter.yml');

type Section = 'INTAKE' | 'ESPECIFICADO' | 'COMPILADO' | 'ENTREGADO' | 'BLOQUEADO';

interface ParsedRow {
  originalId: string;
  descripcion: string;
  receiptRef: string;
  section: Section;
}

/**
 * Section header -> (state, requires receipt ref for COMPILADO-vs-ESPECIFICADO).
 * The "Próximas" section maps to INTAKE regardless of columns. [CONFIG]
 */
const SECTION_MAP: ReadonlyMap<string, Section> = new Map([
  ['próximas tareas', 'INTAKE'],
  ['proximas tareas', 'INTAKE'],
  ['en progreso', 'COMPILADO'], // downgraded to ESPECIFICADO if no receipt ref
  ['hechas', 'ENTREGADO'],
  ['hechas (últimas 5)', 'ENTREGADO'],
  ['bloqueadas', 'BLOQUEADO'],
]);

/** Extract the slug key for a header line (lowercased, trimmed). */
function sectionKey(header: string): string {
  return header.replace(/^#+\s*/u, '').trim().toLowerCase();
}

/**
 * Parse a markdown table body (lines after the header + separator) into rows.
 * Each row is split on `|`, cells trimmed. The separator row (|---|---|) is
 * skipped. Returns the cell arrays. [CÓDIGO]
 */
function parseTableBody(lines: string[]): string[][] {
  const rows: string[][] = [];
  let sawSeparator = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!sawSeparator && /^\|[\s:-]*-\|/u.test(trimmed.replace(/\s+/gu, ' '))) {
        sawSeparator = true;
        continue;
      }
      sawSeparator = true; // tolerate tables without an explicit separator
      const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
      rows.push(cells);
    } else if (rows.length > 0) {
      // first non-table line ends the table
      break;
    }
  }
  return rows;
}

/**
 * Split TASK.md into top-level (`## `) sections. Returns an array of
 * {header, bodyLines}. The front-matter before the first `## ` is dropped. [CÓDIGO]
 */
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

/** Determine whether an id string is a legacy numeric id (TASK-NNNN) or a tagged id. */
function isTaskId(cell: string): boolean {
  return /^TASK-[A-Za-z0-9-]+$/.test(cell);
}

/**
 * Parse TASK.md into backfill rows. Skips the "Plantilla" section and any
 * prose-only subsections (e.g. "## TASK-TAX-001 — estado migración ...")
 * which have no markdown table. [CÓDIGO]
 */
function parseTaskMd(content: string): ParsedRow[] {
  const sections = splitSections(content);
  const rows: ParsedRow[] = [];
  for (const sec of sections) {
    const key = sectionKey(sec.header);
    const state = SECTION_MAP.get(key);
    if (state === undefined) continue; // Plantilla, prose subsections, etc.
    const tableRows = parseTableBody(sec.body.split('\n'));
    for (const cells of tableRows) {
      if (cells.length < 2) continue;
      const idCell = cells[0];
      if (idCell === undefined || !isTaskId(idCell)) continue;
      const descripcion = cells[1] ?? '';
      // receipt ref column index varies per section:
      //   En progreso: id|descripción|producerActorId|comando pendiente|receipt ref (idx 4)
      //   Hechas:       id|descripción|receipt ref|fecha (idx 2)
      //   Próximas:     id|descripción|gate|input|owner|estado|bloqueado (no receipt)
      //   Bloqueadas:   id|descripción|razón (no receipt)
      let receiptRef = '';
      if (state === 'COMPILADO' || state === 'ESPECIFICADO') {
        receiptRef = cells[4] ?? '';
      } else if (state === 'ENTREGADO') {
        receiptRef = cells[2] ?? '';
      }
      const resolvedState: Section =
        state === 'COMPILADO' && receiptRef.length === 0 ? 'ESPECIFICADO' : state;
      rows.push({
        originalId: idCell,
        descripcion,
        receiptRef,
        section: resolvedState,
      });
    }
  }
  return rows;
}

/** Atomic write: write to {path}.tmp then rename. */
function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

/** Serialize the counter back to its canonical YAML form. [CÓDIGO] */
function serializeCounter(c: TaskCounter): string {
  const projectSeqEntries = Object.entries(c.counters.project_sequences).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const projectSeqYaml =
    projectSeqEntries.length === 0
      ? '{}'
      : projectSeqEntries.map(([slug, n]) => `  ${slug}: ${n}`).join('\n');
  return [
    'schema_version: 1',
    'registry_id: task-counter-v1',
    'mutation_policy: append-only-records-and-events',
    'counters:',
    `  project_sequences: ${projectSeqYaml}`,
    `  loose_sequence: ${c.counters.loose_sequence}`,
    '',
  ].join('\n');
}

/** Truncate a descripción to the objetivo (<=500) and done (<=500) limits. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

interface BackfillPlanItem {
  originalId: string;
  mintedId: string;
  descripcion: string;
  state: Section;
  receiptRef: string;
}

/** Build a task.yaml contract object for a backfilled task. */
function buildContract(item: BackfillPlanItem): TaskContract {
  const objetivo = clamp(item.descripcion, 500);
  const contract: TaskContract = {
    schema_version: 'task-contract-v1',
    task_id: item.mintedId,
    project_id: null, // loose — historical repo-task not bound to a project
    objetivo,
    repo: 'metodologia-frames-agent-os',
    responsable: 'lead',
    // Schema requires inputs.min(1) and write_set.min(1). The original flat
    // TASK.md did not record per-task inputs/write-sets; we record the
    // truthful minimal provenance: the backfill read TASK.md and wrote the
    // task.yaml path. Human amend expected. [CÓDIGO] [coverage_gap]
    inputs: ['TASK.md'],
    write_set: [`04_estado/tasks/${item.mintedId}/task.yaml`],
    no_objetivos: [],
    done: clamp(item.descripcion, 500),
    validacion: 'see original TASK.md',
    gaps: ['backfilled from flat TASK.md — state inferred, human amend'],
    state: item.state,
    created_from_route: 'R4', // retroactive
    gate_target: null,
    spawned_subtasks: [],
    parent_task_id: null,
    evidence_tags: {historical: 'DOC'},
    created_at: BACKFILL_TIMESTAMP,
    updated_at: BACKFILL_TIMESTAMP,
  };
  // Full schema validation before writing — fail fast if the minter produced
  // an id or field the contract rejects. [CÓDIGO]
  const parsed = TaskContractSchema.safeParse(contract);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(
      `backfill-tasks: contract for ${item.mintedId} (orig ${item.originalId}) fails schema — ${issues}`,
    );
  }
  return parsed.data;
}

function buildBackfillNotes(item: BackfillPlanItem): string {
  const notes = {
    schema_version: 1,
    original_id: item.originalId,
    section: item.state,
    inferred_state: item.state,
    receipt_ref: item.receiptRef || null,
    backfilled: true,
    note: 'migrated from flat TASK.md cola — state inferred from section, human amend expected',
  };
  return YAML.stringify(notes);
}

function main(): void {
  if (!existsSync(TASK_MD)) {
    console.error(`[FAIL] backfill-tasks: TASK.md not found at ${TASK_MD}`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(COUNTER_PATH)) {
    console.error(`[FAIL] backfill-tasks: task-counter.yml not found at ${COUNTER_PATH}`);
    process.exitCode = 1;
    return;
  }

  const content = readFileSync(TASK_MD, 'utf8');
  const rows = parseTaskMd(content);

  // Dedup by original_id (first occurrence wins). [CÓDIGO]
  const seen = new Set<string>();
  const uniqueRows: ParsedRow[] = [];
  for (const row of rows) {
    if (seen.has(row.originalId)) continue;
    seen.add(row.originalId);
    uniqueRows.push(row);
  }

  // Load counter (append-only). [CONFIG]
  const counterRaw = YAML.parse(readFileSync(COUNTER_PATH, 'utf8')) as unknown;
  const counter = normalizeCounter(counterRaw);

  let workingCounter: TaskCounter = counter;
  const plan: BackfillPlanItem[] = [];
  for (const row of uniqueRows) {
    const {task_id, nextCounter} = mintTaskId({
      projectSlug: null, // all backfilled tasks are loose
      counter: workingCounter,
    });
    workingCounter = nextCounter;
    plan.push({
      originalId: row.originalId,
      mintedId: task_id,
      descripcion: row.descripcion,
      state: row.section,
      receiptRef: row.receiptRef,
    });
  }

  // Write task.yaml + meta/backfill-notes.yml per minted task. [CÓDIGO]
  let written = 0;
  for (const item of plan) {
    const taskDir = resolve(TASKS_DIR, item.mintedId);
    const metaDir = resolve(taskDir, 'meta');
    mkdirSync(metaDir, {recursive: true});
    const contract = buildContract(item);
    const yaml = YAML.stringify(contract);
    atomicWrite(resolve(taskDir, 'task.yaml'), yaml);
    atomicWrite(resolve(metaDir, 'backfill-notes.yml'), buildBackfillNotes(item));
    written += 1;
  }

  // Reconcile counter via bumpCounter (append-only, idempotent) and write
  // atomically. project_sequences stays {} (all loose). [CONFIG]
  for (const item of plan) {
    workingCounter = bumpCounter(workingCounter, item.mintedId);
  }
  atomicWrite(COUNTER_PATH, serializeCounter(workingCounter));

  console.info(
    `PASS backfill: ${written} tasks backfilled (loose), counter loose_sequence=${workingCounter.counters.loose_sequence}.`,
  );
}

/** Normalize a parsed counter YAML into the TaskCounter interface. */
function normalizeCounter(raw: unknown): TaskCounter {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('backfill-tasks: task-counter.yml is not an object');
  }
  const obj = raw as Record<string, unknown>;
  const counters = (obj.counters ?? {}) as Record<string, unknown>;
  const projectSeq = counters.project_sequences ?? {};
  if (typeof projectSeq !== 'object' || projectSeq === null) {
    throw new Error('backfill-tasks: counters.project_sequences is not a map');
  }
  const normalizedSeq: Record<string, number> = {};
  for (const [k, v] of Object.entries(projectSeq)) {
    if (typeof v === 'number' && Number.isFinite(v)) normalizedSeq[k] = v;
  }
  const loose = typeof counters.loose_sequence === 'number' ? counters.loose_sequence : 0;
  return {
    schema_version: typeof obj.schema_version === 'number' ? obj.schema_version : 1,
    registry_id: typeof obj.registry_id === 'string' ? obj.registry_id : 'task-counter-v1',
    mutation_policy:
      typeof obj.mutation_policy === 'string'
        ? obj.mutation_policy
        : 'append-only-records-and-events',
    counters: {
      project_sequences: normalizedSeq,
      loose_sequence: loose,
    },
  };
}

main();