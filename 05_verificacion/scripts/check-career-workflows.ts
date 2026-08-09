// Career OS structural and fail-closed conformance gate. [CÓDIGO]
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {CareerDeliverableRegistryV1Schema} from '../../02_proceso/workflows/career/_schema/registry-v1.schema.ts';
import {CareerWorkflowV1Schema} from '../../02_proceso/workflows/career/_schema/workflow-v1.schema.ts';

const ROOT = process.cwd();
const CAREER = resolve(ROOT, '02_proceso/workflows/career');
const expected = Array.from({length: 10}, (_, index) => `C${String(index).padStart(2, '0')}`);
const errors: string[] = [];
const readYaml = (path: string): unknown => parse(readFileSync(resolve(ROOT, path), 'utf8'));
const sha256 = (path: string): string =>
  createHash('sha256')
    .update(readFileSync(resolve(ROOT, path)))
    .digest('hex');

const workflowFiles = readdirSync(CAREER, {withFileTypes: true})
  .filter((entry) => entry.isDirectory() && /^c[0-9]{2}-/u.test(entry.name))
  .map((entry) => `02_proceso/workflows/career/${entry.name}/workflow.yml`)
  .sort();
const workflows = workflowFiles.map((path) => {
  try {
    return CareerWorkflowV1Schema.parse(readYaml(path));
  } catch (error) {
    errors.push(`CAREER-WORKFLOW-001 ${path}: ${String(error)}`);
    return null;
  }
});
const parsedWorkflows = workflows.filter((workflow) => workflow !== null);
const actual = parsedWorkflows.map(({workflow_id}) => workflow_id).sort();
if (actual.join(',') !== expected.join(',')) {
  errors.push('CAREER-WORKFLOW-002 expected exactly C00-C09');
}

const skillRegistry = readYaml('04_estado/registries/skills/creation-v3-skill-registry.yml') as {
  entries?: Array<{skill_id?: string; current_state?: string}>;
};
const activeSkills = new Set(
  (skillRegistry.entries ?? [])
    .filter(({current_state}) => current_state === 'active')
    .map(({skill_id}) => skill_id),
);

for (const workflow of parsedWorkflows) {
  if (!existsSync(resolve(ROOT, workflow.template_ref))) {
    errors.push(`CAREER-WORKFLOW-003 ${workflow.workflow_id} missing template_ref`);
  } else {
    const htmlTwin = workflow.template_ref.replace(/\.template\.md$/u, '.template.html');
    if (!existsSync(resolve(ROOT, htmlTwin))) {
      errors.push(`CAREER-WORKFLOW-004 ${workflow.workflow_id} missing HTML twin`);
    }
  }
  for (const skill of workflow.capability_map) {
    if (!activeSkills.has(skill)) {
      errors.push(`CAREER-WORKFLOW-005 ${workflow.workflow_id} inactive skill ${skill}`);
    }
  }
  for (const step of workflow.execution_steps) {
    if (!workflow.gates.includes(step.gate)) {
      errors.push(`CAREER-WORKFLOW-006 ${workflow.workflow_id}/${step.step_id} gate not declared`);
    }
    if (!step.outputs.every((output) => workflow.deliverables.includes(output))) {
      errors.push(
        `CAREER-WORKFLOW-007 ${workflow.workflow_id}/${step.step_id} output not declared`,
      );
    }
    if (!activeSkills.has(step.primary_skill)) {
      errors.push(
        `CAREER-WORKFLOW-008 ${workflow.workflow_id}/${step.step_id} primary skill inactive`,
      );
    }
  }
  if (workflow.metadata.publication_authority !== false) {
    errors.push(`CAREER-WORKFLOW-009 ${workflow.workflow_id} publication authority forbidden`);
  }
}

const registry = CareerDeliverableRegistryV1Schema.parse(
  readYaml('02_proceso/workflows/career/_assets/deliverable-registry.yml'),
);
const definitions = new Map(
  registry.definitions.map((definition) => [definition.deliverable_id, definition]),
);
for (const workflow of parsedWorkflows) {
  for (const deliverable of workflow.deliverables) {
    const definition = definitions.get(deliverable);
    if (!definition || definition.workflow_id !== workflow.workflow_id) {
      errors.push(`CAREER-DELIVERABLE-001 ${workflow.workflow_id}/${deliverable}`);
    }
  }
}
for (const definition of registry.definitions) {
  if (!existsSync(resolve(ROOT, definition.template_ref))) {
    errors.push(`CAREER-DELIVERABLE-002 ${definition.deliverable_id} template missing`);
  }
}

const deterministicFiles = ['route-career.ts', 'scoring.ts', 'state-machine.ts', 'submission.ts'];
const forbidden = /\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval)\s*\(/u;
for (const file of deterministicFiles) {
  const body = readFileSync(resolve(CAREER, '_runner', file), 'utf8');
  if (forbidden.test(body)) errors.push(`CAREER-DETERMINISM-001 ${file}`);
}

const submission = parsedWorkflows.find(({workflow_id}) => workflow_id === 'C09');
if (
  !submission ||
  submission.metadata.execution_scope !== 'local-evaluation' ||
  !/detener|stop|sin efecto externo/iu.test(submission.stop_rule)
) {
  errors.push('CAREER-SUBMISSION-001 C09 must prepare and stop without external effect');
}

const requirementRegistry = readYaml(
  '04_estado/registries/sources/career-requirements-registry.yml',
) as {
  source_id?: string;
  current_state?: string;
  projection_ref?: string;
  projection_sha256?: string;
  requirements?: Array<{requirement_id?: string; raw_sha256?: string}>;
  receipts?: string[];
  effects?: {network?: boolean; submission?: boolean; publication?: boolean};
};
const careerRequirements = requirementRegistry.requirements ?? [];
const requirementProjection = requirementRegistry.projection_ref
  ? (readYaml(requirementRegistry.projection_ref) as {
      documents?: Array<{requirement_id?: string; raw_sha256?: string}>;
    })
  : {};
const requirementKey = (value: {requirement_id?: string; raw_sha256?: string}): string =>
  `${value.requirement_id ?? ''}:${value.raw_sha256 ?? ''}`;
if (
  requirementRegistry.source_id !== 'SRC-CAREER-REQUIREMENTS-V1' ||
  requirementRegistry.current_state !== 'active' ||
  careerRequirements.length !== 5 ||
  careerRequirements.some(
    ({requirement_id, raw_sha256}) =>
      !/^REQ-CAREER-/u.test(requirement_id ?? '') || !/^[a-f0-9]{64}$/u.test(raw_sha256 ?? ''),
  ) ||
  !requirementRegistry.projection_ref ||
  !existsSync(resolve(ROOT, requirementRegistry.projection_ref)) ||
  sha256(requirementRegistry.projection_ref) !== requirementRegistry.projection_sha256
) {
  errors.push('CAREER-SOURCE-001 five requirements must resolve to the hash-bound projection');
}
if (
  requirementRegistry.effects?.network !== false ||
  requirementRegistry.effects.submission !== false ||
  requirementRegistry.effects.publication !== false
) {
  errors.push('CAREER-SOURCE-002 requirements authority cannot grant external effects');
}
if (
  (requirementProjection.documents ?? []).map(requirementKey).sort().join('|') !==
  careerRequirements.map(requirementKey).sort().join('|')
) {
  errors.push('CAREER-SOURCE-003 registry IDs and hashes must equal the projection');
}
const careerReceipts = (requirementRegistry.receipts ?? []).map((ref) => readYaml(ref)) as Array<{
  event_order?: number;
  actor_id?: string;
  verifier_id?: string;
  transition?: {from?: string | null; to?: string};
  projection_sha256?: string;
  publication_authority?: boolean;
  append_only?: boolean;
}>;
if (
  careerReceipts.length !== 4 ||
  careerReceipts.some(
    (receipt, index) =>
      receipt.event_order !== index + 1 ||
      `${String(receipt.transition?.from)}> ${receipt.transition?.to}`.replace('> ', '>') !==
        ['null>candidate', 'candidate>quarantined', 'quarantined>evaluated', 'evaluated>active'][
          index
        ] ||
      receipt.projection_sha256 !== requirementRegistry.projection_sha256 ||
      receipt.publication_authority !== false ||
      receipt.append_only !== true,
  ) ||
  careerReceipts[3]?.actor_id === careerReceipts[3]?.verifier_id
) {
  errors.push('CAREER-SOURCE-004 lifecycle incomplete or not independently activated');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS CAREER OS: ${parsedWorkflows.length}/${registry.definitions.length}; C09 STOP.`,
  );
}
