import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
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

for (const token of [`name: ${id}`, 'description: This skill should be used when', 'version: 0.3.0',
  'lifecycle_state: active', 'verified', 'user_confirmed', 'inferred', 'missing',
  'bank_sha256', 'source_manifest_sha256', 'cv-spec-v2', 'career-evidence-readiness-v1',
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
const runtimeCheck = String.raw`
import {readFileSync} from 'node:fs';
import {
  assertCareerEvidenceReadinessBindings, assertEvidenceCandidatePacketBindings,
  calculateCandidatePacketHash, calculateDiscoverySessionHash, calculateEvidenceReadinessHash,
  parseCareerDiscoverySession, parseCareerEvidenceReadiness, parseEvidenceCandidatePacket,
  CvSpecV2Schema,
} from './02_proceso/workflows/career/index.ts';
const fixture = JSON.parse(readFileSync('./03_artefactos/skills/career-evidence-interviewer/fixtures/positive/adaptive-session.json'));
const session = parseCareerDiscoverySession({...fixture, session_sha256: calculateDiscoverySessionHash(fixture)});
const bank = 'b'.repeat(64); const evidenceId = 'EVIDENCE-SYNTHETIC-001';
const packetPayload = {schema_version: 'evidence-candidate-packet-v1', packet_id: 'PACKET-SYNTHETIC-001',
  candidate_id: fixture.candidate_id, discovery_session_sha256: session.session_sha256,
  evidence_bank_sha256: bank, items: [{item_id: 'ITEM-SYNTHETIC-001', kind: 'competency',
    statement: 'Coordinates programs with explicit evidence boundaries.', confidence: 'verified',
    source_ids: ['SOURCE-CV-001'], evidence_ids: [evidenceId], role_families: ['program leadership'],
    attribution_limit: 'Synthetic fixture only.', allowed_channels: ['cv'], forbidden_claims: []}]};
const packet = parseEvidenceCandidatePacket({...packetPayload, packet_sha256: calculateCandidatePacketHash(packetPayload)});
assertEvidenceCandidatePacketBindings(packet, session, {candidateId: fixture.candidate_id,
  evidenceBankSha256: bank, evidence: new Map([[evidenceId, 'verified']])});
const check = {passed: true, evidence_ids: [evidenceId], accepted_gap_ids: []};
const readinessPayload = {schema_version: 'career-evidence-readiness-v1', readiness_id: 'READINESS-SYNTHETIC-001',
  candidate_id: fixture.candidate_id, evidence_bank_sha256: bank, candidate_packet_sha256: packet.packet_sha256,
  checks: {identity_and_chronology: check, competency_evidence: check, recent_role_interventions: check,
    contradictions_resolved: check, role_family_selected: check, privacy_boundary: check, gaps_accepted: check},
  blocking_gap_ids: [], status: 'READY', next_gate: 'CR_CAREER_EVIDENCE_READY'};
const readiness = parseCareerEvidenceReadiness({...readinessPayload,
  readiness_sha256: calculateEvidenceReadinessHash(readinessPayload)});
assertCareerEvidenceReadinessBindings(readiness, packet, {candidateId: fixture.candidate_id,
  evidenceBankSha256: bank, evidenceIds: new Set([evidenceId]), gapIds: new Set(), acceptedGapIds: new Set()});
if (CvSpecV2Schema.shape.schema_version.value !== 'cv-spec-v2') throw new Error('CAR-EVIDENCE-CV-SPEC-V2');
const handoff = {candidate_packet_sha256: packet.packet_sha256,
  evidence_readiness_sha256: readiness.readiness_sha256, target_schema: 'cv-spec-v2',
  next_gate: 'CR_CV_SPEC_DRAFT'};
if (!handoff.candidate_packet_sha256 || !handoff.evidence_readiness_sha256 || handoff.target_schema !== 'cv-spec-v2')
  throw new Error('CAR-EVIDENCE-MATERIAL-HANDOFF');
try { assertCareerEvidenceReadinessBindings(readiness, packet, {candidateId: fixture.candidate_id,
  evidenceBankSha256: 'd'.repeat(64), evidenceIds: new Set([evidenceId]), gapIds: new Set(), acceptedGapIds: new Set()});
  throw new Error('CAR-EVIDENCE-STALE-READINESS');
} catch (error) { if (error instanceof Error && error.message === 'CAR-EVIDENCE-STALE-READINESS') throw error; }
`;
execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', runtimeCheck], {
  cwd: process.cwd(), stdio: 'pipe',
});
console.info(`PASS ${id}: confidence-gated evidence and hash-bound handoff for CV spec.`);
