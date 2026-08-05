import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-media/SKILL.md',
  'skills/content-os-media/LINEAGE.yml',
  'skills/content-os-media/schemas/media-manifest-v1.schema.json',
  'skills/content-os-media/scripts/check-skill.mjs',
  'skills/content-os-media/scripts/media-resolve.mjs',
  'skills/content-os-media/scripts/media-audit.mjs',
  'skills/content-os-media/references/resolve-cascade.md',
  'skills/content-os-media/references/audio.md',
  'skills/content-os-media/rules/media-contract.md',
  'skills/content-os-media/examples/media-manifest.jsonl',
  'skills/content-os-media/fixtures/positive/offline-media-brief.yml',
  'skills/content-os-media/fixtures/negative/remote-without-auth.yml',
  'skills/content-os-media/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));

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
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSM_CONTRACT_MISSING: ${token}`);
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
