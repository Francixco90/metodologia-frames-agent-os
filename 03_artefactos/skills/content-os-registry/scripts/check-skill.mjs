import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-registry/SKILL.md',
  'skills/content-os-registry/LINEAGE.yml',
  'skills/content-os-registry/schemas/registry-block-v1.schema.json',
  'skills/content-os-registry/scripts/check-skill.mjs',
  'skills/content-os-registry/scripts/registry-audit.mjs',
  'skills/content-os-registry/references/blocks-and-components.md',
  'skills/content-os-registry/references/contributing.md',
  'skills/content-os-registry/rules/registry-contract.md',
  'skills/content-os-registry/examples/registry-manifest.jsonl',
  'skills/content-os-registry/examples/block-data-chart.html',
  'skills/content-os-registry/fixtures/positive/valid-registry-brief.yml',
  'skills/content-os-registry/fixtures/negative/unregistered-block.yml',
  'skills/content-os-registry/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-registry/examples/registry-manifest.jsonl',
  'skills/content-os-registry/examples/block-data-chart.html',
  'skills/content-os-registry/fixtures/positive/valid-registry-brief.yml',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'registry-block',
  'registry-component',
  'data-composition-src',
  'data-composition-id',
  'seek-safe',
  'offline-first',
  'hash-bound',
  'sub-composition',
  'effect-snippet',
  'paused: true',
  'window.__timelines',
  'sha256',
  'RENDERED_DRAFT',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSR_CONTRACT_MISSING: ${token}`);
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
    throw new Error(`COSR_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get(
  'skills/content-os-registry/fixtures/negative/unregistered-block.yml',
);
for (const token of [
  'missing-sha256',
  'missing-seek-safe',
  'network-in-block',
  'https://',
  'block-missing-dimensions',
  'component-with-dimensions',
  'not-offline',
  'missing-composition-id',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSR_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-registry: ${required.length} governed resources, reusable blocks + components, hash-bound, seek-safe, offline-first.`,
);
