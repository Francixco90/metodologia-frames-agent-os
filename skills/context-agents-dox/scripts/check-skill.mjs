import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'context-agents-dox';

const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
  `skills/${id}/scripts/check-skill.mjs`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');

// --- Required presence tokens ---
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de',
  'fail-closed',
  'coverage_gap',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

// --- Forbidden APIs in source text ---
for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(combined)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// --- Absolute path prefixes, built from char codes so this checker does not self-trip ---
const slashU = String.fromCharCode(47, 85, 115, 101, 114, 115, 47);
const slashH = String.fromCharCode(47, 104, 111, 109, 101, 47);
const winU = String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92);
for (const prefix of [slashU, slashH, winU]) {
  if (combined.includes(prefix)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_ABSOLUTE_PATH: ${prefix}`);
  }
}

// --- SKILL.md frontmatter: 4 scalar fields ---
const skill = contents.get(`skills/${id}/SKILL.md`);
const fmMatch = /^---\n([\s\S]*?)\n---/u.exec(skill);
if (!fmMatch) {
  throw new Error(`${id.toUpperCase()}_FRONTMATTER_MISSING`);
}
const fm = fmMatch[1];
for (const field of ['name', 'version', 'license', 'description']) {
  const re = new RegExp(`^${field}:\\s+\\S`, 'mu');
  if (!re.test(fm)) {
    throw new Error(`${id.toUpperCase()}_FRONTMATTER_FIELD_MISSING: ${field}`);
  }
}

// --- LINEAGE.yml: 10 required fields ---
const lineage = contents.get(`skills/${id}/LINEAGE.yml`);
const lineageFields = [
  'schema_version',
  'skill_id',
  'version',
  'lifecycle_state',
  'execution_scope',
  'content_origin',
  'derivation_mode',
  'authority_refs',
  'external_fragments_reused',
  'publication_authority',
];
for (const field of lineageFields) {
  const re = new RegExp(`^${field}:`, 'mu');
  if (!re.test(lineage)) {
    throw new Error(`${id.toUpperCase()}_LINEAGE_FIELD_MISSING: ${field}`);
  }
}

// --- Fixtures parse as YAML (lightweight: key presence + structure) ---
const positive = contents.get(`skills/${id}/fixtures/positive/case-01.yml`);
const negative = contents.get(`skills/${id}/fixtures/negative/case-01.yml`);

for (const [label, fixture, mustHave] of [
  ['positive', positive, ['name:', 'scenario:', 'expected_behavior:']],
  ['negative', negative, ['name:', 'scenario:', 'violation:']],
]) {
  for (const key of mustHave) {
    if (!fixture.includes(key)) {
      throw new Error(`${id.toUpperCase()}_${label.toUpperCase()}_FIXTURE_INCOMPLETE: ${key}`);
    }
  }
}

// --- Negative fixture must carry a violation block ---
if (!/^violation:\s*>\s*\n/mu.test(negative)) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_VIOLATION_SHAPE`);
}

console.info(
  `PASS ${id}: ${required.length} governed resources, frontmatter, lineage, fixtures, fail-closed.`,
);
