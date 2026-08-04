#!/usr/bin/env node
/**
 * content-os-product-launch-video local skill checker.
 *
 * Validates:
 *   1. 14 required files present.
 *   2. SKILL.md frontmatter (name, description, version, license, metadata).
 *   3. Required tokens present in SKILL.md.
 *   4. Forbidden API scan on runtimeCombined (examples + positive fixture).
 *   5. Negative fixture contains the 6 violation code tokens (completeness).
 *
 * Error prefix COSR-PLV_.
 */
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const ROOT = process.cwd();
const SKILL_DIR = resolve(ROOT, 'skills/content-os-product-launch-video');
const PREFIX = 'COSR-PLV_';

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'schemas/product-launch-video-v1.schema.json',
  'scripts/check-skill.mjs',
  'scripts/workflow-audit.mjs',
  'references/story-design.md',
  'references/visual-design.md',
  'references/capture-and-assets.md',
  'rules/workflow-contract.md',
  'examples/storyboard-brief.jsonl',
  'examples/frame-sequence.jsonl',
  'fixtures/positive/valid-workflow-brief.yml',
  'fixtures/negative/broken-workflow.yml',
  'receipts/runtime-boundary.yml',
];

const errors = [];

// 1. required files
for (const rel of required) {
  if (!existsSync(resolve(SKILL_DIR, rel))) {
    errors.push(`${PREFIX}MISSING_FILE ${rel}`);
  }
}

// 2. SKILL.md frontmatter
const skillMd = readFileSync(resolve(SKILL_DIR, 'SKILL.md'), 'utf8');
if (!skillMd.startsWith('---\nname: content-os-product-launch-video\n')) {
  errors.push(`${PREFIX}FRONTMATTER_NAME`);
}
if (!skillMd.includes('description: This skill should be used when')) {
  errors.push(`${PREFIX}FRONTMATTER_DESC`);
}
if (!skillMd.includes('version: 0.1.0')) {
  errors.push(`${PREFIX}FRONTMATTER_VERSION`);
}
if (!skillMd.includes('license: LicenseRef-MetodologIA-Internal')) {
  errors.push(`${PREFIX}FRONTMATTER_LICENSE`);
}
if (!skillMd.includes('lifecycle_state: active')) {
  errors.push(`${PREFIX}FRONTMATTER_LIFECYCLE`);
}
if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(skillMd)) {
  errors.push(`${PREFIX}ABSOLUTE_PATH`);
}

// 3. required tokens
const requiredTokens = [
  'product-launch-video',
  'orchestrator',
  'step-gated',
  'capture',
  'playwright',
  'offline-first',
  'seek-safe',
  'RENDERED_DRAFT',
  'window.__timelines',
  'paused: true',
  'sha256',
];
for (const token of requiredTokens) {
  if (!skillMd.includes(token)) {
    errors.push(`${PREFIX}MISSING_TOKEN ${token}`);
  }
}

// 4. forbidden API scan on runtimeCombined (examples + positive fixture)
const runtimeFiles = [
  'examples/storyboard-brief.jsonl',
  'examples/frame-sequence.jsonl',
  'fixtures/positive/valid-workflow-brief.yml',
];
const runtimeCombined = runtimeFiles
  .map((rel) => {
    const p = resolve(SKILL_DIR, rel);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  })
  .join('\n');

const forbidden = [
  {re: /\bDate\.now\s*\(/, name: 'Date.now('},
  {re: /\bMath\.random\s*\(/, name: 'Math.random('},
  {re: /\bnew\s+Date\s*\(/, name: 'new Date('},
  {re: /\bperformance\.now\s*\(/, name: 'performance.now('},
  {re: /\bfetch\s*\(/, name: 'fetch('},
  {re: /\bsetTimeout\s*\(/, name: 'setTimeout('},
  {re: /\bsetInterval\s*\(/, name: 'setInterval('},
  {re: /\bgetBoundingClientRect\s*\(/, name: 'getBoundingClientRect('},
  {re: /repeat:\s*-1/, name: 'repeat:-1'},
  {re: /https?:\/\//, name: 'https://'},
  {re: /transition:\s/, name: 'transition:'},
];
for (const {re, name} of forbidden) {
  if (re.test(runtimeCombined)) {
    errors.push(`${PREFIX}FORBIDDEN_API ${name}`);
  }
}

// 5. negative fixture completeness (must contain the 6 violation code tokens)
const negPath = resolve(SKILL_DIR, 'fixtures/negative/broken-workflow.yml');
if (existsSync(negPath)) {
  const neg = readFileSync(negPath, 'utf8');
  const codes = [
    'missing-gate',
    'step-out-of-order',
    'capture-blocked',
    'no-capture-for-url',
    'no-render',
    'network-in-workflow',
  ];
  for (const code of codes) {
    if (!neg.includes(code)) {
      errors.push(`${PREFIX}NEG_MISSING_CODE ${code}`);
    }
  }
} else {
  errors.push(`${PREFIX}MISSING_FILE fixtures/negative/broken-workflow.yml`);
}

if (errors.length > 0) {
  console.error(`FAIL content-os-product-launch-video: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exitCode = 1;
} else {
  console.info(
    'PASS content-os-product-launch-video: 14 files, frontmatter, tokens, forbidden-scan, negative-completeness.',
  );
}
