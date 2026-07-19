import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {
  ApprovedRenderPackageSchema,
  N8nDryRunTransport,
  N8nIdempotencyConflictError,
} from '../../adapters/n8n/index.ts';
import {readRepositoryJson} from '../fixtures/verifier/io.ts';
import {makeN8nEvidenceFixture} from '../fixtures/verifier/n8n.ts';

describe('A11 n8n inert adapter contract', () => {
  it('keeps workflow, callback, and kill-switch policies fail-closed', () => {
    const workflow = z
      .strictObject({
        name: z.string(),
        active: z.literal(false),
        settings: z.record(z.string(), z.unknown()),
        nodes: z.array(
          z
            .object({
              id: z.string(),
              type: z.string(),
              credentials: z.never().optional(),
            })
            .passthrough(),
        ),
        connections: z.record(z.string(), z.unknown()),
        pinData: z.record(z.string(), z.unknown()),
        meta: z
          .object({
            templateCredsSetupCompleted: z.literal(false),
            governance: z.literal('inactive-no-credentials-no-network'),
          })
          .strict(),
        tags: z.array(z.unknown()),
      })
      .parse(readRepositoryJson('workflows/adapters/vs-001-approved-package-dry-run.json'));
    const callback = z
      .object({
        mode: z.literal('receipt-only'),
        network_callback_enabled: z.literal(false),
      })
      .parse(readRepositoryJson('adapters/n8n/callback-policy.json'));
    const killSwitch = z
      .object({
        enabled: z.literal(true),
        effect: z.literal('block_live_execution'),
      })
      .parse(readRepositoryJson('adapters/n8n/kill-switch.json'));
    const forbiddenNodePattern = /(http|webhook|email|slack|telegram|drive|calendar|publish)/iu;

    expect(workflow.nodes.some(({type}) => forbiddenNodePattern.test(type))).toBe(false);
    expect(callback.network_callback_enabled).toBe(false);
    expect(killSwitch.effect).toBe('block_live_execution');
  });

  it('declares bounded retries, terminal non-retryable errors, and a dead-letter path', () => {
    const policy = z
      .strictObject({
        schema_version: z.literal(1),
        policy_id: z.string().min(1),
        max_attempts: z.number().int().min(1).max(5),
        backoff_seconds: z.array(z.number().int().positive()).min(1).max(5),
        retryable_error_classes: z.array(z.string()).min(1),
        non_retryable_error_classes: z
          .array(z.string())
          .refine((values) =>
            ['hash_mismatch', 'approval_missing', 'rights_blocked'].every((value) =>
              values.includes(value),
            ),
          ),
        dead_letter_after_exhaustion: z.literal(true),
      })
      .parse(readRepositoryJson('adapters/n8n/retry-policy.json'));

    expect(policy.backoff_seconds).toHaveLength(policy.max_attempts);
  });

  it('is idempotent and rejects reuse of a key with different hash-bound content', () => {
    const {evidenceReader, renderPackage} = makeN8nEvidenceFixture();
    const transport = new N8nDryRunTransport(evidenceReader);
    const first = transport.propose(renderPackage);
    const replay = transport.propose(renderPackage);

    expect(first.status).toBe('dry-run-accepted');
    expect(replay).toMatchObject({
      receiptId: first.receiptId,
      status: 'dry-run-replayed',
      inputHash: first.inputHash,
      dryRun: true,
    });
    expect(transport.size()).toBe(1);
    expect(() =>
      transport.propose({...renderPackage, compositionId: 'DifferentComposition'}),
    ).toThrow(N8nIdempotencyConflictError);
  });

  it('rejects non-human-approved, live, or unknown-field payloads', () => {
    const {renderPackage} = makeN8nEvidenceFixture();
    expect(
      ApprovedRenderPackageSchema.safeParse({
        ...renderPackage,
        approvalState: 'GUARDIAN_PASS',
      }).success,
    ).toBe(false);
    expect(ApprovedRenderPackageSchema.safeParse({...renderPackage, dryRun: false}).success).toBe(
      false,
    );
    expect(
      ApprovedRenderPackageSchema.safeParse({
        ...renderPackage,
        humanApproverActorId: 'H02',
      }).success,
    ).toBe(false);
    expect(
      ApprovedRenderPackageSchema.safeParse({
        ...renderPackage,
        credentials: 'forbidden',
      }).success,
    ).toBe(false);
  });
});
