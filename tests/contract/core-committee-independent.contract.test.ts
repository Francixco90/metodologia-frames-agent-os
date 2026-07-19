import {readFileSync} from 'node:fs';
import path from 'node:path';

import {parse} from 'yaml';

import {
  CommitteeDecisionSchema,
  CommitteeSessionSchema,
  AgentContractSchema,
  adjudicateCommittee,
} from '../../committees/src/index.ts';
import {
  ApprovalSchema,
  CANONICAL_GUARDIAN_ACTOR_ID,
  CANONICAL_HUMAN_APPROVER_ACTOR_ID,
} from '../../core/contracts/index.ts';
import {EvidenceLedger, canonicalize, hashCanonical} from '../../core/evidence/index.ts';
import {AppendOnlyMemory} from '../../core/memory/index.ts';
import {createRenderReceiptStore} from '../../core/receipts/index.ts';
import {transitionGlobalState, type TransitionRequest} from '../../core/state-machine/index.ts';
import {HASH_A, HASH_B, HASH_C, NOW, approval, portableRef} from '../unit/core/fixtures.ts';

const projectRoot = process.cwd();
const committeeRoot = path.join(
  projectRoot,
  'projects',
  'vs-001-source-to-campaign',
  'remotion',
  'committee',
);

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8')) as unknown;

const roleIds = [
  'RT-01',
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-09',
  'RT-10',
  'RT-11',
] as const;

const renderReceipt = () => ({
  schemaVersion: 'render-receipt-v1' as const,
  receiptId: 'receipt:render:independent',
  idempotencyKey: 'render-independent-0001',
  artifactId: 'artifact:vs001',
  artifactHash: HASH_A,
  compositionId: 'composition:main',
  inputPropsRef: 'projects/vs001/05-input-props.json',
  inputPropsHash: HASH_A,
  assetManifestRef: 'projects/vs001/assets-manifest.yml',
  assetManifestHash: HASH_B,
  toolchain: {
    node: '22.23.1',
    packageManager: 'pnpm@11.9.0',
    remotion: '4.0.494',
    chromium: '149',
    ffmpeg: '8.1.1',
    locale: 'es-CO',
    timezone: 'America/Bogota',
  },
  output: {
    ref: 'receipts/renders/vs001.mp4',
    sha256: HASH_B,
    normalizedPixelDigest: HASH_C,
    width: 1080,
    height: 1920,
    fps: 30,
    durationFrames: 1231,
    codec: 'h264',
    streams: ['video' as const],
  },
  mode: 'final' as const,
  status: 'succeeded' as const,
  logRefs: ['receipts/renders/vs001.log'],
  createdAt: NOW,
});

describe('independent A03/A04 contract verification', () => {
  it('validates all eleven operational role contracts and the RT-11 non-production boundary', () => {
    const contracts = roleIds.map((roleId) => {
      const raw = readFileSync(path.join(projectRoot, 'agents', roleId, 'contract.yml'), 'utf8');
      const contract = AgentContractSchema.parse(parse(raw) as unknown);
      expect(contract.role_id).toBe(roleId);
      expect(contract.evidence_policy.private_reasoning).toBe('NEVER_PERSIST');
      expect(contract.handoff.required_fields).toEqual(
        expect.arrayContaining(['outputs', 'tests', 'coverage_gaps', 'next_gate']),
      );
      return contract;
    });

    expect(new Set(contracts.map(({role_id: roleId}) => roleId))).toHaveLength(11);
    const guardian = contracts.find(({role_id: roleId}) => roleId === 'RT-11');
    expect(guardian).toBeDefined();
    expect(guardian?.tools.forbidden.join(' ')).toMatch(
      /producir|corregir|H01|READY|publicación/iu,
    );
    expect(guardian?.handoff.consumers).toEqual(['RT-01']);
  });

  it('recomputes the real VS-001 committee decision from five proposals and twenty reviews', () => {
    const session = CommitteeSessionSchema.parse(
      readJson('projects/vs-001-source-to-campaign/remotion/committee/committee-session.json'),
    );
    const storedDecision = CommitteeDecisionSchema.parse(
      readJson('projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json'),
    );
    const derivedDecision = adjudicateCommittee(session);

    expect(session.proposals).toHaveLength(5);
    expect(session.peerAssessments).toHaveLength(20);
    expect(new Set(session.proposals.map(({proposer}) => proposer.actorId))).toHaveLength(5);
    expect(new Set(session.proposals.map(({proposer}) => proposer.roleId))).toHaveLength(5);
    expect(new Set(session.peerAssessments.map(({assessmentId}) => assessmentId))).toHaveLength(20);
    expect(canonicalize(storedDecision)).toBe(canonicalize(derivedDecision));
    expect(derivedDecision.ranking[0]).toMatchObject({
      rank: 1,
      proposalId: session.synthesis.selectedProposalId,
      assessmentCount: 4,
    });
    expect(derivedDecision.trace).toEqual({
      proposalCount: 5,
      peerAssessmentCount: 20,
      privateReasoningPersisted: false,
    });
    expect(hashCanonical(session)).toMatch(/^[a-f0-9]{64}$/u);
    expect(hashCanonical(storedDecision)).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('proves the cross-review graph is complete, non-self and scored by one common rubric', () => {
    const session = CommitteeSessionSchema.parse(
      readJson('projects/vs-001-source-to-campaign/remotion/committee/committee-session.json'),
    );
    const proposalOwner = new Map(
      session.proposals.map(({proposalId, proposer}) => [proposalId, proposer.actorId]),
    );
    const expectedDimensionIds = session.rubric.dimensions.map(({dimensionId}) => dimensionId);
    const reviewPairs = new Set<string>();

    for (const assessment of session.peerAssessments) {
      expect(assessment.reviewerActorId).not.toBe(proposalOwner.get(assessment.proposalId));
      expect(assessment.dimensionScores.map(({dimensionId}) => dimensionId).sort()).toEqual(
        [...expectedDimensionIds].sort(),
      );
      reviewPairs.add(`${assessment.reviewerActorId}::${assessment.proposalId}`);
    }

    expect(reviewPairs).toHaveLength(20);
    expect(session.rubric.dimensions.reduce((sum, {weight}) => sum + weight, 0)).toBeCloseTo(1, 12);
    for (const proposal of session.proposals) {
      expect(
        session.peerAssessments.filter(({proposalId}) => proposalId === proposal.proposalId),
      ).toHaveLength(4);
    }
  });

  it('keeps committee provenance honest without representing sequential perspectives as subagents', () => {
    const orchestration = readFileSync(path.join(committeeRoot, 'orchestration.md'), 'utf8');

    expect(orchestration.match(/`subagent` especializado real/gu)).toHaveLength(3);
    expect(orchestration.match(/`sequential-perspective` explícita/gu)).toHaveLength(2);
    expect(orchestration).toMatch(/no se presentan como delegación real/iu);
    expect(orchestration).toMatch(/no concede aprobación humana, `READY` ni publicación/iu);
  });

  it('binds canonical RT-11 and H01 to distinct direct gates', () => {
    const guardianRequest: TransitionRequest = {
      artifactId: 'artifact:vs001',
      artifactHash: HASH_A,
      producerActorId: 'actor:producer',
      actorId: CANONICAL_GUARDIAN_ACTOR_ID,
      actorRole: 'guardian',
      evidence: [{kind: 'guardian-verdict', hash: HASH_B}],
    };
    expect(transitionGlobalState('VALIDATED', 'GUARDIAN_PASS', guardianRequest)).toBe(
      'GUARDIAN_PASS',
    );

    const humanApproval = ApprovalSchema.parse(
      approval('GUARDIAN_PASS', 'HUMAN_APPROVED', 'human'),
    );
    const humanRequest: TransitionRequest = {
      artifactId: 'artifact:vs001',
      artifactHash: HASH_A,
      producerActorId: 'actor:producer',
      actorId: CANONICAL_HUMAN_APPROVER_ACTOR_ID,
      actorRole: 'human',
      evidence: [{kind: 'human-approval', hash: HASH_B}],
      approval: humanApproval,
    };
    expect(transitionGlobalState('GUARDIAN_PASS', 'HUMAN_APPROVED', humanRequest)).toBe(
      'HUMAN_APPROVED',
    );
    expect(
      new Set([guardianRequest.producerActorId, guardianRequest.actorId, humanRequest.actorId]),
    ).toHaveLength(3);
  });

  it('keeps evidence, memory and receipt snapshots deeply immutable and hash-stable', () => {
    const ledger = new EvidenceLedger();
    const evidence = ledger.append({
      evidenceId: 'evidence:independent',
      kind: 'test',
      subjectRef: portableRef('artifact', 'artifact:vs001'),
      payload: {result: {status: 'PASS', assertions: [1, 2, 3]}},
      actorId: 'actor:independent-verifier',
      recordedAt: NOW,
      tags: ['CÓDIGO'],
    });
    const nestedEvidence = evidence.payload.result as {
      assertions: number[];
      status: string;
    };
    expect(Object.isFrozen(nestedEvidence)).toBe(true);
    expect(Object.isFrozen(nestedEvidence.assertions)).toBe(true);
    expect(Reflect.set(nestedEvidence, 'status', 'FAIL')).toBe(false);
    expect(ledger.verify()).toBe(true);

    const memory = new AppendOnlyMemory();
    const entry = memory.append({
      memoryId: 'memory:independent',
      subjectId: 'artifact:vs001',
      kind: 'decision',
      summary: 'Bounded decision summary with evidence.',
      actorId: 'actor:independent-verifier',
      evidenceRefs: [portableRef('evidence', 'evidence:independent')],
      createdAt: NOW,
    });
    expect(Object.isFrozen(entry.evidenceRefs)).toBe(true);
    expect(Object.isFrozen(entry.evidenceRefs[0])).toBe(true);
    expect(memory.verify()).toBe(true);

    const store = createRenderReceiptStore();
    const created = store.record(renderReceipt());
    const replayed = store.record(renderReceipt());
    expect(created.receiptHash).toBe(replayed.receiptHash);
    expect(replayed.status).toBe('replayed');
    expect(Object.isFrozen(replayed.receipt.output)).toBe(true);
    expect(replayed.receipt.output.sha256).toBe(HASH_B);
  });
});
