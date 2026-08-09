import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/content-os-remotion-create';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/remotion-create-v1.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/fixtures/positive/valid-composition-registration.yml`,
  `${skill}/fixtures/negative/broken-composition-registration.yml`,
  `${skill}/examples/composition-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({remotion: '4.0.494', react: '19.2.7'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_RCR_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const skillMd = contents.get(`${skill}/SKILL.md`);
const lineage = contents.get(`${skill}/LINEAGE.yml`);
if (!/^version: 0\.2\.0$/mu.test(skillMd) || !/^version: 0\.2\.0$/mu.test(lineage)) {
  throw new Error('COS_RCR_VERSION_MISMATCH');
}
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-composition-registration.yml`,
  `${skill}/examples/composition-sequence.jsonl`,
]
  .map((p) => contents.get(p))
  .join('\n');

for (const token of [
  'useCurrentFrame',
  'interpolate',
  'Easing.bezier',
  'Easing.spring',
  'registerRoot',
  'calculateMetadata',
  'defaultProps',
  'durationInFrames',
  'RENDERED_DRAFT',
  'Derivada de',
  'LicenseRef-MetodologIA-Internal',
  'content-os-remotion-create',
  'content-os-remotion-markup',
  'remotion-video-production',
  'determinism',
  'source-available',
  'H03-LIC-REMOTION-001',
  'DocumentationImpactPlanV1',
  'DocumentationClosureReceiptV1',
  'DOCS_TRANSVERSAL_COMPLETE',
]) {
  if (!combined.includes(token)) throw new Error(`COS_RCR_CONTRACT_MISSING: ${token}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_RCR_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-composition-registration.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'CSS transition',
  'Tailwind animation',
  'latest',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_RCR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-remotion-create: ${required.length} governed resources, scaffold + register, offline deterministic.`,
);
