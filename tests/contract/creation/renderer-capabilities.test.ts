import {describe, expect, it} from 'vitest';

import {
  ExplicitFrameContextV1Schema,
  MotionAdapterSpecV1Schema,
  RendererCapabilityV1Schema,
  RendererCapabilityRegistryV1Schema,
} from '../../../core/contracts/index.ts';

const digest = 'a'.repeat(64);
const binding = (ref: string) => ({
  schemaVersion: 'hash-bound-ref-v1' as const,
  ref,
  sha256: digest,
});

const capability = (capabilityId: 'd3' | 'gsap' | 'three' | 'lottie' | 'remotion') => ({
  schemaVersion: 'renderer-capability-v1' as const,
  capabilityId,
  adapterId: `${capabilityId}-adapter-v1`,
  adapterVersion: '0.1.0',
  adapterRef: binding(`renderers/remotion/src/adapters/${capabilityId}-adapter.ts`),
  positiveFixtureRef: binding(`tests/fixtures/renderers/${capabilityId}-positive.json`),
  hostileFixtureRef: binding(`tests/fixtures/renderers/${capabilityId}-hostile.json`),
  dependencies: [
    {
      packageName: capabilityId === 'remotion' ? 'remotion' : capabilityId,
      version: '1.0.0',
      lockIntegrity: `sha512-${'A'.repeat(86)}==`,
      licenseId: 'MIT',
      licenseVerdict: 'verified_osi' as const,
      licenseRef: binding('receipts/dependency-audits/license.yml'),
    },
  ],
  inputKinds: ['validated_spec'],
  outputKinds: ['semantic_snapshot'],
  supportedEvidenceModes: ['conceptual' as const],
  determinism: {
    explicitFrameRequired: capabilityId !== 'd3',
    networkAllowed: false as const,
    wallClockAllowed: false as const,
    implicitRandomnessAllowed: false as const,
    canonicalOrderingRequired: true as const,
    freshProcessVerified: true,
    concurrentRepeatVerified: true,
  },
  fallback: {
    fallbackId: `${capabilityId}-fallback-v1`,
    outputKind: 'svg_2d' as const,
    observable: true as const,
    preservesCapabilityVerdict: false as const,
    triggerCodes: ['RENDERER_UNAVAILABLE'],
  },
  limitations: ['Local fixture verification is not production authorization.'],
  availability: 'verified_local_internal_preview' as const,
  productionEligibility: 'eligible' as const,
  readinessEligible: false as const,
  distributionState: 'NOT_DESIGNED' as const,
  publicationAuthority: false as const,
});

const specs = [
  {
    schemaVersion: 'motion-adapter-spec-v1',
    adapterId: 'd3-adapter-v1',
    adapterVersion: '0.1.0',
    capabilityId: 'd3',
    clockMode: 'not_applicable',
    fallbackObservable: true,
    publicationAuthority: false,
    allowedModules: ['d3-array', 'd3-scale', 'd3-shape', 'd3-hierarchy', 'd3-interpolate'],
    domMutationAllowed: false,
    numericPrecisionDigits: 3,
    quantitativeMetadataRequired: true,
    textualEquivalenceRequired: true,
  },
  {
    schemaVersion: 'motion-adapter-spec-v1',
    adapterId: 'gsap-adapter-v1',
    adapterVersion: '0.1.0',
    capabilityId: 'gsap',
    clockMode: 'explicit_frame',
    fallbackObservable: true,
    publicationAuthority: false,
    paused: true,
    seekFormula: 'frame/fps',
    tickerMode: 'sleep',
    plugins: [],
    cleanupRequired: true,
  },
  {
    schemaVersion: 'motion-adapter-spec-v1',
    adapterId: 'three-adapter-v1',
    adapterVersion: '0.1.0',
    capabilityId: 'three',
    clockMode: 'explicit_frame',
    fallbackObservable: true,
    publicationAuthority: false,
    cameraFixed: true,
    lightsFixed: true,
    seedFixed: true,
    useFrameAllowed: false,
    graphicsBackend: 'angle',
  },
  {
    schemaVersion: 'motion-adapter-spec-v1',
    adapterId: 'lottie-adapter-v1',
    adapterVersion: '0.1.0',
    capabilityId: 'lottie',
    clockMode: 'explicit_frame',
    fallbackObservable: true,
    publicationAuthority: false,
    localJsonOnly: true,
    expressionsAllowed: false,
    autoplay: false,
    loop: false,
    posterFrameRequired: true,
  },
  {
    schemaVersion: 'motion-adapter-spec-v1',
    adapterId: 'remotion-adapter-v1',
    adapterVersion: '0.1.0',
    capabilityId: 'remotion',
    clockMode: 'explicit_frame',
    fallbackObservable: true,
    publicationAuthority: false,
    frameSource: 'useCurrentFrame',
    networkGuardRequired: true,
    runtimeScope: 'local_evaluation_only',
  },
] as const;

describe('renderer capability V1 contracts', () => {
  it('validates explicit frames and rejects the duration boundary', () => {
    expect(
      ExplicitFrameContextV1Schema.parse({
        schemaVersion: 'explicit-frame-context-v1',
        frame: 29,
        fps: 30,
        durationInFrames: 30,
      }).frame,
    ).toBe(29);
    expect(() =>
      ExplicitFrameContextV1Schema.parse({
        schemaVersion: 'explicit-frame-context-v1',
        frame: 30,
        fps: 30,
        durationInFrames: 30,
      }),
    ).toThrow(/lower than duration/u);
  });

  it('accepts the five discriminated adapter specs', () => {
    expect(specs.map((spec) => MotionAdapterSpecV1Schema.parse(spec).capabilityId)).toEqual([
      'd3',
      'gsap',
      'three',
      'lottie',
      'remotion',
    ]);
  });

  it('requires exactly one entry and spec for every H-03 capability', () => {
    const registry = RendererCapabilityRegistryV1Schema.parse({
      schemaVersion: 'renderer-capability-registry-v1',
      registryId: 'renderer-registry-h03-v1',
      state: 'H03_EVALUATION_ONLY',
      capabilities: ['d3', 'gsap', 'three', 'lottie', 'remotion'].map((id) =>
        capability(id as Parameters<typeof capability>[0]),
      ),
      adapterSpecs: specs,
      supportingRefs: [
        'adapter-runtime.ts',
        'probe-components.tsx',
        'probe-entry.tsx',
        'render-smoke.yml',
        'render-replay.ts',
      ].map((ref) => binding(ref)),
      registrySha256: digest,
      productionState: 'BLOCKED_LICENSE',
      distributionState: 'NOT_DESIGNED',
      publicationAuthority: false,
    });
    expect(registry.capabilities).toHaveLength(5);
  });

  it('blocks production eligibility when any dependency is evaluation-only', () => {
    const base = capability('remotion');
    expect(() =>
      RendererCapabilityV1Schema.parse({
        ...base,
        dependencies: [{...base.dependencies[0], licenseVerdict: 'evaluation_only'}],
      }),
    ).toThrow(/license gap/u);
  });
});
