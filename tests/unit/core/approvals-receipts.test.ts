import {describe, expect, it} from 'vitest';

import {applyApprovedTransition, validateApprovalBinding} from '../../../core/approvals/index.ts';
import {
  createReleaseReceiptStore,
  createRenderReceiptStore,
  IdempotencyConflictError,
} from '../../../core/receipts/index.ts';
import {HASH_A, HASH_B, HASH_C, NOW, approval, portableRef, workProduct} from './fixtures.ts';

describe('approval engine', () => {
  it('validates artifact identity, version, hash, state and independent actor', () => {
    const product = workProduct('IDEATED');
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');
    expect(validateApprovalBinding(product, committeeApproval).approval.approvalId).toBe(
      committeeApproval.approvalId,
    );
  });

  it('rejects stale hashes and producer self-approval', () => {
    const product = workProduct('IDEATED');
    const stale = {...approval('IDEATED', 'DIRECTION_APPROVED', 'committee'), artifactHash: HASH_C};
    expect(() => validateApprovalBinding(product, stale)).toThrow(/hash/u);

    const selfApproval = {
      ...approval('IDEATED', 'DIRECTION_APPROVED', 'committee'),
      approverActorId: product.producerActorId,
    };
    expect(() => validateApprovalBinding(product, selfApproval)).toThrow();
  });

  it('applies only the transition approved by the bound receipt', () => {
    const product = workProduct('IDEATED');
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');
    const advanced = applyApprovedTransition(product, 'DIRECTION_APPROVED', committeeApproval, {
      artifactId: product.artifactId,
      artifactHash: product.contentHash,
      producerActorId: product.producerActorId,
      evidence: [{kind: 'committee-decision', hash: HASH_B}],
    });
    expect(advanced.state).toBe('DIRECTION_APPROVED');
    expect(() =>
      applyApprovedTransition(product, 'SPECIFIED', committeeApproval, {
        artifactId: product.artifactId,
        artifactHash: product.contentHash,
        producerActorId: product.producerActorId,
        evidence: [{kind: 'spec', hash: HASH_B}],
      }),
    ).toThrow(/different state/u);
  });

  it('rejects a transition whose evidence hashes differ from the bound approval', () => {
    const product = workProduct('IDEATED');
    const committeeApproval = approval('IDEATED', 'DIRECTION_APPROVED', 'committee');

    expect(() =>
      applyApprovedTransition(product, 'DIRECTION_APPROVED', committeeApproval, {
        artifactId: product.artifactId,
        artifactHash: product.contentHash,
        producerActorId: product.producerActorId,
        evidence: [{kind: 'committee-decision', hash: HASH_C}],
      }),
    ).toThrow(/evidence hashes do not match/u);
  });
});

function renderReceipt(outputHash = HASH_B): unknown {
  return {
    schemaVersion: 'render-receipt-v1',
    receiptId: 'receipt:render:one',
    idempotencyKey: 'render-vs001-final-0001',
    artifactId: 'artifact:vs001',
    artifactHash: HASH_A,
    compositionId: 'composition:main',
    inputPropsRef: 'projects/vs001/05-input-props.json',
    inputPropsHash: HASH_A,
    assetManifestRef: 'projects/vs001/assets-manifest.yml',
    assetManifestHash: HASH_A,
    toolchain: {
      node: '22.23.1',
      packageManager: 'pnpm@11.9.0',
      remotion: '4.0.494',
      chromium: 'pinned',
      ffmpeg: '8.1.1',
      locale: 'es-CO',
      timezone: 'America/Bogota',
    },
    output: {
      ref: 'receipts/renders/vs001.mp4',
      sha256: outputHash,
      normalizedPixelDigest: HASH_C,
      width: 1080,
      height: 1920,
      fps: 30,
      durationFrames: 90,
      codec: 'h264',
      streams: ['video'],
    },
    mode: 'final',
    status: 'succeeded',
    logRefs: ['receipts/renders/vs001.log'],
    createdAt: NOW,
  };
}

describe('idempotent receipt stores', () => {
  it('returns replayed for the same idempotency key and canonical content', () => {
    const store = createRenderReceiptStore();
    expect(store.record(renderReceipt()).status).toBe('created');
    expect(store.record(renderReceipt()).status).toBe('replayed');
    expect(store.snapshot()).toHaveLength(1);
  });

  it('deep-clones and freezes receipts so nested mutation cannot corrupt replay integrity', () => {
    const store = createRenderReceiptStore();
    const input = renderReceipt() as {
      output: {
        codec: string;
        streams: string[];
      };
    };
    const created = store.record(input);

    expect(Object.isFrozen(created.receipt)).toBe(true);
    expect(Object.isFrozen(created.receipt.output)).toBe(true);
    expect(Object.isFrozen(created.receipt.output.streams)).toBe(true);
    expect(Reflect.set(created.receipt.output, 'codec', 'vp9')).toBe(false);
    expect(() => created.receipt.output.streams.push('audio')).toThrow();

    input.output.codec = 'vp9';
    input.output.streams.push('audio');

    const stored = store.get('render-vs001-final-0001');
    expect(stored?.output.codec).toBe('h264');
    expect(stored?.output.streams).toEqual(['video']);

    const replay = store.record(renderReceipt());
    expect(replay.status).toBe('replayed');
    expect(replay.receiptHash).toBe(created.receiptHash);
    expect(replay.receipt.output.codec).toBe('h264');
    expect(store.snapshot()[0]?.output.streams).toEqual(['video']);
  });

  it('fails when an idempotency key is reused with different content', () => {
    const store = createRenderReceiptStore();
    store.record(renderReceipt());
    expect(() => store.record(renderReceipt(HASH_C))).toThrow(IdempotencyConflictError);
  });

  it('fails closed for a published dry-run release', () => {
    const store = createReleaseReceiptStore();
    expect(() =>
      store.record({
        schemaVersion: 'release-receipt-v1',
        receiptId: 'receipt:release:one',
        idempotencyKey: 'release-vs001-0001',
        artifactId: 'artifact:vs001',
        artifactHash: HASH_A,
        approvalReceiptId: 'receipt:approval:one',
        approvalReceiptHash: HASH_B,
        destinationRef: portableRef('artifact', 'destination:one'),
        dryRun: true,
        status: 'published',
        callbackPolicyRef: portableRef('receipt', 'policy:callback'),
        retryPolicyRef: portableRef('receipt', 'policy:retry'),
        rollbackRef: portableRef('receipt', 'rollback:one'),
        outputHash: HASH_C,
        logRefs: [],
        createdAt: NOW,
      }),
    ).toThrow();
  });
});
