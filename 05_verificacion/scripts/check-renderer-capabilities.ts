import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {parse} from 'yaml';

import {socialLightTokens} from '../../brand/generated/social-light.tokens.ts';
import {RendererCapabilityRegistryV1Schema} from '../../core/contracts/index.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';
import {
  buildD3Geometry,
  type D3GeometryRequestV1,
} from '../../renderers/remotion/src/adapters/d3-adapter.ts';
import {sampleGsapFrame} from '../../renderers/remotion/src/adapters/gsap-adapter.ts';
import {
  H03_LOTTIE_PROBE_DATA,
  resolveLottieFrame,
  validateLocalLottieDocument,
} from '../../renderers/remotion/src/adapters/lottie-adapter.ts';
import {resolveRemotionFrameSample} from '../../renderers/remotion/src/adapters/remotion-adapter.ts';
import {resolveThreeScenePlan} from '../../renderers/remotion/src/adapters/three-adapter.ts';

const root = process.cwd();
const registryRef = 'registries/renderers/renderer-capability-registry-v1.yml';
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const read = (ref: string): string => readFileSync(resolve(root, ref), 'utf8');

const filesBelow = (directory: string): string[] =>
  readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : statSync(path).isFile() ? [path] : [];
    })
    .sort();

const treeDigest = (ref: string): string =>
  sha256(
    filesBelow(resolve(root, ref))
      .map(
        (path) => `${sha256(readFileSync(path))}  ${relative(root, path).replaceAll('\\', '/')}\n`,
      )
      .join(''),
  );

const semanticProbe = (): string => {
  const frame = {frame: 15, fps: 30, durationInFrames: 30};
  const d3Request = JSON.parse(
    read('skills/data-visual-composition/fixtures/positive/categorical-matrix.json'),
  ) as D3GeometryRequestV1;
  const d3 = buildD3Geometry(d3Request);
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
  const remotion = resolveRemotionFrameSample(frame);
  return hashCanonical({domain: 'h03-semantic-probe-v1', d3, gsap, three, lottie, remotion});
};

if (process.argv.includes('--child')) {
  console.info(semanticProbe());
} else {
  const errors: string[] = [];
  const expect = (condition: boolean, message: string): void => {
    if (!condition) errors.push(message);
  };

  const registry = RendererCapabilityRegistryV1Schema.parse(parse(read(registryRef)));
  const {registrySha256, ...unsignedRegistry} = registry;
  expect(
    registrySha256 ===
      hashCanonical({
        domain: 'renderer-capability-registry-v1:integrity:v1',
        registry: unsignedRegistry,
      }),
    'REN-001 registry self-hash is stale',
  );

  for (const capability of registry.capabilities) {
    for (const binding of [
      capability.adapterRef,
      capability.positiveFixtureRef,
      capability.hostileFixtureRef,
      ...capability.dependencies.map(({licenseRef}) => licenseRef),
    ]) {
      const path = resolve(root, binding.ref);
      expect(existsSync(path), `REN-002 missing hash-bound ref ${binding.ref}`);
      if (existsSync(path)) {
        expect(sha256(readFileSync(path)) === binding.sha256, `REN-003 stale ref ${binding.ref}`);
      }
    }
  }
  for (const binding of registry.supportingRefs) {
    const path = resolve(root, binding.ref);
    expect(existsSync(path), `REN-002 missing hash-bound ref ${binding.ref}`);
    if (existsSync(path)) {
      expect(sha256(readFileSync(path)) === binding.sha256, `REN-003 stale ref ${binding.ref}`);
    }
  }

  const manifest = JSON.parse(read('package.json')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const lock = parse(read('pnpm-lock.yaml')) as {
    packages?: Record<string, {resolution?: {integrity?: string}}>;
  };
  for (const capability of registry.capabilities) {
    for (const dependency of capability.dependencies) {
      const manifestVersion = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
      }[dependency.packageName];
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

  for (const forbidden of ['d3-selection', 'd3-transition', 'd3-timer', 'd3-force', 'd3-random']) {
    expect(
      manifest.dependencies?.[forbidden] === undefined,
      `REN-006 forbidden package ${forbidden}`,
    );
  }

  const d3Source = read('renderers/remotion/src/adapters/d3-adapter.ts');
  expect(
    !/d3-(?:selection|transition|timer|force|random)|\.transition\s*\(/u.test(d3Source),
    'REN-007 D3 adapter imports an autonomous or mutable module',
  );
  const gsapSource = read('renderers/remotion/src/adapters/gsap-adapter.ts');
  expect(
    gsapSource.split('gsap.ticker.sleep();').length === 2 &&
      !/gsap\.ticker\.(?:add|wake|fps|lagSmoothing)/u.test(gsapSource),
    'REN-008 GSAP ticker exception is not exactly one governed sleep',
  );
  const rendererSources = filesBelow(resolve(root, 'renderers/remotion/src/adapters'))
    .filter((path) => /\.[jt]sx?$/u.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  expect(!/\buseFrame\s*\(/u.test(rendererSources), 'REN-009 useFrame is forbidden');
  expect(
    !/\b(?:fetch|setTimeout|setInterval|requestAnimationFrame|performance\.now|Math\.random)\s*\(/u.test(
      rendererSources,
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

  const committee = read('committees/creation/H-03/renderer-capabilities.md');
  const positions = [...committee.matchAll(/^\| P-(RT\d+)\s*\|/gmu)];
  const reviews = [
    ...committee.matchAll(/^\| X-(RT\d+)-(RT\d+)\s*\| RT-(\d+)\s*\| RT-(\d+)\s*\|/gmu),
  ];
  expect(positions.length === 5, 'REN-013 committee must persist five positions');
  expect(reviews.length === 20, 'REN-014 committee must persist twenty reviews');
  expect(
    new Set(reviews.map((match) => `${match[1]}:${match[2]}`)).size === 20 &&
      reviews.every(
        (match) =>
          match[1] !== match[2] && match[1] === `RT${match[3]}` && match[2] === `RT${match[4]}`,
      ),
    'REN-015 committee reviews are not twenty unique directed non-self pairs',
  );

  const smoke = parse(read('quality/reports/creation-v3-h03-render-smoke.yml')) as {
    replay_ref?: string;
    replay_sha256?: string;
    profile?: {graphics_backend?: string};
    outputs?: Array<{frame?: number; concurrency_group?: string; sha256?: string}>;
    checks?: {
      three_concurrent_same_frame_pairs_byte_identical?: string;
      distinct_processes_per_pair?: string;
      fresh_process_repeat_frame_15_byte_identical?: string;
      measured_overlap_ms?: Record<string, number>;
    };
    claims?: {production_eligibility?: string; publication_authority?: boolean};
  };
  const outputs = smoke.outputs ?? [];
  const frameGroups = [0, 15, 29].map((frame) =>
    outputs.filter((output) => output.frame === frame),
  );
  expect(
    smoke.profile?.graphics_backend === 'angle' &&
      outputs.length === 6 &&
      frameGroups.every(
        (group) =>
          group.length === 2 &&
          group[0]?.concurrency_group === group[1]?.concurrency_group &&
          group[0]?.sha256 === group[1]?.sha256,
      ) &&
      new Set(frameGroups.map((group) => group[0]?.sha256)).size === 3,
    'REN-016 graphical smoke lacks repeatability or frame variation',
  );
  expect(
    smoke.replay_ref === 'scripts/render-h03-probe.ts' &&
      smoke.replay_sha256 === sha256(read(smoke.replay_ref)) &&
      smoke.checks?.three_concurrent_same_frame_pairs_byte_identical === 'pass' &&
      smoke.checks.distinct_processes_per_pair === 'pass' &&
      smoke.checks.fresh_process_repeat_frame_15_byte_identical === 'pass' &&
      Object.values(smoke.checks.measured_overlap_ms ?? {}).every((value) => value > 0),
    'REN-017 graphical replay is stale or does not prove real process overlap',
  );
  expect(
    smoke.claims?.production_eligibility === 'not_claimed' &&
      smoke.claims.publication_authority === false,
    'REN-018 smoke receipt overclaims production or publication',
  );

  const localHash = semanticProbe();
  const script = resolve(root, 'scripts/check-renderer-capabilities.ts');
  const child = (): string =>
    execFileSync(process.execPath, ['--import', 'tsx', script, '--child'], {
      cwd: root,
      encoding: 'utf8',
      env: {...process.env, TZ: 'UTC'},
    }).trim();
  const [childA, childB] = [child(), child()];
  const concurrent = await Promise.all([
    Promise.resolve().then(semanticProbe),
    Promise.resolve().then(semanticProbe),
  ]);
  expect(
    [childA, childB, ...concurrent].every((digest) => digest === localHash),
    'REN-019 semantic adapters differ across process or concurrent run',
  );

  expect(
    sha256(read('renderers/remotion/src/Root.tsx')) ===
      '6e904cdc4a76a922af7701a48692f93f67c5678433cafa552a6c11c14ed447e0',
    'REN-020 historical Root.tsx changed',
  );
  expect(
    treeDigest('03_artefactos/projects/pilot-carousel-001') ===
      'd95abfe8ca98e2a751d3ce2b45c7250a98b5279512aaf117083574738bb5a779' &&
      treeDigest('03_artefactos/projects/vs-001-source-to-campaign') ===
        '2038d47926b0b8d827d7b5af9f958d51879f39772b67f17827b4c3f34e19ab1e' &&
      treeDigest('03_artefactos/adapters/n8n') ===
        'ce8f18c880741e552a0d1fec6cc1e7978251bf7364200e9ab1813aca8f396082',
    'REN-021 immutable legacy or n8n surface changed',
  );

  const succession = parse(read('receipts/dependency-audits/H03-LOCK-SUCCESSION-002.yml')) as {
    previous?: {lock_sha256?: string};
    current?: {lock_sha256?: string};
    approval_phrase?: string;
    publication_authority?: boolean;
  };
  expect(
    succession.previous?.lock_sha256 ===
      'c73533cf14815fc883b2e166c0a40c00fcac11fc62bf1081c45ba023db00fc82' &&
      succession.current?.lock_sha256 === sha256(read('pnpm-lock.yaml')) &&
      succession.approval_phrase === 'APRUEBO HITO H-03' &&
      succession.publication_authority === false,
    'REN-022 lock succession receipt is absent or stale',
  );

  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      `verify:renderers PASS registry=${registry.registrySha256} semantic=${localHash} smoke=${outputs[0]?.sha256 ?? 'missing'} production=BLOCKED_LICENSE`,
    );
  }
}
