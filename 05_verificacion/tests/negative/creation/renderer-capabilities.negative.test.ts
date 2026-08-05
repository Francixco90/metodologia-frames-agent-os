import {describe, expect, it} from 'vitest';

import {
  MotionAdapterSpecV1Schema,
  RendererCapabilityV1Schema,
} from '../../../../core/contracts/index.ts';

describe('renderer capability hostile contracts', () => {
  it('rejects unknown fields and non-exact versions', () => {
    expect(() =>
      MotionAdapterSpecV1Schema.parse({
        schemaVersion: 'motion-adapter-spec-v1',
        adapterId: 'gsap-adapter-v1',
        adapterVersion: '^0.1.0',
        capabilityId: 'gsap',
        clockMode: 'explicit_frame',
        fallbackObservable: true,
        publicationAuthority: false,
        paused: true,
        seekFormula: 'frame/fps',
        tickerMode: 'sleep',
        plugins: [],
        cleanupRequired: true,
      }),
    ).toThrow(/semantic version/u);
    expect(() =>
      MotionAdapterSpecV1Schema.parse({
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
        remoteUrl: 'https://example.invalid/file.json',
      }),
    ).toThrow();
  });

  it('rejects publication authority and a fallback that hides substitution', () => {
    const ref = {schemaVersion: 'hash-bound-ref-v1', ref: 'fixture.json', sha256: 'a'.repeat(64)};
    const candidate = {
      schemaVersion: 'renderer-capability-v1',
      capabilityId: 'd3',
      adapterId: 'd3-adapter-v1',
      adapterVersion: '0.1.0',
      adapterRef: ref,
      positiveFixtureRef: ref,
      hostileFixtureRef: ref,
      dependencies: [
        {
          packageName: 'd3-array',
          version: '3.2.4',
          lockIntegrity: `sha512-${'A'.repeat(86)}==`,
          licenseId: 'ISC',
          licenseVerdict: 'verified_osi',
          licenseRef: ref,
        },
      ],
      inputKinds: ['categorical_matrix'],
      outputKinds: ['svg_geometry_json'],
      supportedEvidenceModes: ['categorical'],
      determinism: {
        explicitFrameRequired: false,
        networkAllowed: false,
        wallClockAllowed: false,
        implicitRandomnessAllowed: false,
        canonicalOrderingRequired: true,
        freshProcessVerified: true,
        concurrentRepeatVerified: true,
      },
      fallback: {
        fallbackId: 'd3-table-v1',
        outputKind: 'semantic_table',
        observable: true,
        preservesCapabilityVerdict: true,
        triggerCodes: ['RENDERER_UNAVAILABLE'],
      },
      limitations: ['Local only.'],
      availability: 'installed',
      productionEligibility: 'eligible',
      readinessEligible: false,
      distributionState: 'NOT_DESIGNED',
      publicationAuthority: true,
    };
    expect(() => RendererCapabilityV1Schema.parse(candidate)).toThrow();
  });
});
