import {z} from 'zod';

import {ApprovalSchema, RenderReceiptSchema} from 'core/contracts/index.ts';
import {hashCanonical} from 'core/evidence/index.ts';
import {
  ApprovedRenderPackageSchema,
  N8nDryRunReceiptSchema,
  type N8nDryRunReceipt,
} from './contract.ts';
import {type N8nEvidenceReader, sha256Bytes} from './evidence.ts';

type StoredReceipt = {packageHash: string; receipt: N8nDryRunReceipt};

export class N8nIdempotencyConflictError extends Error {
  public constructor(key: string) {
    super(`The idempotency key is already bound to a different package: ${key}`);
    this.name = 'N8nIdempotencyConflictError';
  }
}

export class N8nEvidenceResolutionError extends Error {
  public constructor(
    public readonly errorCode:
      | 'EVIDENCE_MISSING'
      | 'HASH_MISMATCH'
      | 'APPROVAL_INVALID'
      | 'RENDER_RECEIPT_INVALID'
      | 'POLICY_INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'N8nEvidenceResolutionError';
  }
}

const CallbackPolicySchema = z.strictObject({
  schema_version: z.literal(1),
  policy_id: z.string().min(1),
  mode: z.literal('receipt-only'),
  allowed_fields: z.array(z.string().min(1)).min(1),
  network_callback_enabled: z.literal(false),
});

const RetryPolicySchema = z.strictObject({
  schema_version: z.literal(1),
  policy_id: z.string().min(1),
  max_attempts: z.number().int().min(1).max(5),
  backoff_seconds: z.array(z.number().int().positive()).min(1).max(5),
  retryable_error_classes: z.array(z.string().min(1)).min(1),
  non_retryable_error_classes: z.array(z.string().min(1)).min(1),
  dead_letter_after_exhaustion: z.literal(true),
});

const KillSwitchSchema = z.strictObject({
  schema_version: z.literal(1),
  switch_id: z.string().min(1),
  enabled: z.literal(true),
  effect: z.literal('block_live_execution'),
  reason: z.string().min(1),
});

const parseJsonEvidence = (value: Uint8Array, label: string): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(value)) as unknown;
  } catch {
    throw new N8nEvidenceResolutionError('POLICY_INVALID', `${label} is not valid JSON.`);
  }
};

export class N8nDryRunTransport {
  readonly #receipts = new Map<string, StoredReceipt>();

  public constructor(
    private readonly evidenceReader: N8nEvidenceReader = {
      read: () => undefined,
    },
  ) {}

  #resolve(reference: string, expectedHash: string, label: string): Uint8Array {
    const value = this.evidenceReader.read(reference);
    if (value === undefined) {
      throw new N8nEvidenceResolutionError(
        'EVIDENCE_MISSING',
        `${label} does not resolve: ${reference}`,
      );
    }
    const observedHash = sha256Bytes(value);
    if (observedHash !== expectedHash) {
      throw new N8nEvidenceResolutionError(
        'HASH_MISMATCH',
        `${label} hash mismatch for ${reference}`,
      );
    }
    return value;
  }

  #verifyEvidence(renderPackage: ReturnType<typeof ApprovedRenderPackageSchema.parse>): void {
    const artifact = this.#resolve(
      renderPackage.artifactRef,
      renderPackage.artifactHash,
      'artifact',
    );
    const renderReceiptBytes = this.#resolve(
      renderPackage.renderReceiptRef,
      renderPackage.renderReceiptHash,
      'render receipt',
    );
    this.#resolve(renderPackage.inputPropsRef, renderPackage.inputPropsHash, 'input props');
    this.#resolve(
      renderPackage.assetManifestRef,
      renderPackage.assetManifestHash,
      'asset manifest',
    );
    const approvalBytes = this.#resolve(
      renderPackage.approvalReceiptRef,
      renderPackage.approvalReceiptHash,
      'approval receipt',
    );
    const callbackPolicy = this.#resolve(
      renderPackage.callbackPolicyRef,
      renderPackage.callbackPolicyHash,
      'callback policy',
    );
    const retryPolicy = this.#resolve(
      renderPackage.retryPolicyRef,
      renderPackage.retryPolicyHash,
      'retry policy',
    );
    const killSwitch = this.#resolve(
      renderPackage.killSwitchRef,
      renderPackage.killSwitchHash,
      'kill switch',
    );

    const renderReceiptResult = RenderReceiptSchema.safeParse(
      parseJsonEvidence(renderReceiptBytes, 'render receipt'),
    );
    if (!renderReceiptResult.success) {
      throw new N8nEvidenceResolutionError(
        'RENDER_RECEIPT_INVALID',
        'The render receipt does not satisfy the governed schema.',
      );
    }
    const renderReceipt = renderReceiptResult.data;
    if (
      renderReceipt.status !== 'succeeded' ||
      renderReceipt.artifactId !== renderPackage.artifactId ||
      renderReceipt.artifactHash !== renderPackage.artifactHash ||
      renderReceipt.compositionId !== renderPackage.compositionId ||
      renderReceipt.inputPropsRef !== renderPackage.inputPropsRef ||
      renderReceipt.inputPropsHash !== renderPackage.inputPropsHash ||
      renderReceipt.assetManifestRef !== renderPackage.assetManifestRef ||
      renderReceipt.assetManifestHash !== renderPackage.assetManifestHash ||
      renderReceipt.output.ref !== renderPackage.artifactRef ||
      renderReceipt.output.sha256 !== sha256Bytes(artifact)
    ) {
      throw new N8nEvidenceResolutionError(
        'RENDER_RECEIPT_INVALID',
        'The render receipt is not bound to the proposed artifact and inputs.',
      );
    }

    const approvalResult = ApprovalSchema.safeParse(
      parseJsonEvidence(approvalBytes, 'approval receipt'),
    );
    if (!approvalResult.success) {
      throw new N8nEvidenceResolutionError(
        'APPROVAL_INVALID',
        'The approval receipt does not satisfy the governed schema.',
      );
    }
    const approval = approvalResult.data;
    if (
      approval.approvalId !== renderPackage.approvalReceiptId ||
      approval.artifactId !== renderPackage.artifactId ||
      approval.artifactHash !== renderPackage.artifactHash ||
      approval.approverRole !== 'human' ||
      approval.approverActorId !== renderPackage.humanApproverActorId ||
      approval.decision !== 'approved' ||
      approval.toState !== 'HUMAN_APPROVED' ||
      !approval.evidenceHashes.includes(renderPackage.renderReceiptHash)
    ) {
      throw new N8nEvidenceResolutionError(
        'APPROVAL_INVALID',
        'The human approval is not hash-bound to this artifact and render receipt.',
      );
    }

    try {
      CallbackPolicySchema.parse(parseJsonEvidence(callbackPolicy, 'callback policy'));
      RetryPolicySchema.parse(parseJsonEvidence(retryPolicy, 'retry policy'));
      KillSwitchSchema.parse(parseJsonEvidence(killSwitch, 'kill switch'));
    } catch (error) {
      if (error instanceof N8nEvidenceResolutionError) throw error;
      throw new N8nEvidenceResolutionError(
        'POLICY_INVALID',
        'A referenced n8n policy does not satisfy its fail-closed contract.',
      );
    }
  }

  public propose(input: unknown): N8nDryRunReceipt {
    const renderPackage = ApprovedRenderPackageSchema.parse(input);
    const packageHash = hashCanonical(renderPackage);
    const existing = this.#receipts.get(renderPackage.idempotencyKey);

    if (existing !== undefined) {
      if (existing.packageHash !== packageHash) {
        throw new N8nIdempotencyConflictError(renderPackage.idempotencyKey);
      }
      this.#verifyEvidence(renderPackage);
      return N8nDryRunReceiptSchema.parse({
        ...existing.receipt,
        status: 'dry-run-replayed',
      });
    }

    this.#verifyEvidence(renderPackage);

    const shortHash = packageHash.slice(0, 20);
    const receipt = N8nDryRunReceiptSchema.parse({
      schemaVersion: 'n8n-dry-run-receipt-v1',
      receiptId: `RCP:N8N:${shortHash}`,
      jobId: `JOB:N8N:${shortHash}`,
      idempotencyKey: renderPackage.idempotencyKey,
      status: 'dry-run-accepted',
      logRefs: ['receipts/releases/n8n-dry-run.log'],
      inputHash: packageHash,
      outputHash: hashCanonical({
        artifactId: renderPackage.artifactId,
        status: 'proposed-only',
        dryRun: true,
      }),
      retryCount: 0,
      errorClass: null,
      dryRun: true,
    });
    this.#receipts.set(renderPackage.idempotencyKey, {packageHash, receipt});
    return receipt;
  }

  public size(): number {
    return this.#receipts.size;
  }
}
