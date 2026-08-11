import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const root = process.cwd();
const required = [
  'skills/content-os-media/SKILL.md',
  'skills/content-os-media/LINEAGE.yml',
  'skills/content-os-media/schemas/media-manifest-v1.schema.json',
  'skills/content-os-media/schemas/asr-candidate-v1.schema.json',
  'skills/content-os-media/scripts/check-skill.mjs',
  'skills/content-os-media/scripts/media-resolve.mjs',
  'skills/content-os-media/scripts/media-audit.mjs',
  'skills/content-os-media/references/resolve-cascade.md',
  'skills/content-os-media/references/audio.md',
  'skills/content-os-media/rules/media-contract.md',
  'skills/content-os-media/examples/media-manifest.jsonl',
  'skills/content-os-media/fixtures/positive/offline-media-brief.yml',
  'skills/content-os-media/fixtures/negative/remote-without-auth.yml',
  'skills/content-os-media/fixtures/positive/asr-candidate.json',
  'skills/content-os-media/fixtures/negative/asr-without-provenance.json',
  'skills/content-os-media/fixtures/negative/asr-clock-mismatch.json',
  'skills/content-os-media/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const ajv = new Ajv2020({allErrors: true, strict: false});

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-media/examples/media-manifest.jsonl',
  'skills/content-os-media/fixtures/positive/offline-media-brief.yml',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'media-resolve',
  'offline-default',
  'fail-closed',
  'remote-opt-in',
  'auth-gated',
  'provider: offline',
  'provider: remote',
  'sha256',
  'source',
  'whisper.cpp',
  'Piper',
  'Coqui',
  'HeyGen',
  'OpenAI',
  'ffmpeg',
  'media-manifest-v1',
  'RENDERED_DRAFT',
  'asr-candidate-v1',
  'modelSha256',
  'configSha256',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSM_CONTRACT_MISSING: ${token}`);
  }
}

const asr = JSON.parse(contents.get('skills/content-os-media/fixtures/positive/asr-candidate.json'));
for (const value of [
  asr.source?.sha256,
  asr.derivedAudio?.sha256,
  asr.engine?.modelSha256,
  asr.engine?.configSha256,
]) {
  if (!/^[a-f0-9]{64}$/u.test(value ?? '')) throw new Error('COSM_ASR_PROVENANCE_INVALID');
}
if (
  asr.schemaVersion !== 'asr-candidate-v1' ||
  asr.status !== 'candidate' ||
  !asr.clocks?.absolute?.id ||
  !asr.clocks?.local?.id
) {
  throw new Error('COSM_ASR_CONTRACT_INVALID');
}
const validateAsr = ajv.compile(JSON.parse(contents.get('skills/content-os-media/schemas/asr-candidate-v1.schema.json')));
if (!validateAsr(asr)) throw new Error(`COSM_AJV2020_ASR_POSITIVE: ${ajv.errorsText(validateAsr.errors)}`);
const epsilon = 1e-6;
for (const segment of asr.segments) {
  const span = segment.sourceSpan;
  const selected = span[asr.inputClock];
  if (
    span.sourceId !== asr.source.id ||
    span.absolute.clockId !== asr.clocks.absolute.id ||
    span.local.clockId !== asr.clocks.local.id ||
    !(span.absolute.endSeconds > span.absolute.startSeconds) ||
    !(span.local.endSeconds > span.local.startSeconds) ||
    Math.abs(segment.startSeconds - selected.startSeconds) > epsilon ||
    Math.abs(segment.endSeconds - selected.endSeconds) > epsilon ||
    Math.abs(span.absolute.startSeconds - (span.local.startSeconds + asr.clocks.local.originAbsoluteSeconds)) > epsilon ||
    Math.abs(span.absolute.endSeconds - (span.local.endSeconds + asr.clocks.local.originAbsoluteSeconds)) > epsilon
  ) throw new Error(`COSM_ASR_CLOCK_INCOHERENT: ${segment.id}`);
}
const clockMismatch = JSON.parse(contents.get('skills/content-os-media/fixtures/negative/asr-clock-mismatch.json'));
if (validateAsr(clockMismatch)) {
  const segment = clockMismatch.segments[0];
  const span = segment.sourceSpan;
  const selected = span[clockMismatch.inputClock];
  const coherent = span.absolute.clockId === clockMismatch.clocks.absolute.id && span.local.clockId === clockMismatch.clocks.local.id && span.local.endSeconds > span.local.startSeconds && segment.startSeconds === selected.startSeconds && segment.endSeconds === selected.endSeconds;
  if (coherent) throw new Error('COSM_ASR_CLOCK_NEGATIVE_ACCEPTED');
}

const brokenAsr = contents.get('skills/content-os-media/fixtures/negative/asr-without-provenance.json');
for (const token of [
  'missing-source-sha256',
  'missing-derived-audio-sha256',
  'missing-model-sha256',
  'missing-config-sha256',
  'missing-absolute-local-clock',
  'cannot-promote-asr-to-caption-or-claim',
]) {
  if (!brokenAsr.includes(token)) {
    throw new Error(`COSM_ASR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

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
  /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^'"\s)]+\.(woff2?|ttf|otf|mp4|webm|mp3|wav|png|jpg|jpeg|gif|svg)/iu,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`COSM_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-media/fixtures/negative/remote-without-auth.yml');
for (const token of [
  'provider: remote',
  'auth_declared: false',
  'mediaProfile: offline',
  'network-in-render-path',
  'https://',
  'missing-sha256',
  'missing-source',
  'vendor-placeholder-reuse',
  'at_test',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSM_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-media: ${required.length} governed resources, media OS dual offline + remote-opt-in, fail-closed, offline-first.`,
);
