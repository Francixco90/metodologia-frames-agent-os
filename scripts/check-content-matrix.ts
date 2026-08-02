import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

const plannedImplementationSchema = z.strictObject({
  status: z.literal('planned'),
  plugin_ref: z.null(),
});

const carouselImplementationSchema = z.strictObject({
  status: z.literal('active_candidate'),
  plugin_ref: z.literal('workflows/content/types/carousel/plugin.ts'),
  manifest_ref: z.literal('workflows/content/types/carousel/manifest.yml'),
  schema_ref: z.literal('workflows/content/types/carousel/schema.ts'),
  renderer_ref: z.literal('renderers/static-social/scripts/render-carousel.ts'),
  build_command: z.literal('pnpm carousel:build'),
  verify_command: z.literal('pnpm verify:carousel'),
});

const carouselSchema = z.strictObject({
  workflow_id: z.literal('IG-CAROUSEL-V1'),
  content_type: z.literal('carousel'),
  lifecycle_state: z.literal('active_candidate'),
  implementation: carouselImplementationSchema,
  render_profile: z.literal('portrait_static'),
  content_contract: z.strictObject({
    slide_count_min: z.number().int(),
    slide_count_max: z.number().int(),
    pilot_slide_count: z.number().int(),
    per_slide_alt_text: z.literal('required'),
    claim_binding: z.literal('required'),
    source_binding: z.literal('required'),
  }),
  maximum_automatic_state: z.literal('RENDERED_DRAFT'),
  coverage_gaps: z.array(z.string()).min(1),
});

const plannedSchema = z.strictObject({
  workflow_id: z.string().regex(/^IG-[A-Z-]+-V1$/u),
  content_type: z.string().min(1),
  lifecycle_state: z.literal('planned'),
  implementation: plannedImplementationSchema,
  render_profile: z.enum(['portrait_static', 'vertical_motion', 'square_static']),
  maximum_automatic_state: z.literal('DRAFT'),
});

const matrixSchema = z.strictObject({
  schema_version: z.literal('instagram-workflow-matrix-v1'),
  matrix_id: z.literal('instagram-content-network-v2'),
  network_state: z.literal('active_candidate'),
  channel_profile_ref: z.literal('registries/channels/instagram-profile-v1.yml'),
  brand_profile_ref: z.literal('registries/brand/brand-profile-v2.yml'),
  voice_profile_ref: z.literal('registries/brand/voice-profile-v2.yml'),
  brand_adaptation_ref: z.literal('registries/brand/brand-adaptation-decision-v1.yml'),
  orchestrator_ref: z.literal('workflows/core/orchestrate-content-v2.ts'),
  content_contract_ref: z.literal('core/contracts/content-v2.ts'),
  shared_pipeline: z.array(z.string()),
  shared_gates: z.strictObject({
    source_gate: z.literal('G02'),
    contract_gate: z.literal('G08'),
    content_gate: z.literal('G09_CONTENT'),
    render_gate: z.literal('G12'),
    governance_gate: z.literal('G13'),
    guardian_gate: z.literal('G14'),
    human_gate: z.literal('G15'),
    readiness_gate: z.literal('G16'),
    publish_gate: z.literal('G17'),
  }),
  publication: z.strictObject({
    connector_mode: z.literal('disabled'),
    automatic_publication: z.literal('forbidden'),
    maximum_machine_state: z.literal('GUARDIAN_VERIFIED'),
  }),
  workflows: z.array(z.union([carouselSchema, plannedSchema])).length(8),
});

const expectedPipeline = [
  'intake',
  'source_grounding',
  'strategic_brief',
  'narrative_and_copy',
  'brand_adaptation',
  'production',
  'deterministic_validation',
  'independent_verification',
  'guardian',
  'human_gate',
] as const;

const expectedWorkflows = [
  {workflow_id: 'IG-CAROUSEL-V1', content_type: 'carousel'},
  {workflow_id: 'IG-FEED-TEXT-V1', content_type: 'feed-text'},
  {workflow_id: 'IG-FEED-PHOTO-V1', content_type: 'feed-photo'},
  {workflow_id: 'IG-INFOGRAPHIC-V1', content_type: 'infographic'},
  {workflow_id: 'IG-STORY-SEQUENCE-V1', content_type: 'story-sequence'},
  {workflow_id: 'IG-REEL-MOTION-V1', content_type: 'reel-motion'},
  {workflow_id: 'IG-MICROCOPY-V1', content_type: 'microcopy'},
  {workflow_id: 'IG-LIVE-KIT-V1', content_type: 'live-kit'},
] as const;

export const validateContentMatrixObject = (input: unknown): string[] => {
  const parsed = matrixSchema.safeParse(input);
  if (!parsed.success) return [`SOC001 invalid Instagram workflow matrix: ${parsed.error.message}`];
  const matrix = parsed.data;
  const errors: string[] = [];
  const ids = matrix.workflows.map(({workflow_id: workflowId}) => workflowId);
  const types = matrix.workflows.map(({content_type: contentType}) => contentType);
  if (new Set(ids).size !== 8 || new Set(types).size !== 8) {
    errors.push('SOC002 workflow ids and content types must be unique 8/8');
  }
  const workflowIdentityAndOrder = matrix.workflows.map(
    ({workflow_id: workflowId, content_type: contentType}) => ({
      workflow_id: workflowId,
      content_type: contentType,
    }),
  );
  if (JSON.stringify(workflowIdentityAndOrder) !== JSON.stringify(expectedWorkflows)) {
    errors.push('SOC007 exact workflow identity or order drift');
  }
  if (matrix.shared_pipeline.join(',') !== expectedPipeline.join(',')) {
    errors.push('SOC003 shared pipeline order drift');
  }
  const active = matrix.workflows.filter(
    ({lifecycle_state: lifecycleState}) => lifecycleState === 'active_candidate',
  );
  if (active.length !== 1 || active[0]?.content_type !== 'carousel') {
    errors.push('SOC004 carousel must be the only active_candidate workflow');
  }
  const plannedTypes = matrix.workflows
    .filter(({lifecycle_state: lifecycleState}) => lifecycleState === 'planned')
    .map(({content_type: contentType}) => contentType);
  if (
    plannedTypes.join(',') !==
    expectedWorkflows
      .slice(1)
      .map(({content_type: contentType}) => contentType)
      .join(',')
  ) {
    errors.push('SOC005 planned workflow set drift');
  }
  if (
    matrix.shared_gates.human_gate !== 'G15' ||
    matrix.shared_gates.readiness_gate !== 'G16' ||
    matrix.shared_gates.publish_gate !== 'G17' ||
    matrix.publication.automatic_publication !== 'forbidden'
  ) {
    errors.push('SOC006 human, readiness and publish gates must remain separate');
  }

  const carousel = matrix.workflows.find(
    ({content_type: contentType}) => contentType === 'carousel',
  );
  if (carousel === undefined || carousel.lifecycle_state !== 'active_candidate') {
    errors.push('CAR001 active carousel contract missing');
  } else {
    const contract = carousel.content_contract;
    if (
      contract.slide_count_min !== 3 ||
      contract.slide_count_max !== 10 ||
      contract.pilot_slide_count !== 8
    ) {
      errors.push('CAR002 carousel slide bounds must be 3..10 with an exact 8-card pilot');
    }
    if (
      carousel.render_profile !== 'portrait_static' ||
      carousel.maximum_automatic_state !== 'RENDERED_DRAFT'
    ) {
      errors.push('CAR003 carousel profile or maximum automatic state drift');
    }
    for (const requirement of [
      contract.per_slide_alt_text,
      contract.claim_binding,
      contract.source_binding,
    ]) {
      if (requirement !== 'required') {
        errors.push('CAR004 carousel must bind alt text, claims and sources');
        break;
      }
    }
  }
  return errors;
};

export const validateContentMatrix = (root = process.cwd()): string[] => {
  const matrixPath = resolve(root, 'registries/content-types/instagram-workflow-matrix.yml');
  try {
    return validateContentMatrixObject(parse(readFileSync(matrixPath, 'utf8')) as unknown);
  } catch (error) {
    return [`SOC001 matrix unreadable: ${String(error)}`];
  }
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateContentMatrix();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS SOCIAL/CAROUSEL V2: 8 workflows, carousel active_candidate and G15→G16→G17 preserved.',
    );
  }
}
