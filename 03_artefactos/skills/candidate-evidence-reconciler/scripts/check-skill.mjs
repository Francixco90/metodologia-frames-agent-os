import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'candidate-evidence-reconciler';
const base = `skills/${id}`;
const required = [
  'SKILL.md', 'LINEAGE.yml', 'references/evidence-policy.md',
  'schemas/candidate-evidence-bank-v1.schema.json',
  'fixtures/positive/verified-and-inferred.json',
  'fixtures/negative/rejected-promotions.json', 'receipts/runtime-boundary.yml',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/candidate-evidence-bank-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/verified-and-inferred.json'));
const negative = JSON.parse(docs.get('fixtures/negative/rejected-promotions.json'));

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.1.0',
  'lifecycle_state: active', 'verified', 'user_confirmed', 'inferred', 'missing',
  'network_allowed: false', 'publication_authority: false']) {
  if (!all.includes(token)) throw new Error(`CAR-EVIDENCE-MISSING ${token}`);
}
if (schema.title !== 'CandidateEvidenceBankV1') throw new Error('CAR-EVIDENCE-SCHEMA');
const inferred = positive.evidence.find(({confidence}) => confidence === 'inferred');
if (!inferred || !positive.gaps.some(({evidence_id}) => evidence_id === inferred.evidence_id)) {
  throw new Error('CAR-EVIDENCE-INFERRED-NOT-GAP');
}
for (const caseId of ['job_requirement_as_capability', 'target_metric_as_achievement', 'course_as_certification', 'conflicting_dates', 'missing_source_ref']) {
  if (!negative.cases.some(({id: idValue, expected}) => idValue === caseId && expected === 'BLOCKED')) {
    throw new Error(`CAR-EVIDENCE-NEGATIVE ${caseId}`);
  }
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-EVIDENCE-PRIVATE-LOCATOR');
console.info(`PASS ${id}: confidence-gated evidence, contradiction and gap contracts.`);
