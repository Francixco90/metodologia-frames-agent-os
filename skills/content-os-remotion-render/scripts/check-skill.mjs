import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-remotion-render';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/remotion-render-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-render-request.yml`,
  `${skill}/fixtures/negative/broken-render-request.yml`,
  `${skill}/examples/render-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({remotion: '4.0.494', react: '19.2.7'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_RDR_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-render-request.yml`,
  `${skill}/examples/render-sequence.jsonl`,
]
  .map((p) => contents.get(p))
  .join('\n');

for (const token of [
  'useCurrentFrame',
  'interpolate',
  'Easing.bezier',
  'Easing.spring',
  'registerRoot',
  'RENDERED_DRAFT',
  'Derivada de',
  'LicenseRef-MetodologIA-Internal',
  'content-os-remotion-render',
  'content-os-remotion-create',
  'content-os-remotion-markup',
  'remotion-video-production',
  'determinism',
  'source-available',
  'H03-LIC-REMOTION-001',
  'libx264',
]) {
  if (!combined.includes(token)) throw new Error(`COS_RDR_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_RDR_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-render-request.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'libx264',
  'unpinned',
  'transparent',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_RDR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-remotion-render: ${required.length} governed resources, render, offline deterministic.`,
);
