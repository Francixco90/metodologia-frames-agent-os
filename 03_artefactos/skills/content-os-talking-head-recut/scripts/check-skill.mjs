import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {parse as parseYaml} from 'yaml';

const root = process.cwd();
const skill = 'skills/content-os-talking-head-recut';
const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/schemas/talking-head-recut-v1.schema.json`,
  `${skill}/schemas/talking-head-recut-v2.schema.json`,
  `${skill}/scripts/check-skill.mjs`,
  `${skill}/scripts/storyboard-gate.mjs`,
  `${skill}/fixtures/positive/valid-overlay-plan.yml`,
  `${skill}/fixtures/positive/legacy-v1-read.yml`,
  `${skill}/fixtures/negative/broken-overlay-plan.yml`,
  `${skill}/fixtures/negative/v2-empty-cards.yml`,
  `${skill}/fixtures/negative/v2-invalid-visual-span.yml`,
  `${skill}/fixtures/negative/v2-non-use-render.yml`,
  `${skill}/fixtures/negative/v2-crop-without-evidence.yml`,
  `${skill}/examples/card-sequence.jsonl`,
  `${skill}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const ajv = new Ajv2020({allErrors: true, strict: false});
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (n) => packageJson.dependencies?.[n] ?? packageJson.devDependencies?.[n];
for (const [name, version] of Object.entries({playwright: '1.61.1', gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version)
    throw new Error(`COS_THR_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  `${skill}/fixtures/positive/valid-overlay-plan.yml`,
  `${skill}/examples/card-sequence.jsonl`,
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
  'content-os-embedded-captions',
  'talking-head-recut',
  'correctionLedgerRef',
  'narrativeMapRef',
  'sourceSpan',
  'visualSpan',
  'legacy-v1-new-draft-blocked',
  'sourceAnalysisRef',
  'visualBudgetRef',
  'brandKitRef',
  'reelSpec',
  'crop-safe',
]) {
  if (!combined.includes(token)) throw new Error(`COS_THR_CONTRACT_MISSING: ${token}`);
}

for (const [fixture, marker] of [
  ['fixtures/positive/valid-overlay-plan.yml', 'render-draft'],
  ['fixtures/positive/legacy-v1-read.yml', 'legacy-read'],
]) {
  const gate = spawnSync(process.execPath, [resolve(root, skill, 'scripts/storyboard-gate.mjs'), resolve(root, skill, fixture)], {encoding: 'utf8'});
  if (gate.status !== 0 || !gate.stdout.includes(marker)) {
    throw new Error(`COS_THR_STORYBOARD_GATE: ${fixture}`);
  }
}
const legacyDraft = spawnSync(process.execPath, [resolve(root, skill, 'scripts/storyboard-gate.mjs'), resolve(root, skill, 'fixtures/negative/broken-overlay-plan.yml')], {encoding: 'utf8'});
if (legacyDraft.status === 0 || !legacyDraft.stderr.includes('legacy-v1-new-draft-blocked')) {
  throw new Error('COS_THR_LEGACY_DRAFT_NOT_BLOCKED');
}
const validateV2 = ajv.compile(JSON.parse(contents.get(`${skill}/schemas/talking-head-recut-v2.schema.json`)));
const validV2 = parseYaml(contents.get(`${skill}/fixtures/positive/valid-overlay-plan.yml`));
if (!validateV2(validV2)) throw new Error(`COS_THR_AJV2020_POSITIVE: ${ajv.errorsText(validateV2.errors)}`);
const emptyCards = parseYaml(contents.get(`${skill}/fixtures/negative/v2-empty-cards.yml`));
if (validateV2(emptyCards)) throw new Error('COS_THR_AJV2020_EMPTY_CARDS_ACCEPTED');
const nonUse = parseYaml(contents.get(`${skill}/fixtures/negative/v2-non-use-render.yml`));
if (validateV2(nonUse)) throw new Error('COS_THR_AJV2020_NON_USE_RENDER_ACCEPTED');
for (const fixture of ['v2-empty-cards.yml', 'v2-invalid-visual-span.yml', 'v2-non-use-render.yml', 'v2-crop-without-evidence.yml']) {
  const gate = spawnSync(process.execPath, [resolve(root, skill, 'scripts/storyboard-gate.mjs'), resolve(root, skill, `fixtures/negative/${fixture}`)], {encoding: 'utf8'});
  if (gate.status === 0) throw new Error(`COS_THR_ADVERSARIAL_GATE: ${fixture}`);
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) throw new Error(`COS_THR_FORBIDDEN_API: ${String(pattern)}`);
}

const negative = contents.get(`${skill}/fixtures/negative/broken-overlay-plan.yml`);
for (const token of ['Math.random', 'Date.now', 'setTimeout', 'fetch', 'card-99', 'out-of-range']) {
  if (!negative.includes(token))
    throw new Error(`COS_THR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
}

console.info(
  `PASS content-os-talking-head-recut: ${required.length} governed resources, overlay cards on playing clip, offline deterministic.`,
);
