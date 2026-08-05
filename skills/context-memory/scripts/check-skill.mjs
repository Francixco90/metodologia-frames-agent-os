import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'context-memory';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
];

// Read all required files; throw on missing.
const contents = new Map();
for (const p of required) {
  const abs = resolve(root, p);
  if (!existsSync(abs)) {
    throw new Error(`${id.toUpperCase()}_MISSING_FILE: ${p}`);
  }
  contents.set(p, readFileSync(abs, 'utf8'));
}

const combined = [...contents.values()].join('\n');

// --- Frontmatter: 4 scalar fields (name, description, version, license) ---
const skillMd = contents.get(`skills/${id}/SKILL.md`);
const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/u);
if (!fmMatch) {
  throw new Error(`${id.toUpperCase()}_FRONTMATTER_MISSING`);
}
const frontmatter = fmMatch[1];
const scalarFields = ['name', 'description', 'version', 'license'];
for (const field of scalarFields) {
  const re = new RegExp(`^${field}:\\s*\\S`, 'mu');
  if (!re.test(frontmatter)) {
    throw new Error(`${id.toUpperCase()}_FRONTMATTER_FIELD_MISSING: ${field}`);
  }
}

// --- LINEAGE: 10 fields ---
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

// --- Fixtures: parse YAML (lightweight structural check, no external deps) ---
function parseYamlKeys(text) {
  const keys = new Set();
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u);
    if (m) {
      keys.add(m[1]);
    }
  }
  return keys;
}

const positive = contents.get(`skills/${id}/fixtures/positive/case-01.yml`);
const positiveKeys = parseYamlKeys(positive);
for (const key of ['name', 'scenario', 'expected_behavior']) {
  if (!positiveKeys.has(key)) {
    throw new Error(`${id.toUpperCase()}_POSITIVE_FIXTURE_MISSING_KEY: ${key}`);
  }
}

const negative = contents.get(`skills/${id}/fixtures/negative/case-01.yml`);
const negativeKeys = parseYamlKeys(negative);
for (const key of ['name', 'scenario', 'violation', 'expected_behavior']) {
  if (!negativeKeys.has(key)) {
    throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_MISSING_KEY: ${key}`);
  }
}
if (!negative.includes('violation:')) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_NO_VIOLATION`);
}

// --- Contract tokens ---
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

// --- FORBIDDEN APIs in source (required files) ---
const forbiddenApiPatterns = [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
];
for (const pattern of forbiddenApiPatterns) {
  if (pattern.test(combined)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// --- FORBIDDEN absolute paths, constructed from char codes so this checker
// source does not contain the literal forbidden strings ---
const prefixUsers = String.fromCharCode(47, 85, 115, 101, 114, 115, 47);
const prefixHome = String.fromCharCode(47, 104, 111, 109, 101, 47);
const prefixWin = String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92);
for (const prefix of [prefixUsers, prefixHome, prefixWin]) {
  if (combined.includes(prefix)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_ABSOLUTE_PATH: ${prefix}`);
  }
}

console.info(
  `PASS ${id}: ${required.length} governed resources, frontmatter 4 scalar fields, LINEAGE 10 fields, fixtures parsed, fail-closed.`,
);
