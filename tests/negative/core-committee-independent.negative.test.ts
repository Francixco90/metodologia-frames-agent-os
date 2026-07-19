import {CommitteeApprovalSchema} from '../../approvals/schemas/index.ts';
import {CommitteeSessionSchema, adjudicateCommittee} from '../../committees/src/index.ts';
import {ApprovalSchema, ReleaseReceiptSchema, type Approval} from '../../core/contracts/index.ts';
import {AppendOnlyMemory} from '../../core/memory/index.ts';
import {createRenderReceiptStore} from '../../core/receipts/index.ts';
import {transitionAudiovisualState, transitionGlobalState} from '../../core/state-machine/index.ts';
import {makeValidSession} from '../unit/committee/fixtures.ts';
import {HASH_A, HASH_B, HASH_C, NOW, approval, portableRef} from '../unit/core/fixtures.ts';

type ActorRole = 'committee' | 'guardian' | 'human' | 'producer' | 'release-owner' | 'system';

const request = (
  kinds: Array<
    | 'committee-decision'
    | 'guardian-verdict'
    | 'human-approval'
    | 'publish-receipt'
    | 'release-authorization'
    | 'render-receipt'
    | 'source-lock'
  >,
  options: {
    actorId?: string;
    actorRole?: ActorRole;
    approval?: Approval;
    evidenceHash?: string;
    producerActorId?: string;
    releaseReceipt?: unknown;
  } = {},
): unknown => ({
  artifactId: 'artifact:vs001',
  artifactHash: HASH_A,
  producerActorId: options.producerActorId ?? 'actor:producer',
  actorId: options.actorId ?? 'actor:producer',
  actorRole: options.actorRole ?? 'producer',
  evidence: kinds.map((kind) => ({kind, hash: options.evidenceHash ?? HASH_B})),
  ...(options.approval === undefined ? {} : {approval: options.approval}),
  ...(options.releaseReceipt === undefined ? {} : {releaseReceipt: options.releaseReceipt}),
});

const committeeApproval = () => ({
  schemaVersion: 1,
  approvalId: 'approval-committee-independent',
  committeeId: 'committee-vs001',
  decisionId: 'decision-vs001',
  gate: 'G10',
  authority: 'COMMITTEE_GATE_ONLY',
  requestedByActorId: 'actor:producer',
  decidedByActorId: 'actor:verifier',
  decision: 'APPROVED',
  targetSha256: HASH_A,
  evidenceRefs: ['evidence:committee'],
  conditions: [],
  issuedAt: NOW,
  releaseEffect: 'NONE',
});

const publishedReceipt = (dryRun = false): unknown => ({
  schemaVersion: 'release-receipt-v1',
  receiptId: 'receipt:release:independent',
  idempotencyKey: 'release-independent-0001',
  artifactId: 'artifact:vs001',
  artifactHash: HASH_A,
  approvalReceiptId: 'receipt:approval:release',
  approvalReceiptHash: HASH_B,
  destinationRef: portableRef('artifact', 'destination:instagram'),
  dryRun,
  status: 'published',
  callbackPolicyRef: portableRef('receipt', 'policy:callback'),
  retryPolicyRef: portableRef('receipt', 'policy:retry'),
  rollbackRef: portableRef('receipt', 'rollback:one'),
  outputHash: HASH_C,
  logRefs: [],
  createdAt: NOW,
});

const renderReceipt = () => ({
  schemaVersion: 'render-receipt-v1' as const,
  receiptId: 'receipt:render:negative',
  idempotencyKey: 'render-negative-0001',
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
  logRefs: [],
  createdAt: NOW,
});

describe('independent A03/A04 negative verification', () => {
  it('rejects every attempted shortcut from SOURCE_LOCKED to a later audiovisual state', () => {
    const laterStates = [
      'BEATS_APPROVED',
      'VISUAL_SYSTEM_APPROVED',
      'REGISTRY_APPROVED',
      'BUILD_VALIDATED',
      'REVIEW_SHOTS_APPROVED',
      'RENDER_VALIDATED',
      'POSTPRODUCTION_VALIDATED',
      'GUARDIAN_PASS',
      'HUMAN_APPROVED',
      'READY',
    ] as const;

    for (const nextState of laterStates) {
      expect(() =>
        transitionAudiovisualState('SOURCE_LOCKED', nextState, request(['render-receipt'])),
      ).toThrow(/Illegal state transition/u);
    }
  });

  it('rejects global state skips, including release and publication shortcuts', () => {
    expect(() =>
      transitionGlobalState('INGESTED', 'SOURCE_LOCKED', request(['source-lock'])),
    ).toThrow(/Illegal state transition/u);
    expect(() =>
      transitionGlobalState('READY', 'RELEASE_AUTHORIZED', request(['release-authorization'])),
    ).toThrow(/Illegal state transition/u);
    expect(() =>
      transitionGlobalState(
        'READY',
        'PUBLISHED',
        request(['publish-receipt'], {releaseReceipt: publishedReceipt()}),
      ),
    ).toThrow(/Illegal state transition/u);
  });

  it('rejects approval evidence that is not the exact transition evidence set', () => {
    const boundApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');

    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: boundApproval.approverActorId,
          actorRole: 'committee',
          approval: boundApproval,
          evidenceHash: HASH_C,
        }),
      ),
    ).toThrow(/evidence hashes do not match/u);

    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: boundApproval.approverActorId,
          actorRole: 'committee',
          approval: {...boundApproval, evidenceHashes: [HASH_B, HASH_C]},
        }),
      ),
    ).toThrow(/evidence hashes do not match/u);
  });

  it.each(['H01', 'RT-11'])('rejects reserved actor %s as G10 producer or verifier', (actorId) => {
    expect(
      CommitteeApprovalSchema.safeParse({
        ...committeeApproval(),
        requestedByActorId: actorId,
      }).success,
    ).toBe(false);
    expect(
      CommitteeApprovalSchema.safeParse({
        ...committeeApproval(),
        decidedByActorId: actorId,
      }).success,
    ).toBe(false);
  });

  it('rejects non-canonical Guardian/H01 identities, role impersonation and reserved producers', () => {
    expect(() =>
      transitionGlobalState(
        'VALIDATED',
        'GUARDIAN_PASS',
        request(['guardian-verdict'], {
          actorId: 'actor:guardian',
          actorRole: 'guardian',
        }),
      ),
    ).toThrow(/RT-11/u);

    const humanApproval = approval('GUARDIAN_PASS', 'HUMAN_APPROVED', 'human');
    expect(() => ApprovalSchema.parse({...humanApproval, approverActorId: 'actor:human'})).toThrow(
      /H01/u,
    );
    expect(() =>
      ApprovalSchema.parse({
        ...approval('IDEATED', 'DIRECTION_APPROVED', 'committee'),
        approverActorId: 'RT-11',
      }),
    ).toThrow(/RT-11/u);
    expect(() =>
      transitionGlobalState('INGESTED', 'CLASSIFIED', request([], {producerActorId: 'H01'})),
    ).toThrow(/Producer cannot/u);
  });

  it('rejects duplicate assessment IDs, incomplete review coverage, self-review and RT-11 proposals', () => {
    const duplicateId = makeValidSession();
    duplicateId.peerAssessments[1]!.assessmentId = duplicateId.peerAssessments[0]!.assessmentId;
    expect(CommitteeSessionSchema.safeParse(duplicateId).success).toBe(false);

    const incomplete = makeValidSession();
    incomplete.peerAssessments.pop();
    expect(CommitteeSessionSchema.safeParse(incomplete).success).toBe(false);

    const selfReview = makeValidSession();
    selfReview.peerAssessments[0]!.reviewerActorId = selfReview.proposals.find(
      ({proposalId}) => proposalId === selfReview.peerAssessments[0]!.proposalId,
    )!.proposer.actorId;
    expect(CommitteeSessionSchema.safeParse(selfReview).success).toBe(false);

    const guardianProposal = makeValidSession();
    guardianProposal.proposals[0]!.proposer = {
      actorId: 'RT-11',
      roleId: 'RT-11',
      specialty: 'Guardian',
    } as never;
    expect(CommitteeSessionSchema.safeParse(guardianProposal).success).toBe(false);
  });

  it('rejects a synthesis that selects a proposal below the maximum rubric score', () => {
    const session = makeValidSession();
    session.synthesis.selectedProposalId = 'proposal-02';
    session.synthesis.incorporatedElements[0]!.sourceProposalId = 'proposal-03';
    session.synthesis.alternativeDispositions = [
      {
        proposalId: 'proposal-01',
        disposition: 'NOT_COMPATIBLE',
        summary: 'Negative independent fixture.',
      },
      ...session.synthesis.alternativeDispositions.filter(
        ({proposalId}) => proposalId !== 'proposal-02',
      ),
    ];

    expect(() => adjudicateCommittee(session)).toThrow(/highest rubric score/u);
  });

  it.each([
    {
      label: 'proposal EN',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.proposals[0]!.concept = 'Contains chain-of-thought.';
      },
    },
    {
      label: 'peer review ES',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.peerAssessments[0]!.objections = ['Contiene razonamiento privado.'];
      },
    },
    {
      label: 'synthesis ES',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.synthesis.decisionSummary = 'Contiene cadena de pensamiento.';
      },
    },
    {
      label: 'dissent EN',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        if (session.dissent.status === 'PRESENT') {
          session.dissent.entries[0]!.statement = 'Contains private reasoning.';
        }
      },
    },
    {
      label: 'uncertainty EN',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        session.uncertainty.drivers[0]!.statement = 'Contains hidden reasoning.';
      },
    },
    {
      label: 'second prototype ES',
      mutate: (session: ReturnType<typeof makeValidSession>) => {
        if (!session.secondPrototype.required) {
          session.secondPrototype.rationale = 'Contiene razonamiento privado.';
        }
      },
    },
  ])('rejects prohibited private reasoning in $label', ({mutate}) => {
    const session = makeValidSession();
    mutate(session);
    expect(CommitteeSessionSchema.safeParse(session).success).toBe(false);
  });

  it.each([
    'chain-of-thought',
    'private reasoning',
    'cadena de pensamiento',
    'razonamiento privado',
  ])('rejects prohibited private reasoning in append-only memory: %s', (label) => {
    const memory = new AppendOnlyMemory();
    expect(() =>
      memory.append({
        memoryId: 'memory:negative',
        subjectId: 'artifact:vs001',
        kind: 'learning',
        summary: `Attempted ${label}.`,
        actorId: 'actor:verifier',
        evidenceRefs: [],
        createdAt: NOW,
      }),
    ).toThrow(/Private reasoning/u);
  });

  it('prevents nested mutation from corrupting an idempotent receipt replay', () => {
    const store = createRenderReceiptStore();
    const created = store.record(renderReceipt());

    expect(Reflect.set(created.receipt.output, 'sha256', HASH_C)).toBe(false);
    const replayed = store.record(renderReceipt());
    expect(replayed.status).toBe('replayed');
    expect(replayed.receipt.output.sha256).toBe(HASH_B);
    expect(replayed.receiptHash).toBe(created.receiptHash);
  });

  it('rejects published dry-runs and publication receipts without rollback evidence', () => {
    expect(ReleaseReceiptSchema.safeParse(publishedReceipt(true)).success).toBe(false);
    const missingRollback = {
      ...(publishedReceipt(false) as Record<string, unknown>),
      rollbackRef: undefined,
      outputHash: undefined,
    };
    expect(ReleaseReceiptSchema.safeParse(missingRollback).success).toBe(false);
  });
});
