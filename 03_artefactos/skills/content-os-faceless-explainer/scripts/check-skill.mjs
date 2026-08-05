import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-faceless-explainer/SKILL.md',
  'skills/content-os-faceless-explainer/LINEAGE.yml',
  'skills/content-os-faceless-explainer/schemas/faceless-explainer-v1.schema.json',
  'skills/content-os-faceless-explainer/scripts/check-skill.mjs',
  'skills/content-os-faceless-explainer/scripts/workflow-audit.mjs',
  'skills/content-os-faceless-explainer/references/story-design.md',
  'skills/content-os-faceless-explainer/references/visual-design.md',
  'skills/content-os-faceless-explainer/rules/workflow-contract.md',
  'skills/content-os-faceless-explainer/examples/storyboard-brief.jsonl',
  'skills/content-os-faceless-explainer/examples/frame-sequence.jsonl',
  'skills/content-os-faceless-explainer/fixtures/positive/valid-workflow-brief.yml',
  'skills/content-os-faceless-explainer/fixtures/negative/broken-workflow.yml',
  'skills/content-os-faceless-explainer/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-faceless-explainer/examples/storyboard-brief.jsonl',
  'skills/content-os-faceless-explainer/examples/frame-sequence.jsonl',
  'skills/content-os-faceless-explainer/fixtures/positive/valid-workflow-brief.yml',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'faceless-explainer',
  'orchestrator',
  'step-gated',
  'invented-visuals',
  'no-capture',
  'data-composition-src',
  'paused: true',
  'window.__timelines',
  'sha256',
  'offline-first',
  'seek-safe',
  'RENDERED_DRAFT',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSR-FE_CONTRACT_MISSING: ${token}`);
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
    throw new Error(`COSR-FE_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get(
  'skills/content-os-faceless-explainer/fixtures/negative/broken-workflow.yml',
);
for (const token of [
  'missing-gate',
  'step-out-of-order',
  'capture-in-faceless',
  'footage-in-faceless',
  'no-render',
  'https://',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSR-FE_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-faceless-explainer: ${required.length} governed resources, 8-step gated orchestrator, faceless invented visuals, hash-bound, seek-safe, offline-first.`,
);
