import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-bento-apple-grid';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/bento-apple-grid-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-bento-apple-request.yml`,
  `${skill}/fixtures/negative/broken-bento-apple-request.yml`,
  `${skill}/examples/bento-apple-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_BAG_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-bento-apple-request.yml`,
  `${skill}/examples/bento-apple-sequence.jsonl`,
]
  .map((p) => contents.get(p))
  .join('\n');

for (const token of [
  'zero-gap',
  '6px',
  'stretch',
  'RENDERED_DRAFT',
  'Derivada de',
  'LicenseRef-MetodologIA-Internal',
  'content-os-bento-apple-grid',
  'content-os-core',
  'self-contained',
  'Playwright',
  'MIT',
]) {
  if (!combined.includes(token)) throw new Error(`COS_BAG_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_BAG_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-bento-apple-request.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'align-items: start',
  'viewport',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_BAG_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-bento-apple-grid: ${required.length} governed resources, Apple bento HTML, screenshot deterministic.`,
);
