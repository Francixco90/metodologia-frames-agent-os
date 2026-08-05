/**
 * R2 -> R3 bridge: ongoing-projects detector.
 *
 * CLI: `pnpm task:ongoing` (or `node --import tsx 05_verificacion/scripts/ongoing-projects.ts`).
 *
 * Reads (read-only, no mutation):
 *   - 04_estado/registries/projects/project-registry.yml  (append-only registry)
 *   - each entry's manifest_ref                         (project.yml)
 *   - 04_estado/tasks/{task-id}/task.yaml                (if any exist; tolerates none)
 *
 * Emits JSON to stdout:
 *   { ongoing: [{ project_id, current_state, next_gate, open_tasks: [...] }], generated_at }
 *
 * `next_gate` is derived from the release sequence in 01_intencion/program/dag.yml
 * (G13 governance -> G14 guardian -> G15 human -> G16 readiness -> G17 publish)
 * vs the entry's canonical state. This script does NOT advance gates — it only
 * reports. G13-G17 remain manual fail-closed. [CONFIG]
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const REGISTRY_REF = 'registries/projects/project-registry.yml';
const TASKS_DIR = resolve(root, '04_estado/tasks');

type CanonicalState = {
  project_id: string;
  current_state: string;
  governed_workflow_state: string;
  source_locked: boolean;
  guardian_passed: boolean;
  human_approved: boolean;
  ready: boolean;
  published: boolean;
};

/**
 * Derive the next manual fail-closed gate from the release sequence:
 *   BLOCKED_BEFORE_SOURCE_LOCK -> G13 (governance / source lock)
 *   source_locked              -> G14 (guardian)
 *   guardian_passed            -> G15 (human gate)
 *   human_approved             -> G16 (readiness gate)
 *   ready                      -> G17 (publish gate)
 *   published                  -> null (terminal)
 *
 * Mirrors dag.yml release: human_gate G15, readiness_gate G16, publish_gate G17,
 * with G13 (governance) and G14 (guardian) preceding per dag.yml packages
 * A09b (gate G13) and A12 (gate G14). [CÓDIGO]
 */
const deriveNextGate = (entry: CanonicalState): string | null => {
  if (entry.published) return null;
  if (entry.ready) return 'G17';
  if (entry.human_approved) return 'G16';
  if (entry.guardian_passed) return 'G15';
  if (entry.source_locked) return 'G14';
  return 'G13';
};

const readYaml = (path: string): unknown =>
  YAML.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;

type TaskSummary = {
  task_id: string;
  state: string | null;
  project_id: string | null;
};

/** Read open tasks bound to a project from 04_estado/tasks/{task-id}/task.yaml. */
const readOpenTasks = (projectId: string): TaskSummary[] => {
  if (!existsSync(TASKS_DIR)) return [];
  const tasks: TaskSummary[] = [];
  for (const entry of readdirSync(TASKS_DIR)) {
    const taskYamlPath = resolve(TASKS_DIR, entry, 'task.yaml');
    if (!existsSync(taskYamlPath)) continue;
    const parsed = readYaml(`04_estado/tasks/${entry}/task.yaml`) as Record<string, unknown> | null;
    if (parsed === null || typeof parsed !== 'object') continue;
    const boundProject = typeof parsed.project_id === 'string' ? parsed.project_id : null;
    if (boundProject !== projectId) continue;
    const state = typeof parsed.state === 'string' ? parsed.state : null;
    // "open" = non-terminal task state. Terminal states: ENTREGADO, BLOQUEADO.
    if (state === 'ENTREGADO') continue;
    tasks.push({task_id: entry, state, project_id: boundProject});
  }
  return tasks;
};

const isCanonicalState = (value: unknown): value is CanonicalState => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.project_id === 'string' &&
    typeof v.current_state === 'string' &&
    typeof v.governed_workflow_state === 'string' &&
    typeof v.source_locked === 'boolean' &&
    typeof v.guardian_passed === 'boolean' &&
    typeof v.human_approved === 'boolean' &&
    typeof v.ready === 'boolean' &&
    typeof v.published === 'boolean'
  );
};

const main = (): void => {
  const registry = readYaml(REGISTRY_REF) as {
    entries: Array<CanonicalState & {manifest_ref: string}>;
  };

  const ongoing = registry.entries.map((entry) => {
    // Read manifest to confirm canonical state (read-only; do not mutate).
    if (existsSync(resolve(root, entry.manifest_ref))) {
      const manifest = readYaml(entry.manifest_ref);
      if (!isCanonicalState(manifest)) {
        throw new Error(
          `${entry.project_id}: manifest_ref ${entry.manifest_ref} no expone estado canónico`,
        );
      }
    }
    return {
      project_id: entry.project_id,
      current_state: entry.current_state,
      next_gate: deriveNextGate(entry),
      open_tasks: readOpenTasks(entry.project_id),
    };
  });

  const output = {
    ongoing,
    generated_at: new Date().toISOString(),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
};

main();