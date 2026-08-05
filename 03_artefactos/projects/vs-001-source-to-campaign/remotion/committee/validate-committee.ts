import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  CommitteeDecisionSchema,
  CommitteeSessionSchema,
  adjudicateCommittee,
} from '../../../../../committees/src/index.ts';
import {canonicalize, hashCanonical} from '../../../../../core/evidence/index.ts';

const committeeRoot = path.dirname(fileURLToPath(import.meta.url));
const sessionPath = path.join(committeeRoot, 'committee-session.json');
const decisionPath = path.join(committeeRoot, 'committee-decision.json');
const orchestrationPath = path.join(committeeRoot, 'orchestration.md');

const readJson = (filePath: string): unknown =>
  JSON.parse(readFileSync(filePath, 'utf8')) as unknown;

const session = CommitteeSessionSchema.parse(readJson(sessionPath));
const storedDecision = CommitteeDecisionSchema.parse(readJson(decisionPath));
const derivedDecision = adjudicateCommittee(session);

if (canonicalize(storedDecision) !== canonicalize(derivedDecision)) {
  throw new Error('committee-decision.json diverges from adjudicateCommittee(session).');
}

const expectedActorProvenance = new Map([
  ['actor-rt07-subagent', 'subagent'],
  ['actor-rt04-subagent', 'subagent'],
  ['actor-rt08-subagent', 'subagent'],
  ['perspective-lead-rt05', 'sequential-perspective'],
  ['perspective-lead-rt09', 'sequential-perspective'],
]);
const actualActors = new Set(session.proposals.map(({proposer}) => proposer.actorId));
for (const actorId of expectedActorProvenance.keys()) {
  if (!actualActors.has(actorId)) {
    throw new Error(`Missing declared committee actor ${actorId}.`);
  }
}

if (session.proposals.length !== 5 || session.peerAssessments.length !== 20) {
  throw new Error('Committee must contain five proposals and twenty reviews.');
}

const fixtureDigest = '709d0df2c40af4c69f8c9b3cd64b4efb97a62b184c3c8fcc6fe6476ab68ac9cb';
const evidence = session.proposals.flatMap((proposal) => proposal.evidence);
if (evidence.length !== 5 || evidence.some(({sha256}) => sha256 !== fixtureDigest)) {
  throw new Error('Each proposal must bind one EV-Pxx to the fixture digest.');
}

if (derivedDecision.ranking[0]?.proposalId !== session.synthesis.selectedProposalId) {
  throw new Error('Synthesis does not select the computed top-ranked proposal.');
}
if (derivedDecision.secondPrototype.required) {
  throw new Error('A second prototype is not justified by this session.');
}
if (session.uncertainty.drivers.some(({analysisStatus}) => analysisStatus === 'NOT_RESOLVABLE')) {
  throw new Error('Session unexpectedly contains an unresolvable driver.');
}

const orchestration = readFileSync(orchestrationPath, 'utf8');
for (const [actorId, provenance] of expectedActorProvenance) {
  if (!orchestration.includes(actorId) || !orchestration.includes(provenance)) {
    throw new Error(`orchestration.md does not disclose ${actorId} as ${provenance}.`);
  }
}
if (/chain[-_ ]of[-_ ]thought/iu.test(orchestration)) {
  throw new Error('orchestration.md must not persist private reasoning.');
}

console.info(
  JSON.stringify(
    {
      status: 'PASS',
      committeeId: session.committeeId,
      proposalCount: session.proposals.length,
      peerAssessmentCount: session.peerAssessments.length,
      selectedProposalId: derivedDecision.ranking[0]?.proposalId,
      ranking: derivedDecision.ranking,
      secondPrototype: derivedDecision.secondPrototype,
      sessionSha256: hashCanonical(session),
      decisionSha256: hashCanonical(storedDecision),
      privateReasoningPersisted: derivedDecision.trace.privateReasoningPersisted,
    },
    null,
    2,
  ),
);
