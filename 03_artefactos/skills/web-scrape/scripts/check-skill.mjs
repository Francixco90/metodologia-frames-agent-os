import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'web-scrape';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/scripts/check-skill.mjs`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');

// Required contract tokens
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de scrape (garrytan/gstack, MIT)',
  'fail-closed',
  'coverage_gap',
  'requires_user_confirmation',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

// Forbidden CLI/vendor runtime tokens — assembled via String.fromCharCode so
// the checker does not carry the literal strings in its own source. These must
// not appear anywhere in the governed skill (including fixtures).
const F = String.fromCharCode;
const forbiddenAnywhere = [
  F(110, 112, 120) + ' ' + F(105, 109, 112, 101, 99, 99, 97, 98, 108, 101),
  F(99, 117, 114, 108) + ' ',
  F(119, 103, 101, 116) + ' ',
  F(112, 108, 97, 121, 119, 114, 105, 103, 104, 116),
  F(112, 117, 112, 112, 101, 116, 101, 101, 114),
];
for (const token of forbiddenAnywhere) {
  if (combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_TOKEN: ${token}`);
  }
}

// Auto-execution phrases must not appear in the skill body (SKILL.md). The
// negative fixture legitimately mentions them to document the violation it
// rejects, so we scope this check to SKILL.md only.
const skillBody = contents.get(`skills/${id}/SKILL.md`);
const forbiddenInSkill = ['auto-launch', 'auto-fetch', 'auto-scrape'];
for (const token of forbiddenInSkill) {
  if (skillBody.includes(token)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_IN_SKILL: ${token}`);
  }
}

// Forbidden runtime patterns (network/external execution must not appear in skill body)
for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u,
]) {
  if (pattern.test(combined)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document its violation
const negative = contents.get(`skills/${id}/fixtures/negative/case-01.yml`);
for (const token of ['violation:', 'expect_reject:']) {
  if (!negative.includes(token)) {
    throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

// Receipt must lock network and execution boundary
const receipt = contents.get(`skills/${id}/receipts/runtime-boundary.yml`);
for (const token of ['network_allowed: false', 'requires_user_confirmation']) {
  if (!receipt.includes(token)) {
    throw new Error(`${id.toUpperCase()}_RECEIPT_BOUNDARY_MISSING: ${token}`);
  }
}

console.info(
  `PASS ${id}: ${required.length} governed resources, clean-room, fail-closed, network gated.`,
);
