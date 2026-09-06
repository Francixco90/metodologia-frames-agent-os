// Handlers for the governed project, task and eval routes (R1, R2, R3, R3-LOOSE, R5). They plan
// only: every decision is read-only until its human gate, mirrors route-maintenance-v1 and never
// picks a project or task on the user's behalf. [CÓDIGO]
import {createHash} from 'node:crypto';

import {z} from 'zod';

import {classifyGovernedLegacyRouteV1} from './first-turn-signals-v1.ts';

const Text = (max: number) => z.string().trim().min(1).max(max);
const IdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{1,63}$/u, 'lowercase kebab-case id');

const ProjectCreateInput = z.strictObject({
  request: Text(2_000),
  project_id: IdSchema.optional(),
  title: Text(160).optional(),
  outcome: Text(500).optional(),
});
const ProjectContinueInput = z.strictObject({
  request: Text(2_000),
  project_id: IdSchema.optional(),
  known_projects: z.array(IdSchema).max(200).default([]),
});
const TaskCreateInput = z.strictObject({
  request: Text(2_000),
  project_id: IdSchema.optional(),
  title: Text(160).optional(),
  acceptance: Text(500).optional(),
});
const EvalInput = z.strictObject({
  request: Text(2_000),
  mode: z.enum(['eval', 'ablation']).optional(),
  only: Text(120).optional(),
});

type GovernedRouteId = 'R1' | 'R2' | 'R3' | 'R3-LOOSE' | 'R5';
/** Explicit governed route wins; otherwise classify the prompt; any other explicit route opts out. */
export const selectGovernedRouteV1 = (
  prompt: string,
  explicitRoute: string | undefined,
  hasActiveProject: boolean,
): GovernedRouteId | null => {
  if (explicitRoute !== undefined)
    return explicitRoute in GOVERNED_REASON_CODES_V1 ? (explicitRoute as GovernedRouteId) : null;
  return classifyGovernedLegacyRouteV1(prompt, hasActiveProject);
};
export const GOVERNED_REASON_CODES_V1: Readonly<Record<GovernedRouteId, string>> = {
  R1: 'PROJECT_SIGNAL',
  R2: 'PROJECT_RESUME_SIGNAL',
  R3: 'TASK_SIGNAL',
  'R3-LOOSE': 'TASK_SIGNAL',
  R5: 'EVAL_SIGNAL',
};
type GovernedGate =
  'PJ_SCAFFOLD_APPROVED' | 'PJ_RESUME_CONFIRMED' | 'TK_CONTRACT_APPROVED' | 'EV_RUN_APPROVED';

export interface GovernedRouteDecisionV1 {
  schema_version: 'governed-route-decision-v1';
  route_id: GovernedRouteId;
  request_hash: string;
  decision: 'ROUTED' | 'NEEDS_INPUT';
  selected_stage_path: string[];
  declared_write_set: string[];
  write_policy: `read_only_until_${GovernedGate}`;
  blocking_questions: string[];
  candidates: string[];
  next_gate: GovernedGate;
}

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const decide = (
  route: GovernedRouteId,
  parsed: unknown,
  stages: string[],
  writeSet: string[],
  gate: GovernedGate,
  blocking: (string | null)[],
  candidates: string[] = [],
): GovernedRouteDecisionV1 => {
  const questions = blocking.filter((question): question is string => question !== null);
  return {
    schema_version: 'governed-route-decision-v1',
    route_id: route,
    request_hash: hash(parsed),
    decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
    selected_stage_path: stages,
    declared_write_set: writeSet,
    write_policy: `read_only_until_${gate}`,
    blocking_questions: questions,
    candidates,
    next_gate: gate,
  };
};

export function routeProjectCreateIntent(input: unknown): GovernedRouteDecisionV1 {
  const parsed = ProjectCreateInput.parse(input);
  const id = parsed.project_id ?? null;
  return decide(
    'R1',
    parsed,
    ['PJ00-intake', 'PJ01-scaffold', 'PJ02-register'],
    id
      ? [`03_artefactos/projects/${id}/**`, '04_estado/registries/projects/project-registry.yml']
      : [],
    'PJ_SCAFFOLD_APPROVED',
    [
      id ? null : '¿Qué identificador kebab-case tendrá el proyecto?',
      parsed.title ? null : '¿Cómo se llama el proyecto?',
      parsed.outcome ? null : '¿Qué resultado observable entrega el proyecto?',
    ],
  );
}

export function routeProjectContinueIntent(input: unknown): GovernedRouteDecisionV1 {
  const parsed = ProjectContinueInput.parse(input);
  const known = [...new Set(parsed.known_projects)].sort();
  const chosen = parsed.project_id && known.includes(parsed.project_id) ? parsed.project_id : null;
  const single = known.length === 1 ? (known[0] as string) : null;
  const resolved = chosen ?? single;
  return decide(
    'R2',
    parsed,
    ['PJ10-list', 'PJ11-select', 'PJ12-resume'],
    [],
    'PJ_RESUME_CONFIRMED',
    [
      known.length === 0 ? 'No hay proyectos registrados; ¿quieres crear uno (R1)?' : null,
      known.length > 0 && resolved === null
        ? `¿Qué proyecto continúas? Candidatos: ${known.join(', ')}`
        : null,
    ],
    known,
  );
}

export function routeTaskCreateIntent(input: unknown): GovernedRouteDecisionV1 {
  const parsed = TaskCreateInput.parse(input);
  const loose = parsed.project_id === undefined;
  return decide(
    loose ? 'R3-LOOSE' : 'R3',
    parsed,
    ['TK00-intake', 'TK01-contract', 'TK02-continuity'],
    [loose ? '04_estado/tasks/TASK-loose-*/**' : `04_estado/tasks/TASK-${parsed.project_id}-*/**`],
    'TK_CONTRACT_APPROVED',
    [
      parsed.title ? null : '¿Cuál es el título de la tarea?',
      parsed.acceptance ? null : '¿Qué criterio de aceptación cierra la tarea?',
    ],
  );
}

export function routeEvalIntent(input: unknown): GovernedRouteDecisionV1 {
  const parsed = EvalInput.parse(input);
  return decide(
    'R5',
    parsed,
    ['EV00-select', 'EV01-run', 'EV02-report'],
    ['05_verificacion/evals/results/**'],
    'EV_RUN_APPROVED',
    [parsed.mode ? null : '¿Ejecutas una eval (oráculos) o una ablation (variantes)?'],
  );
}
