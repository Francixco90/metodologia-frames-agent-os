import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-keyframes/SKILL.md',
  'skills/content-os-keyframes/LINEAGE.yml',
  'skills/content-os-keyframes/schemas/pose-contract-v1.schema.json',
  'skills/content-os-keyframes/scripts/check-skill.mjs',
  'skills/content-os-keyframes/scripts/pose-lint.mjs',
  'skills/content-os-keyframes/references/pose-patterns.md',
  'skills/content-os-keyframes/rules/pose-contract.md',
  'skills/content-os-keyframes/examples/pose-ladder.html',
  'skills/content-os-keyframes/fixtures/positive/seek-safe-poses.html',
  'skills/content-os-keyframes/fixtures/negative/endpoint-only.html',
  'skills/content-os-keyframes/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (name) =>
  packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
for (const [name, version] of Object.entries({gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version) {
    throw new Error(`COSK_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
  }
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-keyframes/examples/pose-ladder.html',
  'skills/content-os-keyframes/fixtures/positive/seek-safe-poses.html',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'gsap.timeline',
  'paused: true',
  'window.__timelines',
  'fromTo',
  'data-keyframe-subject',
  'data-pose',
  'data-at',
  'data-final-state',
  'autoAlpha',
  'will-change: transform',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSK_CONTRACT_MISSING: ${token}`);
  }
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\bperformance\.now\s*\(/u,
  /getBoundingClientRect/u,
  /repeat:\s*-1/u,
  /['"]\s*\+=/u,
  /\btransition\s*:/u,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`COSK_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-keyframes/fixtures/negative/endpoint-only.html');
for (const token of [
  'Math.random',
  'getBoundingClientRect',
  '+=',
  'animation:',
  'infinite',
  'transition:',
  'endpoint-only',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSK_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-keyframes: ${required.length} governed resources, pose contract + seek-safe lint, offline-first.`,
);
