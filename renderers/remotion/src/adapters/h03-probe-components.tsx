import {Lottie} from '@remotion/lottie';
import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';

import {socialLightTokens} from '../../../../brand/generated/social-light.tokens.ts';
import {sampleGsapFrame, type GsapFrameRecipeV1} from './gsap-adapter.ts';
import {
  H03_LOTTIE_PROBE_DATA,
  materializeLottieRenderData,
  resolveLottieFrame,
  validateLocalLottieDocument,
} from './lottie-adapter.ts';
import {useExplicitRemotionFrame} from './remotion-adapter.ts';
import {resolveThreeScenePlan, type ThreeSceneSpecV1} from './three-adapter.ts';

const gsapRecipe: GsapFrameRecipeV1 = {
  recipeId: 'h03-gsap-frame-probe',
  initial: {opacity: 0.2, x: 0},
  steps: [{atSeconds: 0, durationSeconds: 1, values: {opacity: 1, x: 48}, ease: 'power1.inOut'}],
};

const threeScene: ThreeSceneSpecV1 = {
  sceneId: 'h03-three-procedural-probe',
  width: 180,
  height: 180,
  seed: 'h03-first-party-fixed-seed',
  camera: {position: [3, 2, 4], fov: 35},
  ambientLightIntensity: 1.2,
  directionalLight: {position: [4, 5, 3], intensity: 2.1},
  object: {
    geometry: 'box',
    color: socialLightTokens.colors.goldFill,
    baseRotation: [0.35, 0.25, 0],
    turnsPerComposition: 0.5,
  },
};

const lottieDocument = validateLocalLottieDocument(H03_LOTTIE_PROBE_DATA);

export const H03MotionAdapterProbe = () => {
  const sample = useExplicitRemotionFrame();
  const animationData = useMemo(() => materializeLottieRenderData(lottieDocument), []);
  const gsapValues = sampleGsapFrame(gsapRecipe, sample.context);
  const lottieFrame = resolveLottieFrame(lottieDocument, sample.context);
  const threePlan = resolveThreeScenePlan(threeScene, sample.context, {
    angleAvailable: true,
    headlessProfilePinned: true,
  });
  if (threePlan.status !== 'THREE_AVAILABLE') {
    throw new Error(`THREE_RUNTIME_UNAVAILABLE: ${threePlan.fallbackReason}`);
  }

  return (
    <AbsoluteFill
      data-gsap-x={gsapValues.x}
      data-lottie-source-frame={lottieFrame.sourceFrame}
      data-remotion-frame={sample.context.frame}
      style={{
        alignItems: 'center',
        backgroundColor: socialLightTokens.colors.ink,
        color: socialLightTokens.colors.surface,
        display: 'flex',
        flexDirection: 'row',
        gap: 24,
        justifyContent: 'center',
      }}
    >
      <div style={{height: threePlan.height, width: threePlan.width}}>
        <ThreeCanvas
          camera={{fov: threePlan.camera.fov, position: [...threePlan.camera.position]}}
          height={threePlan.height}
          width={threePlan.width}
        >
          <ambientLight intensity={threePlan.ambientLightIntensity} />
          <directionalLight
            intensity={threePlan.directionalLight.intensity}
            position={[...threePlan.directionalLight.position]}
          />
          <mesh rotation={[...threePlan.object.rotation]}>
            <boxGeometry args={[1.8, 1.8, 1.8]} />
            <meshStandardMaterial color={threePlan.object.color} />
          </mesh>
        </ThreeCanvas>
      </div>
      <div
        style={{
          height: 120,
          opacity: gsapValues.opacity,
          transform: `translateX(${String(gsapValues.x)}px)`,
          width: 120,
        }}
      >
        <Lottie
          animationData={animationData}
          loop={false}
          playbackRate={lottieFrame.playbackRate}
          renderer="svg"
          style={{height: 120, width: 120}}
        />
      </div>
    </AbsoluteFill>
  );
};
