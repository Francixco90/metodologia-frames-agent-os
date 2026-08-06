// triage-loose-tasks.ts — normalize the 31 backfilled loose tasks to first-class
// R3-LOOSE (plan A5). For each `04_estado/tasks/TASK-loose-*/`:
//   1. created_from_route: R4 -> R3-LOOSE (the route that should have minted them
//      — backfill recorded R4 because that is the route that produced them, but
//      the canonical first-class loose route is R3-LOOSE per the loose-task
//      policy).
//   2. evidence_tags.historical: DOC -> coverage_gap where the backfill notes
//      record an `inferred_state` (fail-closed: an inferred state has no
//      ground-truth source, so the tag must mark the gap, not a clean DOC).
//   3. Append a `provenance` note to `meta/backfill-notes.yml` recording the
//      normalization. Idempotent: a task already at R3-LOOSE with a
//      `triage_r3_loose` provenance line is left untouched.
// Does NOT set `project_id` — loose tasks stay first-class and unbound. [CONFIG]
//
// Usage:
//   node --import tsx 05_verificacion/scripts/triage-loose-tasks.ts            # write
//   node --import tsx 05_verificacion/scripts/triage-loose-tasks.ts --dry-run  # report only
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {parse, stringify} from 'yaml';

const ROOT = process.cwd();
const TASKS_DIR = resolve(ROOT, '04_estado/tasks');
const PROVENANCE_KEY = 'triage_r3_loose';

interface BackfillNotes {
  schema_version?: number;
  original_id?: string;
  section?: string;
  inferred_state?: string;
  receipt_ref?: string | null;
  backfilled?: boolean;
  note?: string;
  provenance?: string[];
}

const isLooseDir = (name: string): boolean => name.startsWith('TASK-loose-');

const readYaml = <T>(path: string): T => parse(readFileSync(path, 'utf8')) as T;

const triageOne = (dir: string, dryRun: boolean): {id: string; changed: boolean; reason: string} => {
  const taskPath = resolve(dir, 'task.yaml');
  if (!existsSync(taskPath)) return {id: dir.split(sep).pop() ?? dir, changed: false, reason: 'no task.yaml'};
  const id = dir.split(sep).pop() ?? dir;
  const task = readYaml<Record<string, unknown>>(taskPath);
  const notesPath = resolve(dir, 'meta/backfill-notes.yml');
  const notes = existsSync(notesPath) ? readYaml<BackfillNotes>(notesPath) : {};
  const alreadyTouched = Array.isArray(notes.provenance) && notes.provenance.includes(PROVENANCE_KEY);
  const routeChanged = task.created_from_route === 'R4';
  const inferred = typeof notes.inferred_state === 'string' && notes.inferred_state.length > 0;
  const tags = (task.evidence_tags ?? {}) as Record<string, string>;
  const tagChanged = inferred && tags.historical !== 'coverage_gap';

  if (!routeChanged && !tagChanged && alreadyTouched) {
    return {id, changed: false, reason: 'already normalized'};
  }
  if (routeChanged) task.created_from_route = 'R3-LOOSE';
  if (tagChanged) tags.historical = 'coverage_gap';
  if (routeChanged || tagChanged) task.evidence_tags = tags;
  const provenance = Array.isArray(notes.provenance) ? notes.provenance.slice() : [];
  if (!provenance.includes(PROVENANCE_KEY)) provenance.push(PROVENANCE_KEY);
  notes.provenance = provenance;
  if (notes.note === undefined) notes.note = 'migrated from flat TASK.md cola — state inferred, human amend expected';
  if (!dryRun) {
    writeFileSync(taskPath, `${stringify(task)}`, 'utf8');
    writeFileSync(notesPath, `${stringify(notes)}`, 'utf8');
  }
  const reasons: string[] = [];
  if (routeChanged) reasons.push('R4->R3-LOOSE');
  if (tagChanged) reasons.push('historical->coverage_gap');
  return {id, changed: true, reason: reasons.join('; ') || 'provenance appended'};
};

const main = (): void => {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const dirs = readdirSync(TASKS_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && isLooseDir(e.name))
    .map((e) => resolve(TASKS_DIR, e.name))
    .sort();
  let changed = 0;
  let skipped = 0;
  for (const dir of dirs) {
    const r = triageOne(dir, dryRun);
    if (r.changed) {
      changed += 1;
      console.info(`${dryRun ? '[DRY] ' : ''}${r.id}: ${r.reason}`);
    } else {
      skipped += 1;
      console.info(`${r.id}: ${r.reason}`);
    }
  }
  console.info(`triage-loose-tasks: changed=${changed} skipped=${skipped} (dry-run=${dryRun})`);
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) main();

export {triageOne, main};