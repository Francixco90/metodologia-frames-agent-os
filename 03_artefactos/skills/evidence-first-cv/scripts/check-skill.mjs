import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'evidence-first-cv';
const base = `skills/${id}`;
const required = [
  'SKILL.md', 'LINEAGE.yml', 'references/cv-quality-contract.md',
  'schemas/cv-package-v1.schema.json', 'fixtures/positive/targeted-cv-package.json',
  'fixtures/negative/rejected-cv-packages.json', 'receipts/runtime-boundary.yml',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/cv-package-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/targeted-cv-package.json'));
const negative = JSON.parse(docs.get('fixtures/negative/rejected-cv-packages.json'));

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.1.0',
  'lifecycle_state: active', 'candidate-neutral-ats', 'Markdown canónico', 'ATS-safe',
  'network_allowed: false', 'submission_authority: false', 'CR_PACKAGE_QA']) {
  if (!all.includes(token)) throw new Error(`CAR-CV-MISSING ${token}`);
}
if (schema.title !== 'CvPackageV1') throw new Error('CAR-CV-SCHEMA');
if (positive.outputs.length < 2 || positive.outputs.some(({materialized, sha256}) => !materialized || !/^[a-f0-9]{64}$/u.test(sha256))) {
  throw new Error('CAR-CV-OUTPUTS');
}
for (const caseId of ['unsupported_claim', 'inferred_claim_promoted', 'missing_material_output', 'pdf_not_selectable', 'cross_format_contradiction', 'remote_asset']) {
  if (!negative.cases.some(({id: value}) => value === caseId)) throw new Error(`CAR-CV-NEGATIVE ${caseId}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-CV-PRIVATE-LOCATOR');
console.info(`PASS ${id}: evidence-bound recruiter/ATS package and material output contract.`);
