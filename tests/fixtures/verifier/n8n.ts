import {
  type ApprovedRenderPackage,
  InMemoryEvidenceReader,
  sha256Bytes,
} from '../../../adapters/n8n/index.ts';

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

export const jsonEvidence = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const sha256Evidence = (value: string): string => sha256Bytes(encode(value));

const digest = (character: string): string => character.repeat(64);

export interface N8nEvidenceFixture {
  evidenceReader: InMemoryEvidenceReader;
  records: Record<string, string>;
  refs: {
    approvalReceipt: string;
    artifact: string;
    assetManifest: string;
    callbackPolicy: string;
    inputProps: string;
    killSwitch: string;
    renderReceipt: string;
    retryPolicy: string;
  };
  renderPackage: ApprovedRenderPackage;
}

export function makeN8nEvidenceFixture(): N8nEvidenceFixture {
  const refs = {
    approvalReceipt: 'approvals/h01/vs001.json',
    artifact: 'artifacts/vs001.mp4',
    assetManifest: 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
    callbackPolicy: 'adapters/n8n/callback-policy.json',
    inputProps: 'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
    killSwitch: 'adapters/n8n/kill-switch.json',
    renderReceipt: 'receipts/renders/vs001.json',
    retryPolicy: 'adapters/n8n/retry-policy.json',
  };
  const artifact = 'deterministic-video-fixture';
  const inputProps = '{"fixture":true}\n';
  const assetManifest = 'schema_version: 1\nassets: []\n';
  const artifactHash = sha256Evidence(artifact);
  const inputPropsHash = sha256Evidence(inputProps);
  const assetManifestHash = sha256Evidence(assetManifest);
  const renderReceipt = jsonEvidence({
    schemaVersion: 'render-receipt-v1',
    receiptId: 'RCP:RENDER:VS001',
    idempotencyKey: 'render-vs001-fixture-001',
    artifactId: 'VID:VS001',
    artifactHash,
    compositionId: 'MethodologiaVertical',
    inputPropsRef: refs.inputProps,
    inputPropsHash,
    assetManifestRef: refs.assetManifest,
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
      ref: refs.artifact,
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
  const renderReceiptHash = sha256Evidence(renderReceipt);
  const approval = jsonEvidence({
    schemaVersion: 'approval-v1',
    approvalId: 'APR:H01:VS001',
    artifactId: 'VID:VS001',
    artifactVersion: 'review-v1',
    artifactHash,
    fromState: 'GUARDIAN_PASS',
    toState: 'HUMAN_APPROVED',
    decision: 'approved',
    producerActorId: 'A08',
    approverActorId: 'H01',
    approverRole: 'human',
    conditions: [],
    risksAccepted: [],
    evidenceHashes: [renderReceiptHash],
    decidedAt: '2026-07-19T16:11:00-05:00',
  });
  const callbackPolicy = jsonEvidence({
    schema_version: 1,
    policy_id: 'POL:N8N:CALLBACK:VS001',
    mode: 'receipt-only',
    allowed_fields: ['receipt_id'],
    network_callback_enabled: false,
  });
  const retryPolicy = jsonEvidence({
    schema_version: 1,
    policy_id: 'POL:N8N:RETRY:VS001',
    max_attempts: 3,
    backoff_seconds: [5, 30, 120],
    retryable_error_classes: ['transient_transport'],
    non_retryable_error_classes: ['hash_mismatch', 'approval_missing', 'rights_blocked'],
    dead_letter_after_exhaustion: true,
  });
  const killSwitch = jsonEvidence({
    schema_version: 1,
    switch_id: 'SW:N8N:VS001',
    enabled: true,
    effect: 'block_live_execution',
    reason: 'Fixture remains dry-run only.',
  });
  const records = {
    [refs.approvalReceipt]: approval,
    [refs.artifact]: artifact,
    [refs.assetManifest]: assetManifest,
    [refs.callbackPolicy]: callbackPolicy,
    [refs.inputProps]: inputProps,
    [refs.killSwitch]: killSwitch,
    [refs.renderReceipt]: renderReceipt,
    [refs.retryPolicy]: retryPolicy,
  };
  const renderPackage = {
    schemaVersion: 'n8n-approved-render-package-v2',
    artifactId: 'VID:VS001',
    artifactRef: refs.artifact,
    artifactHash,
    compositionId: 'MethodologiaVertical',
    renderReceiptRef: refs.renderReceipt,
    renderReceiptHash,
    inputPropsRef: refs.inputProps,
    inputPropsHash,
    assetManifestRef: refs.assetManifest,
    assetManifestHash,
    idempotencyKey: 'vs001-approved-render-qa-001',
    approvalState: 'HUMAN_APPROVED',
    humanApproverActorId: 'H01',
    approvalReceiptId: 'APR:H01:VS001',
    approvalReceiptRef: refs.approvalReceipt,
    approvalReceiptHash: sha256Evidence(approval),
    callbackPolicyRef: refs.callbackPolicy,
    callbackPolicyHash: sha256Evidence(callbackPolicy),
    retryPolicyRef: refs.retryPolicy,
    retryPolicyHash: sha256Evidence(retryPolicy),
    killSwitchRef: refs.killSwitch,
    killSwitchHash: sha256Evidence(killSwitch),
    dryRun: true,
  } satisfies ApprovedRenderPackage;

  return {
    evidenceReader: new InMemoryEvidenceReader(records),
    records,
    refs,
    renderPackage,
  };
}
