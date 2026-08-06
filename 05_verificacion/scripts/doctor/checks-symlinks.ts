// doctor/checks-symlinks.ts — tasks symlink + task-counter consistency.
import {existsSync, lstatSync, readFileSync, readlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {countTasks, record, ROOT} from '../doctor/types.ts';

// Check: tasks symlink resolves: "tasks" -> 04_estado/tasks.
export const checkTasksSymlink = (): void => {
  const linkPath = resolve(ROOT, 'tasks');
  const expectedTarget = '04_estado/tasks';
  if (!existsSync(linkPath)) {
    record('tasks-symlink', 'fail', 'symlink "tasks" ausente');
    return;
  }
  let stat;
  try {
    stat = lstatSync(linkPath);
  } catch (err) {
    record('tasks-symlink', 'fail', `lstat falló: ${(err as Error).message}`);
    return;
  }
  if (!stat.isSymbolicLink()) {
    record('tasks-symlink', 'fail', '"tasks" no es symlink');
    return;
  }
  let target: string;
  try {
    target = readlinkSync(linkPath);
  } catch (err) {
    record('tasks-symlink', 'fail', `readlink falló: ${(err as Error).message}`);
    return;
  }
  if (target !== expectedTarget) {
    record(
      'tasks-symlink',
      'fail',
      `symlink "tasks" -> "${target}" (esperado "${expectedTarget}")`,
    );
    return;
  }
  if (!existsSync(resolve(ROOT, expectedTarget))) {
    record(
      'tasks-symlink',
      'fail',
      `symlink "tasks" -> ${expectedTarget} pero el destino no existe`,
    );
    return;
  }
  record('tasks-symlink', 'pass', `tasks -> ${expectedTarget} (resuelve)`);
};

// Check: task-counter.yml parses + loose_sequence consistent.
export const checkTaskCounter = (): void => {
  const counterPath = resolve(ROOT, '04_estado/registries/tasks/task-counter.yml');
  if (!existsSync(counterPath)) {
    record('task-counter', 'fail', '04_estado/registries/tasks/task-counter.yml ausente');
    return;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(readFileSync(counterPath, 'utf8')) as Record<string, unknown>;
  } catch (err) {
    record('task-counter', 'fail', `no parseable: ${(err as Error).message}`);
    return;
  }
  const looseSequence = (parsed.counters as Record<string, unknown> | undefined)?.loose_sequence;
  if (typeof looseSequence !== 'number') {
    record(
      'task-counter',
      'fail',
      `loose_sequence no es número (observado ${String(looseSequence)})`,
    );
    return;
  }
  const taskCount = countTasks();
  // loose_sequence = next available index; dir count <= loose_sequence.
  // More dirs than counter = inconsistency. [INFERENCIA]
  if (taskCount > looseSequence) {
    record(
      'task-counter',
      'fail',
      `loose_sequence=${looseSequence} pero ${taskCount} task dirs (inconsistente)`,
    );
  } else {
    record(
      'task-counter',
      'pass',
      `loose_sequence=${looseSequence}, ${taskCount} task dirs (consistente)`,
    );
  }
};
