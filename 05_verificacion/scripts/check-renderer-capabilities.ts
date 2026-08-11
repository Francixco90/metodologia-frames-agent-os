import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {RendererCapabilityRegistryV1Schema} from '../../core/contracts/index.ts';
import {hashCanonical} from '../../core/evidence/hash.ts';
import {verifyApprovedH03LockSuccession} from './lib/h03-lock-succession.mjs';
import {
  readAt,
  semanticProbe,
  sha256,
  treeDigest,
  validateRendererFoundation,
} from './lib/renderer-capability-foundation.ts';

const root = process.cwd();
const registryRef = 'registries/renderers/renderer-capability-registry-v1.yml';
const read = (ref: string): string => readAt(root, ref);

if (process.argv.includes('--child')) {
  console.info(semanticProbe(root));
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

  validateRendererFoundation(root, registry, expect);

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

  const localHash = semanticProbe(root);
  const script = resolve(root, 'scripts/check-renderer-capabilities.ts');
  const child = (): string =>
    execFileSync(process.execPath, ['--import', 'tsx', script, '--child'], {
      cwd: root,
      encoding: 'utf8',
      env: {...process.env, TZ: 'UTC'},
    }).trim();
  const [childA, childB] = [child(), child()];
  const concurrent = await Promise.all([
    Promise.resolve().then(() => semanticProbe(root)),
    Promise.resolve().then(() => semanticProbe(root)),
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
    treeDigest(root, '03_artefactos/projects/pilot-carousel-001') ===
      'd95abfe8ca98e2a751d3ce2b45c7250a98b5279512aaf117083574738bb5a779' &&
      treeDigest(root, '03_artefactos/projects/vs-001-source-to-campaign') ===
        '2038d47926b0b8d827d7b5af9f958d51879f39772b67f17827b4c3f34e19ab1e' &&
      treeDigest(root, '03_artefactos/adapters/n8n') ===
        'ce8f18c880741e552a0d1fec6cc1e7978251bf7364200e9ab1813aca8f396082',
    'REN-021 immutable legacy or n8n surface changed',
  );

  verifyApprovedH03LockSuccession(root);

  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      `verify:renderers PASS registry=${registry.registrySha256} semantic=${localHash} smoke=${outputs[0]?.sha256 ?? 'missing'} production=BLOCKED_LICENSE`,
    );
  }
}
