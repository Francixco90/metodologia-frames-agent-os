import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'career-application-orchestrator';
const base = `skills/${id}`;
const required = [
  'SKILL.md',
  'context.md',
  'LINEAGE.yml',
  'references/orchestration-contract.md',
  'schemas/career-application-contract-v1.schema.json',
  'fixtures/positive/cv-general-route.json',
  'fixtures/negative/fail-closed-routes.json',
  'receipts/runtime-boundary.yml',
  'scripts/route-career.mjs',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/career-application-contract-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/cv-general-route.json'));
const negative = JSON.parse(docs.get('fixtures/negative/fail-closed-routes.json'));

for (const token of [
  `name: ${id}`,
  'description: This skill should be used when',
  'version: 0.2.0',
  '## 1. Propósito y activación',
  '## 6. Gates, handoff y contextos hijos',
  'lifecycle_state: active',
  'local-evaluation',
  'C00 → C01 → C02 → C06 → C08',
  'SUBMITTED',
  'network_allowed: false',
  'submission_authority: false',
]) if (!all.includes(token)) throw new Error(`CAR-ORCH-MISSING ${token}`);

if (schema.title !== 'CareerApplicationContractV1') throw new Error('CAR-ORCH-SCHEMA');
if (positive.expected.maximum_blocking_questions !== 3) throw new Error('CAR-ORCH-QUESTIONS');
if (positive.expected.selected_stage_path.join(',') !== 'C00,C01,C02,C06,C08') {
  throw new Error('CAR-ORCH-ROUTE');
}
const negativeIds = new Set(negative.cases.map(({id: caseId}) => caseId));
for (const caseId of ['ambiguous_candidate', 'inferred_submitted', 'changed_package_hash', 'captcha_required', 'pii_to_git']) {
  if (!negativeIds.has(caseId)) throw new Error(`CAR-ORCH-NEGATIVE ${caseId}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-ORCH-PRIVATE-LOCATOR');
console.info(`PASS ${id}: deterministic brief-first routing and fail-closed submission boundary.`);
