import {readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';

import {parseSimpleYml} from './parse-simple-yml.mjs';

const id = 'context-teammates';
const root = process.cwd();
const skillDir = join(root, 'skills', id);

const required = [
  'SKILL.md',
  'context.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/case-01.yml',
  'fixtures/negative/case-01.yml',
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(skillDir, p), 'utf8')]));
const combined = [...contents.values()].join('\n');
const failures = [];

// Forbidden APIs must be absent across all governed files. The absolute-path
// prefixes are assembled from char codes so this checker source does not
// itself contain the literal forbidden path strings.
const usersPrefix = String.fromCharCode(47, 85, 115, 101, 114, 115, 47); // /Users/
const homePrefix = String.fromCharCode(47, 104, 111, 109, 101, 47); // /home/
const winUsersPrefix = String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92); // C:\Users\

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
]) {
  if (pattern.test(combined)) {
    failures.push(`forbidden API detected: ${String(pattern)}`);
  }
}

for (const prefix of [usersPrefix, homePrefix, winUsersPrefix]) {
  if (combined.includes(prefix)) {
    failures.push(`forbidden absolute path prefix detected: ${prefix}`);
  }
}

// Governance tokens must be present.
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'coverage_gap',
  'fail-closed',
  'Derivada de',
]) {
  if (!combined.includes(token)) {
    failures.push(`missing governance token: ${token}`);
  }
}

// SKILL.md frontmatter must declare 4 scalar fields: name, description, version, license.
const skillMd = contents.get('SKILL.md');
const fmMatch = /^---\n([\s\S]*?)\n---/u.exec(skillMd);
if (!fmMatch) {
  failures.push('SKILL.md frontmatter not found');
} else {
  const fm = fmMatch[1];
  const scalars = ['name', 'description', 'version', 'license'];
  const present = scalars.filter((k) => new RegExp(`^${k}:`, 'mu').test(fm));
  if (present.length !== 4) {
    failures.push(`frontmatter expected 4 scalar fields, got ${present.length}`);
  }
}

// LINEAGE.yml must declare all 10 top-level fields.
const lineage = contents.get('LINEAGE.yml');
const lineageKeys = [
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
const lineagePresent = lineageKeys.filter((k) => new RegExp(`^${k}:`, 'mu').test(lineage));
if (lineagePresent.length !== 10) {
  failures.push(`LINEAGE expected 10 fields, got ${lineagePresent.length}`);
}

const publicContext = contents.get('context.md');
if (!/^version: 0\.2\.0$/mu.test(skillMd) || !/^version: 0\.2\.0$/mu.test(lineage)) {
  failures.push('version mismatch; expected 0.2.0');
}
for (let section = 1; section <= 6; section += 1) {
  if (!publicContext.includes(`## ${section}.`)) failures.push(`context.md missing section ${section}`);
}
if (!skillMd.includes('[context.md](context.md)')) failures.push('SKILL.md must link context.md');
const words = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
if (words(skillMd) > 800 || words(publicContext) > 400 || publicContext.split('\n').length > 100) {
  failures.push('skill/context budget exceeded');
}

const pos = parseSimpleYml(contents.get('fixtures/positive/case-01.yml'));
if (!pos.name || !pos.scenario || !pos.expected_behavior) {
  failures.push('positive fixture missing required keys: name, scenario, expected_behavior');
}

const neg = parseSimpleYml(contents.get('fixtures/negative/case-01.yml'));
if (!neg.violation) {
  failures.push('negative fixture missing violation folded scalar');
}

if (failures.length > 0) {
  console.error(`FAIL ${id}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.info(
  `PASS ${id}: ${required.length} governed resources, frontmatter 4 fields, LINEAGE 10 fields, fixtures parse, clean-room, fail-closed.`,
);
