import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {parse} from 'yaml';
import type {z} from 'zod';

import {socialLightTokens} from '../../../brand/generated/social-light.tokens.ts';
import type {RendererCapabilityRegistryV1Schema} from '../../../core/contracts/index.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import {
  buildD3Geometry,
  type D3GeometryRequestV1,
} from '../../../renderers/remotion/src/adapters/d3-adapter.ts';
import {sampleGsapFrame} from '../../../renderers/remotion/src/adapters/gsap-adapter.ts';
import {
  H03_LOTTIE_PROBE_DATA,
  resolveLottieFrame,
  validateLocalLottieDocument,
} from '../../../renderers/remotion/src/adapters/lottie-adapter.ts';
import {resolveRemotionFrameSample} from '../../../renderers/remotion/src/adapters/remotion-adapter.ts';
import {resolveThreeScenePlan} from '../../../renderers/remotion/src/adapters/three-adapter.ts';

type Registry = z.infer<typeof RendererCapabilityRegistryV1Schema>;
type Expect = (condition: boolean, message: string) => void;

export const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
export const readAt = (root: string, ref: string): string =>
  readFileSync(resolve(root, ref), 'utf8');

export const filesBelow = (directory: string): string[] =>
  readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : statSync(path).isFile() ? [path] : [];
    })
    .sort();

export const treeDigest = (root: string, ref: string): string =>
  sha256(
    filesBelow(resolve(root, ref))
      .map(
        (path) => `${sha256(readFileSync(path))}  ${relative(root, path).replaceAll('\\', '/')}\n`,
      )
      .join(''),
  );

export const semanticProbe = (root: string): string => {
  const frame = {frame: 15, fps: 30, durationInFrames: 30};
  const d3 = buildD3Geometry(
    JSON.parse(
      readAt(root, 'skills/data-visual-composition/fixtures/positive/categorical-matrix.json'),
    ) as D3GeometryRequestV1,
  );
  const gsap = sampleGsapFrame(
    {
      recipeId: 'h03-check-gsap',
      initial: {opacity: 0, x: 0},
      steps: [{atSeconds: 0, durationSeconds: 1, values: {opacity: 1, x: 30}, ease: 'linear'}],
    },
    frame,
  );
  const three = resolveThreeScenePlan(
    {
      sceneId: 'h03-check-three',
      width: 180,
      height: 180,
      seed: 'h03-check-fixed-seed',
      camera: {position: [3, 2, 4], fov: 35},
      ambientLightIntensity: 1,
      directionalLight: {position: [4, 5, 3], intensity: 2},
      object: {
        geometry: 'box',
        color: socialLightTokens.colors.goldFill,
        baseRotation: [0, 0.25, 0],
        turnsPerComposition: 0.5,
      },
    },
    frame,
    {angleAvailable: true, headlessProfilePinned: true},
  );
  const lottie = resolveLottieFrame(validateLocalLottieDocument(H03_LOTTIE_PROBE_DATA), frame);
  return hashCanonical({
    domain: 'h03-semantic-probe-v1',
    d3,
    gsap,
    three,
    lottie,
    remotion: resolveRemotionFrameSample(frame),
  });
};

export const validateRendererFoundation = (
  root: string,
  registry: Registry,
  expect: Expect,
): void => {
  for (const capability of registry.capabilities) {
    for (const binding of [
      capability.adapterRef,
      capability.positiveFixtureRef,
      capability.hostileFixtureRef,
      ...capability.dependencies.map(({licenseRef}) => licenseRef),
    ]) {
      const path = resolve(root, binding.ref);
      expect(existsSync(path), `REN-002 missing hash-bound ref ${binding.ref}`);
      if (existsSync(path))
        expect(sha256(readFileSync(path)) === binding.sha256, `REN-003 stale ref ${binding.ref}`);
    }
  }
  for (const binding of registry.supportingRefs) {
    const path = resolve(root, binding.ref);
    expect(existsSync(path), `REN-002 missing hash-bound ref ${binding.ref}`);
    if (existsSync(path))
      expect(sha256(readFileSync(path)) === binding.sha256, `REN-003 stale ref ${binding.ref}`);
  }

  const manifest = JSON.parse(readAt(root, 'package.json')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const lock = parse(readAt(root, 'pnpm-lock.yaml')) as {
    packages?: Record<string, {resolution?: {integrity?: string}}>;
  };
  for (const capability of registry.capabilities) {
    for (const dependency of capability.dependencies) {
      const manifestVersion = {...manifest.dependencies, ...manifest.devDependencies}[
        dependency.packageName
      ];
      expect(
        manifestVersion === dependency.version,
        `REN-004 manifest drift ${dependency.packageName}@${String(manifestVersion)}`,
      );
      expect(
        lock.packages?.[`${dependency.packageName}@${dependency.version}`]?.resolution
          ?.integrity === dependency.lockIntegrity,
        `REN-005 lock integrity drift ${dependency.packageName}@${dependency.version}`,
      );
    }
  }
  for (const forbidden of ['d3-selection', 'd3-transition', 'd3-timer', 'd3-force', 'd3-random'])
    expect(
      manifest.dependencies?.[forbidden] === undefined,
      `REN-006 forbidden package ${forbidden}`,
    );

  const d3Source = readAt(root, 'renderers/remotion/src/adapters/d3-adapter.ts');
  expect(
    !/d3-(?:selection|transition|timer|force|random)|\.transition\s*\(/u.test(d3Source),
    'REN-007 D3 adapter imports an autonomous or mutable module',
  );
  const gsapSource = readAt(root, 'renderers/remotion/src/adapters/gsap-adapter.ts');
  expect(
    gsapSource.split('gsap.ticker.sleep();').length === 2 &&
      !/gsap\.ticker\.(?:add|wake|fps|lagSmoothing)/u.test(gsapSource),
    'REN-008 GSAP ticker exception is not exactly one governed sleep',
  );
  const sources = filesBelow(resolve(root, 'renderers/remotion/src/adapters'))
    .filter((path) => /\.[jt]sx?$/u.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  expect(!/\buseFrame\s*\(/u.test(sources), 'REN-009 useFrame is forbidden');
  expect(
    !/\b(?:fetch|setTimeout|setInterval|requestAnimationFrame|performance\.now|Math\.random)\s*\(/u.test(
      sources,
    ),
    'REN-010 adapter uses network, clock, timer or randomness',
  );
  expect(
    registry.productionState === 'BLOCKED_LICENSE' &&
      registry.capabilities
        .filter(({capabilityId}) => ['three', 'lottie', 'remotion'].includes(capabilityId))
        .every(({productionEligibility}) => productionEligibility === 'blocked_license'),
    'REN-011 transitive Remotion-license boundary was promoted',
  );
  expect(
    registry.capabilities.every(
      ({distributionState, publicationAuthority, readinessEligible}) =>
        distributionState === 'NOT_DESIGNED' && !publicationAuthority && !readinessEligible,
    ),
    'REN-012 creation adapter acquired readiness, distribution or publication authority',
  );
};
