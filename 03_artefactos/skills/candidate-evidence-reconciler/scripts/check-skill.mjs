import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'candidate-evidence-reconciler';
const base = `skills/${id}`;
const required = [
  'SKILL.md', 'LINEAGE.yml', 'references/evidence-policy.md',
  'schemas/candidate-evidence-bank-v1.schema.json',
  'fixtures/positive/verified-and-inferred.json',
  'fixtures/negative/rejected-promotions.json', 'receipts/runtime-boundary.yml',
  'schemas/candidate-evidence-handoff-v1.schema.json',
  'fixtures/positive/spec-ready-handoff.json', 'fixtures/negative/rejected-handoffs.json',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/candidate-evidence-bank-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/verified-and-inferred.json'));
const negative = JSON.parse(docs.get('fixtures/negative/rejected-promotions.json'));
const handoffSchema = JSON.parse(docs.get('schemas/candidate-evidence-handoff-v1.schema.json'));
const handoff = JSON.parse(docs.get('fixtures/positive/spec-ready-handoff.json'));
const rejectedHandoffs = JSON.parse(docs.get('fixtures/negative/rejected-handoffs.json'));

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.2.0',
  'lifecycle_state: active', 'verified', 'user_confirmed', 'inferred', 'missing',
  'bank_sha256', 'source_manifest_sha256', 'cv-spec-v1',
  'network_allowed: false', 'publication_authority: false']) {
  if (!all.includes(token)) throw new Error(`CAR-EVIDENCE-MISSING ${token}`);
}
if (handoffSchema.title !== 'CandidateEvidenceHandoffV1') throw new Error('CAR-EVIDENCE-HANDOFF-SCHEMA');
if (handoff.state !== 'READY_FOR_SPEC' || handoff.next_gate !== 'CR_CV_SPEC_DRAFT') {
  throw new Error('CAR-EVIDENCE-HANDOFF-STATE');
}
if (!/^[a-f0-9]{64}$/u.test(handoff.bank_sha256) || !/^[a-f0-9]{64}$/u.test(handoff.source_manifest_sha256)) {
  throw new Error('CAR-EVIDENCE-HANDOFF-HASH');
}
const prohibited = new Set(handoff.prohibited_evidence_ids);
if (handoff.eligible_evidence_ids.some((evidenceId) => prohibited.has(evidenceId))) {
  throw new Error('CAR-EVIDENCE-HANDOFF-OVERLAP');
}
if (handoff.blocking_contradiction_ids.length > 0) throw new Error('CAR-EVIDENCE-HANDOFF-BLOCKING-CONTRADICTION');
for (const caseId of ['stale_bank_hash', 'stale_source_manifest_hash', 'inferred_marked_eligible',
  'missing_marked_eligible', 'blocking_contradiction_ready', 'eligible_and_prohibited_overlap',
  'requirement_added_as_evidence']) {
  if (!rejectedHandoffs.cases.some(({id: value, expected}) => value === caseId && expected === 'BLOCKED')) {
    throw new Error(`CAR-EVIDENCE-HANDOFF-NEGATIVE ${caseId}`);
  }
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
console.info(`PASS ${id}: confidence-gated evidence and hash-bound handoff for CV spec.`);
