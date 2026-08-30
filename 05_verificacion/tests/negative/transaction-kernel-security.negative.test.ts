import {
  appendFileSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  statfsSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {TransactionEffectReceiptV1Schema, TransactionKernelErrorV1} from 'core/contracts/index.ts';
import {hashCanonical} from 'core/evidence/hash.ts';
import {
  DefaultTransactionKernelV1,
  assertExactTransactionRefV1,
  assertExactWriteSetV1,
  captureTransactionSnapshotV1,
  computeProducerActionSha256V1,
  computeTransactionExecutionInputSha256V1,
  readTransactionLedgerV1,
  withStableRootCapabilityV1,
  type DefaultTransactionKernelOptionsV1,
  type TransactionDurableSeamV1,
  type TransactionWriterOperationV1,
  type TransactionWriterSeamV1,
} from 'core/orchestration/index.ts';
import {TransactionDurableStoreV1} from 'core/orchestration/transaction-durable-store-v1.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionExecution as execution,
  makeTransactionSandbox as sandbox,
  signTransactionFixture as signed,
  transactionAuthorityPort as verifiedAuthority,
  transactionDigest as digest,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

const kernelFor = (
  state: string,
  options: Omit<DefaultTransactionKernelOptionsV1, 'producerAuthority'> = {},
): DefaultTransactionKernelV1 =>
  new DefaultTransactionKernelV1(state, {producerAuthority: verifiedAuthority, ...options});

afterEach(() => {
  cleanupTransactionFixtures();
});

describe('TransactionKernelV1 filesystem and recovery boundaries', () => {
  it.each([
    '../escape.md',
    '/absolute.md',
    '\\\\server\\share',
    'C:\\drive.md',
    'file:ads',
    'CON',
    'nul.txt',
    'COM1.log',
    'trailing.',
    'trailing ',
    'glob/*.md',
    'a//b',
    'e\u0301.md',
    'control\u0000.md',
    '~/.secret',
  ])('rejects non-portable exact ref %j', (ref) => {
    expect(() => assertExactTransactionRefV1(ref)).toThrow(TransactionKernelErrorV1);
  });

  it('rejects duplicate, casefold and Unicode-normalized aliases', () => {
    expect(() => assertExactWriteSetV1(['Report.md', 'report.md'])).toThrow(/alias/u);
    expect(() => assertExactWriteSetV1(['é.md', 'e\u0301.md'])).toThrow();
    expect(() => assertExactWriteSetV1(['same.md', 'same.md'])).toThrow(/Duplicate/u);
  });

  it('never overwrites a pre-existing target, even when bytes match', () => {
    const fixture = execution('preexisting');
    writeFileSync(resolve(fixture.effect, 'result.md'), 'x');
    const receipt = kernelFor(fixture.state).execute(fixture.input);
    expect(receipt).toMatchObject({
      state: 'BLOCKED_UNCERTAIN',
      errorCode: 'BLOCKED_UNCERTAIN',
      outputs: [],
    });
    expect(readFileSync(resolve(fixture.effect, 'result.md'), 'utf8')).toBe('x');
  });

  it.each([
    'TEMP_OPEN',
    'WRITE',
    'FILE_FSYNC',
    'LINK',
    'PARENT_OPEN',
    'PARENT_FSYNC',
    'READBACK',
    'TEMP_UNLINK',
    'PARENT_RESYNC',
  ] satisfies TransactionWriterOperationV1[])(
    'maps %s operation failure to uncertainty, never PASS',
    (operation) => {
      const fixture = execution(`op.${operation.toLowerCase()}`);
      const receipt = kernelFor(fixture.state, {
        writerHooks: {
          beforeOperation: (current) => {
            if (current === operation) throw new Error(`fault:${operation}`);
          },
        },
      }).execute(fixture.input);
      expect(receipt.state).toBe('BLOCKED_UNCERTAIN');
      expect(receipt.outputs).toEqual([]);
      expect(
        new TransactionDurableStoreV1(fixture.state).inspect(fixture.input.runId).latestState,
      ).toBe('BLOCKED_UNCERTAIN');
    },
  );

  it.each([
    'TEMP_OPENED',
    'BYTES_WRITTEN',
    'FILE_SYNCED',
    'TARGET_LINKED',
    'PARENT_SYNCED',
    'READBACK_VERIFIED',
    'TEMP_REMOVED',
    'PARENT_RESYNCED',
  ] satisfies TransactionWriterSeamV1[])(
    'crash after writer seam %s cannot produce PASS',
    (seam) => {
      const fixture = execution(`seam.${seam.toLowerCase()}`);
      const receipt = kernelFor(fixture.state, {
        writerHooks: {
          onSeam: (current) => {
            if (current === seam) throw new Error(`crash:${seam}`);
          },
        },
      }).execute(fixture.input);
      expect(receipt.state).toBe('BLOCKED_UNCERTAIN');
      expect(receipt.coverageGaps).toContain('TRANSACTION_EFFECT_NOT_VERIFIED');
    },
  );

  it('reports a partial ledger, stale lock and receipt contamination as uncertainty', () => {
    const fixture = execution('corrupt');
    const store = new TransactionDurableStoreV1(fixture.state);
    expect(kernelFor(fixture.state).execute(fixture.input).state).toBe('EFFECT_SUCCEEDED');
    const run = resolve(fixture.state, fixture.input.runId);
    appendFileSync(resolve(run, 'ledger.jsonl'), '{"partial":true}');
    writeFileSync(resolve(run, 'run.lock'), '{}');
    writeFileSync(resolve(run, 'receipts', 'orphan.json'), '{}');
    expect(store.inspect(fixture.input.runId)).toMatchObject({status: 'BLOCKED_UNCERTAIN'});
    expect(store.inspect(fixture.input.runId).issues).toEqual(
      expect.arrayContaining(['PARTIAL_LEDGER_LINE', 'ORPHAN_LOCK', 'ORPHAN_RECEIPT:orphan']),
    );
  });

  it('detects ledger run contamination and invalid hash chain', () => {
    const {state} = sandbox();
    const path = resolve(state, 'ledger.jsonl');
    const unsigned = {
      schemaVersion: 'transaction-ledger-record-v1' as const,
      eventId: 'event.other',
      runId: 'run.other',
      state: 'PREPARED' as const,
      payloadSha256: digest('payload'),
      receiptId: null,
      receiptPhysicalSha256: null,
      previousRecordSha256: null,
      recordedAt: '2026-08-29T12:00:00.000Z',
    };
    writeFileSync(
      path,
      `${JSON.stringify({...unsigned, recordSha256: hashCanonical(unsigned)})}\n`,
    );
    expect(readTransactionLedgerV1(path, 'run.expected').issues).toEqual(['INVALID_LEDGER_CHAIN']);
  });

  it('fails a concurrent run lock closed', () => {
    const fixture = execution('locked');
    const run = resolve(fixture.state, fixture.input.runId);
    mkdirSync(resolve(run, 'receipts'), {recursive: true});
    writeFileSync(resolve(run, 'run.lock'), '{}');
    expect(() => kernelFor(fixture.state).execute(fixture.input)).toThrow(/lock exists/u);
  });

  it('requires an authorized, self-hash-bound append-only recovery', () => {
    const fixture = execution('recovery');
    const withoutAuthority = kernelFor(fixture.state, {
      writerHooks: {
        beforeOperation: (operation) => {
          if (operation === 'READBACK') throw new Error('crash');
        },
      },
    });
    expect(withoutAuthority.execute(fixture.input).state).toBe('BLOCKED_UNCERTAIN');
    const before = readFileSync(
      resolve(fixture.state, fixture.input.runId, 'ledger.jsonl'),
      'utf8',
    );
    const recoveryDraft = {
      schemaVersion: 'transaction-recovery-input-v1' as const,
      runId: fixture.input.runId,
      recoveryId: 'recovery.one',
      actorInstanceId: 'actor.recovery',
      taskId: 'task.recovery',
      authoritySha256: digest('recovery-authority'),
      reason: 'Durable seam interrupted.',
      recordedAt: '2026-08-29T12:00:02.000Z',
    };
    const recoveryInput = signed(recoveryDraft);
    expect(() => withoutAuthority.recover(recoveryInput)).toThrow(/authority port/u);
    const authorized = kernelFor(fixture.state, {
      recoveryAuthority: verifiedAuthority,
    });
    expect(authorized.recover(recoveryInput)).toMatchObject({state: 'BLOCKED_UNCERTAIN'});
    expect(readFileSync(resolve(fixture.state, fixture.input.runId, 'ledger.jsonl'), 'utf8')).toBe(
      before,
    );
    expect(
      readFileSync(resolve(fixture.state, fixture.input.runId, 'recovery-ledger.jsonl'), 'utf8'),
    ).toContain('recovery.one');
  });

  it('blocks state/effect root overlap before any effect', () => {
    const fixture = execution('overlap');
    const stateInfo = lstatSync(fixture.state);
    const changed = {
      ...fixture.input,
      rootAuthority: {
        ...fixture.authority,
        rootPath: fixture.state,
        expectedRealpath: fixture.state,
        expectedDev: stateInfo.dev,
        expectedIno: stateInfo.ino,
        expectedFilesystemType: Number(statfsSync(fixture.state).type),
      },
    };
    const input = signed({
      ...changed,
      producerSession: {
        ...changed.producerSession,
        actionSha256: computeProducerActionSha256V1(changed),
      },
    });
    expect(() => kernelFor(fixture.state).execute(input)).toThrow(/disjoint/u);
  });

  it('rejects an invalid WorkOrder logical digest before trusting envelope hashes', () => {
    const fixture = execution('workorder-hash');
    const input = signed({
      ...fixture.input,
      workOrder: {...fixture.input.workOrder, canonicalSha256: 'b'.repeat(64)},
    });
    expect(() => kernelFor(fixture.state).execute(input)).toThrow(/WorkOrder logical/u);
  });

  it('binds a run to its first graph and rejects a reminted graph', () => {
    const shared = sandbox();
    const first = execution('graph-first', shared, 'first.md');
    expect(kernelFor(first.state).execute(first.input).state).toBe('EFFECT_SUCCEEDED');
    const second = execution('graph-second', shared, 'second.md');
    const changed = {...second.input, runId: first.input.runId};
    const producerSession = {
      ...changed.producerSession,
      actionSha256: computeProducerActionSha256V1(changed),
    };
    const draft = {...changed, producerSession};
    const input = {...draft, canonicalSha256: computeTransactionExecutionInputSha256V1(draft)};
    expect(() => kernelFor(first.state).execute(input)).toThrow(/graph|digest/u);
  });

  it('rejects a future action-bound authority verdict', () => {
    const fixture = execution('future-authority');
    const futureAuthority: typeof verifiedAuthority = {
      verify: (session, expectedRole) =>
        signed({
          schemaVersion: 'actor-authority-verdict-v1' as const,
          status: 'VERIFIED' as const,
          expectedRole,
          ...session,
          evidenceSha256: digest('future'),
          verifiedAt: '2026-08-30T00:00:00.000Z',
        }),
    };
    expect(() =>
      new DefaultTransactionKernelV1(fixture.state, {producerAuthority: futureAuthority}).execute(
        fixture.input,
      ),
    ).toThrow(/future/u);
  });

  it.each(['root', 'bytes'] as const)('rejects producer action drift in %s', (field) => {
    const fixture = execution(`producer-drift.${field}`);
    const changed =
      field === 'root'
        ? {
            ...fixture.input,
            rootAuthority: {...fixture.input.rootAuthority, rootPath: `${fixture.effect}.other`},
          }
        : {
            ...fixture.input,
            intents: [
              {...fixture.input.intents[0]!, contentBase64: 'eQ==', contentSha256: digest('y')},
            ],
          };
    const input = {...changed, canonicalSha256: computeTransactionExecutionInputSha256V1(changed)};
    expect(() => kernelFor(fixture.state).execute(input)).toThrow(/Producer identity/u);
  });

  it('rejects causally contradictory effect receipt shapes', () => {
    const fixture = execution('receipt-shape');
    const receipt = kernelFor(fixture.state).execute(fixture.input);
    expect(() => TransactionEffectReceiptV1Schema.parse({...receipt, outputs: []})).toThrow();
    expect(() =>
      TransactionEffectReceiptV1Schema.parse({...receipt, errorCode: 'WRITE_FAILED'}),
    ).toThrow();
  });

  it('rejects symlinks and unexpected hardlinks during snapshot', () => {
    for (const kind of ['symlink', 'hardlink'] as const) {
      const {effect, authority} = sandbox();
      writeFileSync(resolve(effect, 'target.md'), 'x');
      if (kind === 'symlink')
        symlinkSync(resolve(effect, 'target.md'), resolve(effect, 'alias.md'));
      else linkSync(resolve(effect, 'target.md'), resolve(effect, 'alias.md'));
      expect(() =>
        withStableRootCapabilityV1(authority, (capability) =>
          captureTransactionSnapshotV1(capability),
        ),
      ).toThrow();
    }
  });

  it.each(['LOCK_FSYNC', 'LEDGER_FSYNC'] satisfies TransactionDurableSeamV1[])(
    'leaves a detectable uncertain state after durable seam %s',
    (seam) => {
      const fixture = execution(`durable.${seam.toLowerCase()}`);
      const durableHooks = {
        onSeam: (current: TransactionDurableSeamV1) => {
          if (current === seam) throw new Error(`crash:${seam}`);
        },
      };
      expect(() => kernelFor(fixture.state, {durableHooks}).execute(fixture.input)).toThrow();
      const inspection = new TransactionDurableStoreV1(fixture.state).inspect(fixture.input.runId);
      expect(inspection.status).toBe('BLOCKED_UNCERTAIN');
      expect(inspection.latestState).not.toBe('PROMOTED');
    },
  );
});
