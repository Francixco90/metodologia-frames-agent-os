import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {
  DeliverableDefinitionRegistryV1Schema,
  FRAMES_DELIVERABLE_SECTIONS,
  type DeliverableDefinitionV1,
} from '../_schema/deliverable-v1.schema.ts';
import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
import {
  createFramesDeliverableMarkdown,
  parseFramesDeliverableMarkdown,
} from './deliverable-model.ts';
import {renderFramesDeliverableHtml} from './deliverable-renderer.ts';

export const loadDeliverableDefinitions = (root: string): Map<string, DeliverableDefinitionV1> => {
  const path = resolve(
    root,
    '02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml',
  );
  const registry = DeliverableDefinitionRegistryV1Schema.parse(parse(readFileSync(path, 'utf8')));
  return new Map(registry.definitions.map((item) => [item.deliverable_id, item]));
};

const sectionText = (
  definition: DeliverableDefinitionV1,
  workflow: MultimediaWorkflow,
): Record<(typeof FRAMES_DELIVERABLE_SECTIONS)[number], string> => ({
  'Resultado y decisión': `${definition.purpose} Estado: RENDERED_DRAFT; no concede aprobación.`,
  'Audiencia y uso': `${definition.audience} Uso previsto: ${definition.consumers.join(', ')}.`,
  'Entradas, evidencia y supuestos': 'Completar desde fuentes hash-bound; UNKNOWN bloquea el gate.',
  'Contenido estructurado': definition.required_fields
    .map((field) => `- ${field}: pendiente`)
    .join('\n'),
  'Componentes, activos y prompts': `Familias: ${definition.piece_families.join(', ') || 'no aplica'}.`,
  'Secuencia, hitos y dependencias': workflow.execution_steps
    .filter(({outputs}) => outputs.includes(definition.deliverable_id))
    .map(({step_id, purpose}) => `- ${step_id}: ${purpose}`)
    .join('\n'),
  'Skills, ownership y handoffs': `Owner: ${workflow.discipline}. Skills: ${workflow.capability_map.skills.join(', ')}.`,
  'Riesgos, límites y casos borde':
    'Sin fuentes o campos completos, conservar DRAFT/BLOCKED; no publicar.',
  'Criterios de aceptación y QA': `Campos: ${definition.required_fields.join(', ')}. Gate: ${definition.acceptance_gate}.`,
  'Estado, lineage y siguiente gate': `${workflow.workflow_id} → ${definition.consumers.join(', ')}; siguiente gate ${definition.acceptance_gate}.`,
});

export const createDeliverableMaterial = (
  definition: DeliverableDefinitionV1,
  workflow: MultimediaWorkflow,
  displayName: string,
): {markdown: string; html: string; contentSha256: string} => {
  const draft = {
    schema_version: 'frames-deliverable-v1' as const,
    instance_id: `DELIV-${workflow.workflow_id}-${definition.deliverable_id.replace(/-v[0-9]+$/u, '').toUpperCase()}`,
    deliverable_id: definition.deliverable_id,
    display_name: displayName,
    workflow_id: workflow.workflow_id,
    deliverable_class: definition.deliverable_class,
    touchpoint: definition.touchpoint,
    identity: {brand: 'MetodologIA' as const, owner: workflow.discipline},
    audience: definition.audience,
    purpose: definition.purpose,
    sources: [],
    formats: definition.formats,
    piece_families: definition.piece_families,
    companion_for: null,
    skills: workflow.capability_map.skills,
    fields: definition.required_fields.map((field) => ({
      field_id: field,
      label: field,
      value_type: 'text' as const,
      status: 'unknown' as const,
      value: 'Pendiente de producción gobernada.',
      source_refs: [],
    })),
    state: 'DRAFT' as const,
    next_gate: definition.acceptance_gate,
  };
  const copy = sectionText(definition, workflow);
  const markdown = createFramesDeliverableMarkdown(
    draft,
    FRAMES_DELIVERABLE_SECTIONS.map((id) => ({id, markdown: copy[id]})),
  );
  return {
    markdown,
    html: renderFramesDeliverableHtml(markdown),
    contentSha256: parseFramesDeliverableMarkdown(markdown).frontmatter.content_sha256,
  };
};
