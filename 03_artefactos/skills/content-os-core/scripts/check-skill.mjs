import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-core/SKILL.md',
  'skills/content-os-core/context.md',
  'skills/content-os-core/LINEAGE.yml',
  'skills/content-os-core/schemas/html-composition-v1.schema.json',
  'skills/content-os-core/scripts/render-html.ts',
  'skills/content-os-core/scripts/check-skill.mjs',
  'skills/content-os-core/fixtures/positive/minimal-10s.html',
  'skills/content-os-core/fixtures/negative/network-random.html',
  'skills/content-os-core/examples/minimal.html',
  'skills/content-os-core/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pkgVersion = (name) =>
  packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
for (const [name, version] of Object.entries({
  playwright: '1.61.1',
  gsap: '3.15.0',
})) {
  if (pkgVersion(name) !== version) {
    throw new Error(`COS_PIN_MISMATCH: ${name}@${String(pkgVersion(name))}`);
  }
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-core/scripts/render-html.ts',
  'skills/content-os-core/examples/minimal.html',
  'skills/content-os-core/fixtures/positive/minimal-10s.html',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'version: 0.2.0',
  '## 1. Activación',
  '## 8. Handoff',
  'data-composition-id',
  'data-duration',
  'data-start',
  'window.__timelines',
  'gsap.timeline',
  'paused: true',
  'chromium.launch',
  'screenshot',
  'image2pipe',
  'libx264',
  'RENDERED_DRAFT',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COS_CONTRACT_MISSING: ${token}`);
  }
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`COS_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-core/fixtures/negative/network-random.html');
for (const token of ['Math.random', 'Date.now', 'setTimeout', 'fetch', 'animation:', 'https://']) {
  if (!negative.includes(token)) {
    throw new Error(`COS_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-core: ${required.length} governed resources, Playwright+FFmpeg adapter, offline deterministic.`,
);
