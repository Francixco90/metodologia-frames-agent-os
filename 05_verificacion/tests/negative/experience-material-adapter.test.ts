import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {FramesWorkOrderV1Schema, hashExperienceValue} from 'core/contracts/index.ts';
import {
  FakeSkillAdapterV1,
  MaterialSkillAdapterV1,
  type MaterialSkillHandlerV1,
} from 'workflows/core/index.ts';

const roots: string[] = [];
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const evidence = [{ref: 'evidence/material-check.json', sha256: 'a'.repeat(64)}];
const timestamps = {
  startedAt: '2026-08-09T12:00:00.000Z',
  completedAt: '2026-08-09T12:00:01.000Z',
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

const createRoot = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-material-adapter-'));
  roots.push(root);
  return root;
};

const workOrderFor = (output: string, writeSet = ['outputs/**']) => {
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: 'WO.EXP.MATERIAL',
    requestHash: 'a'.repeat(64),
    routeId: 'R6' as const,
    workflowId: 'CONTENT.MINIMAL',
    stepId: 'P06.materialize',
    skillId: 'content-os-creative',
    actorId: 'RT-07',
    readSet: [],
    writeSet,
    inputs: [],
    expectedOutputs: [output],
    tools: [],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {targetFiles: 1, maxFiles: 4, targetTokens: 1_000, maxTokens: 4_000},
    acceptanceCriteria: ['El output existe y su hash se leyó desde disco.'],
    stopRule: 'Detener ante output no verificable.',
  };
  return FramesWorkOrderV1Schema.parse({
    ...draft,
    canonicalSha256: hashExperienceValue(draft),
  });
};

const invoke = async (
  root: string,
  output: string,
  handler: MaterialSkillHandlerV1,
  writeSet?: string[],
) =>
  new MaterialSkillAdapterV1(root, {'content-os-creative': handler}).invoke({
    invocationId: 'INV.EXP.MATERIAL',
    workOrder: workOrderFor(output, writeSet),
    ...timestamps,
  });

describe('MaterialSkillAdapterV1 adversarial boundaries', () => {
  it('rejects nonexistent and stale outputs', async () => {
    const root = createRoot();
    const missing = await invoke(root, 'outputs/missing.md', () => ({
      status: 'PASS',
      outputs: [{ref: 'outputs/missing.md', sha256: 'a'.repeat(64)}],
      evidence,
      publicSummary: 'No existe.',
    }));
    expect(missing).toMatchObject({status: 'BLOCKED', outputs: []});

    const path = resolve(root, 'outputs/stale.md');
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, 'material real', 'utf8');
    const stale = await invoke(root, 'outputs/stale.md', () => ({
      status: 'PASS',
      outputs: [{ref: 'outputs/stale.md', sha256: digest('otro contenido')}],
      evidence,
      publicSummary: 'Hash declarado obsoleto.',
    }));
    expect(stale).toMatchObject({status: 'BLOCKED', outputs: []});
    expect(stale.publicSummary).toMatch(/hash mismatch/u);
  });

  it('rejects symlinks and outputs outside the exact write set', async () => {
    const root = createRoot();
    const target = resolve(root, 'target.md');
    const link = resolve(root, 'outputs/link.md');
    mkdirSync(dirname(link), {recursive: true});
    writeFileSync(target, 'target', 'utf8');
    symlinkSync(target, link);
    const symlink = await invoke(root, 'outputs/link.md', () => ({
      status: 'PASS',
      outputs: [{ref: 'outputs/link.md', sha256: digest('target')}],
      evidence,
      publicSummary: 'Symlink.',
    }));
    expect(symlink).toMatchObject({status: 'BLOCKED', outputs: []});
    expect(symlink.publicSummary).toMatch(/non-symlink/u);

    const outside = resolve(root, 'outputs/outside.md');
    writeFileSync(outside, 'outside', 'utf8');
    const unauthorized = await invoke(
      root,
      'outputs/outside.md',
      () => ({
        status: 'PASS',
        outputs: [{ref: 'outputs/outside.md', sha256: digest('outside')}],
        evidence,
        publicSummary: 'Fuera del write set.',
      }),
      ['outputs/allowed/**'],
    );
    expect(unauthorized).toMatchObject({status: 'BLOCKED', outputs: []});
    expect(unauthorized.publicSummary).toMatch(/outside the authorized write set/u);
  });

  it('accredits only read-back material and marks the fake adapter simulation-only', async () => {
    const root = createRoot();
    const output = 'outputs/brief.md';
    const bytes = 'brief material\n';
    const path = resolve(root, output);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, bytes, 'utf8');
    const receipt = await invoke(root, output, () => ({
      status: 'PASS',
      outputs: [{ref: output, sha256: digest(bytes)}],
      evidence,
      publicSummary: 'Material verificado.',
    }));
    expect(receipt).toMatchObject({
      status: 'PASS',
      metrics: {materialExecutionAccredited: true, simulationOnly: false},
      outputs: [{ref: output, sha256: digest(bytes)}],
    });

    const fake = new FakeSkillAdapterV1({
      'content-os-creative': () => ({
        status: 'PASS',
        outputs: [{ref: output, sha256: digest(bytes)}],
        evidence,
        publicSummary: 'Simulación.',
      }),
    });
    expect(fake.simulationOnly).toBe(true);
    expect(
      await fake.invoke({
        invocationId: 'INV.EXP.FAKE',
        workOrder: workOrderFor(output),
        ...timestamps,
      }),
    ).toMatchObject({
      status: 'UNKNOWN',
      metrics: {materialExecutionAccredited: false, simulationOnly: true},
    });
  });
});
