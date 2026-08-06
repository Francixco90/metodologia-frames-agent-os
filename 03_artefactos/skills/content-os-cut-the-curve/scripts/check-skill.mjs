import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-cut-the-curve';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/cut-the-curve-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-seam-catalog.yml`,
  `${skill}/fixtures/negative/broken-seam-catalog.yml`,
  `${skill}/examples/seam-catalog-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
  `${skill}/references/zoom-through.md`,
  `${skill}/references/inverse-zoom-through.md`,
  `${skill}/references/cut-the-curve.md`,
  `${skill}/references/waterfall-cut.md`,
  `${skill}/references/rack-focus-blur-cut.md`,
  `${skill}/references/waterfall-entry.md`,
  `${skill}/references/nudge-curve.md`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1', gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_CTC_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-seam-catalog.yml`,
  `${skill}/examples/seam-catalog-sequence.jsonl`,
]
  .map((p) => contents.get(p))
  .join('\n');

for (const token of [
  'data-composition-id',
  'data-duration',
  'data-start',
  'window.__timelines',
  'gsap.timeline',
  'paused: true',
  'chromium.launch',
  'image2pipe',
  'libx264',
  'RENDERED_DRAFT',
  'Derivada de',
  'LicenseRef-MetodologIA-Internal',
  'content-os-cut-the-curve',
  'content-os-motion-doctrine',
  'content-os-seam-craft',
  'zoom-through',
  'inverse zoom',
  'cut the curve',
  'waterfall cut',
  'rack-focus',
  'waterfall entry',
  'nudge curve',
  'power4.in',
  'power4.out',
  'partial travel',
  'scale-sign',
]) {
  if (!combined.includes(token)) throw new Error(`COS_CTC_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_CTC_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-seam-catalog.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'grow-from-small-mirror',
  'full-off-screen',
  'inOut-on-cut',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_CTC_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-cut-the-curve: ${required.length} governed resources, seam catalog, offline deterministic.`,
);
