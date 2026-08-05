import {z} from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const relativePathSchema = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith('/'));

export const registeredComponentSchema = z.strictObject({
  component_id: z.string().regex(/^[A-Za-z][A-Za-z0-9-]+$/u),
  version: z.string().regex(/^\d+\.\d+\.\d+$/u),
  category: z.enum([
    'caption',
    'chrome',
    'composition',
    'contract',
    'font-loader',
    'navigation',
    'qa',
    'runtime-policy',
    'scene',
    'status',
    'visual-system',
  ]),
  renderer: z.literal('remotion'),
  path: relativePathSchema,
  sha256: sha256Schema,
  role: z.string().min(1),
  runtime: z.literal('Remotion 4.0.494'),
  deterministic: z.literal(true),
  props: z.strictObject({
    required: z.array(z.string().min(1)),
    defaults: z.record(z.string(), z.unknown()),
  }),
  compatible_formats: z.tuple([z.literal('9:16')]),
  preview: z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('portable'),
      ref: relativePathSchema,
      sha256: sha256Schema,
    }),
    z.strictObject({
      status: z.literal('not_applicable'),
      reason: z.string().min(1),
    }),
  ]),
  restrictions: z.array(z.string().min(1)).min(1),
  rights: z.strictObject({
    holder: z.literal('MetodologIA'),
    basis: z.literal('locally_authored_first_party_code'),
    allowed_scope: z.literal('local_contract_testing_only'),
  }),
  accessibility: z.array(z.string().min(1)).min(1),
  tests: z.strictObject({
    required: z.literal(true),
    refs: z.array(relativePathSchema).min(1),
  }),
  risks: z.array(z.string().min(1)).min(1),
  state: z.literal('REGISTRY_DRAFT'),
});

export const componentRegistrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('COMPONENTS-VS001-001'),
  composition_id: z.literal('MethodologiaVertical'),
  state: z.literal('REGISTRY_DRAFT'),
  approval_receipt: z.null(),
  committee_decision_ref: relativePathSchema,
  creative_direction: z.strictObject({
    proposalId: z.literal('PROP-VS001-02-RT04'),
    title: z.literal('Cadena visible'),
    synthesisId: z.literal('SYNTHESIS-VS001-MOTION-01'),
    incorporatedElements: z.tuple([
      z.literal('three-question-breadcrumb'),
      z.literal('text-shape-pattern-reduced-motion-rights-first'),
      z.literal('zero-of-four-claims-hash-custody'),
      z.literal('persistent-signal-web-motion-fork'),
    ]),
  }),
  components: z.array(registeredComponentSchema).min(1),
  asset_manifest_sha256: sha256Schema,
  forbidden_runtime_behaviors: z.tuple([
    z.literal('network'),
    z.literal('clock'),
    z.literal('randomness'),
    z.literal('timers'),
    z.literal('css_animation'),
    z.literal('css_transition'),
    z.literal('remote_font'),
  ]),
});

export type ComponentRegistry = z.infer<typeof componentRegistrySchema>;
