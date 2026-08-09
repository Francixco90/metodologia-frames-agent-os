import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'dev-executing-plans';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/references/documentation-governance.md`,
  `skills/${id}/scripts/check-skill.mjs`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/example.md`,
  `skills/${id}/fixtures/negative/example.md`,
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');
const skillMd = contents.get(`skills/${id}/SKILL.md`);
const lineage = contents.get(`skills/${id}/LINEAGE.yml`);

if (!/^version: 0\.3\.0$/mu.test(skillMd) || !/^version: 0\.3\.0$/mu.test(lineage)) {
  throw new Error(`${id.toUpperCase()}_VERSION_MISMATCH`);
}

for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de',
  'fail-closed',
  'coverage_gap',
  id,
  'paso',
  'checkpoint',
  'bloqueador',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

for (const token of [
  'DocumentationImpactPlanV1',
  'DocumentationClosureReceiptV1',
  'DOCS_TRANSVERSAL_COMPLETE',
  'CREATE',
  'EXPAND',
  'EXTEND',
  'CORRECT',
  'MIGRATE',
  'DEPRECATE',
  '[gobierno documental](references/documentation-governance.md)',
]) {
  if (!skillMd.includes(token)) {
    throw new Error(`${id.toUpperCase()}_DOCUMENTATION_GOVERNANCE_MISSING: ${token}`);
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

const negative = contents.get(`skills/${id}/fixtures/negative/example.md`);
if (!negative.includes('violation:')) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_INCOMPLETE`);
}

console.info(`PASS ${id}: ${required.length} governed resources, clean-room, fail-closed.`);
