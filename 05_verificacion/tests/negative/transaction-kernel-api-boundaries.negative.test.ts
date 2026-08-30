import {existsSync, mkdirSync, renameSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import * as PublicOrchestration from 'core/orchestration/index.ts';
import {DefaultTransactionKernelV1} from 'core/orchestration/index.ts';
import {TransactionDurableStoreV1} from 'core/orchestration/transaction-durable-store-v1.ts';
import {MaterialSkillAdapterV2} from 'workflows/core/index.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionExecution,
  transactionAuthorityPort,
  transactionProducerAuthorizer,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

afterEach(cleanupTransactionFixtures);
const withoutIntents = (input: ReturnType<typeof makeTransactionExecution>['input']) => {
  const draft = {...input};
  delete (draft as Partial<typeof draft>).intents;
  delete (draft as Partial<typeof draft>).canonicalSha256;
  return draft;
};

describe('TransactionKernelV1 internal API boundaries', () => {
  it('does not export the low-level durable store from the public facade', () => {
    expect('TransactionDurableStoreV1' in PublicOrchestration).toBe(false);
  });

  it('does not allow event-only callers to mint receipt states', () => {
    const fixture = makeTransactionExecution('forged-event');
    const store = new TransactionDurableStoreV1(fixture.state);
    // prettier-ignore
    expect(() => store.withRunLock(fixture.input.runId, 'forged.lock', 'actor.forged', fixture.input.occurredAt, () => {store.bindRun(fixture.input.runId, fixture.input.graph.canonicalSha256, fixture.input.occurredAt); (store.appendEvent as (run:string,event:string,state:string,payload:object,at:string)=>string)(fixture.input.runId, 'forged.promoted', 'PROMOTED', {}, fixture.input.occurredAt);})).toThrow(/cannot mint/u);
  });

  it('rejects unknown receipts at the durable persistence boundary', () => {
    const fixture = makeTransactionExecution('forged-receipt');
    const store = new TransactionDurableStoreV1(fixture.state);
    // prettier-ignore
    expect(() => store.withRunLock(fixture.input.runId, 'forged.lock', 'actor.forged', fixture.input.occurredAt, () => {store.bindRun(fixture.input.runId, fixture.input.graph.canonicalSha256, fixture.input.occurredAt); store.persistReceipt(fixture.input.runId, 'forged.receipt', 'PROMOTED', {schemaVersion:'forged-receipt-v1', graphSha256:fixture.input.graph.canonicalSha256}, fixture.input.occurredAt);})).toThrow(/Unknown transaction receipt schema/u);
  });

  it('detects effect-root mutation by a supposedly pure V2 handler before kernel execution', async () => {
    const fixture = makeTransactionExecution('rogue-handler');
    const execution = withoutIntents(fixture.input);
    // prettier-ignore
    const adapter = new MaterialSkillAdapterV2(new DefaultTransactionKernelV1(fixture.state, {producerAuthority: transactionAuthorityPort}), {[execution.workOrder.skillId]: () => {writeFileSync(resolve(fixture.effect, 'rogue.md'), 'rogue'); return {intents:[{ref:'result.md', bytes:Buffer.from('intended')}]};}}, transactionProducerAuthorizer);
    await expect(adapter.invoke({execution})).rejects.toThrow(/undeclared creations/u);
    expect(existsSync(resolve(fixture.effect, 'result.md'))).toBe(false);
  });

  it('materializes handler getters inside the purity snapshot', async () => {
    const fixture = makeTransactionExecution('deferred-getter');
    const execution = withoutIntents(fixture.input);
    const result = {} as {intents: readonly [{ref: string; bytes: Uint8Array}]};
    // prettier-ignore
    Object.defineProperty(result, 'intents', {get: () => {writeFileSync(resolve(fixture.effect, 'getter.md'), 'rogue'); return [{ref:'result.md', bytes:Buffer.from('intended')}];}});
    // prettier-ignore
    const adapter = new MaterialSkillAdapterV2(new DefaultTransactionKernelV1(fixture.state, {producerAuthority: transactionAuthorityPort}), {[execution.workOrder.skillId]: () => result}, transactionProducerAuthorizer);
    await expect(adapter.invoke({execution})).rejects.toThrow(/undeclared creations/u);
    expect(existsSync(resolve(fixture.effect, 'result.md'))).toBe(false);
  });

  it('rejects a durable root path replaced after store construction', () => {
    const fixture = makeTransactionExecution('state-root-swap');
    const store = new TransactionDurableStoreV1(fixture.state);
    renameSync(fixture.state, `${fixture.state}.moved`);
    mkdirSync(fixture.state);
    expect(() => store.inspect(fixture.input.runId)).toThrow(/root identity drifted/u);
  });

  it('rejects a run directory replaced after its durable lock is synced', () => {
    const fixture = makeTransactionExecution('run-swap');
    const run = resolve(fixture.state, fixture.input.runId);
    const displaced = `${run}.displaced`;
    // prettier-ignore
    const kernel = new DefaultTransactionKernelV1(fixture.state, {producerAuthority:transactionAuthorityPort, durableHooks:{onSeam:(seam) => {if (seam === 'LOCK_FSYNC') {renameSync(run, displaced); mkdirSync(resolve(run, 'receipts'), {recursive:true}); renameSync(resolve(displaced, 'run.lock'), resolve(run, 'run.lock'));}}}});
    expect(() => kernel.execute(fixture.input)).toThrow(/run identity/u);
    expect(existsSync(resolve(fixture.effect, 'result.md'))).toBe(false);
    expect(new TransactionDurableStoreV1(fixture.state).inspect(fixture.input.runId)).toMatchObject(
      {status: 'BLOCKED_UNCERTAIN'},
    );
  });

  it('blocks a declared parent swap before the temporary write escapes', () => {
    const fixture = makeTransactionExecution('parent-swap', undefined, 'out/result.md');
    const parent = resolve(fixture.effect, 'out');
    const outside = resolve(dirname(fixture.effect), 'outside');
    mkdirSync(parent);
    mkdirSync(outside);
    // prettier-ignore
    const kernel = new DefaultTransactionKernelV1(fixture.state, {producerAuthority:transactionAuthorityPort, writerHooks:{beforeOperation:(operation) => {if (operation === 'TEMP_OPEN') {renameSync(parent, `${parent}.moved`); symlinkSync(outside, parent);}}}});
    expect(kernel.execute(fixture.input).state).toBe('BLOCKED_UNCERTAIN');
    expect(existsSync(resolve(outside, 'result.md'))).toBe(false);
  });

  it('downgrades a target mutated after writer readback to BLOCKED_UNCERTAIN', () => {
    const fixture = makeTransactionExecution('post-readback');
    // prettier-ignore
    const kernel = new DefaultTransactionKernelV1(fixture.state, {producerAuthority:transactionAuthorityPort, writerHooks:{beforeOperation:(operation) => {if (operation === 'TEMP_UNLINK') writeFileSync(resolve(fixture.effect, 'result.md'), 'mutated');}}});
    expect(kernel.execute(fixture.input).state).toBe('BLOCKED_UNCERTAIN');
  });
});
