import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';

import type {CareerBriefDraftV1} from './brief-model.ts';
import {createCareerBriefMarkdown} from './brief-model.ts';
import {renderCareerBriefHtml, verifyCareerBriefParity} from './brief-renderer.ts';
import {sha256Text} from './canonical.ts';
import {routeCareerIntent, type CareerRouteRequest} from './route-career.ts';
import {CareerWorkflowV1Schema, type CareerWorkflowV1} from '../_schema/workflow-v1.schema.ts';

const STAGE_DIRS = [
  'c00-intake',
  'c01-evidence',
  'c02-positioning',
  'c03-discovery',
  'c04-scoring',
  'c05-application-design',
  'c06-cv',
  'c07-cover-letter',
  'c08-package-qa',
  'c09-submission',
] as const;
const CAREER_ROOT = fileURLToPath(new URL('..', import.meta.url));

export type CareerRunnerInput = {
  root: string;
  route: CareerRouteRequest;
  sources?: readonly {ref: string; sha256: string}[];
  outputDirectory?: string;
  dryRun?: boolean;
};

export type CareerRunnerResult = {
  schema_version: 'career-run-result-v1';
  status: 'NEEDS_INPUT' | 'AWAITING_APPROVAL';
  intent: ReturnType<typeof routeCareerIntent>;
  workflows: readonly {workflow_id: string; title: string; next_gate: string}[];
  brief: {markdown_ref: string; html_ref: string; content_sha256: string; html_sha256: string};
  next_gate: 'CR_BRIEF_APPROVED';
  materialized: boolean;
};

const loadWorkflow = (stage: string): CareerWorkflowV1 => {
  const directory = STAGE_DIRS.find((entry) => entry.startsWith(stage.toLowerCase()));
  if (!directory) throw new Error(`CAREER-RUN-001 unresolved workflow ${stage}`);
  return CareerWorkflowV1Schema.parse(
    parse(readFileSync(resolve(CAREER_ROOT, directory, 'workflow.yml'), 'utf8')),
  );
};

const privateRef = (root: string, path: string): string => {
  const privateRoot = resolve(root, 'work/private');
  const target = resolve(path);
  const offset = relative(privateRoot, target);
  if (!offset || offset.startsWith('..')) throw new Error('CAREER-RUN-PRIVATE-001');
  return relative(resolve(root), target).replaceAll('\\', '/');
};

const writeAtomic = (path: string, value: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, 'utf8');
  renameSync(temporary, path);
};

const briefKind = (
  intent: ReturnType<typeof routeCareerIntent>,
): CareerBriefDraftV1['brief_kind'] => {
  if (intent.intent_class === 'job_search') return 'job-search';
  if (intent.intent_class === 'intervention') return 'intervention';
  return intent.job_ref ? 'application' : 'candidate-foundation';
};

export const runCareerBriefFirst = (input: CareerRunnerInput): CareerRunnerResult => {
  const intent = routeCareerIntent({
    ...input.route,
    sourceRefs: input.sources?.map(({ref}) => ref),
  });
  const workflows = intent.selected_stage_path.map(loadWorkflow);
  const candidateId =
    intent.candidate_id ?? `CAND-PENDING-${intent.request_hash.slice(0, 10).toUpperCase()}`;
  const skills = [...new Set(workflows.flatMap(({capability_map}) => capability_map))].sort();
  const sourceList = [...(input.sources ?? [])].sort((left, right) =>
    left.ref.localeCompare(right.ref),
  );
  const draft: CareerBriefDraftV1 = {
    schema_version: 'career-brief-v1',
    brief_id: `CBRIEF-${intent.request_hash.slice(0, 16).toUpperCase()}`,
    brief_kind: briefKind(intent),
    candidate_id: candidateId,
    application_id: intent.application_id,
    display_identity: 'candidate-neutral-ats',
    generated_by: 'MetodologIA',
    request: intent.request,
    request_hash: intent.request_hash,
    sources: sourceList,
    language: intent.language === 'unknown' ? 'es' : intent.language,
    workflow_selected: intent.selected_stage_path,
    skills,
    state: 'BRIEF_DRAFT',
    next_gate: 'CR_BRIEF_APPROVED',
  };
  const stageSummary = workflows
    .map(({workflow_id, title}) => `${workflow_id} — ${title}`)
    .join('\n');
  const unresolved =
    intent.blocking_questions.map((question) => `- ${question}`).join('\n') || '- Ninguno.';
  const markdown = createCareerBriefMarkdown(draft, {
    'Resultado esperado': `Preparar un recorrido Career OS gobernado para: ${intent.request}`,
    'Pedido interpretado': `Intención: ${intent.intent_class}. Decisión: ${intent.decision}.`,
    'Candidato, audiencia y objetivo': `Candidato: ${candidateId}. Rol objetivo: ${intent.target_role ?? 'por resolver'}.`,
    'Evidencia, fuentes y supuestos':
      sourceList.length > 0
        ? sourceList.map(({ref}) => `- ${ref}`).join('\n')
        : '- Sin fuentes hash-bound; no promover claims.',
    'Vacante o familia de rol':
      intent.job_ref ?? intent.target_role ?? 'Por resolver antes de producción.',
    'Estrategia de posicionamiento':
      'Se decidirá solo con evidencia aprobada; no se infieren capacidades.',
    'Steps y milestones': stageSummary,
    Deliverables: workflows
      .flatMap(({deliverables}) => deliverables)
      .map((item) => `- ${item}`)
      .join('\n'),
    'Skills y responsabilidades': skills.map((skill) => `- ${skill}`).join('\n'),
    'Riesgos, límites y casos borde': `${unresolved}\n- C09 queda PREPARED_STOP; sin red ni envío.`,
    'Criterios de aceptación':
      '- Brief MD/HTML con paridad.\n- Claims evidence-first.\n- Gate humano antes de producir.',
    'Decisión y siguiente gate': `Estado: ${intent.decision}. Siguiente gate: CR_BRIEF_APPROVED.`,
  });
  const html = renderCareerBriefHtml(markdown);
  if (verifyCareerBriefParity(markdown, html).length > 0)
    throw new Error('CAREER-RUN-002 brief parity failed');
  const output = input.outputDirectory ?? resolve(input.root, 'work/private/career');
  const markdownPath = resolve(output, 'brief.md');
  const htmlPath = resolve(output, 'brief.html');
  const markdownRef = privateRef(input.root, markdownPath);
  const htmlRef = privateRef(input.root, htmlPath);
  if (!input.dryRun) {
    writeAtomic(markdownPath, markdown);
    writeAtomic(htmlPath, html);
  }
  return {
    schema_version: 'career-run-result-v1',
    status: intent.decision === 'NEEDS_INPUT' ? 'NEEDS_INPUT' : 'AWAITING_APPROVAL',
    intent,
    workflows: workflows.map(({workflow_id, title}) => ({
      workflow_id,
      title,
      next_gate: 'CR_BRIEF_APPROVED',
    })),
    brief: {
      markdown_ref: markdownRef,
      html_ref: htmlRef,
      content_sha256: sha256Text(markdown),
      html_sha256: sha256Text(html),
    },
    next_gate: 'CR_BRIEF_APPROVED',
    materialized: !input.dryRun,
  };
};
