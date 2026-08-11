import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {parse as parseYaml} from 'yaml';

const root = process.cwd();
const skill = 'skills/content-os-remotion-captions';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/remotion-captions-v1.schema.json`,
  `${skill}/schemas/remotion-captions-v2.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/scripts/voice-draft-gate.mjs`,
  `${skill}/fixtures/positive/valid-captions-request.yml`,
  `${skill}/fixtures/positive/legacy-v1-read.yml`,
  `${skill}/fixtures/negative/broken-captions-request.yml`,
  `${skill}/fixtures/negative/v2-non-use-render.yml`,
  `${skill}/examples/captions-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const ajv = new Ajv2020({allErrors: true, strict: false});
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({remotion: '4.0.494', react: '19.2.7'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_RCP_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-captions-request.yml`,
  `${skill}/examples/captions-sequence.jsonl`,
]
  .map((p) => contents.get(p))
  .join('\n');

for (const token of [
  'useCurrentFrame',
  'interpolate',
  'Easing.bezier',
  'Easing.spring',
  'Caption',
  'RENDERED_DRAFT',
  'Derivada de',
  'LicenseRef-MetodologIA-Internal',
  'content-os-remotion-captions',
  'content-os-remotion-create',
  'content-os-remotion-render',
  'remotion-video-production',
  'determinism',
  'source-available',
  'H03-LIC-REMOTION-001',
  'correctionLedgerRef',
  'sourceSpans',
  'legacy-v1-new-draft-blocked',
]) {
  if (!combined.includes(token)) throw new Error(`COS_RCP_CONTRACT_MISSING: ${token}`);
}

for (const [fixture, marker] of [
  ['fixtures/positive/valid-captions-request.yml', 'v2-draft'],
  ['fixtures/positive/legacy-v1-read.yml', 'legacy-read'],
]) {
  const gate = spawnSync(process.execPath, [resolve(root, skill, 'scripts/voice-draft-gate.mjs'), resolve(root, skill, fixture)], {encoding: 'utf8'});
  if (gate.status !== 0 || !gate.stdout.includes(marker)) {
    throw new Error(`COS_RCP_VOICE_DRAFT_GATE: ${fixture}`);
  }
}
const legacyDraft = spawnSync(process.execPath, [resolve(root, skill, 'scripts/voice-draft-gate.mjs'), resolve(root, skill, 'fixtures/negative/broken-captions-request.yml')], {encoding: 'utf8'});
if (legacyDraft.status === 0 || !legacyDraft.stderr.includes('legacy-v1-new-draft-blocked')) {
  throw new Error('COS_RCP_LEGACY_DRAFT_NOT_BLOCKED');
}
const validateV2 = ajv.compile(JSON.parse(contents.get(`${skill}/schemas/remotion-captions-v2.schema.json`)));
const validV2 = parseYaml(contents.get(`${skill}/fixtures/positive/valid-captions-request.yml`));
if (!validateV2(validV2)) throw new Error(`COS_RCP_AJV2020_POSITIVE: ${ajv.errorsText(validateV2.errors)}`);
const nonUse = parseYaml(contents.get(`${skill}/fixtures/negative/v2-non-use-render.yml`));
if (validateV2(nonUse)) throw new Error('COS_RCP_AJV2020_NON_USE_RENDER_ACCEPTED');
const nonUseGate = spawnSync(process.execPath, [resolve(root, skill, 'scripts/voice-draft-gate.mjs'), resolve(root, skill, 'fixtures/negative/v2-non-use-render.yml')], {encoding: 'utf8'});
if (nonUseGate.status === 0 || !nonUseGate.stderr.includes('blocks-render')) throw new Error('COS_RCP_NON_USE_RENDER_GATE');

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_RCP_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-captions-request.yml`);
for (const token of [
  'Math.random',
  'Date.now',
  'setTimeout',
  'fetch',
  'live',
  'CSS transition',
  'SRT',
]) {
  if (!negative.includes(token))
    throw new Error(`COS_RCP_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-remotion-captions: ${required.length} governed resources, frame-driven captions, offline deterministic.`,
);
