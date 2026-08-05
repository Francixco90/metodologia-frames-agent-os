import {describe, expect, it} from 'vitest';

import {
  transitionAudiovisualState,
  transitionGlobalState,
} from '../../../../core/state-machine/index.ts';
import {
  advanceAudiovisualWorkflow,
  type AudiovisualWorkflowRecord,
} from '../../../../workflows/core/index.ts';
import {HASH_A, HASH_B, HASH_C, NOW, approval, portableRef} from './fixtures.ts';

function request(
  kinds: Array<
    | 'beat-map'
    | 'build'
    | 'classification'
    | 'committee-decision'
    | 'component-registry'
    | 'guardian-verdict'
    | 'human-approval'
    | 'postproduction-receipt'
    | 'publish-receipt'
    | 'render-receipt'
    | 'review-shots'
    | 'source-lock'
    | 'spec'
    | 'test-report'
    | 'visual-system'
  >,
  options: {
    actorId?: string;
    actorRole?: 'committee' | 'guardian' | 'human' | 'producer' | 'release-owner' | 'system';
    approval?: ReturnType<typeof approval>;
    evidenceHash?: string;
    producerActorId?: string;
    releaseReceipt?: unknown;
  } = {},
): unknown {
  return {
    artifactId: 'artifact:vs001',
    artifactHash: HASH_A,
    producerActorId: options.producerActorId ?? 'actor:producer',
    actorId: options.actorId ?? 'actor:producer',
    actorRole: options.actorRole ?? 'producer',
    evidence: kinds.map((kind) => ({kind, hash: options.evidenceHash ?? HASH_B})),
    ...(options.approval === undefined ? {} : {approval: options.approval}),
    ...(options.releaseReceipt === undefined ? {} : {releaseReceipt: options.releaseReceipt}),
  };
}

describe('global fail-closed state machine', () => {
  it('accepts a direct, evidenced transition', () => {
    expect(transitionGlobalState('INGESTED', 'CLASSIFIED', request(['classification']))).toBe(
      'CLASSIFIED',
    );
  });

  it('rejects skipped states and missing gate evidence', () => {
    expect(() =>
      transitionGlobalState('INGESTED', 'SOURCE_LOCKED', request(['source-lock'])),
    ).toThrow(/Illegal state transition/u);
    expect(() => transitionGlobalState('INGESTED', 'CLASSIFIED', request(['source-lock']))).toThrow(
      /Missing transition evidence/u,
    );
  });

  it('requires committee approval bound to the exact direction transition', () => {
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');
    expect(
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: committeeApproval.approverActorId,
          actorRole: 'committee',
          approval: committeeApproval,
        }),
      ),
    ).toBe('DIRECTION_APPROVED');
  });

  it('rejects execution by an actor other than the bound approver', () => {
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');
    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: 'actor:different-committee',
          actorRole: 'committee',
          approval: committeeApproval,
        }),
      ),
    ).toThrow(/actor does not match/u);
  });

  it('accepts only canonical RT-11 as the independent Guardian', () => {
    expect(
      transitionGlobalState(
        'VALIDATED',
        'GUARDIAN_PASS',
        request(['guardian-verdict'], {
          actorId: 'RT-11',
          actorRole: 'guardian',
        }),
      ),
    ).toBe('GUARDIAN_PASS');

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
  });

  it('rejects RT-11 or H01 as a producer', () => {
    expect(() =>
      transitionGlobalState(
        'VALIDATED',
        'GUARDIAN_PASS',
        request(['guardian-verdict'], {
          actorId: 'RT-11',
          actorRole: 'guardian',
          producerActorId: 'RT-11',
        }),
      ),
    ).toThrow(/Producer cannot/u);

    expect(() =>
      transitionGlobalState(
        'INGESTED',
        'CLASSIFIED',
        request(['classification'], {producerActorId: 'H01'}),
      ),
    ).toThrow(/Producer cannot/u);
  });

  it('binds approval evidence hashes to the exact transition evidence set', () => {
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');

    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: committeeApproval.approverActorId,
          actorRole: 'committee',
          approval: committeeApproval,
          evidenceHash: HASH_C,
        }),
      ),
    ).toThrow(/evidence hashes do not match/u);

    const approvalWithExtraEvidence = {
      ...committeeApproval,
      evidenceHashes: [HASH_B, HASH_C],
    };
    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: approvalWithExtraEvidence.approverActorId,
          actorRole: 'committee',
          approval: approvalWithExtraEvidence,
        }),
      ),
    ).toThrow(/evidence hashes do not match/u);
  });

  it('accepts only canonical H01 for human approvals and human gates', () => {
    const humanApproval = approval('GUARDIAN_PASS', 'HUMAN_APPROVED', 'human');
    expect(
      transitionGlobalState(
        'GUARDIAN_PASS',
        'HUMAN_APPROVED',
        request(['human-approval'], {
          actorId: 'H01',
          actorRole: 'human',
          approval: humanApproval,
        }),
      ),
    ).toBe('HUMAN_APPROVED');

    expect(() =>
      transitionGlobalState(
        'HUMAN_APPROVED',
        'READY',
        request(['human-approval'], {
          actorId: 'actor:human',
          actorRole: 'human',
        }),
      ),
    ).toThrow(/H01/u);
  });

  it('prevents H01 and RT-11 from impersonating another operational role', () => {
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');
    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: 'H01',
          actorRole: 'committee',
          approval: {...committeeApproval, approverActorId: 'H01'},
        }),
      ),
    ).toThrow(/H01/u);

    expect(() =>
      transitionGlobalState(
        'IDEATED',
        'DIRECTION_APPROVED',
        request(['committee-decision'], {
          actorId: 'RT-11',
          actorRole: 'committee',
          approval: {...committeeApproval, approverActorId: 'RT-11'},
        }),
      ),
    ).toThrow(/RT-11/u);
  });

  it('requires a non-dry-run, hash-bound receipt to publish', () => {
    const releaseReceipt = {
      schemaVersion: 'release-receipt-v1',
      receiptId: 'receipt:release:1',
      idempotencyKey: 'release-artifact-vs001-001',
      artifactId: 'artifact:vs001',
      artifactHash: HASH_A,
      approvalReceiptId: 'receipt:approval:release',
      approvalReceiptHash: HASH_B,
      destinationRef: portableRef('artifact', 'destination:instagram'),
      dryRun: false,
      status: 'published',
      callbackPolicyRef: portableRef('receipt', 'policy:callback'),
      retryPolicyRef: portableRef('receipt', 'policy:retry'),
      rollbackRef: portableRef('receipt', 'rollback:one'),
      outputHash: HASH_B,
      logRefs: ['receipts/releases/publish.log'],
      createdAt: NOW,
    };
    expect(
      transitionGlobalState(
        'RELEASE_AUTHORIZED',
        'PUBLISHED',
        request(['publish-receipt'], {
          actorId: 'actor:release-owner',
          actorRole: 'release-owner',
          releaseReceipt,
        }),
      ),
    ).toBe('PUBLISHED');
    expect(() =>
      transitionGlobalState('RELEASE_AUTHORIZED', 'PUBLISHED', request(['publish-receipt'])),
    ).toThrow(/release receipt/u);
  });
});

describe('explicit audiovisual workflow', () => {
  it('traverses every governed state with format-specific guards', () => {
    let record: AudiovisualWorkflowRecord = {
      schemaVersion: 'audiovisual-workflow-v1',
      artifactId: 'artifact:vs001',
      artifactHash: HASH_A,
      producerActorId: 'actor:producer',
      state: 'SOURCE_LOCKED',
    };

    const approvedSteps = [
      ['SPEC_APPROVED', ['spec', 'committee-decision']],
      ['BEATS_APPROVED', ['beat-map', 'committee-decision']],
      ['VISUAL_SYSTEM_APPROVED', ['visual-system', 'committee-decision']],
      ['REGISTRY_APPROVED', ['component-registry', 'committee-decision']],
    ] as const;

    for (const [next, kinds] of approvedSteps) {
      const gateApproval = approval(record.state, next, 'committee');
      record = advanceAudiovisualWorkflow(
        record,
        next,
        request([...kinds], {
          actorId: gateApproval.approverActorId,
          actorRole: 'committee',
          approval: gateApproval,
        }),
      );
    }

    record = advanceAudiovisualWorkflow(
      record,
      'BUILD_VALIDATED',
      request(['build', 'test-report']),
    );
    const shotsApproval = approval('BUILD_VALIDATED', 'REVIEW_SHOTS_APPROVED', 'committee');
    record = advanceAudiovisualWorkflow(
      record,
      'REVIEW_SHOTS_APPROVED',
      request(['review-shots', 'committee-decision'], {
        actorId: shotsApproval.approverActorId,
        actorRole: 'committee',
        approval: shotsApproval,
      }),
    );
    record = advanceAudiovisualWorkflow(record, 'RENDER_VALIDATED', request(['render-receipt']));
    record = advanceAudiovisualWorkflow(
      record,
      'POSTPRODUCTION_VALIDATED',
      request(['postproduction-receipt']),
    );
    record = advanceAudiovisualWorkflow(
      record,
      'GUARDIAN_PASS',
      request(['guardian-verdict'], {
        actorId: 'RT-11',
        actorRole: 'guardian',
      }),
    );
    const humanApproval = approval('GUARDIAN_PASS', 'HUMAN_APPROVED', 'human');
    record = advanceAudiovisualWorkflow(
      record,
      'HUMAN_APPROVED',
      request(['human-approval'], {
        actorId: humanApproval.approverActorId,
        actorRole: 'human',
        approval: humanApproval,
      }),
    );
    record = advanceAudiovisualWorkflow(
      record,
      'READY',
      request(['human-approval'], {actorId: 'H01', actorRole: 'human'}),
    );
    expect(record.state).toBe('READY');
  });

  it('rejects skipped gates and a beat approval without a beat map', () => {
    expect(() =>
      transitionAudiovisualState(
        'SOURCE_LOCKED',
        'BEATS_APPROVED',
        request(['beat-map', 'committee-decision']),
      ),
    ).toThrow(/Illegal state transition/u);

    const beatApproval = approval('SPEC_APPROVED', 'BEATS_APPROVED', 'committee');
    expect(() =>
      transitionAudiovisualState(
        'SPEC_APPROVED',
        'BEATS_APPROVED',
        request(['committee-decision'], {
          actorId: beatApproval.approverActorId,
          actorRole: 'committee',
          approval: beatApproval,
        }),
      ),
    ).toThrow(/beat-map/u);
  });
});
