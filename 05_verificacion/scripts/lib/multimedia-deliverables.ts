import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';

import {
  DeliverableDefinitionRegistryV1Schema,
  type DeliverableDefinitionV1,
} from '../../../02_proceso/workflows/multimedia/_schema/deliverable-v1.schema.ts';
import type {MultimediaWorkflow} from '../../../02_proceso/workflows/multimedia/_schema/workflow-v1.schema.ts';

export type TemplateRegistryEntry = {
  template_id?: string;
  markdown_template_ref?: string;
  html_template_ref?: string;
  data_schema_ref?: string;
  design_profile?: string;
  acceptance_gate?: string;
};

export const validateTemplateAcceptanceGates = (
  workflow: MultimediaWorkflow,
  registry: ReadonlyMap<string, TemplateRegistryEntry>,
): string[] => {
  const finalStep = workflow.execution_steps.at(-1);
  if (!finalStep) return [`MW-CAP-07 ${workflow.workflow_id}: missing final execution step`];
  const issues: string[] = [];
  if (!workflow.gates.includes(finalStep.gate)) {
    issues.push(
      `MW-CAP-07 ${workflow.workflow_id}: final step gate is not declared by workflow: ${finalStep.gate}`,
    );
  }
  const templateIds = new Set([
    ...workflow.outputs.map(({template_id}) => template_id),
    ...workflow.execution_steps.map(({template_id}) => template_id),
  ]);
  for (const templateId of templateIds) {
    const gate = registry.get(templateId)?.acceptance_gate;
    if (gate && gate !== finalStep.gate) {
      issues.push(
        `MW-CAP-07 ${workflow.workflow_id}: template ${templateId} accepts at ${gate}, expected final gate ${finalStep.gate}`,
      );
    }
  }
  return issues;
};

export const loadDeliverableDefinitions = (root: string): DeliverableDefinitionV1[] =>
  DeliverableDefinitionRegistryV1Schema.parse(
    parse(
      readFileSync(
        join(root, '02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml'),
        'utf8',
      ),
    ),
  ).definitions;

const sameSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length &&
  [...left].sort().every((value, index) => value === [...right].sort()[index]);

export const validateWorkflowDeliverables = (
  root: string,
  workflow: MultimediaWorkflow,
  definitions: ReadonlyMap<string, DeliverableDefinitionV1>,
): string[] => {
  const issues: string[] = [];
  const outputIds = workflow.outputs.map(({deliverable_id}) => deliverable_id);
  if (!sameSet(outputIds, workflow.brief.deliverables)) {
    issues.push(`${workflow.workflow_id}: outputs differ from brief.deliverables`);
  }
  if (!sameSet(outputIds, workflow.capability_map.assets)) {
    issues.push(`${workflow.workflow_id}: outputs differ from capability_map.assets`);
  }

  for (const output of workflow.outputs) {
    const definition = definitions.get(output.deliverable_id);
    if (!definition) {
      issues.push(`${workflow.workflow_id}: undefined deliverable ${output.deliverable_id}`);
      continue;
    }
    if (definition.workflow_id !== workflow.workflow_id) {
      issues.push(`${workflow.workflow_id}: wrong owner stage for ${output.deliverable_id}`);
    }
    if (definition.display_name !== output.artifact) {
      issues.push(`${workflow.workflow_id}: display drift for ${output.deliverable_id}`);
    }
    if (definition.template_id !== output.template_id) {
      issues.push(`${workflow.workflow_id}: template drift for ${output.deliverable_id}`);
    }
    if (definition.acceptance_gate !== workflow.execution_steps.at(-1)?.gate) {
      issues.push(`${workflow.workflow_id}: acceptance gate drift for ${output.deliverable_id}`);
    }
    const expectedSchema = `02_proceso/workflows/multimedia/_schema/artifacts/${output.deliverable_id}.schema.ts`;
    if (output.schema_ref !== expectedSchema || !existsSync(join(root, expectedSchema))) {
      issues.push(`${workflow.workflow_id}: schema unresolved for ${output.deliverable_id}`);
    }
    if (!output.required && !output.condition) {
      issues.push(
        `${workflow.workflow_id}: optional output lacks condition ${output.deliverable_id}`,
      );
    }
  }

  for (const step of workflow.execution_steps) {
    for (const deliverableId of step.outputs) {
      if (!outputIds.includes(deliverableId)) {
        issues.push(`${workflow.workflow_id}/${step.step_id}: undeclared output ${deliverableId}`);
      }
    }
  }
  return issues;
};

export const validateCatalogCoverage = (
  workflows: readonly MultimediaWorkflow[],
  definitions: readonly DeliverableDefinitionV1[],
): string[] => {
  const declared = workflows.flatMap(({outputs}) =>
    outputs.map(({deliverable_id}) => deliverable_id),
  );
  const expected = definitions.map(({deliverable_id}) => deliverable_id);
  return sameSet(declared, expected) ? [] : ['catalog: definitions and workflow outputs differ'];
};
