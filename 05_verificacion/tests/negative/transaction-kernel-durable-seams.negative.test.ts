import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {DefaultTransactionKernelV1} from 'core/orchestration/index.ts';
import {
  cleanupTransactionFixtures,
  makeTransactionExecution,
  signTransactionFixture,
  transactionAuthorityPort,
  transactionDigest,
} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

const forbidden = /"state":"(?:VERIFIED_PASS|GUARDIAN_PASS|H01_APPROVED|PROMOTED)"/u;
const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const states = (path: string): string[] =>
  read(path)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => (JSON.parse(line) as {state: string}).state);
const snapshot = (paths: Record<string, string>) =>
  Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, read(path)]));
const child = (body: string, args: readonly string[]) =>
  spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', body, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
const changingAuthority = (): typeof transactionAuthorityPort => {
  let sequence = 0;
  return {
    verify: (session, expectedRole) =>
      signTransactionFixture({
        schemaVersion: 'actor-authority-verdict-v1' as const,
        status: 'VERIFIED' as const,
        expectedRole,
        ...session,
        evidenceSha256: transactionDigest(`authority-evidence:${sequence++}`),
        verifiedAt: '2026-08-29T11:59:59.000Z',
      }),
  };
};
const recoveryInput = (fixture: ReturnType<typeof makeTransactionExecution>, id: string) =>
  signTransactionFixture({
    schemaVersion: 'transaction-recovery-input-v1' as const,
    runId: fixture.input.runId,
    recoveryId: `recovery.${id}`,
    actorInstanceId: `actor.recovery.${id}`,
    taskId: `task.recovery.${id}`,
    authoritySha256: transactionDigest(`authority:${id}`),
    reason: 'Record exact append-only recovery evidence.',
    recordedAt: '2026-08-29T12:00:03.000Z',
  });
const EFFECT_CHILD = `import{readFileSync}from'node:fs';import{DefaultTransactionKernelV1 as K}from'./02_proceso/core/orchestration/index.ts';import{transactionAuthorityPort as a}from'./05_verificacion/tests/fixtures/transaction-kernel-v1.fixture.ts';const[s,p,t,h]=process.argv.slice(1);let n=0;new K(s,{producerAuthority:a,durableHooks:{onSeam:x=>{if(x===t&&++n===Number(h))process.exit(73)}}}).execute(JSON.parse(readFileSync(p,'utf8')));`;
const RECOVERY_CHILD = `import{readFileSync}from'node:fs';import{DefaultTransactionKernelV1 as K}from'./02_proceso/core/orchestration/index.ts';import{transactionAuthorityPort as a}from'./05_verificacion/tests/fixtures/transaction-kernel-v1.fixture.ts';const[s,p,t]=process.argv.slice(1);new K(s,{producerAuthority:a,recoveryAuthority:a,durableHooks:{onSeam:x=>{if(x===t)process.exit(74)}}}).recover(JSON.parse(readFileSync(p,'utf8')));`;
// prettier-ignore
const effectCases = [
  {id:'lock', seam:'LOCK_FSYNC', hit:1, states:[], binding:false, receipt:false, output:false},
  {id:'binding', seam:'RUN_BINDING_FSYNC', hit:1, states:[], binding:true, receipt:false, output:false},
  {id:'ledger-prepared', seam:'LEDGER_FSYNC', hit:1, states:['PREPARED'], binding:true, receipt:false, output:false},
  {id:'ledger-running', seam:'LEDGER_FSYNC', hit:2, states:['PREPARED','RUNNING'], binding:true, receipt:false, output:false},
  {id:'receipt', seam:'RECEIPT_FSYNC', hit:1, states:['PREPARED','RUNNING'], binding:true, receipt:true, output:true},
  {id:'ledger-effect', seam:'LEDGER_FSYNC', hit:3, states:['PREPARED','RUNNING','EFFECT_SUCCEEDED'], binding:true, receipt:true, output:true},
  {id:'lock-release', seam:'LOCK_RELEASE', hit:1, states:['PREPARED','RUNNING','EFFECT_SUCCEEDED'], binding:true, receipt:true, output:true},
] as const;

afterEach(cleanupTransactionFixtures);
describe('TransactionKernelV1 durable process-crash seams', () => {
  it.each(effectCases)('recovers fail-closed after $id', ({id, seam, hit, ...expected}) => {
    const fixture = makeTransactionExecution(`process-crash.${id}`);
    const inputPath = resolve(fixture.state, '..', `${id}.input.json`);
    writeFileSync(inputPath, JSON.stringify(fixture.input));
    const crashed = child(EFFECT_CHILD, [fixture.state, inputPath, seam, String(hit)]);
    expect({status: crashed.status, stderr: crashed.stderr}).toEqual({status: 73, stderr: ''});
    const kernel = new DefaultTransactionKernelV1(fixture.state, {
      producerAuthority: transactionAuthorityPort,
      recoveryAuthority: transactionAuthorityPort,
    });
    const run = resolve(fixture.state, fixture.input.runId);
    const paths = {
      binding: resolve(run, 'run-binding.json'),
      ledger: resolve(run, 'ledger.jsonl'),
      receipt: resolve(run, 'receipts', `${fixture.input.receiptId}.json`),
      output: resolve(fixture.effect, 'result.md'),
    };
    const inspection = kernel.inspect({runId: fixture.input.runId});
    expect({
      states: states(paths.ledger),
      binding: existsSync(paths.binding),
      receipt: existsSync(paths.receipt),
      output: existsSync(paths.output),
    }).toEqual(expected);
    expect(read(paths.ledger)).not.toMatch(forbidden);
    if (seam === 'LOCK_RELEASE') {
      expect({
        inspection,
        output: read(paths.output),
        recovery: kernel.inspectRecovery({runId: fixture.input.runId}),
      }).toMatchObject({
        inspection: {status: 'CLEAN', latestState: 'EFFECT_SUCCEEDED', receiptCount: 1, issues: []},
        output: 'x',
        recovery: {recoveryRequired: false},
      });
      expect(existsSync(resolve(run, 'run.lock'))).toBe(false);
      return;
    }
    expect(inspection.status).toBe('BLOCKED_UNCERTAIN');
    expect(kernel.inspectRecovery({runId: fixture.input.runId}).recoveryRequired).toBe(true);
    const before = snapshot(paths);
    expect(kernel.recover(recoveryInput(fixture, `effect.${id}`)).state).toBe('BLOCKED_UNCERTAIN');
    expect(snapshot(paths)).toEqual(before);
    expect(read(resolve(run, 'recovery-ledger.jsonl'))).not.toMatch(forbidden);
  });

  it.each([
    {id: 'lock', seam: 'LOCK_FSYNC'},
    {id: 'receipt', seam: 'RECOVERY_RECEIPT_FSYNC'},
    {id: 'ledger', seam: 'RECOVERY_LEDGER_FSYNC'},
  ] as const)('resumes exact recovery after process crash at $id', ({id, seam}) => {
    const fixture = makeTransactionExecution(`recovery-crash.${id}`);
    const fault = new DefaultTransactionKernelV1(fixture.state, {
      producerAuthority: transactionAuthorityPort,
      writerHooks: {
        beforeOperation: () => {
          throw new Error('effect fault');
        },
      },
    });
    expect(fault.execute(fixture.input).state).toBe('BLOCKED_UNCERTAIN');
    const run = resolve(fixture.state, fixture.input.runId);
    const mainLedger = resolve(run, 'ledger.jsonl');
    const before = read(mainLedger);
    const input = recoveryInput(fixture, `crash.${id}`);
    const inputPath = resolve(fixture.state, '..', `${id}.recovery.json`);
    writeFileSync(inputPath, JSON.stringify(input));
    const crashed = child(RECOVERY_CHILD, [fixture.state, inputPath, seam]);
    expect({status: crashed.status, stderr: crashed.stderr, main: read(mainLedger)}).toEqual({
      status: 74,
      stderr: '',
      main: before,
    });
    const lock = resolve(run, 'recovery.lock');
    const receipt = resolve(run, 'recovery-receipts', `${input.recoveryId}.json`);
    const ledger = resolve(run, 'recovery-ledger.jsonl');
    expect({lock: existsSync(lock), receipt: existsSync(receipt), states: states(ledger)}).toEqual({
      lock: true,
      receipt: seam !== 'LOCK_FSYNC',
      states: seam === 'RECOVERY_LEDGER_FSYNC' ? ['BLOCKED_UNCERTAIN'] : [],
    });
    const resumed = new DefaultTransactionKernelV1(fixture.state, {
      producerAuthority: transactionAuthorityPort,
      recoveryAuthority: changingAuthority(),
    });
    expect(() =>
      resumed.recover(signTransactionFixture({...input, recoveryId: `recovery.different.${id}`})),
    ).toThrow(/another action/u);
    const recovered = resumed.recover(input);
    expect(recovered).toEqual(JSON.parse(read(receipt)));
    expect(resumed.recover(input)).toEqual(recovered);
    expect({
      main: read(mainLedger),
      lines: read(ledger).trim().split('\n').length,
      lock: existsSync(lock),
      inspection: resumed.inspect({runId: fixture.input.runId}),
    }).toMatchObject({
      main: before,
      lines: 1,
      lock: false,
      inspection: {status: 'CLEAN', latestState: 'BLOCKED_UNCERTAIN', issues: []},
    });
  });
});
