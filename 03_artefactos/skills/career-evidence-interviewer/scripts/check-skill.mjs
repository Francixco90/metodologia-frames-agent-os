import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base = resolve('03_artefactos/skills/career-evidence-interviewer');
const read = (path) => readFileSync(resolve(base, path), 'utf8');
const skill = read('SKILL.md');
const lineage = read('LINEAGE.yml');
const receipt = read('receipts/runtime-boundary.yml');
const fixture = JSON.parse(read('fixtures/positive/adaptive-session.json'));
const corpus = [skill, lineage, receipt].join('\n');

for (const token of [
  'name: career-evidence-interviewer',
  'description: This skill should be used when',
  'version: 0.1.0',
  'lifecycle_state: active',
  'CR_CAREER_EVIDENCE_READY',
  '[INFERENCIA]',
  'user_confirmed',
  'network_allowed: false',
  'publication_authority: false',
]) {
  if (!corpus.includes(token)) throw new Error(`CAREER-INTERVIEWER-MISSING ${token}`);
}

const contractCheck = String.raw`
import {readFileSync} from 'node:fs';
import {
  assertEvidenceCandidatePacketBindings,
  calculateCandidatePacketHash,
  calculateDiscoverySessionHash,
  parseCareerDiscoverySession,
  parseEvidenceCandidatePacket,
} from './02_proceso/workflows/career/index.ts';
const fixture = JSON.parse(readFileSync(
  './03_artefactos/skills/career-evidence-interviewer/fixtures/positive/adaptive-session.json',
  'utf8',
));
parseCareerDiscoverySession({...fixture, session_sha256: calculateDiscoverySessionHash(fixture)});
const invalid = (mutate) => {
  const payload = structuredClone(fixture);
  mutate(payload);
  try {
    parseCareerDiscoverySession({...payload, session_sha256: calculateDiscoverySessionHash(payload)});
    return false;
  } catch { return true; }
};
if (!invalid((value) => value.rounds[0].questions.push(
  ...value.rounds[0].questions.slice(0, 1),
  ...value.rounds[0].questions.slice(0, 1),
  ...value.rounds[0].questions.slice(0, 1),
))) throw new Error('CAREER-INTERVIEWER-QUESTION-LIMIT');
if (!invalid((value) => { value.source_inventory[0].source_ref = 'file:///private/cv.pdf'; }))
  throw new Error('CAREER-INTERVIEWER-PRIVATE-ROOT');
if (!invalid((value) => { value.rounds[0].questions[0].gap_ids = ['GAP-UNKNOWN']; }))
  throw new Error('CAREER-INTERVIEWER-GAP-BINDING');
if (!invalid((value) => {
  const template = value.rounds[0];
  value.rounds = Array.from({length: 5}, (_, index) => ({
    ...structuredClone(template),
    round_number: index + 1,
  }));
})) throw new Error('CAREER-INTERVIEWER-ROUND-LIMIT');
if (!invalid((value) => {
  value.rounds.push({...structuredClone(value.rounds[0]), round_number: 2});
})) throw new Error('CAREER-INTERVIEWER-ROUND-SEQUENCE');
const sufficient = structuredClone(fixture);
sufficient.gaps[0].status = 'resolved';
sufficient.rounds = [];
sufficient.state = 'READY_FOR_CONFIRMATION';
sufficient.next_gate = 'CR_CAREER_EVIDENCE_CONFIRM';
parseCareerDiscoverySession({
  ...sufficient,
  session_sha256: calculateDiscoverySessionHash(sufficient),
});
const paused = structuredClone(fixture);
paused.rounds[0].status = 'paused';
paused.state = 'PAUSED';
parseCareerDiscoverySession({...paused, session_sha256: calculateDiscoverySessionHash(paused)});
const session = parseCareerDiscoverySession({
  ...fixture,
  session_sha256: calculateDiscoverySessionHash(fixture),
});
const packetPayload = {
  schema_version: 'evidence-candidate-packet-v1',
  packet_id: 'PACKET-SYNTHETIC-001',
  candidate_id: fixture.candidate_id,
  discovery_session_sha256: session.session_sha256,
  evidence_bank_sha256: 'b'.repeat(64),
  items: [{
    item_id: 'ITEM-SYNTHETIC-001', kind: 'competency',
    statement: 'Coordinates programs with explicit decision and evidence boundaries.',
    confidence: 'verified', source_ids: ['SOURCE-CV-001'],
    evidence_ids: ['EVIDENCE-SYNTHETIC-001'], role_families: ['program leadership'],
    attribution_limit: 'Synthetic fixture; no individual or employer claim.',
    allowed_channels: ['cv'], forbidden_claims: [],
  }],
};
const packet = parseEvidenceCandidatePacket({
  ...packetPayload,
  packet_sha256: calculateCandidatePacketHash(packetPayload),
});
const aspirationPayload = structuredClone(packetPayload);
aspirationPayload.packet_id = 'PACKET-ASPIRATION-001';
aspirationPayload.items[0].item_id = 'ITEM-ASPIRATION-001';
aspirationPayload.items[0].statement = 'Aspires to lead a larger business unit.';
aspirationPayload.items[0].confidence = 'inferred';
aspirationPayload.items[0].evidence_ids = [];
aspirationPayload.items[0].allowed_channels = ['interview'];
aspirationPayload.items[0].forbidden_claims = ['Proven business unit leadership'];
parseEvidenceCandidatePacket({
  ...aspirationPayload,
  packet_sha256: calculateCandidatePacketHash(aspirationPayload),
});
aspirationPayload.items[0].allowed_channels = ['cv'];
try {
  parseEvidenceCandidatePacket({
    ...aspirationPayload,
    packet_sha256: calculateCandidatePacketHash(aspirationPayload),
  });
  throw new Error('CAREER-INTERVIEWER-ASPIRATION-PROMOTED');
} catch (error) {
  if (error instanceof Error && error.message === 'CAREER-INTERVIEWER-ASPIRATION-PROMOTED')
    throw error;
}
const expectBindingFailure = (targetSession, observed) => {
  try {
    assertEvidenceCandidatePacketBindings(packet, targetSession, observed);
    return false;
  } catch { return true; }
};
const observed = {
  candidateId: fixture.candidate_id,
  evidenceBankSha256: 'b'.repeat(64),
  evidence: new Map([['EVIDENCE-SYNTHETIC-001', 'inferred']]),
};
if (!expectBindingFailure(session, observed))
  throw new Error('CAREER-INTERVIEWER-INFERRED-PROMOTION');
if (!expectBindingFailure(session, {...observed, evidenceBankSha256: 'c'.repeat(64)}))
  throw new Error('CAREER-INTERVIEWER-STALE-BANK');
const externalPayload = structuredClone(fixture);
externalPayload.source_inventory[0].authority = 'external_requirement';
const externalSession = parseCareerDiscoverySession({
  ...externalPayload,
  session_sha256: calculateDiscoverySessionHash(externalPayload),
});
if (!expectBindingFailure(externalSession, {
  ...observed,
  evidence: new Map([['EVIDENCE-SYNTHETIC-001', 'verified']]),
})) throw new Error('CAREER-INTERVIEWER-EXTERNAL-REQUIREMENT');
`;
execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', contractCheck], {
  cwd: process.cwd(),
  stdio: 'pipe',
});

if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(corpus)) {
  throw new Error('CAREER-INTERVIEWER-PRIVATE-LOCATOR');
}

console.info('PASS career-evidence-interviewer: adaptive, evidence-bound and fail-closed.');
