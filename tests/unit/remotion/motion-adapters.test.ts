import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

import {
  assertMotionAdapterLicense,
  createExplicitFrameContext,
  MotionAdapterError,
} from '../../../renderers/remotion/src/adapters/adapter-runtime.ts';
import {
  createGsapFrameSampler,
  sampleGsapFrame,
} from '../../../renderers/remotion/src/adapters/gsap-adapter.ts';
import {
  H03_LOTTIE_PROBE_DATA,
  materializeLottieRenderData,
  resolveLottieFrame,
  validateLocalLottieDocument,
} from '../../../renderers/remotion/src/adapters/lottie-adapter.ts';
import {resolveRemotionFrameSample} from '../../../renderers/remotion/src/adapters/remotion-adapter.ts';
import {
  resolveThreeScenePlan,
  type ThreeSceneSpecV1,
} from '../../../renderers/remotion/src/adapters/three-adapter.ts';

const frame = (value: number, durationInFrames = 31) =>
  createExplicitFrameContext({frame: value, fps: 30, durationInFrames});

interface HostileCase {
  readonly case_id: string;
  readonly expected_error: string;
}

const hostileFixture = YAML.parse(
  readFileSync(resolve('tests/fixtures/renderers/h03-hostile-motion-adapters.yml'), 'utf8'),
) as {readonly cases: readonly HostileCase[]};

const threeScene: ThreeSceneSpecV1 = {
  sceneId: 'h03-test-scene',
  width: 180,
  height: 180,
  seed: 'h03-fixed-seed',
  camera: {position: [3, 2, 4], fov: 35},
  ambientLightIntensity: 1,
  directionalLight: {position: [4, 5, 3], intensity: 2},
  object: {
    geometry: 'box',
    color: '#DDA82A',
    baseRotation: [0, 0.25, 0],
    turnsPerComposition: 0.5,
  },
};

describe('H-03 motion adapters', () => {
  it('requires an explicit integer frame inside the composition', () => {
    expect(frame(0)).toEqual({frame: 0, fps: 30, durationInFrames: 31});
    for (const invalidFrame of [-1, 0.5, 31]) {
      expect(() => frame(invalidFrame)).toThrow(/INVALID_FRAME_CONTEXT/u);
    }
    expect(() => createExplicitFrameContext({frame: 0, fps: 0, durationInFrames: 1})).toThrow(
      /INVALID_FRAME_CONTEXT/u,
    );
  });

  it('samples a paused GSAP timeline by frame and disposes it', () => {
    const recipe = {
      recipeId: 'h03-gsap-unit-test',
      initial: {opacity: 0, x: 0},
      steps: [
        {
          atSeconds: 0,
          durationSeconds: 1,
          values: {opacity: 1, x: 100},
          ease: 'none' as const,
        },
      ],
    };
    expect(sampleGsapFrame(recipe, frame(0)).x).toBe(0);
    expect(sampleGsapFrame(recipe, frame(15)).x).toBeCloseTo(50, 8);
    expect(sampleGsapFrame(recipe, frame(30)).x).toBeCloseTo(100, 8);

    const sampler = createGsapFrameSampler(recipe);
    sampler.dispose();
    expect(() => sampler.sample(frame(0))).toThrowError(MotionAdapterError);
  });

  it('keeps the GSAP ticker asleep after creation, sampling and disposal in a fresh process', () => {
    const childScript = `
      import {gsap} from 'gsap';
      import {createGsapFrameSampler} from './renderers/remotion/src/adapters/gsap-adapter.ts';
      const sampler = createGsapFrameSampler({
        recipeId: 'h03-child-ticker-proof',
        initial: {x: 0},
        steps: [{atSeconds: 0, durationSeconds: 1, values: {x: 100}, ease: 'none'}],
      });
      sampler.sample({frame: 15, fps: 30, durationInFrames: 31});
      const afterSample = gsap.ticker.time;
      await new Promise((done) => setTimeout(done, 80));
      const afterSampleWait = gsap.ticker.time;
      sampler.dispose();
      const afterDispose = gsap.ticker.time;
      await new Promise((done) => setTimeout(done, 80));
      const afterDisposeWait = gsap.ticker.time;
      console.info(JSON.stringify({afterSample, afterSampleWait, afterDispose, afterDisposeWait}));
    `;
    const child = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', childScript],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(child.status, child.stderr).toBe(0);
    const proof = JSON.parse(child.stdout.trim()) as {
      readonly afterSample: number;
      readonly afterSampleWait: number;
      readonly afterDispose: number;
      readonly afterDisposeWait: number;
    };
    expect(proof.afterSampleWait).toBe(proof.afterSample);
    expect(proof.afterDisposeWait).toBe(proof.afterDispose);
  });

  it('rejects non-numeric GSAP properties and unapproved easing', () => {
    expect(() =>
      createGsapFrameSampler({
        recipeId: 'h03-hostile-gsap',
        initial: {x: 0},
        steps: [
          {
            atSeconds: 0,
            durationSeconds: 1,
            values: {y: 100},
            ease: 'none',
          },
        ],
      }),
    ).toThrow(/GSAP_RECIPE_INVALID/u);
  });

  it('resolves a fixed Three scene and makes the 2D fallback observable', () => {
    const first = resolveThreeScenePlan(threeScene, frame(0), {
      angleAvailable: true,
      headlessProfilePinned: true,
    });
    const last = resolveThreeScenePlan(threeScene, frame(30), {
      angleAvailable: true,
      headlessProfilePinned: true,
    });
    expect(first.status).toBe('THREE_AVAILABLE');
    expect(last.status).toBe('THREE_AVAILABLE');
    if (first.status === 'THREE_AVAILABLE' && last.status === 'THREE_AVAILABLE') {
      expect(last.object.rotation[1] - first.object.rotation[1]).toBeCloseTo(Math.PI, 10);
    }

    expect(
      resolveThreeScenePlan(threeScene, frame(0), {
        angleAvailable: false,
        headlessProfilePinned: true,
      }),
    ).toMatchObject({
      status: 'FALLBACK_2D_REQUIRED',
      fallbackUsed: true,
      fallbackReason: 'ANGLE_UNAVAILABLE',
    });
  });

  it('validates a closed local Lottie and maps render frames without looping', () => {
    const document = validateLocalLottieDocument(H03_LOTTIE_PROBE_DATA);
    const canonicalBefore = JSON.stringify(document.animationData);
    const runtimeCopy = materializeLottieRenderData(document) as Record<string, unknown>;
    runtimeCopy.__complete = true;
    expect(JSON.stringify(document.animationData)).toBe(canonicalBefore);
    expect(resolveLottieFrame(document, frame(15))).toMatchObject({
      renderFrame: 15,
      sourceFrame: 15,
      posterFrame: 0,
      playbackRate: 1,
      loop: false,
      autoplay: false,
    });
  });

  it('maps a 60fps Lottie onto a 30fps composition through explicit playback rate', () => {
    const document = validateLocalLottieDocument({
      ...H03_LOTTIE_PROBE_DATA,
      fr: 60,
      op: 60,
    });
    expect(resolveLottieFrame(document, frame(15))).toMatchObject({
      renderFrame: 15,
      sourceFrame: 30,
      playbackRate: 2,
      loop: false,
      autoplay: false,
    });
  });

  it.each([
    {...H03_LOTTIE_PROBE_DATA, assets: [{id: 'image_0', p: 'remote.png'}]},
    {...H03_LOTTIE_PROBE_DATA, layers: [{x: 'time * 2'}]},
    {...H03_LOTTIE_PROBE_DATA, fonts: {list: [{fName: 'Remote'}]}},
  ])('rejects hostile Lottie dependencies', (document) => {
    expect(() => validateLocalLottieDocument(document)).toThrow(/LOTTIE_/u);
  });

  it('derives Remotion time and progress only from the explicit frame context', () => {
    expect(resolveRemotionFrameSample(frame(15))).toMatchObject({
      seconds: 0.5,
      progress: 0.5,
      clockOwner: 'REMOTION_FRAME',
    });
  });

  it.each(hostileFixture.cases)('$case_id fails with $expected_error', (hostileCase) => {
    const actionByCase: Record<string, () => unknown> = {
      'invalid-frame': () => frame(-1),
      'gsap-unknown-property': () =>
        createGsapFrameSampler({
          recipeId: 'h03-fixture-hostile-gsap',
          initial: {x: 0},
          steps: [{atSeconds: 0, durationSeconds: 1, values: {y: 1}, ease: 'none'}],
        }),
      'lottie-expression': () =>
        validateLocalLottieDocument({...H03_LOTTIE_PROBE_DATA, layers: [{x: 'time * 2'}]}),
      'production-license-unresolved': () =>
        assertMotionAdapterLicense({
          adapterId: 'remotion-frame-runtime',
          licenseState: 'local_evaluation_only',
          requestedScope: 'production',
        }),
    };
    const action = actionByCase[hostileCase.case_id];
    expect(action, hostileCase.case_id).toBeDefined();
    expect(action).toThrow(new RegExp(hostileCase.expected_error, 'u'));
  });
});
