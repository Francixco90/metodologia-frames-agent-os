import {describe, expect, it} from 'vitest';

import {
  InMemoryEvidenceReader,
  N8nDryRunTransport,
  N8nEvidenceResolutionError,
} from '../../../adapters/n8n/index.ts';
import {jsonEvidence, makeN8nEvidenceFixture, sha256Evidence} from '../fixtures/verifier/n8n.ts';

describe('A11 n8n adversarial verification', () => {
  it('defaults to deny-all when no evidence reader is explicitly injected', () => {
    const {renderPackage} = makeN8nEvidenceFixture();
    const transport = new N8nDryRunTransport();

    expect(() => transport.propose(renderPackage)).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'EVIDENCE_MISSING',
      }),
    );
    expect(transport.size()).toBe(0);
  });

  it.each([
    ['artifact', 'artifact'],
    ['render receipt', 'renderReceipt'],
    ['input props', 'inputProps'],
    ['asset manifest', 'assetManifest'],
    ['approval receipt', 'approvalReceipt'],
    ['callback policy', 'callbackPolicy'],
    ['retry policy', 'retryPolicy'],
    ['kill switch', 'killSwitch'],
  ] as const)('requires the %s reference to resolve', (_label, key) => {
    const fixture = makeN8nEvidenceFixture();
    const records = {...fixture.records};
    delete records[fixture.refs[key]];
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() => transport.propose(fixture.renderPackage)).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'EVIDENCE_MISSING',
      }),
    );
  });

  it.each([
    ['artifact', 'artifact'],
    ['render receipt', 'renderReceipt'],
    ['input props', 'inputProps'],
    ['asset manifest', 'assetManifest'],
    ['approval receipt', 'approvalReceipt'],
    ['callback policy', 'callbackPolicy'],
    ['retry policy', 'retryPolicy'],
    ['kill switch', 'killSwitch'],
  ] as const)('rejects hash drift in the resolved %s', (_label, key) => {
    const fixture = makeN8nEvidenceFixture();
    const records = {
      ...fixture.records,
      [fixture.refs[key]]: `${fixture.records[fixture.refs[key]]}tampered`,
    };
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() => transport.propose(fixture.renderPackage)).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'HASH_MISMATCH',
      }),
    );
  });

  it('rejects an H01 approval that is not hash-bound to the render receipt', () => {
    const fixture = makeN8nEvidenceFixture();
    const approval = JSON.parse(fixture.records[fixture.refs.approvalReceipt] ?? '{}') as {
      evidenceHashes: string[];
    };
    approval.evidenceHashes = ['f'.repeat(64)];
    const approvalEvidence = jsonEvidence(approval);
    const records = {
      ...fixture.records,
      [fixture.refs.approvalReceipt]: approvalEvidence,
    };
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() =>
      transport.propose({
        ...fixture.renderPackage,
        approvalReceiptHash: sha256Evidence(approvalEvidence),
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'APPROVAL_INVALID',
      }),
    );
  });

  it('rejects a hash-valid render receipt that is not bound to the proposed artifact', () => {
    const fixture = makeN8nEvidenceFixture();
    const renderReceipt = JSON.parse(fixture.records[fixture.refs.renderReceipt] ?? '{}') as {
      artifactId: string;
    };
    renderReceipt.artifactId = 'VID:OTHER';
    const renderReceiptEvidence = jsonEvidence(renderReceipt);
    const records = {
      ...fixture.records,
      [fixture.refs.renderReceipt]: renderReceiptEvidence,
    };
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() =>
      transport.propose({
        ...fixture.renderPackage,
        renderReceiptHash: sha256Evidence(renderReceiptEvidence),
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'RENDER_RECEIPT_INVALID',
      }),
    );
  });

  it.each([
    {
      label: 'callback policy',
      refKey: 'callbackPolicy',
      hashKey: 'callbackPolicyHash',
      invalidate: (policy: Record<string, unknown>) => {
        policy.network_callback_enabled = true;
      },
    },
    {
      label: 'retry policy',
      refKey: 'retryPolicy',
      hashKey: 'retryPolicyHash',
      invalidate: (policy: Record<string, unknown>) => {
        policy.dead_letter_after_exhaustion = false;
      },
    },
    {
      label: 'kill switch',
      refKey: 'killSwitch',
      hashKey: 'killSwitchHash',
      invalidate: (policy: Record<string, unknown>) => {
        policy.enabled = false;
      },
    },
  ] as const)('rejects a hash-valid but unsafe $label', ({refKey, hashKey, invalidate}) => {
    const fixture = makeN8nEvidenceFixture();
    const policy = JSON.parse(fixture.records[fixture.refs[refKey]] ?? '{}') as Record<
      string,
      unknown
    >;
    invalidate(policy);
    const policyEvidence = jsonEvidence(policy);
    const records = {
      ...fixture.records,
      [fixture.refs[refKey]]: policyEvidence,
    };
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() =>
      transport.propose({
        ...fixture.renderPackage,
        [hashKey]: sha256Evidence(policyEvidence),
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'POLICY_INVALID',
      }),
    );
  });

  it('rejects a hash-valid approval issued by an actor other than canonical H01', () => {
    const fixture = makeN8nEvidenceFixture();
    const approval = JSON.parse(fixture.records[fixture.refs.approvalReceipt] ?? '{}') as {
      approvalId: string;
      approverActorId: string;
    };
    approval.approvalId = 'APR:H02:VS001';
    approval.approverActorId = 'H02';
    const approvalEvidence = jsonEvidence(approval);
    const records = {
      ...fixture.records,
      [fixture.refs.approvalReceipt]: approvalEvidence,
    };
    const transport = new N8nDryRunTransport(new InMemoryEvidenceReader(records));

    expect(() =>
      transport.propose({
        ...fixture.renderPackage,
        approvalReceiptId: approval.approvalId,
        approvalReceiptHash: sha256Evidence(approvalEvidence),
      }),
    ).toThrow(N8nEvidenceResolutionError);
  });

  it('re-resolves evidence before replaying an already accepted package', () => {
    const fixture = makeN8nEvidenceFixture();
    const records = {...fixture.records};
    const evidenceReader = {
      read(reference: string): Uint8Array | undefined {
        const value = records[reference];
        return value === undefined ? undefined : new TextEncoder().encode(value);
      },
    };
    const transport = new N8nDryRunTransport(evidenceReader);

    expect(transport.propose(fixture.renderPackage).status).toBe('dry-run-accepted');
    records[fixture.refs.artifact] = `${records[fixture.refs.artifact]}tampered`;

    expect(() => transport.propose(fixture.renderPackage)).toThrowError(
      expect.objectContaining({
        name: 'N8nEvidenceResolutionError',
        errorCode: 'HASH_MISMATCH',
      }),
    );
  });
});
