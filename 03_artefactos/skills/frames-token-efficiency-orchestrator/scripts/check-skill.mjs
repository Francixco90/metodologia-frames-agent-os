import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'frames-token-efficiency-orchestrator';
const base = `skills/${id}`;
const required = [
  'SKILL.md',
  'context.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'references/source-lock.yml',
  'references/adapters.md',
  'fixtures/positive/route-terminal-output.yml',
  'fixtures/negative/reject-unsafe-compression.yml',
];

const docs = new Map();
for (const relative of required) {
  try {
    docs.set(relative, readFileSync(resolve(root, base, relative), 'utf8'));
  } catch {
    console.error(`FAIL ${id}: missing ${relative}`);
    process.exit(1);
  }
}

const all = [...docs.values()].join('\n');
const skill = docs.get('SKILL.md');
const lineage = docs.get('LINEAGE.yml');
const boundary = docs.get('receipts/runtime-boundary.yml');
const sourceLock = docs.get('references/source-lock.yml');
const adapters = docs.get('references/adapters.md');
const positive = docs.get('fixtures/positive/route-terminal-output.yml');
const negative = docs.get('fixtures/negative/reject-unsafe-compression.yml');

for (const trigger of [
  'usar RTK',
  'medir consumo con ccusage',
  'comprimir contexto con Headroom',
  'mapear código con Graphify',
  'usar Caveman',
  'auto-orquestar con Claude Native Toolkit',
]) {
  if (!skill.includes(`"${trigger}"`) || !positive.includes(trigger)) {
    console.error(`FAIL ${id}: trigger missing ${trigger}`);
    process.exit(1);
  }
}

for (const token of [
  `name: ${id}`,
  'description: This skill should be used when',
  'version: 0.2.0',
  'LicenseRef-MetodologIA-Internal',
  'fail-closed',
  'coverage_gap',
  'PASS|FAIL|UNKNOWN|BLOCKED',
]) {
  if (!skill.includes(token)) {
    console.error(`FAIL ${id}: SKILL.md missing ${token}`);
    process.exit(1);
  }
}

for (const heading of ['## 1. Propósito y activación', '## 6. Gates, handoff y contextos hijos']) {
  if (!docs.get('context.md').includes(heading)) {
    console.error(`FAIL ${id}: context.md missing ${heading}`);
    process.exit(1);
  }
}

for (const token of [
  `skill_id: ${id}`,
  'content_origin: locally_authored_adaptation',
  'external_fragments_reused: false',
  'publication_authority: false',
]) {
  if (!lineage.includes(token)) {
    console.error(`FAIL ${id}: LINEAGE missing ${token}`);
    process.exit(1);
  }
}

for (const token of [
  'network_allowed: false',
  'persistent_proxy_allowed: false',
  'global_hook_mutation_allowed: false',
  'raw_recovery: required',
]) {
  if (!boundary.includes(token)) {
    console.error(`FAIL ${id}: runtime boundary missing ${token}`);
    process.exit(1);
  }
}

const sources = ['rtk', 'caveman', 'graphify', 'claude-native-toolkit', 'ccusage', 'headroom'];
for (const source of sources) {
  if (!sourceLock.includes(`id: ${source}`)) {
    console.error(`FAIL ${id}: source lock missing ${source}`);
    process.exit(1);
  }
  if (!adapters.includes(`# ${source}`) && !adapters.includes(`## ${source}`)) {
    console.error(`FAIL ${id}: adapter chapter missing ${source}`);
    process.exit(1);
  }
  if (!positive.includes(`route: ${source}`) && !positive.includes(`chapters.md#${source}`)) {
    console.error(`FAIL ${id}: positive route missing ${source}`);
    process.exit(1);
  }
}

for (const token of [
  'short_terminal_output',
  'human_publishable_content',
  'guardian_verdict',
  'graph_contains_pii',
  'runtime_version_unknown',
  'headroom_recovery_incomplete',
]) {
  if (!negative.includes(token)) {
    console.error(`FAIL ${id}: negative routing case missing ${token}`);
    process.exit(1);
  }
}

for (const token of [
  'double_transform',
  'guardian_compression',
  'no_transform_preserve_verbatim',
  'expected_chapters',
]) {
  if (!all.includes(token)) {
    console.error(`FAIL ${id}: fixtures missing ${token}`);
    process.exit(1);
  }
}

const locator = /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u;
if (locator.test(all)) {
  console.error(`FAIL ${id}: private locator detected`);
  process.exit(1);
}

console.log(`PASS ${id}: six source-locked Frames routes, fail-closed boundaries and adversarial fixture.`);
