import {z} from 'zod';

import {HashBoundReferenceV1Schema} from './content-v2.ts';
import {PortableIdSchema, Sha256Schema} from './primitives.ts';
import {containsProhibitedReasoningText} from './reasoning-safety.ts';

const ExactVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/u, 'Expected an exact semantic version');
const NpmIntegritySchema = z
  .string()
  .regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/u, 'Expected an npm SHA-512 integrity');
const ShortTextSchema = z.string().trim().min(1).max(320);

export const RendererCapabilityIdV1Schema = z.enum(['d3', 'gsap', 'three', 'lottie', 'remotion']);

export const RendererDependencyV1Schema = z.strictObject({
  packageName: z.string().regex(/^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/u),
  version: ExactVersionSchema,
  lockIntegrity: NpmIntegritySchema,
  licenseId: z.string().trim().min(2).max(80),
  licenseVerdict: z.enum([
    'verified_osi',
    'verified_custom_restricted',
    'evaluation_only',
    'coverage_gap',
  ]),
  licenseRef: HashBoundReferenceV1Schema,
});

export type RendererDependencyV1 = z.infer<typeof RendererDependencyV1Schema>;

export const ExplicitFrameContextV1Schema = z
  .strictObject({
    schemaVersion: z.literal('explicit-frame-context-v1'),
    frame: z.number().int().min(0),
    fps: z.number().int().min(1).max(240),
    durationInFrames: z.number().int().min(1).max(1_000_000),
  })
  .superRefine(({durationInFrames, frame}, context) => {
    if (frame >= durationInFrames) {
      context.addIssue({
        code: 'custom',
        message: 'Frame must be lower than durationInFrames.',
        path: ['frame'],
      });
    }
  });

export type ExplicitFrameContextV1 = z.infer<typeof ExplicitFrameContextV1Schema>;

const FallbackV1Schema = z.strictObject({
  fallbackId: PortableIdSchema,
  outputKind: z.enum(['semantic_table', 'ordered_list', 'svg_2d', 'poster_frame', 'native_motion']),
  observable: z.literal(true),
  preservesCapabilityVerdict: z.literal(false),
  triggerCodes: z.array(PortableIdSchema).min(1).max(12),
});

const DeterminismPolicyV1Schema = z.strictObject({
  explicitFrameRequired: z.boolean(),
  networkAllowed: z.literal(false),
  wallClockAllowed: z.literal(false),
  implicitRandomnessAllowed: z.literal(false),
  canonicalOrderingRequired: z.literal(true),
  freshProcessVerified: z.boolean(),
  concurrentRepeatVerified: z.boolean(),
});

export const RendererCapabilityV1Schema = z
  .strictObject({
    schemaVersion: z.literal('renderer-capability-v1'),
    capabilityId: RendererCapabilityIdV1Schema,
    adapterId: PortableIdSchema,
    adapterVersion: ExactVersionSchema,
    adapterRef: HashBoundReferenceV1Schema,
    positiveFixtureRef: HashBoundReferenceV1Schema,
    hostileFixtureRef: HashBoundReferenceV1Schema,
    dependencies: z.array(RendererDependencyV1Schema).min(1).max(16),
    inputKinds: z.array(PortableIdSchema).min(1).max(16),
    outputKinds: z.array(PortableIdSchema).min(1).max(16),
    supportedEvidenceModes: z
      .array(z.enum(['conceptual', 'categorical', 'quantitative_claims']))
      .min(1)
      .max(3),
    determinism: DeterminismPolicyV1Schema,
    fallback: FallbackV1Schema,
    limitations: z.array(ShortTextSchema).min(1).max(16),
    availability: z.enum(['installed', 'verified_local_internal_preview', 'blocked']),
    productionEligibility: z.enum(['eligible', 'blocked_license', 'blocked_determinism']),
    readinessEligible: z.literal(false),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((capability, context) => {
    const dependencyNames = capability.dependencies.map(({packageName}) => packageName);
    if (new Set(dependencyNames).size !== dependencyNames.length) {
      context.addIssue({
        code: 'custom',
        message: 'Dependencies must be unique.',
        path: ['dependencies'],
      });
    }
    if (
      capability.productionEligibility === 'eligible' &&
      capability.dependencies.some(({licenseVerdict}) =>
        ['coverage_gap', 'evaluation_only'].includes(licenseVerdict),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A capability with a license gap cannot be production eligible.',
        path: ['productionEligibility'],
      });
    }
    if (containsProhibitedReasoningText(capability)) {
      context.addIssue({
        code: 'custom',
        message: 'Renderer contracts cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type RendererCapabilityV1 = z.infer<typeof RendererCapabilityV1Schema>;

const BaseAdapterSpecV1Schema = z.strictObject({
  schemaVersion: z.literal('motion-adapter-spec-v1'),
  adapterId: PortableIdSchema,
  adapterVersion: ExactVersionSchema,
  capabilityId: RendererCapabilityIdV1Schema,
  clockMode: z.enum(['not_applicable', 'explicit_frame']),
  fallbackObservable: z.literal(true),
  publicationAuthority: z.literal(false),
});

const D3AdapterSpecV1Schema = BaseAdapterSpecV1Schema.extend({
  capabilityId: z.literal('d3'),
  clockMode: z.literal('not_applicable'),
  allowedModules: z
    .array(z.enum(['d3-array', 'd3-scale', 'd3-shape', 'd3-hierarchy', 'd3-interpolate']))
    .length(5),
  domMutationAllowed: z.literal(false),
  numericPrecisionDigits: z.literal(3),
  quantitativeMetadataRequired: z.literal(true),
  textualEquivalenceRequired: z.literal(true),
});

const GsapAdapterSpecV1Schema = BaseAdapterSpecV1Schema.extend({
  capabilityId: z.literal('gsap'),
  clockMode: z.literal('explicit_frame'),
  paused: z.literal(true),
  seekFormula: z.literal('frame/fps'),
  tickerMode: z.literal('sleep'),
  plugins: z.tuple([]),
  cleanupRequired: z.literal(true),
});

const ThreeAdapterSpecV1Schema = BaseAdapterSpecV1Schema.extend({
  capabilityId: z.literal('three'),
  clockMode: z.literal('explicit_frame'),
  cameraFixed: z.literal(true),
  lightsFixed: z.literal(true),
  seedFixed: z.literal(true),
  useFrameAllowed: z.literal(false),
  graphicsBackend: z.literal('angle'),
});

const LottieAdapterSpecV1Schema = BaseAdapterSpecV1Schema.extend({
  capabilityId: z.literal('lottie'),
  clockMode: z.literal('explicit_frame'),
  localJsonOnly: z.literal(true),
  expressionsAllowed: z.literal(false),
  autoplay: z.literal(false),
  loop: z.literal(false),
  posterFrameRequired: z.literal(true),
});

const RemotionAdapterSpecV1Schema = BaseAdapterSpecV1Schema.extend({
  capabilityId: z.literal('remotion'),
  clockMode: z.literal('explicit_frame'),
  frameSource: z.literal('useCurrentFrame'),
  networkGuardRequired: z.literal(true),
  runtimeScope: z.literal('local_evaluation_only'),
});

export const MotionAdapterSpecV1Schema = z.discriminatedUnion('capabilityId', [
  D3AdapterSpecV1Schema,
  GsapAdapterSpecV1Schema,
  ThreeAdapterSpecV1Schema,
  LottieAdapterSpecV1Schema,
  RemotionAdapterSpecV1Schema,
]);

export type MotionAdapterSpecV1 = z.infer<typeof MotionAdapterSpecV1Schema>;

export const RendererCapabilityRegistryV1Schema = z
  .strictObject({
    schemaVersion: z.literal('renderer-capability-registry-v1'),
    registryId: PortableIdSchema,
    state: z.literal('H03_EVALUATION_ONLY'),
    capabilities: z.array(RendererCapabilityV1Schema).length(5),
    adapterSpecs: z.array(MotionAdapterSpecV1Schema).length(5),
    supportingRefs: z.array(HashBoundReferenceV1Schema).min(5).max(16),
    registrySha256: Sha256Schema,
    productionState: z.literal('BLOCKED_LICENSE'),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((registry, context) => {
    const expected = ['d3', 'gsap', 'lottie', 'remotion', 'three'];
    const capabilityIds = registry.capabilities.map(({capabilityId}) => capabilityId).sort();
    const specIds = registry.adapterSpecs.map(({capabilityId}) => capabilityId).sort();
    const supportPaths = registry.supportingRefs.map(({ref}) => ref);
    if (JSON.stringify(capabilityIds) !== JSON.stringify(expected)) {
      context.addIssue({code: 'custom', message: 'Registry must contain all five capabilities.'});
    }
    if (JSON.stringify(specIds) !== JSON.stringify(expected)) {
      context.addIssue({code: 'custom', message: 'Registry must contain all five adapter specs.'});
    }
    if (new Set(supportPaths).size !== supportPaths.length) {
      context.addIssue({code: 'custom', message: 'Supporting references must be unique.'});
    }
  });

export type RendererCapabilityRegistryV1 = z.infer<typeof RendererCapabilityRegistryV1Schema>;
