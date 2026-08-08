import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {
  DeliverableDefinitionRegistryV1Schema,
  type DeliverableDefinitionV1,
} from '../_schema/deliverable-v1.schema.ts';
import {DeliverableTemplateRegistryV1Schema} from '../_schema/workflow-step-v1.schema.ts';
import {
  MultimediaWorkflowSchema,
  type MultimediaWorkflow,
  type MultimediaWorkflowId,
} from '../_schema/workflow-v1.schema.ts';
import {createFramesDeliverableMarkdown} from './deliverable-model.ts';
import {renderFramesDeliverableHtml} from './deliverable-renderer.ts';
import {
  loadDeliverableTemplateProfiles,
  createDeliverableTemplateSections,
  unknownSentinelFor,
  type DeliverableTemplateProfilesV1,
} from './deliverable-template-profile.ts';

const BASE = '02_proceso/workflows/multimedia';
const ASSETS = `${BASE}/_assets`;
const INPUT_REFS = {
  definitions: `${ASSETS}/deliverable-definition-registry.yml`,
  profiles: `${ASSETS}/deliverable-template-profiles.yml`,
  templates: `${ASSETS}/deliverable-template-registry.yml`,
  html: `${ASSETS}/brief-document-template.html`,
  design: `${ASSETS}/metodologia-html-v7.yml`,
} as const;

export interface GeneratedDeliverableTemplate {
  deliverableId: string;
  workflowId: MultimediaWorkflowId;
  markdownPath: string;
  htmlPath: string;
  markdown: string;
  html: string;
}

export interface DeliverableTemplateCatalog {
  root: string;
  htmlTemplate: string;
  definitions: DeliverableDefinitionV1[];
  profiles: DeliverableTemplateProfilesV1;
  workflows: Map<MultimediaWorkflowId, {dir: string; ref: string; value: MultimediaWorkflow}>;
  sourcePins: Array<{
    source_id: string;
    ref: string;
    sha256: string;
    authority: 'verified';
    rights: 'cleared';
  }>;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const readPin = (root: string, source_id: string, ref: string) => ({
  source_id,
  ref,
  sha256: sha256(readFileSync(resolve(root, ref), 'utf8')),
  authority: 'verified' as const,
  rights: 'cleared' as const,
});

export const loadDeliverableTemplateCatalog = (root: string): DeliverableTemplateCatalog => {
  const definitionRaw = readFileSync(resolve(root, INPUT_REFS.definitions), 'utf8');
  const definitions = DeliverableDefinitionRegistryV1Schema.parse(parse(definitionRaw)).definitions;
  const templateRaw = readFileSync(resolve(root, INPUT_REFS.templates), 'utf8');
  const templates = DeliverableTemplateRegistryV1Schema.parse(parse(templateRaw)).templates;
  const multimediaDir = resolve(root, BASE);
  const workflows = new Map<
    MultimediaWorkflowId,
    {dir: string; ref: string; value: MultimediaWorkflow}
  >();
  for (const entry of readdirSync(multimediaDir, {withFileTypes: true})) {
    if (!entry.isDirectory() || !/^p[0-9]{2}-/u.test(entry.name)) continue;
    const ref = `${BASE}/${entry.name}/workflow.yml`;
    const value = MultimediaWorkflowSchema.parse(parse(readFileSync(resolve(root, ref), 'utf8')));
    if (workflows.has(value.workflow_id))
      throw new Error(`Duplicate workflow: ${value.workflow_id}`);
    workflows.set(value.workflow_id, {dir: entry.name, ref, value});
  }
  for (const definition of definitions) {
    const workflow = workflows.get(definition.workflow_id)?.value;
    const output = workflow?.outputs.find(
      ({deliverable_id}) => deliverable_id === definition.deliverable_id,
    );
    if (!output || output.template_id !== definition.template_id) {
      throw new Error(`Unresolved workflow output: ${definition.deliverable_id}`);
    }
    if (!templates.some(({template_id}) => template_id === definition.template_id)) {
      throw new Error(`Unresolved template: ${definition.template_id}`);
    }
  }
  return {
    root,
    htmlTemplate: readFileSync(resolve(root, INPUT_REFS.html), 'utf8'),
    definitions,
    profiles: loadDeliverableTemplateProfiles(root),
    workflows,
    sourcePins: [
      readPin(root, 'generator-definitions', INPUT_REFS.definitions),
      readPin(root, 'generator-profiles', INPUT_REFS.profiles),
      readPin(root, 'generator-template-registry', INPUT_REFS.templates),
      readPin(root, 'generator-html-shell', INPUT_REFS.html),
      readPin(root, 'generator-design-profile', INPUT_REFS.design),
    ],
  };
};

export const generateDeliverableTemplate = (
  catalog: DeliverableTemplateCatalog,
  definition: DeliverableDefinitionV1,
): GeneratedDeliverableTemplate => {
  const binding = catalog.workflows.get(definition.workflow_id);
  if (!binding) throw new Error(`Missing workflow: ${definition.workflow_id}`);
  const producingSteps = binding.value.execution_steps.filter(({outputs}) =>
    outputs.includes(definition.deliverable_id),
  );
  const sources = [
    ...catalog.sourcePins,
    readPin(
      catalog.root,
      `generator-workflow-${definition.workflow_id.toLowerCase()}`,
      binding.ref,
    ),
  ];
  const skills = [
    ...new Set(
      producingSteps.flatMap(({primary_skill, optional_skills}) => [
        primary_skill,
        ...optional_skills,
      ]),
    ),
  ];
  const markdown = createFramesDeliverableMarkdown(
    {
      schema_version: 'frames-deliverable-v1',
      instance_id: `DELIV-${definition.workflow_id}-${definition.deliverable_id.replace(/-v[0-9]+$/u, '').toUpperCase()}`,
      deliverable_id: definition.deliverable_id,
      display_name: `${definition.display_name} · Template`,
      workflow_id: definition.workflow_id,
      deliverable_class: definition.deliverable_class,
      touchpoint: definition.touchpoint,
      identity: {brand: 'MetodologIA', owner: binding.value.discipline},
      audience: definition.audience,
      purpose: definition.purpose,
      sources,
      formats: definition.formats,
      piece_families: definition.piece_families,
      companion_for: null,
      skills,
      fields: definition.required_fields.map((field) => ({
        field_id: field,
        label: field,
        value_type: 'text',
        status: 'unknown',
        value: unknownSentinelFor(catalog.profiles.unknown_sentinel, field),
        source_refs: [],
      })),
      state: 'DRAFT',
      next_gate: definition.acceptance_gate,
    },
    createDeliverableTemplateSections(definition, binding.value, catalog.profiles),
  );
  const prefix = `${BASE}/${binding.dir}/templates/${definition.deliverable_id}.template`;
  return {
    deliverableId: definition.deliverable_id,
    workflowId: definition.workflow_id,
    markdownPath: `${prefix}.md`,
    htmlPath: `${prefix}.html`,
    markdown,
    html: renderFramesDeliverableHtml(markdown, catalog.htmlTemplate),
  };
};

export const generateDeliverableTemplates = (
  root: string,
  selectedIds?: ReadonlySet<string>,
): GeneratedDeliverableTemplate[] => {
  const catalog = loadDeliverableTemplateCatalog(root);
  const selected = catalog.definitions
    .filter(({deliverable_id}) => !selectedIds || selectedIds.has(deliverable_id))
    .sort(
      (left, right) =>
        left.workflow_id.localeCompare(right.workflow_id) ||
        left.deliverable_id.localeCompare(right.deliverable_id),
    );
  if (selectedIds && selected.length !== selectedIds.size) {
    const known = new Set(selected.map(({deliverable_id}) => deliverable_id));
    const missing = [...selectedIds].filter((id) => !known.has(id));
    throw new Error(`Unknown deliverable ids: ${missing.join(', ')}`);
  }
  return selected.map((definition) => generateDeliverableTemplate(catalog, definition));
};
