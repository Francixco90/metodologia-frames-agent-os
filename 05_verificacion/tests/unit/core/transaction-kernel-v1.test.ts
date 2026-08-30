import {mkdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {hashCanonical} from 'core/evidence/hash.ts';
import {
  DefaultTransactionKernelV1,
  DurableCausalGateRecorderV1,
  DurableHumanApprovalRecorderV1,
  computeGuardianAuthorityActionSha256V1,
  computeHumanApprovalAuthorityActionSha256V1,
  computePromotionAuthorityActionSha256V1,
  computeVerificationAuthorityActionSha256V1,
  validateTransactionGraphV1,
} from 'core/orchestration/index.ts';
import {TransactionDurableStoreV1} from 'core/orchestration/transaction-durable-store-v1.ts';
import {MaterialSkillAdapterV2} from 'workflows/core/index.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionDraft as makeDraft,
  makeTransactionGraph as makeGraph,
  makeTransactionSandbox as makeRoots,
  makeTransactionWorkOrder as makeWorkOrder,
  physicalTransactionReceipt as physical,
  signTransactionFixture as signed,
  transactionAuthorityPort as authorityPort,
  transactionDigest as sha,
  transactionProducerAuthorizer as producerAuthorizer,
  transactionSession as session,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

afterEach(() => {
  cleanupTransactionFixtures();
});

describe('TransactionKernelV1', () => {
  it('materializes one and multiple pure-handler outputs with exact readback', async () => {
    for (const [id, content] of [
      ['single', {'out/result.md': '# exact\n'}],
      ['multi', {'out/result.md': '# exact\n', 'out/data.json': '{"ok":true}\n'}],
    ] as const) {
      const {effect, state, authority} = makeRoots();
      mkdirSync(resolve(effect, 'out'));
      const refs = Object.keys(content);
      const workOrder = makeWorkOrder(id, refs);
      const authorization = {scope: 'PROJECT_LOCAL'};
      const graph = makeGraph(id, workOrder, authorization);
      const draft = makeDraft(id, authority, graph, workOrder, authorization);
      const durableSeams: string[] = [];
      const rootSeams: string[] = [];
      const store = new TransactionDurableStoreV1(state);
      const seams: string[] = [];
      const adapter = new MaterialSkillAdapterV2(
        new DefaultTransactionKernelV1(state, {
          producerAuthority: authorityPort,
          durableHooks: {onSeam: (seam) => durableSeams.push(seam)},
          rootHooks: {onSeam: (seam) => rootSeams.push(seam)},
          writerHooks: {onSeam: (seam) => seams.push(seam)},
        }),
        {
          [workOrder.skillId]: () => ({
            intents: Object.entries(content).map(([ref, bytes]) => ({
              ref,
              bytes: Buffer.from(bytes),
            })),
          }),
        },
        producerAuthorizer,
      );

      const receipt = await adapter.invoke({execution: draft});

      const writerCycle = [
        'TEMP_OPENED',
        'BYTES_WRITTEN',
        'FILE_SYNCED',
        'TARGET_LINKED',
        'PARENT_SYNCED',
        'READBACK_VERIFIED',
        'TEMP_REMOVED',
        'PARENT_RESYNCED',
      ];
      expect({errorCode: receipt.errorCode, seams, rootSeams, durableSeams}).toEqual({
        errorCode: null,
        seams: Array.from({length: refs.length}, () => writerCycle).flat(),
        rootSeams: [
          'ROOT_REALPATH',
          'ROOT_OPENED',
          'ROOT_VALIDATED_PRE',
          'ROOT_VALIDATED_POST',
          'ROOT_CLOSED',
        ],
        durableSeams: [
          'LOCK_FSYNC',
          'RUN_BINDING_FSYNC',
          'LEDGER_FSYNC',
          'LEDGER_FSYNC',
          'RECEIPT_FSYNC',
          'LEDGER_FSYNC',
          'LOCK_RELEASE',
        ],
      });
      expect(receipt).toMatchObject({state: 'EFFECT_SUCCEEDED', coverageGaps: []});
      expect(receipt.assuranceLimitations).toContain('NODE_FS_OPENAT_UNAVAILABLE');
      expect(receipt.outputs.map(({ref}) => ref).sort()).toEqual([...refs].sort());
      for (const [ref, bytes] of Object.entries(content)) {
        expect(readFileSync(resolve(effect, ref), 'utf8')).toBe(bytes);
      }
      expect(store.inspect(draft.runId)).toMatchObject({
        status: 'CLEAN',
        latestState: 'EFFECT_SUCCEEDED',
        receiptCount: 1,
      });
    }
  });

  it('requires distinct physical evidence through verification, Guardian, H01 and recorder', async () => {
    const {effect, state, authority} = makeRoots();
    mkdirSync(resolve(effect, 'out'));
    const workOrder = makeWorkOrder('causal', ['out/result.md']);
    const authorization = {scope: 'PROJECT_LOCAL'};
    const graph = makeGraph('causal', workOrder, authorization);
    const draft = makeDraft('causal', authority, graph, workOrder, authorization);
    const store = new TransactionDurableStoreV1(state);
    const kernel = new DefaultTransactionKernelV1(state, {
      producerAuthority: authorityPort,
    });
    const effectReceipt = await new MaterialSkillAdapterV2(
      kernel,
      {
        [workOrder.skillId]: () => ({
          intents: [{ref: 'out/result.md', bytes: Buffer.from('candidate\n')}],
        }),
      },
      producerAuthorizer,
    ).invoke({execution: draft});
    const recorder = new DurableCausalGateRecorderV1(state, authorityPort);
    const candidateSha256 = effectReceipt.candidateSha256;
    const effectPhysicalSha256 = physical(effectReceipt);
    const verification = recorder.recordVerification({
      runId: draft.runId,
      nodeId: draft.nodeId,
      receiptId: 'verification.causal',
      effectReceiptId: effectReceipt.receiptId,
      effectReceiptPhysicalSha256: effectPhysicalSha256,
      producerActorInstanceId: effectReceipt.producerActorInstanceId,
      verifierSession: session(
        'verifier',
        computeVerificationAuthorityActionSha256V1(
          effectReceipt,
          effectPhysicalSha256,
          'PASS',
          candidateSha256,
        ),
      ),
      decision: 'PASS',
      evidenceSha256: candidateSha256,
      recordedAt: '2026-08-29T12:00:01.000Z',
    });
    const verificationPhysicalSha256 = physical(verification);
    const guardian = recorder.recordGuardianVerdict({
      runId: draft.runId,
      nodeId: draft.nodeId,
      receiptId: 'guardian.causal',
      verificationReceiptId: verification.receiptId,
      verificationReceiptPhysicalSha256: verificationPhysicalSha256,
      guardianSession: session(
        'guardian',
        computeGuardianAuthorityActionSha256V1(
          verification,
          verificationPhysicalSha256,
          'PASS',
          candidateSha256,
        ),
      ),
      decision: 'PASS',
      evidenceSha256: candidateSha256,
      recordedAt: '2026-08-29T12:00:02.000Z',
    });
    const guardianPhysicalSha256 = physical(guardian);
    const approval = new DurableHumanApprovalRecorderV1(state, authorityPort).recordHumanApproval({
      runId: draft.runId,
      nodeId: draft.nodeId,
      receiptId: 'approval.causal',
      guardianReceiptId: guardian.receiptId,
      guardianReceiptPhysicalSha256: guardianPhysicalSha256,
      approverSession: session(
        'approver',
        computeHumanApprovalAuthorityActionSha256V1(guardian, guardianPhysicalSha256),
      ),
      recordedAt: '2026-08-29T12:00:03.000Z',
    });
    const approvalPhysicalSha256 = physical(approval);
    expect(store.inspect(draft.runId).latestState).toBe('H01_APPROVED');
    const promotion = recorder.promote({
      runId: draft.runId,
      nodeId: draft.nodeId,
      promotionReceiptId: 'promotion.causal',
      humanApprovalReceiptId: approval.receiptId,
      humanApprovalReceiptPhysicalSha256: approvalPhysicalSha256,
      recorderSession: session(
        'recorder',
        computePromotionAuthorityActionSha256V1(approval, approvalPhysicalSha256),
      ),
      recordedAt: '2026-08-29T12:00:04.000Z',
    });

    expect(promotion.state).toBe('PROMOTED');
    expect(
      new Set([
        promotion.producerActorInstanceId,
        promotion.verifierActorInstanceId,
        promotion.guardianActorInstanceId,
        promotion.approverActorInstanceId,
        promotion.recorderActorInstanceId,
      ]).size,
    ).toBe(5);
    expect(store.inspect(draft.runId)).toMatchObject({
      status: 'CLEAN',
      latestState: 'PROMOTED',
      receiptCount: 5,
    });
  });

  it('rejects invalid DAG topology and hash-bound authorization drift', () => {
    const {authority} = makeRoots();
    const workOrder = makeWorkOrder('graph', ['result.md']);
    const authorization = {scope: 'PROJECT_LOCAL'};
    const graph = makeGraph('graph', workOrder, authorization);
    expect(validateTransactionGraphV1(graph)).toEqual(graph);
    const node = graph.nodes[0]!;
    const cases = [
      {...node, dependsOn: ['missing.node'], wave: 1},
      {...node, nodeId: 'node.parent', aliases: [], wave: 0, dependsOn: ['node.graph']},
      {...node, aliases: ['NODE.GRAPH']},
    ];
    for (const changed of cases) {
      const invalid = signed({
        ...graph,
        nodes: changed.nodeId === 'node.parent' ? [node, changed] : [changed],
      });
      expect(() => validateTransactionGraphV1(invalid)).toThrow();
    }
    const drifted = makeDraft('graph', authority, graph, workOrder, {scope: 'DIFFERENT'});
    const kernel = new DefaultTransactionKernelV1(makeRoots().state, {
      producerAuthority: authorityPort,
    });
    expect(() =>
      kernel.execute(
        signed({
          ...drifted,
          intents: [
            {
              effect: 'CREATE_FILE',
              ref: 'result.md',
              contentBase64: 'eA==',
              contentSha256: sha('x'),
              sizeBytes: 1,
            },
          ],
        }),
      ),
    ).toThrow(/binding drift/u);
  });

  it('does not execute a child without the exact physical PromotionReceipt', () => {
    const {state, authority} = makeRoots();
    const parentWorkOrder = makeWorkOrder('parent', ['parent.md']);
    const childWorkOrder = makeWorkOrder('child', ['child.md']);
    const authorization = {scope: 'PROJECT_LOCAL'};
    const parentGraph = makeGraph('parent', parentWorkOrder, authorization);
    const parentNode = parentGraph.nodes[0]!;
    const graph = makeGraph('child', childWorkOrder, authorization, [parentNode], ['node.parent']);
    const draft = makeDraft('child', authority, graph, childWorkOrder, authorization, [
      {nodeId: 'node.parent', receiptId: 'promotion.parent', physicalSha256: 'b'.repeat(64)},
    ]);
    const input = signed({
      ...draft,
      intents: [
        {
          effect: 'CREATE_FILE' as const,
          ref: 'child.md',
          contentBase64: 'eA==',
          contentSha256: sha('x'),
          sizeBytes: 1,
        },
      ],
    });

    expect(() =>
      new DefaultTransactionKernelV1(state, {producerAuthority: authorityPort}).execute(input),
    ).toThrow();
  });

  it('rejects a causal role collision', async () => {
    const {effect, state, authority} = makeRoots();
    const workOrder = makeWorkOrder('collision', ['result.md']);
    const authorization = {scope: 'PROJECT_LOCAL'};
    const graph = makeGraph('collision', workOrder, authorization);
    const draft = makeDraft('collision', authority, graph, workOrder, authorization);
    const receipt = await new MaterialSkillAdapterV2(
      new DefaultTransactionKernelV1(state, {producerAuthority: authorityPort}),
      {
        [workOrder.skillId]: () => ({intents: [{ref: 'result.md', bytes: Buffer.from('x')}]}),
      },
      producerAuthorizer,
    ).invoke({execution: draft});
    const recorder = new DurableCausalGateRecorderV1(state, authorityPort);
    const receiptPhysicalSha256 = physical(receipt);
    const evidenceSha256 = hashCanonical(receipt.outputs);
    const actionSha256 = computeVerificationAuthorityActionSha256V1(
      receipt,
      receiptPhysicalSha256,
      'PASS',
      evidenceSha256,
    );
    expect(() =>
      recorder.recordVerification({
        runId: draft.runId,
        nodeId: draft.nodeId,
        receiptId: 'verification.collision',
        effectReceiptId: receipt.receiptId,
        effectReceiptPhysicalSha256: receiptPhysicalSha256,
        producerActorInstanceId: receipt.producerActorInstanceId,
        verifierSession: {
          taskId: receipt.producerTaskId,
          actorInstanceId: receipt.producerActorInstanceId,
          authoritySha256: sha('same'),
          actionSha256,
          environment: 'LOCAL_SIMULATION',
        },
        decision: 'PASS',
        evidenceSha256,
        recordedAt: '2026-08-29T12:00:01.000Z',
      }),
    ).toThrow(/distinct/u);
    expect(readFileSync(resolve(effect, 'result.md'), 'utf8')).toBe('x');
  });
});
