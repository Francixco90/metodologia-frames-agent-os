import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
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
  'fixtures/positive/cv-spec-first-handoff.json',
  'fixtures/negative/fail-closed-routes.json',
  'receipts/runtime-boundary.yml',
  'scripts/route-career.mjs',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const schema = JSON.parse(docs.get('schemas/career-application-contract-v1.schema.json'));
const positive = JSON.parse(docs.get('fixtures/positive/cv-general-route.json'));
const negative = JSON.parse(docs.get('fixtures/negative/fail-closed-routes.json'));
const specFirst = JSON.parse(docs.get('fixtures/positive/cv-spec-first-handoff.json'));

for (const token of [
  `name: ${id}`,
  'description: This skill should be used when',
  'version: 0.4.0',
  '## 1. Propósito y activación',
  '## 6. Gates, handoff y contextos hijos',
  'lifecycle_state: active',
  'local-evaluation',
  'C00 → C01 → C02 → C06 → C08',
  'CR_CV_SPEC_APPROVED',
  'CR_CAREER_EVIDENCE_READY',
  'career-evidence-interviewer',
  'spec_sha256',
  'SUBMITTED',
  'network_allowed: false',
  'submission_authority: false',
]) if (!all.includes(token)) throw new Error(`CAR-ORCH-MISSING ${token}`);

if (schema.title !== 'CareerApplicationContractV1') throw new Error('CAR-ORCH-SCHEMA');
if (positive.expected.maximum_blocking_questions !== 3) throw new Error('CAR-ORCH-QUESTIONS');
if (positive.expected.selected_stage_path.join(',') !== 'C00,C01,C02,C06,C08') {
  throw new Error('CAR-ORCH-ROUTE');
}
if (specFirst.expected.selected_stage_path.join(',') !== 'C00,C01,C04,C05,C06,C08') {
  throw new Error('CAR-ORCH-TARGETED-SPEC-ROUTE');
}
for (const binding of ['brief_sha256', 'evidence_bank_sha256', 'readiness_sha256', 'job_snapshot_sha256', 'spec_sha256', 'CR_CAREER_EVIDENCE_READY', 'CR_CV_SPEC_APPROVED']) {
  if (!specFirst.expected.required_before_compile.includes(binding)) throw new Error(`CAR-ORCH-SPEC-PREFLIGHT ${binding}`);
}
if (specFirst.expected.artifact_state_after_compile !== 'RENDERED_DRAFT' || specFirst.expected.external_effect !== false) {
  throw new Error('CAR-ORCH-SPEC-STATE');
}
const negativeIds = new Set(negative.cases.map(({id: caseId}) => caseId));
for (const caseId of ['ambiguous_candidate', 'inferred_submitted', 'changed_package_hash', 'captcha_required', 'pii_to_git']) {
  if (!negativeIds.has(caseId)) throw new Error(`CAR-ORCH-NEGATIVE ${caseId}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) throw new Error('CAR-ORCH-PRIVATE-LOCATOR');
const runtimeCheck = String.raw`
import {readFileSync} from 'node:fs';
import {
  calculateDiscoverySessionHash, calculateEvidenceReadinessHash,
  parseCareerDiscoverySession, routeCareerIntent,
} from './02_proceso/workflows/career/index.ts';
const bank = 'b'.repeat(64); const candidate = 'CAND-SYNTHETIC-001';
const evidence = ['EVIDENCE-SYNTHETIC-001'];
const check = {passed: true, evidence_ids: evidence, accepted_gap_ids: []};
const readyPayload = {
  schema_version: 'career-evidence-readiness-v1', readiness_id: 'READINESS-SYNTHETIC-001',
  candidate_id: candidate, evidence_bank_sha256: bank, candidate_packet_sha256: 'c'.repeat(64),
  checks: {identity_and_chronology: check, competency_evidence: check,
    recent_role_interventions: check, contradictions_resolved: check,
    role_family_selected: check, privacy_boundary: check, gaps_accepted: check},
  blocking_gap_ids: [], status: 'READY', next_gate: 'CR_CAREER_EVIDENCE_READY',
};
const ready = {...readyPayload, readiness_sha256: calculateEvidenceReadinessHash(readyPayload)};
const request = {request: 'Construye un CV general', candidateId: candidate,
  targetRole: 'Program leader', profileReady: true, evidenceBankSha256: bank};
if (routeCareerIntent({...request, evidenceReadiness: ready}).selected_stage_path.includes('C01'))
  throw new Error('CAR-ORCH-READY-INTERVIEWED');
const missing = routeCareerIntent(request);
if (!missing.selected_stage_path.includes('C01') || missing.next_gate !== 'CR_CAREER_EVIDENCE_READY')
  throw new Error('CAR-ORCH-MISSING-INTERVIEW');
const unverified = routeCareerIntent({...request, evidenceReady: true});
if (!unverified.selected_stage_path.includes('C01') || !unverified.reason_codes.includes('EVIDENCE_READINESS_UNVERIFIED'))
  throw new Error('CAR-ORCH-BOOLEAN-BYPASS');
const blockedPayload = {...readyPayload, checks: {...readyPayload.checks,
  competency_evidence: {passed: false, evidence_ids: [], accepted_gap_ids: []}},
  blocking_gap_ids: ['GAP-SYNTHETIC-001'], status: 'BLOCKED'};
const blocked = {...blockedPayload, readiness_sha256: calculateEvidenceReadinessHash(blockedPayload)};
try { routeCareerIntent({...request, evidenceReadiness: blocked});
  throw new Error('CAR-ORCH-BLOCKED-ROUTED');
} catch (error) { if (error instanceof Error && error.message === 'CAR-ORCH-BLOCKED-ROUTED') throw error; }
const fixture = JSON.parse(readFileSync('./03_artefactos/skills/career-evidence-interviewer/fixtures/positive/adaptive-session.json'));
const open = parseCareerDiscoverySession({...fixture, session_sha256: calculateDiscoverySessionHash(fixture)});
if (open.state !== 'INTERVIEW_REQUIRED') throw new Error('CAR-ORCH-GAP-NO-INTERVIEW');
const pausedPayload = structuredClone(fixture); pausedPayload.state = 'PAUSED'; pausedPayload.rounds[0].status = 'paused';
const paused = parseCareerDiscoverySession({...pausedPayload, session_sha256: calculateDiscoverySessionHash(pausedPayload)});
if (paused.session_id !== open.session_id || paused.session_sha256 === open.session_sha256)
  throw new Error('CAR-ORCH-PAUSE-LINEAGE');
try { parseCareerDiscoverySession({...pausedPayload, session_sha256: open.session_sha256});
  throw new Error('CAR-ORCH-STALE-SESSION');
} catch (error) { if (error instanceof Error && error.message === 'CAR-ORCH-STALE-SESSION') throw error; }
`;
execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', runtimeCheck], {
  cwd: process.cwd(), stdio: 'pipe',
});
console.info(`PASS ${id}: deterministic brief/spec-first routing and fail-closed submission boundary.`);
