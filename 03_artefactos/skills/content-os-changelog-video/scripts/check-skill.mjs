import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-changelog-video';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/changelog-video-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-changelog-plan.yml`,
  `${skill}/fixtures/negative/broken-changelog-plan.yml`,
  `${skill}/examples/theme-plan.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1', gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_CLV_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-changelog-plan.yml`,
  `${skill}/examples/theme-plan.jsonl`,
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
  'content-os-motion-graphics',
  'ui-recreate',
  'visualize, don',
]) {
  if (!combined.includes(token)) throw new Error(`COS_CLV_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_CLV_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-changelog-plan.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'theme-99',
  'text-bullets',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_CLV_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-changelog-video: ${required.length} governed resources, mock-UI visualizations, offline deterministic.`,
);
