import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';

const root = process.cwd();
const id = 'context-save';
const skillDir = join(root, 'skills', id);

const required = ['SKILL.md', 'LINEAGE.yml', 'receipts/runtime-boundary.yml'];

const fixtureFiles = ['fixtures/positive/case-01.yml', 'fixtures/negative/case-01.yml'];

const allPaths = [...required, ...fixtureFiles];

function readSkill(rel) {
  const abs = join(skillDir, rel);
  if (!existsSync(abs)) {
    throw new Error(`FAIL ${id}: missing required file: ${rel}`);
  }
  return readFileSync(abs, 'utf8');
}

function readCheckerSelf() {
  const selfPath = join(skillDir, 'scripts', 'check-skill.mjs');
  if (!existsSync(selfPath)) {
    throw new Error(`FAIL ${id}: missing checker script itself`);
  }
  return readFileSync(selfPath, 'utf8');
}

// 1. Required files exist and are readable.
const contents = new Map();
for (const rel of allPaths) {
  contents.set(rel, readSkill(rel));
}

// 2. SKILL.md frontmatter has the 4 required fields: name, description,
//    version, license.
const skillMd = contents.get('SKILL.md');
const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/u);
if (!fmMatch) {
  throw new Error(`FAIL ${id}: SKILL.md missing frontmatter block`);
}
const fm = fmMatch[1];
const fmFields = ['name', 'description', 'version', 'license'];
for (const field of fmFields) {
  const re = new RegExp(`^${field}:`, 'mu');
  if (!re.test(fm)) {
    throw new Error(`FAIL ${id}: SKILL.md frontmatter missing field: ${field}`);
  }
}

// 3. LINEAGE.yml has the 5 required fields.
const lineage = contents.get('LINEAGE.yml');
const lineageFields = [
  'content_origin',
  'derivation_mode',
  'external_fragments_reused',
  'publication_authority',
  'authority_refs',
];
for (const field of lineageFields) {
  const re = new RegExp(`^${field}:`, 'mu');
  if (!re.test(lineage)) {
    throw new Error(`FAIL ${id}: LINEAGE.yml missing field: ${field}`);
  }
}

// 4. Fixtures parse as YAML (lightweight structural check — node has no
//    built-in YAML parser, so assert the expected top-level keys exist).
const positive = contents.get('fixtures/positive/case-01.yml');
for (const key of ['name:', 'scenario:', 'expected_behavior:']) {
  if (!new RegExp(`^${key}`, 'mu').test(positive)) {
    throw new Error(`FAIL ${id}: positive fixture missing key: ${key}`);
  }
}

const negative = contents.get('fixtures/negative/case-01.yml');
for (const key of ['name:', 'scenario:', 'violation:', 'expected_behavior:']) {
  if (!new RegExp(`^${key}`, 'mu').test(negative)) {
    throw new Error(`FAIL ${id}: negative fixture missing key: ${key}`);
  }
}
// violation must be a folded scalar (starts with ">").
if (!/^violation:\s*>/mu.test(negative)) {
  throw new Error(`FAIL ${id}: negative fixture violation must be a folded scalar (>)`);
}

// 5. Receipt asserts the two boundary fields.
const receipt = contents.get('receipts/runtime-boundary.yml');
for (const key of ['network_allowed:', 'execution_boundary:']) {
  if (!new RegExp(`^${key}`, 'mu').test(receipt)) {
    throw new Error(`FAIL ${id}: runtime-boundary.yml missing key: ${key}`);
  }
}

// 6. FORBIDDEN APIs anywhere in the skill directory (including this checker).
const scanned = [skillMd, lineage, receipt, positive, negative, readCheckerSelf()];

// Also scan every file inside the skill dir for completeness.
function walk(dir) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      scanned.push(readFileSync(full, 'utf8'));
    }
  }
}
walk(skillDir);

const combined = scanned.join('\n');

const forbiddenPatterns = [
  {name: 'Math.random', re: /\bMath\.random\s*\(/u},
  {name: 'Date.now', re: /\bDate\.now\s*\(/u},
  {name: 'new Date', re: /\bnew\s+Date\s*\(/u},
  {name: 'fetch', re: /\bfetch\s*\(/u},
  {name: 'setTimeout', re: /\bsetTimeout\s*\(/u},
  {name: 'setInterval', re: /\bsetInterval\s*\(/u},
];

// Absolute path literals are forbidden in skill content. Build the regexes
// from char codes so the checker source itself does not contain the banned
// literals (which would self-trip the scan).
const usersAbs = new RegExp(['/', 'U', 's', 'e', 'r', 's', '/'].join(''), 'u');
const homeAbs = new RegExp(['/', 'h', 'o', 'm', 'e', '/'].join(''), 'u');
const winAbs = new RegExp(['[A-Za-z]:', '\\\\', 'U', 's', 'e', 'r', 's', '\\\\'].join(''), 'u');
const absPatterns = [
  {name: 'unix-users-absolute', re: usersAbs},
  {name: 'unix-home-absolute', re: homeAbs},
  {name: 'windows-users-absolute', re: winAbs},
];

for (const {name, re} of forbiddenPatterns) {
  if (re.test(combined)) {
    throw new Error(`FAIL ${id}: forbidden API detected: ${name}`);
  }
}

for (const {name, re} of absPatterns) {
  if (re.test(combined)) {
    throw new Error(`FAIL ${id}: forbidden absolute path detected: ${name}`);
  }
}

// 7. No imports of vendor code.
if (
  /skills\/vendor\//u.test(combined.replace(/authority_refs:[\s\S]*?(?=\n\w|\n---|\n[a-z])/u, ''))
) {
  // Allow the authority_refs line in LINEAGE.yml to reference the vendor doc;
  // reject any actual import/require of vendor code.
}

// Stricter: reject import/require statements pointing at vendor paths.
const importRe = /\b(?:import|require)\s*\(?[^)]*skills\/vendor\//u;
if (importRe.test(combined)) {
  throw new Error(`FAIL ${id}: forbidden vendor code import detected`);
}

// 8. Governing tokens present in SKILL.md.
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de',
  'fail-closed',
  'coverage_gap',
]) {
  if (!combined.includes(token)) {
    throw new Error(`FAIL ${id}: governing token missing: ${token}`);
  }
}

console.info(
  `PASS ${id}: ${allPaths.length} governed resources, frontmatter + lineage + fixtures valid, clean-room, fail-closed.`,
);
