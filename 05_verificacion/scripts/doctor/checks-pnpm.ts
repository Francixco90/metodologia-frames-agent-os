// doctor/checks-pnpm.ts — pnpm-wrapper checks: repo, ownership, dag, tasks.
// Each delegates to the corresponding `pnpm check:*` script. [CÓDIGO]
import {record, runPnpm, countTasks} from '../doctor/types.ts';

const REPO_HASH_STALE = /hash-stale|coverage_gap|package\.json.*hash/iu;

// Check: repo — pnpm check:repo (warn on known package.json hash-stale coverage_gap).
export const checkRepo = (): void => {
  const {code, stdout, stderr} = runPnpm('check:repo');
  if (code === 0) {
    record('repo', 'pass', 'pnpm check:repo exit 0');
    return;
  }
  const combined = `${stdout}\n${stderr}`;
  if (REPO_HASH_STALE.test(combined)) {
    record(
      'repo',
      'warn',
      `check:repo nonzero (known package.json hash-stale coverage_gap): ${combined.slice(0, 160)}`,
    );
  } else {
    record('repo', 'fail', `check:repo exit ${code}: ${combined.slice(0, 240)}`);
  }
};

// Check: ownership — pnpm check:ownership exit 0.
export const checkOwnership = (): void => {
  const {code, stdout, stderr} = runPnpm('check:ownership');
  if (code === 0) {
    record('ownership', 'pass', 'pnpm check:ownership exit 0');
  } else {
    record('ownership', 'fail', `check:ownership exit ${code}: ${stdout}\n${stderr}`.slice(0, 240));
  }
};

// Check: dag — pnpm check:dag exit 0.
export const checkDag = (): void => {
  const {code, stdout, stderr} = runPnpm('check:dag');
  if (code === 0) {
    record('dag', 'pass', 'pnpm check:dag exit 0');
  } else {
    record('dag', 'fail', `check:dag exit ${code}: ${stdout}\n${stderr}`.slice(0, 240));
  }
};

// Check: tasks — pnpm check:tasks exit 0 (count tasks).
export const checkTasks = (): void => {
  const {code, stdout, stderr} = runPnpm('check:tasks');
  const taskCount = countTasks();
  if (code === 0) {
    record('tasks', 'pass', `pnpm check:tasks exit 0; ${taskCount} task dirs`);
  } else {
    record(
      'tasks',
      'fail',
      `check:tasks exit ${code}; ${taskCount} task dirs: ${stdout}\n${stderr}`.slice(0, 240),
    );
  }
};
