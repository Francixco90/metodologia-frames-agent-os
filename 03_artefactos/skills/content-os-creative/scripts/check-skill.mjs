import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {parse as parseYaml} from 'yaml';

const root = process.cwd();
const required = [
  'skills/content-os-creative/SKILL.md',
  'skills/content-os-creative/context.md',
  'skills/content-os-creative/LINEAGE.yml',
  'skills/content-os-creative/schemas/creative-brief-v1.schema.json',
  'skills/content-os-creative/schemas/creative-brief-v2.schema.json',
  'skills/content-os-creative/scripts/check-skill.mjs',
  'skills/content-os-creative/scripts/creative-audit.mjs',
  'skills/content-os-creative/scripts/voice-evidence-gate.mjs',
  'skills/content-os-creative/references/composition-patterns.md',
  'skills/content-os-creative/references/narration-and-pacing.md',
  'skills/content-os-creative/references/house-style.md',
  'skills/content-os-creative/rules/creative-contract.md',
  'skills/content-os-creative/examples/branded-reveal.html',
  'skills/content-os-creative/fixtures/positive/branded-brief.yml',
  'skills/content-os-creative/fixtures/positive/legacy-v1-read.yml',
  'skills/content-os-creative/fixtures/negative/lazy-defaults.yml',
  'skills/content-os-creative/fixtures/negative/v2-empty-beats.yml',
  'skills/content-os-creative/fixtures/negative/v2-non-use-render.yml',
  'skills/content-os-creative/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const ajv = new Ajv2020({allErrors: true, strict: false});
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (name) =>
  packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
for (const [name, version] of Object.entries({gsap: '3.15.0'})) {
  if (pkgVersion(name) !== version) {
    throw new Error(`COSC_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
  }
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = ['skills/content-os-creative/examples/branded-reveal.html']
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'version: 0.2.0',
  '## 1. Activación',
  '## 8. Handoff',
  'metodologia-brand-router',
  'BrandProfileV2',
  'VoiceProfileV2',
  'ChannelProfileV1',
  'brandRef',
  'voiceRef',
  'channelRef',
  'storySpine',
  'offline-first',
  'no external',
  'correctionLedgerRef',
  'sourceSpan',
  'legacy-v1-new-draft-blocked',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSC_CONTRACT_MISSING: ${token}`);
  }
}

for (const [fixture, marker] of [
  ['skills/content-os-creative/fixtures/positive/branded-brief.yml', 'render-draft'],
  ['skills/content-os-creative/fixtures/positive/legacy-v1-read.yml', 'legacy-read'],
]) {
  const gate = spawnSync(process.execPath, [resolve(root, 'skills/content-os-creative/scripts/voice-evidence-gate.mjs'), resolve(root, fixture)], {encoding: 'utf8'});
  if (gate.status !== 0 || !gate.stdout.includes(marker)) throw new Error(`COSC_VOICE_GATE: ${fixture}`);
}
const legacyDraft = spawnSync(process.execPath, [resolve(root, 'skills/content-os-creative/scripts/voice-evidence-gate.mjs'), resolve(root, 'skills/content-os-creative/fixtures/negative/lazy-defaults.yml')], {encoding: 'utf8'});
if (legacyDraft.status === 0 || !legacyDraft.stderr.includes('legacy-v1-new-draft-blocked')) throw new Error('COSC_LEGACY_DRAFT_NOT_BLOCKED');
const validateV2 = ajv.compile(JSON.parse(contents.get('skills/content-os-creative/schemas/creative-brief-v2.schema.json')));
const validV2 = parseYaml(contents.get('skills/content-os-creative/fixtures/positive/branded-brief.yml'));
if (!validateV2(validV2)) throw new Error(`COSC_AJV2020_POSITIVE: ${ajv.errorsText(validateV2.errors)}`);
const emptyBeats = parseYaml(contents.get('skills/content-os-creative/fixtures/negative/v2-empty-beats.yml'));
if (validateV2(emptyBeats)) throw new Error('COSC_AJV2020_EMPTY_BEATS_ACCEPTED');
const emptyBeatGate = spawnSync(process.execPath, [resolve(root, 'skills/content-os-creative/scripts/voice-evidence-gate.mjs'), resolve(root, 'skills/content-os-creative/fixtures/negative/v2-empty-beats.yml')], {encoding: 'utf8'});
if (emptyBeatGate.status === 0 || !emptyBeatGate.stderr.includes('beats-empty')) throw new Error('COSC_EMPTY_BEATS_GATE');
const nonUse = parseYaml(contents.get('skills/content-os-creative/fixtures/negative/v2-non-use-render.yml'));
if (validateV2(nonUse)) throw new Error('COSC_AJV2020_NON_USE_RENDER_ACCEPTED');
const nonUseGate = spawnSync(process.execPath, [resolve(root, 'skills/content-os-creative/scripts/voice-evidence-gate.mjs'), resolve(root, 'skills/content-os-creative/fixtures/negative/v2-non-use-render.yml')], {encoding: 'utf8'});
if (nonUseGate.status === 0 || !nonUseGate.stderr.includes('blocks-render')) throw new Error('COSC_NON_USE_RENDER_GATE');

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
  /https?:\/\/fonts\.googleapis\.com/u,
  /https?:\/\/[a-z0-9.-]+\/[^'"\s)]+\.(woff2?|ttf|otf|mp4|webm|mp3|wav|png|jpg|jpeg|gif|svg)/u,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`COSC_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-creative/fixtures/negative/lazy-defaults.yml');
for (const token of [
  'missing-brandRef',
  'fonts.googleapis.com',
  'external-asset',
  'lazy-default',
  'pure-white',
  'generic-copy',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSC_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-creative: ${required.length} governed resources, brand router integration + offline-first, no external fonts/assets.`,
);
