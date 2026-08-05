import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-creative/SKILL.md',
  'skills/content-os-creative/LINEAGE.yml',
  'skills/content-os-creative/schemas/creative-brief-v1.schema.json',
  'skills/content-os-creative/scripts/check-skill.mjs',
  'skills/content-os-creative/scripts/creative-audit.mjs',
  'skills/content-os-creative/references/composition-patterns.md',
  'skills/content-os-creative/references/narration-and-pacing.md',
  'skills/content-os-creative/references/house-style.md',
  'skills/content-os-creative/rules/creative-contract.md',
  'skills/content-os-creative/examples/branded-reveal.html',
  'skills/content-os-creative/fixtures/positive/branded-brief.yml',
  'skills/content-os-creative/fixtures/negative/lazy-defaults.yml',
  'skills/content-os-creative/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
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
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSC_CONTRACT_MISSING: ${token}`);
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
