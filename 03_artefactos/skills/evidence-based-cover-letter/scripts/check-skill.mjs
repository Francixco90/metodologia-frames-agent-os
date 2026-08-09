import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'evidence-based-cover-letter';
const base = `skills/${id}`;
const required = [
  'SKILL.md', 'LINEAGE.yml', 'references/letter-quality-contract.md',
  'schemas/cover-letter-package-v1.schema.json', 'fixtures/positive/letter-package.json',
  'fixtures/negative/rejected-letters.json', 'receipts/runtime-boundary.yml',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/cover-letter-package-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/letter-package.json'));
const negative = JSON.parse(docs.get('fixtures/negative/rejected-letters.json'));

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.1.0',
  'lifecycle_state: active', '180–280', '80–140', '40–70', 'Requirement–Evidence Map',
  'network_allowed: false', 'submission_authority: false', 'CR_PACKAGE_QA']) {
  if (!all.includes(token)) throw new Error(`CAR-LETTER-MISSING ${token}`);
}
if (schema.title !== 'CoverLetterPackageV1' || positive.word_count < 180 || positive.word_count > 280) {
  throw new Error('CAR-LETTER-SCHEMA-OR-BUDGET');
}
if (positive.need_ids.length > 3 || positive.evidence_ids.length > 2) throw new Error('CAR-LETTER-SELECTION');
for (const caseId of ['missing_job_snapshot', 'inferred_claim', 'random_contact', 'placeholder_remaining', 'repeats_cv_summary', 'channel_budget_exceeded']) {
  if (!negative.cases.some(({id: value}) => value === caseId)) throw new Error(`CAR-LETTER-NEGATIVE ${caseId}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-LETTER-PRIVATE-LOCATOR');
console.info(`PASS ${id}: job-bound argument, channel budgets and evidence-only claims.`);
