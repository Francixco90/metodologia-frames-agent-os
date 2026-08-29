import {readFile, realpath} from 'node:fs/promises';
import {glob} from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'yaml';
import type {WorkflowDocumentationV1, WorkflowStepDocumentationV1} from './contracts.ts';
export {buildSequenceModel} from './sequence-model.ts';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeOutputs = (source: UnknownRecord): string[] => {
  const direct = asStrings(source.deliverables);
  if (direct.length > 0) return direct;
  if (Array.isArray(source.outputs)) {
    const outputs = source.outputs
      .map(asRecord)
      .map((item) => asString(item.deliverable_id || item.artifact))
      .filter(Boolean);
    if (outputs.length > 0) return outputs;
  }
  return [
    ...new Set(
      (Array.isArray(source.execution_steps) ? source.execution_steps : []).flatMap((step) =>
        asStrings(asRecord(step).outputs),
      ),
    ),
  ];
};

const normalizeTemplateRefs = (source: UnknownRecord): string[] =>
  [source.template_ref, source.task_template_ref, source.prompt_spec_ref].filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );

const normalizeStep = (value: unknown): WorkflowStepDocumentationV1 => {
  const step = asRecord(value);
  const recorder = asString(step.recorder);
  const decisionActor = asString(step.decision_actor);
  return {
    id: asString(step.step_id, 'STEP'),
    purpose: asString(step.purpose, 'Ejecutar el paso declarado.'),
    inputs: asStrings(step.inputs),
    primarySkill: asString(step.primary_skill, 'unassigned'),
    optionalSkills: asStrings(step.optional_skills),
    verifier: asString(step.verifier, 'unassigned'),
    ...(recorder ? {recorder} : {}),
    ...(decisionActor ? {decisionActor} : {}),
    outputs: asStrings(step.outputs),
    templateId: asString(step.template_id),
    gate: asString(step.gate, 'UNKNOWN'),
    stopRule: asString(step.stop_rule, 'Detener ante evidencia insuficiente.'),
  };
};

export const loadWorkflowDocumentation = async (
  repoRoot: string,
): Promise<WorkflowDocumentationV1[]> => {
  const repoReal = await realpath(repoRoot);
  const files: string[] = [];
  for await (const relativeSource of glob('02_proceso/workflows/*/*/workflow.yml', {
    cwd: repoRoot,
  })) {
    files.push(relativeSource);
  }
  const workflows = await Promise.all(
    files.sort().map(async (relativeSource) => {
      const absoluteSource = await realpath(path.join(repoRoot, relativeSource));
      if (!absoluteSource.startsWith(`${repoReal}${path.sep}`))
        throw new Error(`Source escape: ${relativeSource}`);
      const source = asRecord(parse(await readFile(absoluteSource, 'utf8')));
      const id = asString(source.workflow_id);
      if (!/^[PCLMS]\d{2}$/u.test(id)) throw new Error(`Invalid workflow id in ${relativeSource}`);
      const family = id.startsWith('P')
        ? 'content'
        : id.startsWith('C')
          ? 'career'
          : id.startsWith('L')
            ? 'local-extension'
            : id.startsWith('M')
              ? 'maintenance'
              : 'skill-system';
      const directGate = asString(source.gate);
      const stepGates = [
        ...new Set(
          (Array.isArray(source.execution_steps) ? source.execution_steps : [])
            .map((step) => asString(asRecord(step).gate))
            .filter(Boolean),
        ),
      ];
      return {
        schemaVersion: 'workflow-documentation-v1',
        id,
        family,
        title: asString(source.title, id),
        purpose: asString(source.purpose, 'Propósito no declarado.'),
        command: asString(source.command, 'No disponible'),
        source: relativeSource,
        inputs: asStrings(source.inputs),
        deliverables: normalizeOutputs(source),
        templateRefs: normalizeTemplateRefs(source),
        preconditions: asStrings(source.preconditions),
        gates: asStrings(source.gates).length
          ? asStrings(source.gates)
          : directGate
            ? [directGate]
            : stepGates,
        nextWorkflow: asString(source.next_workflow) || null,
        stopRule: asString(
          source.stop_rule || source.fallback,
          'Detener ante evidencia insuficiente.',
        ),
        steps: Array.isArray(source.execution_steps)
          ? source.execution_steps.map(normalizeStep)
          : [
              {
                id: 'S01',
                purpose: asString(source.purpose, 'Ejecutar el workflow atómico.'),
                inputs: asStrings(source.inputs),
                primarySkill: 'Frames',
                optionalSkills: [],
                verifier: 'RT-09',
                outputs: normalizeOutputs(source),
                templateId: '',
                gate: directGate || 'UNKNOWN',
                stopRule: asString(source.stop_rule, 'Detener ante evidencia insuficiente.'),
              },
            ],
      } satisfies WorkflowDocumentationV1;
    }),
  );
  return workflows.sort((left, right) => left.id.localeCompare(right.id));
};
