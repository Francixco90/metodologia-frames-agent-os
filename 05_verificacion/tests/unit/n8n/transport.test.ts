import {describe, expect, it} from 'vitest';

import {
  ApprovedRenderPackageSchema,
  InMemoryEvidenceReader,
  N8nDryRunTransport,
  N8nEvidenceResolutionError,
  N8nIdempotencyConflictError,
  sha256Bytes,
} from '../../../../adapters/n8n/index.ts';

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string): string => sha256Bytes(encode(value));
const digest = (character: string): string => character.repeat(64);

const makeFixture = () => {
  const artifactRef = 'artifacts/vs001.mp4';
  const inputPropsRef = 'projects/vs-001-source-to-campaign/remotion/05-input-props.json';
  const assetManifestRef = 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml';
  const renderReceiptRef = 'receipts/renders/vs001.json';
  const approvalReceiptRef = 'approvals/h01/vs001.json';
  const callbackPolicyRef = 'adapters/n8n/callback-policy.json';
  const retryPolicyRef = 'adapters/n8n/retry-policy.json';
  const killSwitchRef = 'adapters/n8n/kill-switch.json';
  const artifact = 'deterministic-video-fixture';
  const inputProps = '{"fixture":true}\n';
  const assetManifest = 'schema_version: 1\nassets: []\n';
  const artifactHash = sha256(artifact);
  const inputPropsHash = sha256(inputProps);
  const assetManifestHash = sha256(assetManifest);
  const renderReceipt = json({
    schemaVersion: 'render-receipt-v1',
    receiptId: 'RCP:RENDER:VS001',
    idempotencyKey: 'render-vs001-fixture-001',
    artifactId: 'VID:VS001',
    artifactHash,
    compositionId: 'MethodologiaVertical',
    inputPropsRef,
    inputPropsHash,
    assetManifestRef,
    assetManifestHash,
    toolchain: {
      node: '22.23.1',
      packageManager: 'pnpm@11.9.0',
      remotion: '4.0.494',
      chromium: 'fixture',
      ffmpeg: '8.1.1',
      locale: 'es-CO',
      timezone: 'America/Bogota',
    },
    output: {
      ref: artifactRef,
      sha256: artifactHash,
      normalizedPixelDigest: digest('1'),
      width: 1080,
      height: 1920,
      fps: 30,
      durationFrames: 900,
      codec: 'h264',
      streams: ['video'],
    },
    mode: 'review',
    status: 'succeeded',
    logRefs: ['receipts/renders/vs001.log'],
    createdAt: '2026-07-19T16:10:00-05:00',
  });
  const renderReceiptHash = sha256(renderReceipt);
  const approval = json({
    schemaVersion: 'approval-v1',
    approvalId: 'APR:H01:VS001',
    artifactId: 'VID:VS001',
    artifactVersion: 'review-v1',
    artifactHash,
    fromState: 'GUARDIAN_PASS',
    toState: 'HUMAN_APPROVED',
    decision: 'approved',
    producerActorId: 'actor-remotion-producer',
    approverActorId: 'H01',
    approverRole: 'human',
    conditions: [],
    risksAccepted: [],
    evidenceHashes: [renderReceiptHash],
    decidedAt: '2026-07-19T16:11:00-05:00',
  });
  const callbackPolicy = json({
    schema_version: 1,
    policy_id: 'POL:N8N:CALLBACK:VS001',
    mode: 'receipt-only',
    allowed_fields: ['receipt_id'],
    network_callback_enabled: false,
  });
  const retryPolicy = json({
    schema_version: 1,
    policy_id: 'POL:N8N:RETRY:VS001',
    max_attempts: 3,
    backoff_seconds: [5, 30, 120],
    retryable_error_classes: ['transient_transport'],
    non_retryable_error_classes: ['hash_mismatch', 'approval_missing', 'rights_blocked'],
    dead_letter_after_exhaustion: true,
  });
  const killSwitch = json({
    schema_version: 1,
    switch_id: 'SW:N8N:VS001',
    enabled: true,
    effect: 'block_live_execution',
    reason: 'Fixture remains dry-run only.',
  });

  const renderPackage = {
    schemaVersion: 'n8n-approved-render-package-v2',
    artifactId: 'VID:VS001',
    artifactRef,
    artifactHash,
    compositionId: 'MethodologiaVertical',
    renderReceiptRef,
    renderReceiptHash,
    inputPropsRef,
    inputPropsHash,
    assetManifestRef,
    assetManifestHash,
    idempotencyKey: 'vs001-approved-render-001',
    approvalState: 'HUMAN_APPROVED',
    humanApproverActorId: 'H01',
    approvalReceiptId: 'APR:H01:VS001',
    approvalReceiptRef,
    approvalReceiptHash: sha256(approval),
    callbackPolicyRef,
    callbackPolicyHash: sha256(callbackPolicy),
    retryPolicyRef,
    retryPolicyHash: sha256(retryPolicy),
    killSwitchRef,
    killSwitchHash: sha256(killSwitch),
    dryRun: true,
  } as const;

  const evidenceReader = new InMemoryEvidenceReader({
    [artifactRef]: artifact,
    [inputPropsRef]: inputProps,
    [assetManifestRef]: assetManifest,
    [renderReceiptRef]: renderReceipt,
    [approvalReceiptRef]: approval,
    [callbackPolicyRef]: callbackPolicy,
    [retryPolicyRef]: retryPolicy,
    [killSwitchRef]: killSwitch,
  });

  return {evidenceReader, renderPackage};
};

describe('N8nDryRunTransport', () => {
  it('accepts a resolved human-approved, hash-bound dry-run package', () => {
    const {evidenceReader, renderPackage} = makeFixture();
    const transport = new N8nDryRunTransport(evidenceReader);
    const receipt = transport.propose(renderPackage);

    expect(receipt.status).toBe('dry-run-accepted');
    expect(receipt.dryRun).toBe(true);
    expect(transport.size()).toBe(1);
  });

  it('replays the same verified package without creating a duplicate job', () => {
    const {evidenceReader, renderPackage} = makeFixture();
    const transport = new N8nDryRunTransport(evidenceReader);
    const first = transport.propose(renderPackage);
    const replay = transport.propose(renderPackage);

    expect(replay.receiptId).toBe(first.receiptId);
    expect(replay.status).toBe('dry-run-replayed');
    expect(transport.size()).toBe(1);
  });

  it('re-resolves evidence before replay and rejects drift', () => {
    const {evidenceReader, renderPackage} = makeFixture();
    let evidenceAvailable = true;
    const transport = new N8nDryRunTransport({
      read: (reference) => (evidenceAvailable ? evidenceReader.read(reference) : undefined),
    });
    transport.propose(renderPackage);
    evidenceAvailable = false;

    expect(() => transport.propose(renderPackage)).toThrow(N8nEvidenceResolutionError);
    expect(transport.size()).toBe(1);
  });

  it('rejects a human approval issued by an actor other than canonical H01', () => {
    const {evidenceReader, renderPackage} = makeFixture();
    const approvalBytes = evidenceReader.read(renderPackage.approvalReceiptRef);
    expect(approvalBytes).toBeDefined();
    const approval = JSON.parse(new TextDecoder().decode(approvalBytes)) as Record<string, unknown>;
    approval.approvalId = 'APR:H02:VS001';
    approval.approverActorId = 'H02';
    const h02Approval = json(approval);
    const h02Reader = {
      read: (reference: string) =>
        reference === renderPackage.approvalReceiptRef
          ? encode(h02Approval)
          : evidenceReader.read(reference),
    };
    const transport = new N8nDryRunTransport(h02Reader);

    expect(() =>
      transport.propose({
        ...renderPackage,
        approvalReceiptId: 'APR:H02:VS001',
        approvalReceiptHash: sha256(h02Approval),
      }),
    ).toThrow(N8nEvidenceResolutionError);
  });

  it('rejects reuse of an idempotency key before accepting different content', () => {
    const {evidenceReader, renderPackage} = makeFixture();
    const transport = new N8nDryRunTransport(evidenceReader);
    transport.propose(renderPackage);

    expect(() =>
      transport.propose({...renderPackage, compositionId: 'DifferentComposition'}),
    ).toThrow(N8nIdempotencyConflictError);
  });

  it('rejects shape-valid packages whose evidence does not resolve', () => {
    const {renderPackage} = makeFixture();
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader({}));

    expect(() => transport.propose(renderPackage)).toThrow(N8nEvidenceResolutionError);
    expect(transport.size()).toBe(0);
  });

  it('rejects packages that are not explicitly human approved and dry-run', () => {
    const {renderPackage} = makeFixture();
    expect(() =>
      ApprovedRenderPackageSchema.parse({
        ...renderPackage,
        approvalState: 'GUARDIAN_PASS',
        dryRun: false,
      }),
    ).toThrow();
  });
});
