import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-animation/SKILL.md',
  'skills/content-os-animation/LINEAGE.yml',
  'skills/content-os-animation/schemas/animation-rule-v1.schema.json',
  'skills/content-os-animation/scripts/check-skill.mjs',
  'skills/content-os-animation/scripts/animation-map.mjs',
  'skills/content-os-animation/rules/rules-index.md',
  'skills/content-os-animation/rules/fade-slide-rise.md',
  'skills/content-os-animation/blueprints/blueprints-index.md',
  'skills/content-os-animation/blueprints/brand-reveal.md',
  'skills/content-os-animation/transitions/overview.md',
  'skills/content-os-animation/examples/brand-reveal.html',
  'skills/content-os-animation/fixtures/positive/gsap-seekable.html',
  'skills/content-os-animation/fixtures/negative/autonomous-css.html',
  'skills/content-os-animation/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (name) =>
  packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
for (const [name, version] of Object.entries({gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version) {
    throw new Error(`COSA_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
  }
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-animation/examples/brand-reveal.html',
  'skills/content-os-animation/fixtures/positive/gsap-seekable.html',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'gsap.timeline',
  'paused: true',
  'window.__timelines',
  'fromTo',
  'power2.out',
  'stagger',
  'autoAlpha',
  'will-change: transform',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSA_CONTRACT_MISSING: ${token}`);
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
    throw new Error(`COSA_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-animation/fixtures/negative/autonomous-css.html');
for (const token of [
  'Math.random',
  'getBoundingClientRect',
  '+=',
  'animation:',
  'infinite',
  'transition:',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSA_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-animation: ${required.length} governed resources, GSAP seek-safe, offline-first.`,
);
