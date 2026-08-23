import {describe, expect, it} from 'vitest';

import {assertMethodExplainerContractBundle} from 'workflows/video-os/index.ts';

import {
  type Bundle,
  makeBundle,
  type Mutation,
  refreshRunMaterial,
} from './video-os-method-explainer-fixture.ts';

const setIncompleteRun = (bundle: Bundle, index: number, status: 'running' | 'blocked'): void => {
  bundle.unattended_run.state = status === 'running' ? 'RUNNING' : 'BLOCKED';
  for (let cursor = index; cursor < bundle.unattended_run.stages.length; cursor += 1) {
    const stage = bundle.unattended_run.stages[cursor]!;
    stage.status = cursor === index ? status : 'pending';
    stage.attempts = cursor === index ? 1 : 0;
    stage.checkpoint = null;
  }
};
describe('unattended-run progression gates', () => {
  it.each([
    ['running', 'RUNNING'],
    ['blocked', 'BLOCKED'],
  ] as const)('accepts a single %s stage only at firstIncomplete', (status, state) => {
    const bundle = makeBundle();
    setIncompleteRun(bundle, 5, status);
    refreshRunMaterial(bundle);
    expect(bundle.unattended_run.state).toBe(state);
    expect(() => assertMethodExplainerContractBundle(bundle)).not.toThrow();
  });

  it.each([
    [
      'stage reordering',
      (bundle) => {
        const first = bundle.unattended_run.stages[0]!.stage;
        bundle.unattended_run.stages[0]!.stage = bundle.unattended_run.stages[1]!.stage;
        bundle.unattended_run.stages[1]!.stage = first;
      },
    ],
    [
      'a completed stage after a pending stage',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.checkpoint = null;
      },
    ],
    [
      'attempt four',
      (bundle) => {
        bundle.unattended_run.stages[0]!.attempts = 4;
      },
    ],
    [
      'a completed stage with zero attempts',
      (bundle) => {
        bundle.unattended_run.stages[0]!.attempts = 0;
      },
    ],
    [
      'multiple running stages',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        for (let index = 5; index < bundle.unattended_run.stages.length; index += 1) {
          bundle.unattended_run.stages[index]!.status = 'pending';
          bundle.unattended_run.stages[index]!.checkpoint = null;
        }
        bundle.unattended_run.stages[5]!.status = 'running';
        bundle.unattended_run.stages[6]!.status = 'running';
      },
    ],
    [
      'a running stage after firstIncomplete',
      (bundle) => {
        setIncompleteRun(bundle, 5, 'running');
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.attempts = 0;
        bundle.unattended_run.stages[6]!.status = 'running';
        bundle.unattended_run.stages[6]!.attempts = 1;
      },
    ],
    [
      'a blocked stage after firstIncomplete',
      (bundle) => {
        setIncompleteRun(bundle, 5, 'blocked');
        bundle.unattended_run.stages[5]!.status = 'pending';
        bundle.unattended_run.stages[5]!.attempts = 0;
        bundle.unattended_run.stages[6]!.status = 'blocked';
        bundle.unattended_run.stages[6]!.attempts = 1;
      },
    ],
    [
      'a pending stage with a checkpoint',
      (bundle) => {
        bundle.unattended_run.state = 'RUNNING';
        for (let index = 5; index < bundle.unattended_run.stages.length; index += 1) {
          bundle.unattended_run.stages[index]!.status = 'pending';
          if (index !== 5) bundle.unattended_run.stages[index]!.checkpoint = null;
        }
      },
    ],
    [
      'rendered draft with an incomplete stage',
      (bundle) => {
        bundle.unattended_run.stages[12]!.status = 'pending';
        bundle.unattended_run.stages[12]!.checkpoint = null;
      },
    ],
    [
      'BLOCKED run state without a blocked stage',
      (bundle) => {
        bundle.unattended_run.state = 'BLOCKED';
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    const candidate = structuredClone(makeBundle());
    mutate(candidate);
    refreshRunMaterial(candidate);
    expect(() => assertMethodExplainerContractBundle(candidate)).toThrow();
  });
});
