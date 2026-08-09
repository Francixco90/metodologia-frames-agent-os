import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'dev-verification-before-completion';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/context.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/scripts/check-skill.mjs`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/verify-before-claiming-done.yml`,
  `skills/${id}/fixtures/negative/claim-done-without-running-verification.yml`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');
const skillMd = contents.get(`skills/${id}/SKILL.md`);
const publicContext = contents.get(`skills/${id}/context.md`);
const lineage = contents.get(`skills/${id}/LINEAGE.yml`);

if (!/^version: 0\.3\.0$/mu.test(skillMd) || !/^version: 0\.3\.0$/mu.test(lineage)) {
  throw new Error(`${id.toUpperCase()}_VERSION_MISMATCH`);
}
for (let section = 1; section <= 6; section += 1) {
  if (!publicContext.includes(`## ${section}.`)) {
    throw new Error(`${id.toUpperCase()}_CONTEXT_SECTION_MISSING: ${section}`);
  }
}
if (!skillMd.includes('[context.md](context.md)')) {
  throw new Error(`${id.toUpperCase()}_CONTEXT_LINK_MISSING`);
}
const words = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
if (words(skillMd) > 800 || words(publicContext) > 400 || publicContext.split('\n').length > 100) {
  throw new Error(`${id.toUpperCase()}_BUDGET_EXCEEDED`);
}

for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de',
  'fail-closed',
  'coverage_gap',
  id,
  'verificación',
  'evidencia',
  'afirmación',
  'DocumentationImpactPlanV1',
  'DocumentationClosureReceiptV1',
  'DOCS_TRANSVERSAL_COMPLETE',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

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

const negative = contents.get(
  `skills/${id}/fixtures/negative/claim-done-without-running-verification.yml`,
);
if (!negative.includes('violation:')) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_INCOMPLETE`);
}

console.info(`PASS ${id}: ${required.length} governed resources, clean-room, fail-closed.`);
