// H-E002 runner — duplicate task_id detection.
// Executable eval: builds a temp tasks/ tree with two task.yaml sharing the
// same task_id, runs the G_TASK_03 dup-detection logic (mirrors
// 05_verificacion/scripts/check-tasks.ts) and asserts a WARN is emitted.
// Deterministic: fixed timestamps + hashes; no Date.now/Math.random. [CÓDIGO]

import {mkdtempSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync, statSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

import {TaskContractSchema} from '../../../02_proceso/core/contracts/index.ts';
import {DETERMINISTIC_EPOCH as FIXED_TS} from '../../scripts/lib/deterministic-epoch.ts';

const FIXTURE_DIR = resolve(__dirname, 'fixture');

interface LoadedTask {
  taskId: string;
  dir: string;
}

/**
 * Réplica aislada del recorrido G_TASK de check-tasks.ts sobre un árbol
 * temporal. Devuelve warnings de duplicados + errores de parseo. [CÓDIGO]
 */
function runCheckTasksLogic(tasksRoot: string): {
  loaded: LoadedTask[];
  warnings: string[];
  errors: string[];
} {
  const loaded: LoadedTask[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const dirs = readdirSync(tasksRoot).filter((f) => !f.startsWith('.'));
  for (const entry of dirs) {
    const full = join(tasksRoot, entry);
    if (!statSync(full).isDirectory()) continue;
    const filePath = join(full, 'task.yaml');
    if (!existsSync(filePath)) continue;
    let raw: unknown;
    try {
      raw = YAML.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch (err) {
      errors.push(`G_TASK_01: ${filePath}: YAML inválido — ${(err as Error).message}`);
      continue;
    }
    const parsed = TaskContractSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      errors.push(`G_TASK_01: ${filePath}: schema parse error — ${issues}`);
      continue;
    }
    loaded.push({taskId: parsed.data.task_id, dir: full});
  }

  const seenIds = new Set<string>();
  for (const {taskId} of loaded) {
    if (seenIds.has(taskId)) {
      warnings.push(`G_TASK_03: task_id duplicado: ${taskId}`);
    }
    seenIds.add(taskId);
  }

  return {loaded, warnings, errors};
}

describe('H-E002 — duplicate task_id detection', () => {
  it('emits a WARN when two task.yaml share the same task_id', () => {
    const root = mkdtempSync(join(tmpdir(), 'he002-tasks-'));
    try {
      const dirA = join(root, 'TASK-dup-001');
      const dirB = join(root, 'TASK-dup-001-b');
      const fixtureA = readFileSync(join(FIXTURE_DIR, 'task-a.yaml'), 'utf8');
      const fixtureB = readFileSync(join(FIXTURE_DIR, 'task-b.yaml'), 'utf8');
      mkdirSync(dirA, {recursive: true});
      mkdirSync(dirB, {recursive: true});
      writeFileSync(join(dirA, 'task.yaml'), fixtureA);
      writeFileSync(join(dirB, 'task.yaml'), fixtureB);

      const {loaded, warnings, errors} = runCheckTasksLogic(root);

      expect(errors).toHaveLength(0);
      expect(loaded).toHaveLength(2);
      expect(loaded.map((t) => t.taskId)).toEqual(['TASK-dup-001', 'TASK-dup-001']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('TASK-dup-001');
      expect(warnings[0]).toContain('duplicado');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('emits no WARN when task_ids are unique', () => {
    const root = mkdtempSync(join(tmpdir(), 'he002-unique-'));
    try {
      const dirA = join(root, 'TASK-uniq-001');
      const dirB = join(root, 'TASK-uniq-002');
      const base = (id: string): string =>
        [
          'schema_version: task-contract-v1',
          `task_id: ${id}`,
          'project_id: proj-eval',
          `objetivo: "unique ${id}"`,
          'repo: metodologia-frames-agent-os',
          'responsable: lead',
          `inputs: ["05_verificacion/evals/H-E002/fixture/task-a.yaml"]`,
          `write_set: ["04_estado/tasks/${id}/task.yaml"]`,
          'no_objetivos: []',
          `done: "unique ${id}"`,
          'validacion: "assert no WARN"',
          'gaps: []',
          'state: INTAKE',
          'created_from_route: R3',
          'gate_target: null',
          'spawned_subtasks: []',
          'parent_task_id: null',
          'evidence_tags:',
          '  eval: DOC',
          `created_at: ${FIXED_TS}`,
          `updated_at: ${FIXED_TS}`,
        ].join('\n');

      mkdirSync(dirA, {recursive: true});
      mkdirSync(dirB, {recursive: true});
      writeFileSync(join(dirA, 'task.yaml'), base('TASK-uniq-001'));
      writeFileSync(join(dirB, 'task.yaml'), base('TASK-uniq-002'));

      const {warnings, errors, loaded} = runCheckTasksLogic(root);

      expect(errors).toHaveLength(0);
      expect(loaded).toHaveLength(2);
      expect(warnings).toHaveLength(0);
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });
});