#!/usr/bin/env node
/**
 * content-os-general-video local skill checker.
 *
 * Validates structure, policy tokens, deterministic runtime boundaries and
 * positive/adversarial renders.
 *
 * Error prefix COSR-GV_.
 */
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runAdversarial} from './check-adversarial.mjs';

const ROOT = process.cwd();
const SKILL_DIR = resolve(ROOT, 'skills/content-os-general-video');
const PREFIX = 'COSR-GV_';

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'schemas/general-video-v1.schema.json',
  'schemas/general-video-v2.schema.json',
  'schemas/piece-scripts-v2.schema.json',
  'schemas/ab-test-v1.schema.json',
  'schemas/semantic-index-v1.schema.json',
  'schemas/video-asset-manifest-v2.schema.json',
  'schemas/video-plan-v1.schema.json',
  'schemas/video-plan-v2.schema.json',
  'schemas/video-render-receipt-v3.schema.json',
  'schemas/video-verification-v2.schema.json',
  'scripts/check-skill.mjs',
  'scripts/video-cli.mjs',
  'scripts/lib/check-suite.mjs',
  'scripts/lib/check-adversarial.mjs',
  'scripts/lib/video-runtime.mjs',
  'scripts/lib/runtime-core.mjs',
  'scripts/lib/runtime-operations.mjs',
  'scripts/generate-synthetic-media.mjs',
  'scripts/workflow-audit.mjs',
  'scripts/linguistic-gate.mjs',
  'references/genre-lenses.md',
  'references/dispatch.md',
  'references/design-discipline.md',
  'references/steps-receta.md',
  'rules/workflow-contract.md',
  'examples/storyboard-brief.jsonl',
  'examples/frame-sequence.jsonl',
  'fixtures/positive/valid-workflow-brief.yml',
  'fixtures/negative/broken-workflow.yml',
  'fixtures/v2-negative/cases.json',
  'fixtures/gates/transcribed-without-gate.yml',
  'receipts/runtime-boundary.yml',
];

const errors = [];

for (const rel of required) {
  if (!existsSync(resolve(SKILL_DIR, rel))) {
    errors.push(`${PREFIX}MISSING_FILE ${rel}`);
  }
}

const skillMd = readFileSync(resolve(SKILL_DIR, 'SKILL.md'), 'utf8');
if (!skillMd.startsWith('---\nname: content-os-general-video\n')) {
  errors.push(`${PREFIX}FRONTMATTER_NAME`);
}
if (!skillMd.includes('description: This skill should be used when')) {
  errors.push(`${PREFIX}FRONTMATTER_DESC`);
}
if (!skillMd.includes('version: 0.4.0')) errors.push(`${PREFIX}FRONTMATTER_VERSION`);
if (!skillMd.includes('license: LicenseRef-MetodologIA-Internal')) {
  errors.push(`${PREFIX}FRONTMATTER_LICENSE`);
}
if (!skillMd.includes('lifecycle_state: active')) {
  errors.push(`${PREFIX}FRONTMATTER_LIFECYCLE`);
}
if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(skillMd)) {
  errors.push(`${PREFIX}ABSOLUTE_PATH`);
}

const requiredTokens = [
  'general-video',
  'orchestrator',
  'step-gated',
  'offline-first',
  'seek-safe',
  'RENDERED_DRAFT',
  'window.__timelines',
  'paused: true',
  'sha256',
  'companion',
  'storyboard',
  'dispatch',
  'Spec → Compile → Verify → Review → Promote',
  'piece-scripts-v2',
  'variantAxis: visual',
];
for (const token of requiredTokens) {
  if (!skillMd.includes(token)) {
    errors.push(`${PREFIX}MISSING_TOKEN ${token}`);
  }
}

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

const negPath = resolve(SKILL_DIR, 'fixtures/negative/broken-workflow.yml');
if (existsSync(negPath)) {
  const neg = readFileSync(negPath, 'utf8');
  const codes = [
    'missing-gate',
    'step-out-of-order',
    'no-render',
    'network-in-workflow',
    'scope-creep',
    'unapproved-render',
  ];
  for (const code of codes) {
    if (!neg.includes(code)) {
      errors.push(`${PREFIX}NEG_MISSING_CODE ${code}`);
    }
  }
} else {
  errors.push(`${PREFIX}MISSING_FILE fixtures/negative/broken-workflow.yml`);
}

const linguistic = spawnSync(
  process.execPath,
  [resolve(SKILL_DIR, 'scripts/linguistic-gate.mjs'), resolve(SKILL_DIR, 'fixtures/gates/transcribed-without-gate.yml')],
  {encoding: 'utf8'},
);
if (linguistic.status === 0 || !linguistic.stderr.includes('linguistic-gate')) {
  errors.push(`${PREFIX}LINGUISTIC_GATE`);
}

runAdversarial({SKILL_DIR, errors});

if (errors.length > 0) {
  console.error(`FAIL content-os-general-video: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exitCode = 1;
} else {
  console.info(
    'PASS content-os-general-video: v1 read compatibility, v2 Spec First CLI, A/B/miniclip gates, fixtures and forbidden-scan.',
  );
}
