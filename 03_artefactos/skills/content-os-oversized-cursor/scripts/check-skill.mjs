import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-oversized-cursor';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/oversized-cursor-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-cursor-plan.yml`,
  `${skill}/fixtures/negative/broken-cursor-plan.yml`,
  `${skill}/examples/cursor-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
  `${skill}/references/cursor-receta.md`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1', gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_OCR_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-cursor-plan.yml`,
  `${skill}/examples/cursor-sequence.jsonl`,
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
  'content-os-oversized-cursor',
  'content-os-motion-doctrine',
  'content-os-seam-craft',
  'content-os-cut-the-curve',
  'oversized cursor',
  'eye-carrier',
  'off-screen entry',
  'tip-targeting',
  'transformOrigin',
  '7cqw',
  'power3.out',
  'power2.in',
  'power2.out',
  'click-ignites',
  'cut-the-curve handoff',
  'no idle wobble',
]) {
  if (!combined.includes(token)) throw new Error(`COS_OCR_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_OCR_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-cursor-plan.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'fade-in-place',
  'mask-reveal',
  'idle-wobble',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_OCR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-oversized-cursor: ${required.length} governed resources, eye-carrier, offline deterministic.`,
);
