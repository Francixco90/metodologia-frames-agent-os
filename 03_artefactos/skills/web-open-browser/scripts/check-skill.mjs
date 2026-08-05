// Self-contained ESM checker for web-open-browser. Node standard library only.
// Forbidden tokens built via String.fromCharCode so they never appear literally.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'web-open-browser';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
  `skills/${id}/scripts/check-skill.mjs`,
  `skills/${id}/receipts/runtime-boundary.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');

// Required content tokens.
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de open-gstack-browser (garrytan/gstack, MIT)',
  'fail-closed',
  'coverage_gap',
  'web-open-browser',
  'requires_user_confirmation',
  'network_allowed: false',
  'execution_boundary: requires_user_confirmation',
  'violation:',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

// Forbidden API and locator tokens, assembled so they do not appear literally.
const forbidden = [
  String.fromCharCode(102, 101, 116, 99, 104, 40),
  String.fromCharCode(77, 97, 116, 104, 46, 114, 97, 110, 100, 111, 109),
  String.fromCharCode(68, 97, 116, 101, 46, 110, 111, 119),
  String.fromCharCode(115, 101, 116, 84, 105, 109, 101, 111, 117, 116, 40),
  String.fromCharCode(115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108, 40),
  String.fromCharCode(47, 85, 115, 101, 114, 115, 47),
  String.fromCharCode(47, 104, 111, 109, 101, 47),
];

for (const token of forbidden) {
  if (combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_TOKEN: ${token}`);
  }
}

// Negative fixture must declare a violation.
const negative = contents.get(`skills/${id}/fixtures/negative/case-01.yml`);
if (!negative || !negative.includes('violation:')) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_INCOMPLETE`);
}

console.info(`PASS ${id}: ${required.length} governed resources, clean-room, fail-closed.`);
