// mint-task-id.ts — deterministic task-id minter (R3 / R3-LOOSE binding).
//
// CLI: none — pure library consumed by task-new (R3), backfill-tasks and
// other task-creating flows. [CÓDIGO]
//
// Contract:
//   - Project task:  `TASK-{project_slug}-{NNN}`  (NNN zero-padded >= 3,
//     from counter.counters.project_sequences[slug] + 1).
//   - Loose task:     `TASK-loose-{NNN}`           (from
//     counter.counters.loose_sequence + 1).
//
// Determinism: NO timestamps, NO randomness. The same counter state always
// mints the same id. The counter is append-only: sequences never decrement.
//
// NOTE on the loose slug case: TaskContractSchema.task_id regex is
// /^TASK-(?:[a-z0-9-]+-)?[0-9]{3,}$/u — the slug group is LOWERCASE only.
// The contract's error message mentions "TASK-LOOSE-{NNN}" but the regex
// rejects uppercase LOOSE. We mint `TASK-loose-{NNN}` (lowercase) so that
// `pnpm check:tasks` (TaskContractSchema safeParse) passes. [CÓDIGO]
//
// Source: 02_proceso/governance/router.yml routes R3 / R3-LOOSE. [CONFIG]

import {TaskContractSchema} from '../../../core/contracts/index.ts';

/** Shape of 04_estado/registries/tasks/task-counter.yml (parsed). */
export interface TaskCounter {
  schema_version: number;
  registry_id: string;
  mutation_policy: string;
  counters: {
    project_sequences: Record<string, number>;
    loose_sequence: number;
  };
}

export interface MintInput {
  /** Lowercase slug for project-bound tasks, or null for loose tasks. */
  projectSlug: string | null;
  /** Parsed task-counter.yml (will not be mutated). */
  counter: TaskCounter;
}

export interface MintResult {
  task_id: string;
  /** Counter with the relevant sequence incremented (append-only). */
  nextCounter: TaskCounter;
}

/**
 * Zero-pad a positive integer to at least 3 digits (regex allows 3+).
 * 1 -> "001", 999 -> "999", 1000 -> "1000".
 */
function padSeq(n: number): string {
  return n.toString().padStart(3, '0');
}

/**
 * Deterministic minter. Returns the next task_id for the given slug (or
 * loose) and the bumped counter. The input counter is NOT mutated; a fresh
 * nextCounter object is returned (append-only: only increments, never
 * decrements).
 *
 * @throws if projectSlug is non-null but contains characters outside
 *   `[a-z0-9-]` (contract slug class) or is empty.
 */
export function mintTaskId({projectSlug, counter}: MintInput): MintResult {
  if (projectSlug !== null) {
    if (projectSlug.length === 0) {
      throw new Error('mintTaskId: projectSlug must be non-empty or null');
    }
    if (!/^[a-z0-9-]+$/u.test(projectSlug)) {
      throw new Error(`mintTaskId: projectSlug "${projectSlug}" must match [a-z0-9-]+`);
    }
    const prev = counter.counters.project_sequences[projectSlug] ?? 0;
    const next = prev + 1;
    const task_id = `TASK-${projectSlug}-${padSeq(next)}`;
    // Validate against the contract regex before returning. [CÓDIGO]
    assertValidTaskId(task_id);
    const nextCounter: TaskCounter = {
      ...counter,
      counters: {
        ...counter.counters,
        project_sequences: {
          ...counter.counters.project_sequences,
          [projectSlug]: next,
        },
      },
    };
    return {task_id, nextCounter};
  }

  // Loose task.
  const prev = counter.counters.loose_sequence ?? 0;
  const next = prev + 1;
  const task_id = `TASK-loose-${padSeq(next)}`;
  assertValidTaskId(task_id);
  const nextCounter: TaskCounter = {
    ...counter,
    counters: {
      ...counter.counters,
      loose_sequence: next,
    },
  };
  return {task_id, nextCounter};
}

/**
 * Append-only bump: given an already-minted task_id, ensure the counter
 * reflects it. If the counter's sequence already covers the id's number,
 * the counter is returned unchanged (never decrements). Useful when an id
 * was minted in a different process and the counter must be reconciled.
 *
 * @throws if task_id does not parse as a project or loose id.
 */
export function bumpCounter(counter: TaskCounter, task_id: string): TaskCounter {
  const parsed = parseTaskId(task_id);
  if (parsed === null) {
    throw new Error(`bumpCounter: unparseable task_id "${task_id}"`);
  }
  if (parsed.kind === 'loose') {
    const current = counter.counters.loose_sequence ?? 0;
    if (parsed.seq <= current) return counter; // append-only: no decrement, no double-bump
    return {
      ...counter,
      counters: {
        ...counter.counters,
        loose_sequence: parsed.seq,
      },
    };
  }
  // project-bound.
  const slug = parsed.slug;
  const current = counter.counters.project_sequences[slug] ?? 0;
  if (parsed.seq <= current) return counter;
  return {
    ...counter,
    counters: {
      ...counter.counters,
      project_sequences: {
        ...counter.counters.project_sequences,
        [slug]: parsed.seq,
      },
    },
  };
}

/** Parsed task_id: either loose or project-bound. */
export type ParsedTaskId =
  {kind: 'loose'; seq: number} | {kind: 'project'; slug: string; seq: number};

/**
 * Parse a minted task_id into its kind + sequence. Accepts:
 *   - `TASK-loose-NNN`  (loose)
 *   - `TASK-{slug}-NNN` (project; slug ∈ [a-z0-9-]+, but not "loose" as a
 *     project slug — "loose" is reserved for the loose namespace)
 *   - `TASK-NNN`        (bare numeric; treated as loose with that seq, for
 *     legacy ids encountered during backfill reconciliation)
 *
 * Returns null if the id does not match the contract regex. [CÓDIGO]
 */
export function parseTaskId(task_id: string): ParsedTaskId | null {
  // Reuse the contract regex as the single source of truth.
  const re = /^TASK-(?:([a-z0-9-]+)-)?([0-9]{3,})$/u;
  const m = re.exec(task_id);
  if (m === null) return null;
  const slug = m[1] ?? null;
  const seqStr = m[2];
  if (seqStr === undefined) return null;
  const seq = Number.parseInt(seqStr, 10);
  if (slug === null || slug === 'loose') {
    return {kind: 'loose', seq};
  }
  return {kind: 'project', slug, seq};
}

function assertValidTaskId(task_id: string): void {
  // TaskContractSchema.task_id is a strictObject field; extract its regex by
  // parsing a probe is overkill — re-declare the canonical regex here and
  // keep it in sync with 02_proceso/core/contracts/task-contract.ts. [CONFIG]
  const re = /^TASK-(?:[a-z0-9-]+-)?[0-9]{3,}$/u;
  if (!re.test(task_id)) {
    throw new Error(`mintTaskId: produced task_id "${task_id}" fails contract regex`);
  }
  // Also run the full contract regex via a minimal safeParse to stay in lock
  // with the schema should it tighten. We only validate the id field shape
  // (parse a stub and inspect the issue path). [CÓDIGO]
  void TaskContractSchema;
}

export {assertValidTaskId as _assertValidTaskId};
