import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

import {
  DeliverableClassV1Schema,
  FRAMES_DELIVERABLE_SECTIONS,
  type DeliverableDefinitionV1,
  type FramesDeliverableV1,
} from '../_schema/deliverable-v1.schema.ts';
import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';

const SectionProfileSchema = z.strictObject({
  id: z.enum(FRAMES_DELIVERABLE_SECTIONS),
  guidance: z.string().min(1).max(300),
});

const ClassProfileSchema = z.strictObject({
  deliverable_class: DeliverableClassV1Schema,
  focus: z.string().min(1).max(300),
  evidence_rule: z.string().min(1).max(300),
  risk_rule: z.string().min(1).max(300),
});

export const DeliverableTemplateProfilesV1Schema = z
  .strictObject({
    schema_version: z.literal('deliverable-template-profiles-v1'),
    unknown_sentinel: z.string().min(1).max(200),
    sections: z.array(SectionProfileSchema).length(FRAMES_DELIVERABLE_SECTIONS.length),
    class_profiles: z.array(ClassProfileSchema).length(12),
  })
  .superRefine(({sections, class_profiles}, context) => {
    sections.forEach(({id}, index) => {
      if (id !== FRAMES_DELIVERABLE_SECTIONS[index]) {
        context.addIssue({
          code: 'custom',
          path: ['sections', index],
          message: `Expected ${FRAMES_DELIVERABLE_SECTIONS[index]}`,
        });
      }
    });
    const classes = class_profiles.map((profile) => profile.deliverable_class);
    if (new Set(classes).size !== DeliverableClassV1Schema.options.length) {
      context.addIssue({
        code: 'custom',
        path: ['class_profiles'],
        message: 'Expected one profile per deliverable class',
      });
    }
  });

export type DeliverableTemplateProfilesV1 = z.infer<typeof DeliverableTemplateProfilesV1Schema>;
export type DeliverableClassProfileV1 = z.infer<typeof ClassProfileSchema>;

export const unknownSentinelFor = (pattern: string, fieldId: string): string =>
  pattern.replace('{field_id}', fieldId);

export const loadDeliverableTemplateProfiles = (root: string): DeliverableTemplateProfilesV1 => {
  const path = resolve(
    root,
    '02_proceso/workflows/multimedia/_assets/deliverable-template-profiles.yml',
  );
  return DeliverableTemplateProfilesV1Schema.parse(parse(readFileSync(path, 'utf8')));
};

export const resolveDeliverableClassProfile = (
  profiles: DeliverableTemplateProfilesV1,
  deliverableClass: z.infer<typeof DeliverableClassV1Schema>,
): DeliverableClassProfileV1 => {
  const profile = profiles.class_profiles.find(
    (candidate) => candidate.deliverable_class === deliverableClass,
  );
  if (!profile) throw new Error(`Missing deliverable class profile: ${deliverableClass}`);
  return profile;
};

export const createDeliverableTemplateSections = (
  definition: DeliverableDefinitionV1,
  workflow: MultimediaWorkflow,
  profiles: DeliverableTemplateProfilesV1,
): FramesDeliverableV1['sections'] => {
  const profile = resolveDeliverableClassProfile(profiles, definition.deliverable_class);
  const steps = workflow.execution_steps.filter(({outputs}) =>
    outputs.includes(definition.deliverable_id),
  );
  if (steps.length === 0) throw new Error(`No producing step for ${definition.deliverable_id}`);
  const content = [
    `${definition.purpose} Decisión pendiente en ${definition.acceptance_gate}; este DRAFT no concede aprobación.`,
    `${definition.audience} Consumidores: ${definition.consumers.join(', ')}. Foco: ${profile.focus}.`,
    `Inputs: ${steps.flatMap(({inputs}) => inputs).join(', ') || 'ninguno'}. ${profile.evidence_rule}`,
    definition.required_fields
      .map((field) => `- ${field}: ${unknownSentinelFor(profiles.unknown_sentinel, field)}`)
      .join('\n'),
    `Formatos: ${definition.formats.join(', ')}. Familias: ${definition.piece_families.join(', ') || 'other'}. Foco: ${profile.focus}.`,
    steps
      .map(({step_id, purpose, stop_rule}) => `- ${step_id}: ${purpose} Stop: ${stop_rule}`)
      .join('\n'),
    steps
      .map(
        ({step_id, primary_skill, optional_skills, verifier}) =>
          `- ${step_id}: owner ${primary_skill}; apoyos ${optional_skills.join(', ') || 'ninguno'}; verifier ${verifier ?? 'no asignado'}.`,
      )
      .join('\n'),
    `${profile.risk_rule} UNKNOWN conserva DRAFT/BLOCKED; sin publicación.`,
    `Campos: ${definition.required_fields.join(', ')}. Gate: ${definition.acceptance_gate}.`,
    `${workflow.workflow_id} → ${definition.consumers.join(', ')}. DRAFT; gate ${definition.acceptance_gate}.`,
  ];
  return FRAMES_DELIVERABLE_SECTIONS.map((id, index) => ({
    id,
    markdown: `${profiles.sections[index]?.guidance ?? ''}\n\n${content[index] ?? ''}`,
  }));
};
