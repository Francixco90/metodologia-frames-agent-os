/**
 * scaffold-continuity.ts — A1 of gap-closure plan.
 *
 * CLI: `pnpm task:scaffold-continuity [--all] [--task TASK-loose-001] [--dry-run]`
 * (default: --all)
 *
 * Idempotent: for each `04_estado/tasks/TASK-*` directory with a `task.yaml`, if
 * `PROGRESS.md`, `continuity/state.yaml`, or `continuity/resume.md` are
 * missing, materialize them from the templates under
 * `02_proceso/core/contracts/templates/` and derive initial state from the
 * parsed `task.yaml`. Refuses to overwrite existing files. [CÓDIGO]
 *
 * Fail-closed: a task dir whose `task.yaml` does not parse through
 * `TaskContractSchema` is reported and skipped (no inference substituted for
 * the missing contract — escalation, not assumption). [CONFIG]
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {TaskContractSchema} from '../../core/contracts/index.ts';

const ROOT = process.cwd();
const TASKS_DIR = resolve(ROOT, '04_estado/tasks');
const TEMPLATES_DIR = resolve(ROOT, '02_proceso/core/contracts/templates');

interface Plan {
  task_id: string;
  dir: string;
  create: string[];
  skip: string[];
  vars?: Record<string, string>;
}

/** Derive the next-step directive from the task's work state. [CONFIG] */
const nextStepFor = (state: string): string => {
  switch (state) {
    case 'INTAKE':
      return 'Especificar: confirm inputs + write-set, advance INTAKE→ESPECIFICADO via contract-complete evidence.';
    case 'ESPECIFICADO':
      return 'Compilar: build work product within write_set, advance ESPECIFICADO→COMPILADO via work-built evidence.';
    case 'COMPILADO':
      return 'Evaluar: run validacion, advance COMPILADO→EVALUADO via checks-green evidence.';
    case 'EVALUADO':
      return 'Entregar: handoff to consumer, advance EVALUADO→ENTREGADO via handoff-accepted evidence.';
    case 'ENTREGADO':
      return 'Cerrado. No further state advance. Archive or retire.';
    case 'BLOQUEADO':
      return 'Replan: resolve blocker, advance BLOQUEADO→ESPECIFICADO via replan evidence (only non-monotonic path).';
    default:
      return `Unknown state "${state}" — inspect task.yaml, do not advance.`;
  }
};

const blockersFor = (state: string, gaps: string[]): string => {
  if (state === 'BLOQUEADO') {
    return `Bloqueado — inspect task.yaml gaps + gate_target, replan.${gaps.length > 0 ? ` Gaps: ${gaps.join('; ')}` : ''}`;
  }
  if (gaps.length > 0) {
    return `Open gaps: ${gaps.join('; ')}`;
  }
  return '(none)';
};

/** Render a template by substituting `{{key}}` placeholders. [CÓDIGO] */
const render = (template: string, vars: Record<string, string>): string =>
  template.replaceAll(/\{\{(\w+)\}\}/gu, (_, key: string) => vars[key] ?? '');

const listVar = (items: string[]): string =>
  items.length === 0 ? '(none)' : items.map((i) => `- ${i}`).join('\n');

/** Read a task.yaml, parse, and validate through TaskContractSchema. */
const readTask = (dir: string) => {
  const path = resolve(dir, 'task.yaml');
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const parsed: unknown = parse(text);
  const result = TaskContractSchema.safeParse(parsed);
  if (!result.success) {
    return {error: result.error.issues.map((i) => i.path.join('.')).join('; ')};
  }
  return {contract: result.data};
};

const buildVars = (c: {
  schema_version: string;
  task_id: string;
  state: string;
  gate_target: string | null;
  created_from_route: string;
  objetivo: string;
  done: string;
  validacion: string;
  inputs: string[];
  write_set: string[];
  no_objetivos: string[];
  gaps: string[];
  updated_at: string;
}): Record<string, string> => ({
  schema_version: c.schema_version,
  task_id: c.task_id,
  state: c.state,
  gate_target: c.gate_target ?? 'null',
  created_from_route: c.created_from_route,
  objetivo: c.objetivo,
  done: c.done,
  validacion: c.validacion,
  inputs: listVar(c.inputs),
  write_set: listVar(c.write_set),
  no_objetivos: listVar(c.no_objetivos),
  gaps: listVar(c.gaps),
  next_step: nextStepFor(c.state),
  blockers: blockersFor(c.state, c.gaps),
  updated_at: c.updated_at,
});

const collectPlans = (filter?: string): Plan[] => {
  const entries = readdirSync(TASKS_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .filter((e) => existsSync(resolve(TASKS_DIR, e.name, 'task.yaml')))
    .filter((e) => filter === undefined || e.name === filter);

  const plans: Plan[] = [];
  for (const entry of entries) {
    const dir = resolve(TASKS_DIR, entry.name);
    const read = readTask(dir);
    if (read === null) continue;
    if ('error' in read) {
      console.warn(
        `[SKIP] ${entry.name}: task.yaml fails TaskContractSchema — ${read.error} (fail-closed, human amend)`,
      );
      plans.push({task_id: entry.name, dir, create: [], skip: ['task.yaml (invalid)']});
      continue;
    }
    const c = read.contract;
    const vars = buildVars(c);
    const create: string[] = [];
    const skip: string[] = [];

    const progressPath = resolve(dir, 'PROGRESS.md');
    if (existsSync(progressPath)) {
      skip.push('PROGRESS.md');
    } else {
      create.push('PROGRESS.md');
    }

    const continuityDir = resolve(dir, 'continuity');
    const statePath = resolve(continuityDir, 'state.yaml');
    if (existsSync(statePath)) {
      skip.push('continuity/state.yaml');
    } else {
      create.push('continuity/state.yaml');
    }

    const resumePath = resolve(continuityDir, 'resume.md');
    if (existsSync(resumePath)) {
      skip.push('continuity/resume.md');
    } else {
      create.push('continuity/resume.md');
    }

    plans.push({task_id: c.task_id, dir, create, skip, vars});
  }
  return plans;
};

const materialize = (plan: Plan & {vars?: Record<string, string>}): void => {
  if (plan.vars === undefined) return;
  const vars = plan.vars;
  const continuityDir = resolve(plan.dir, 'continuity');

  if (plan.create.includes('PROGRESS.md')) {
    const tmpl = readFileSync(resolve(TEMPLATES_DIR, 'progress.md.tmpl'), 'utf8');
    writeFileSync(resolve(plan.dir, 'PROGRESS.md'), render(tmpl, vars), 'utf8');
  }
  if (plan.create.length > 0 && !existsSync(continuityDir)) {
    mkdirSync(continuityDir, {recursive: true});
  }
  if (plan.create.includes('continuity/state.yaml')) {
    const tmpl = readFileSync(resolve(TEMPLATES_DIR, 'continuity/state.yaml.tmpl'), 'utf8');
    writeFileSync(resolve(continuityDir, 'state.yaml'), render(tmpl, vars), 'utf8');
  }
  if (plan.create.includes('continuity/resume.md')) {
    const tmpl = readFileSync(resolve(TEMPLATES_DIR, 'continuity/resume.md.tmpl'), 'utf8');
    writeFileSync(resolve(continuityDir, 'resume.md'), render(tmpl, vars), 'utf8');
  }
};

const parseArgs = (argv: string[]): {all: boolean; task: string | undefined; dryRun: boolean} => {
  const out = {all: false, task: undefined as string | undefined, dryRun: false};
  for (const arg of argv.slice(2)) {
    if (arg === '--all') out.all = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--task=')) out.task = arg.slice('--task='.length);
  }
  if (!out.all && out.task === undefined) out.all = true;
  return out;
};

const main = (): void => {
  const args = parseArgs(process.argv);
  if (!existsSync(TASKS_DIR)) {
    console.error(`[FAIL] tasks dir not found: ${TASKS_DIR}`);
    process.exitCode = 1;
    return;
  }
  const plans = collectPlans(args.task);
  let created = 0;
  let skipped = 0;
  const createdPaths: string[] = [];

  for (const plan of plans) {
    if (plan.create.length === 0) {
      console.info(`[OK] ${plan.task_id}: nothing to do (${plan.skip.join(', ') || 'no files'})`);
      skipped += plan.skip.length;
      continue;
    }
    if (args.dryRun) {
      console.info(
        `[DRY] ${plan.task_id}: would create ${plan.create.join(', ')}${plan.skip.length > 0 ? `; skip ${plan.skip.join(', ')}` : ''}`,
      );
      continue;
    }
    materialize(plan);
    for (const file of plan.create) {
      createdPaths.push(resolve(plan.dir, file));
    }
    created += plan.create.length;
    console.info(
      `[DONE] ${plan.task_id}: created ${plan.create.join(', ')}${plan.skip.length > 0 ? `; skipped ${plan.skip.join(', ')}` : ''}`,
    );
  }

  const manifest = createdPaths
    .map((p) => p.replace(ROOT + '/', ''))
    .sort()
    .join('\n');
  const manifestSha =
    manifest.length === 0 ? '' : createHash('sha256').update(manifest).digest('hex');
  console.info(
    `SCAFFOLD-CONTINUITY summary: created=${created} skipped=${skipped} dry_run=${args.dryRun} files_sha256=${manifestSha || '(none)'}`,
  );
};

main();
