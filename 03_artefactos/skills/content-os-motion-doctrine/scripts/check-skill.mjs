import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-motion-doctrine';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/motion-doctrine-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-motion-plan.yml`,
  `${skill}/fixtures/negative/broken-motion-plan.yml`,
  `${skill}/examples/motion-doctrine-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
  `${skill}/references/doctrine-receta.md`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1', gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_MDR_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-motion-plan.yml`,
  `${skill}/examples/motion-doctrine-sequence.jsonl`,
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
  'content-os-motion-doctrine',
  'content-os-cut-the-curve',
  'content-os-seam-craft',
  'vector law',
  'the current',
  'seam gate',
  'idle wobble',
  'stillness before climax',
  'causal motion',
  'ledger.json',
  'seam-stamp',
  'seam-gate',
]) {
  if (!combined.includes(token)) throw new Error(`COS_MDR_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_MDR_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-motion-plan.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'idle-wobble',
  'crossfade-between-scenes',
  'mirrored-vector',
  'direction-ping-pong',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_MDR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-motion-doctrine: ${required.length} governed resources, motion gateway doctrine, offline deterministic.`,
);
