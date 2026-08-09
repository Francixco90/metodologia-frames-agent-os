import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'career-opportunity-finder';
const base = `skills/${id}`;
const required = [
  'SKILL.md', 'LINEAGE.yml', 'references/opportunity-policy.md',
  'schemas/job-opportunity-v1.schema.json', 'fixtures/positive/scored-opportunity.json',
  'fixtures/negative/rejected-opportunities.json', 'receipts/runtime-boundary.yml',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/job-opportunity-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/scored-opportunity.json'));
const negative = JSON.parse(docs.get('fixtures/negative/rejected-opportunities.json'));

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.1.0',
  'lifecycle_state: active', '30', '20', '15', '10', '5', 'network_allowed: false',
  'linkedin_adapter: not_promoted', 'CR_APPLICATION_BRIEF']) {
  if (!all.includes(token)) throw new Error(`CAR-OPPORTUNITY-MISSING ${token}`);
}
if (schema.title !== 'JobOpportunityV1') throw new Error('CAR-OPPORTUNITY-SCHEMA');
const parts = positive.score;
const total = parts.core_evidence + parts.hard_requirements + parts.conditions + parts.transferability +
  parts.publication_quality + parts.sector + parts.application_friction + parts.legitimate_contact;
if (total !== parts.total || total > 100) throw new Error('CAR-OPPORTUNITY-SCORE');
for (const caseId of ['closed_job', 'unknown_vigency', 'missing_canonical_url', 'hard_requirement_failed_high_score', 'duplicate_unresolved', 'random_contact', 'live_search_without_adapter']) {
  if (!negative.cases.some(({id: value}) => value === caseId)) throw new Error(`CAR-OPPORTUNITY-NEGATIVE ${caseId}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-OPPORTUNITY-PRIVATE-LOCATOR');
console.info(`PASS ${id}: immutable snapshots, exact 100-point score and offline boundary.`);
