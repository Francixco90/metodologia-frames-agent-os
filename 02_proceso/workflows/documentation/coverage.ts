import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import type {
  DocumentationCoverageV1,
  SequenceModelV1,
  WorkflowDocumentationV1,
} from './contracts.ts';

const authorityFiles = [
  '01_intencion/program/dag.yml',
  '02_proceso/governance/router.yml',
  '02_proceso/governance/multimedia-quality-gate.yml',
  '05_verificacion/scripts/commands.yaml',
  '04_estado/registries/agents/agent-registry-v2.yml',
  '04_estado/registries/skills/skill-registry.yml',
  '04_estado/registries/skills/creation-v3-skill-registry.yml',
  '02_proceso/workflows/multimedia/_assets/deliverable-template-registry.yml',
  '02_proceso/workflows/career/_assets/deliverable-registry.yml',
] as const;

const exists = async (candidate: string): Promise<boolean> =>
  access(candidate)
    .then(() => true)
    .catch(() => false);

const tokenPattern = (token: string): RegExp =>
  new RegExp(
    `(^|[^A-Za-z0-9_-])${token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}([^A-Za-z0-9_-]|$)`,
    'mu',
  );

const loadAuthorityCorpus = async (repoRoot: string): Promise<string> =>
  (
    await Promise.all(
      authorityFiles.map((file) => readFile(path.join(repoRoot, file), 'utf8').catch(() => '')),
    )
  ).join('\n');

export const validateSequence = (
  workflow: WorkflowDocumentationV1,
  sequence: SequenceModelV1,
): string[] => {
  const issues: string[] = [];
  if (sequence.workflowId !== workflow.id) issues.push('sequence:workflow-id');
  const expectedMessages =
    2 +
    workflow.steps.reduce((total, step) => {
      const verifier = step.verifier === 'unassigned' ? null : step.verifier;
      const recorder = step.recorder ?? null;
      const decisionActor = step.decisionActor ?? verifier ?? 'Frames';
      let count = 2;
      let currentActor = step.primarySkill;
      if (verifier !== null) {
        count += 1;
        currentActor = verifier;
      }
      if (recorder !== null && recorder !== currentActor) {
        count += 1;
        currentActor = recorder;
      }
      if (decisionActor !== currentActor) count += 1;
      return total + count;
    }, 0);
  if (sequence.messages.length !== expectedMessages) issues.push('sequence:message-cardinality');
  if (sequence.accessibleSummary.length !== workflow.steps.length + 2)
    issues.push('sequence:summary-cardinality');
  for (const message of sequence.messages) {
    if (!sequence.actors.includes(message.from) || !sequence.actors.includes(message.to)) {
      issues.push(`sequence:unknown-actor:${message.from}:${message.to}`);
    }
  }
  return issues;
};

export const assessWorkflowCoverage = async (
  repoRoot: string,
  workflow: WorkflowDocumentationV1,
  allWorkflows: WorkflowDocumentationV1[],
  sequence: SequenceModelV1,
): Promise<DocumentationCoverageV1> => {
  const unresolved = validateSequence(workflow, sequence);
  const corpus = await loadAuthorityCorpus(repoRoot);
  if (!(await exists(path.join(repoRoot, workflow.source))))
    unresolved.push(`source:${workflow.source}`);
  if (workflow.nextWorkflow && !allWorkflows.some((item) => item.id === workflow.nextWorkflow)) {
    unresolved.push(`next-workflow:${workflow.nextWorkflow}`);
  }
  for (const templateRef of workflow.templateRefs ?? []) {
    const relativeToWorkflow = path.join(repoRoot, path.dirname(workflow.source), templateRef);
    const relativeToRoot = path.join(repoRoot, templateRef);
    if (
      path.isAbsolute(templateRef) ||
      (!(await exists(relativeToWorkflow)) && !(await exists(relativeToRoot)))
    ) {
      unresolved.push(`template-ref:${templateRef}`);
    }
  }
  for (const step of workflow.steps) {
    if (
      step.primarySkill !== 'Frames' &&
      !(await exists(path.join(repoRoot, '03_artefactos/skills', step.primarySkill, 'SKILL.md'))) &&
      !tokenPattern(step.primarySkill).test(corpus)
    ) {
      unresolved.push(`skill:${step.primarySkill}`);
    }
    if (step.verifier !== 'unassigned' && !tokenPattern(step.verifier).test(corpus)) {
      unresolved.push(`verifier:${step.verifier}`);
    }
    if (step.recorder !== undefined && !tokenPattern(step.recorder).test(corpus)) {
      unresolved.push(`recorder:${step.recorder}`);
    }
    if (step.decisionActor !== undefined && !tokenPattern(step.decisionActor).test(corpus)) {
      unresolved.push(`decision-actor:${step.decisionActor}`);
    }
    if (
      step.templateId &&
      !tokenPattern(step.templateId).test(corpus) &&
      (workflow.templateRefs?.length ?? 0) === 0
    ) {
      unresolved.push(`template:${step.templateId}`);
    }
    if (
      step.gate !== 'UNKNOWN' &&
      !workflow.gates.includes(step.gate) &&
      !tokenPattern(step.gate).test(corpus)
    )
      unresolved.push(`gate:${step.gate}`);
  }
  return {
    schemaVersion: 'documentation-coverage-v1',
    workflowId: workflow.id,
    source: workflow.source,
    markdown: `01_intencion/reference/workflows/${workflow.id.toLowerCase()}.md`,
    html: `03_artefactos/content/documentation/workflows/${workflow.id.toLowerCase()}.html`,
    hasSequence: unresolved.every((item) => !item.startsWith('sequence:')),
    referencesResolvable: unresolved.length === 0,
    unresolvedReferences: [...new Set(unresolved)].sort(),
  };
};
